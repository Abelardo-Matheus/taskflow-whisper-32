import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { runChatTurn, type ChatHistoryMsg } from "../_shared/chat-core.ts";
import { readMetaWhatsAppCredentials } from "../_shared/vault.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform",
};

// ---------- Markdown sanitizer (safety net) ----------
function sanitizeForWhatsApp(input: string): string {
  return input
    .replace(/\*\*(.*?)\*\*/g, "*$1*") // Meta WhatsApp uses * for bold
    .replace(/__(.*?)__/g, "_$1_") // Meta WhatsApp uses _ for italics
    .replace(/`{1,3}([^`]+)`{1,3}/g, "```$1```")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[-*]\s+/gm, "- ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// ---------- Conversation history ----------
async function loadWhatsAppHistory(supabase: any, userId: string, workspaceId: string, limit = 10): Promise<ChatHistoryMsg[]> {
  const { data, error } = await supabase
    .from("chat_messages")
    .select("role, content, metadata, created_at")
    .eq("user_id", userId)
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(limit * 2);

  if (error) {
    console.warn("[whatsapp] history load error:", error.message);
    return [];
  }

  const whatsappMsgs = (data || []).filter((m: any) => m?.metadata?.channel === "whatsapp");
  return whatsappMsgs
    .reverse()
    .filter((m: any) => m.role === "user" || m.role === "assistant")
    .map((m: any) => ({ role: m.role, content: m.content }))
    .slice(-limit);
}

async function saveChatMessage(supabase: any, userId: string, workspaceId: string, role: "user" | "assistant", content: string) {
  const { error } = await supabase.from("chat_messages").insert({
    user_id: userId,
    workspace_id: workspaceId,
    role,
    content,
    metadata: { channel: "whatsapp" },
  });
  if (error) console.warn("[whatsapp] save message error:", error.message);
}

// ---------- Main handler ----------
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);

  // ---- Meta Webhook Verification (GET) ----
  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    if (mode === "subscribe" && challenge) {
      console.log("[whatsapp] Webhook verified!");
      return new Response(challenge, { status: 200 });
    }
    return new Response("Invalid request", { status: 400 });
  }

  // ---- POST Requests ----
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

  try {
    const body = await req.json();

    // ---- Internal: send a notification ----
    if (body.action === "send_notification") {
      const { phone: targetPhone, message: notifMessage, workspace_id } = body;
      if (!targetPhone || !notifMessage) {
        return new Response(JSON.stringify({ error: "Missing phone/message" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const cleanPhone = String(targetPhone).replace(/\D/g, "");

      const query = supabase
        .from("whatsapp_instances")
        .select("id, instance_name, workspace_id")
        .eq("status", "connected")
        .eq("is_active", true);
      if (workspace_id) query.eq("workspace_id", workspace_id);
      const { data: instances } = await query.limit(1);
      const inst = instances?.[0];

      if (!inst) {
        return new Response(JSON.stringify({ error: "No connected instance" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const creds = await readMetaWhatsAppCredentials(supabase, inst.id);
      if (!creds) {
        return new Response(JSON.stringify({ error: "Missing credentials" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // instance_name stores the Phone Number ID
      const phoneId = inst.instance_name;
      
      const sendRes = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${creds.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: cleanPhone,
          type: "text",
          text: { preview_url: false, body: notifMessage },
        }),
      });
      console.log(`[whatsapp] notification send status=${sendRes.status}`);

      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ---- Incoming Meta Webhook ----
    if (body.object === "whatsapp_business_account") {
      for (const entry of body.entry) {
        for (const change of entry.changes) {
          if (change.value && change.value.messages) {
            const phoneId = change.value.metadata.phone_number_id;
            const msg = change.value.messages[0];

            if (!msg || msg.type !== "text") continue;

            const fromPhone = msg.from; // Sender's phone number
            const text = msg.text?.body;

            console.log(`[whatsapp] Received message from ${fromPhone} to phone_id ${phoneId}`);

            // Find instance by phoneId
            const { data: inst } = await supabase
              .from("whatsapp_instances")
              .select("id, instance_name, ai_allowed_phone")
              .eq("instance_name", phoneId)
              .eq("is_active", true)
              .maybeSingle();

            if (!inst) {
              console.log(`[whatsapp] Unknown phone_id ${phoneId}`);
              continue;
            }

            // Per-instance AI restriction
            const allowed = (inst?.ai_allowed_phone || "").replace(/\D/g, "");
            if (allowed && !fromPhone.includes(allowed)) {
              console.log(`[whatsapp] Phone ${fromPhone} not in AI-allowed list (${allowed}) — silently ignoring`);
              continue;
            }

            // Find user profile
            const { data: profiles } = await supabase
              .from("profiles")
              .select("user_id, workspace_id, name, phone");

            // Look for matching phone (Meta sends without '+' but with country code)
            const profile = profiles?.find(p => p.phone && fromPhone.includes(p.phone.replace(/\D/g, "")));

            if (!profile) {
              console.log(`[whatsapp] No profile matched for phone=${fromPhone}`);
              await sendWhatsAppMessageViaMeta(supabase, inst.id, phoneId, fromPhone, "❌ Seu número não está cadastrado no TaskAI. Cadastre-o nas Configurações do app.");
              continue;
            }

            console.log(`[whatsapp] Matched profile user_id=${profile.user_id} name=${profile.name}`);

            if (!LOVABLE_API_KEY) {
              console.error("LOVABLE_API_KEY not set");
              continue;
            }

            // Load WhatsApp conversation history
            const history = await loadWhatsAppHistory(supabase, profile.user_id, profile.workspace_id, 10);
            
            // Run shared chat turn
            let replyText: string;
            try {
              replyText = await runChatTurn({
                supabase,
                apiKey: LOVABLE_API_KEY,
                userId: profile.user_id,
                userMessage: text,
                history,
              });
            } catch (e) {
              console.error("[whatsapp] runChatTurn error:", e);
              replyText = "Desculpe, tive um problema para processar sua mensagem agora. Tente de novo em instantes.";
            }

            replyText = sanitizeForWhatsApp(replyText);

            // Persist messages for future context
            await saveChatMessage(supabase, profile.user_id, profile.workspace_id, "user", text);
            await saveChatMessage(supabase, profile.user_id, profile.workspace_id, "assistant", replyText);

            await sendWhatsAppMessageViaMeta(supabase, inst.id, phoneId, fromPhone, replyText);
          }
        }
      }
      return new Response("ok", { headers: corsHeaders });
    }

    return new Response(JSON.stringify({ error: "Unknown action or invalid webhook payload" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("whatsapp error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function sendWhatsAppMessageViaMeta(supabase: any, instanceDbId: string, phoneId: string, toPhone: string, text: string) {
  const creds = await readMetaWhatsAppCredentials(supabase, instanceDbId);
  if (!creds) {
    console.warn(`[whatsapp] Missing vault secrets for instance ${instanceDbId}`);
    return;
  }

  const res = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${creds.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: toPhone,
      type: "text",
      text: { preview_url: false, body: text },
    }),
  });
  const respBody = await res.text();
  console.log(`[whatsapp] send message to ${toPhone} → status=${res.status} body=${respBody.slice(0, 300)}`);
}

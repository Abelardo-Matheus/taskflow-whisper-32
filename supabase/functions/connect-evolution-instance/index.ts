import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { storeEvolutionCredentials } from "../_shared/vault.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Connects an EXISTING Evolution API instance (already created on the Evolution server)
 * to this workspace. Looks it up by instance_name, registers it locally, stores secrets
 * in the vault, and (re)configures the webhook to point back at this project.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const { api_url, api_key, instance_name, name, workspace_id } = await req.json();

    if (!api_url || !api_key || !instance_name || !name || !workspace_id) {
      return new Response(JSON.stringify({ success: false, error: "Campos obrigatórios: api_url, api_key, instance_name, name, workspace_id" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const baseUrl = api_url.replace(/\/$/, "").replace(/\/manager$/, "");

    // 1) Check that the instance exists on the Evolution server
    console.log(`[connect-evolution-instance] Looking up: ${instance_name} at ${baseUrl}`);
    const fetchRes = await fetch(`${baseUrl}/instance/fetchInstances?instanceName=${encodeURIComponent(instance_name)}`, {
      headers: { apikey: api_key },
    });
    const fetchText = await fetchRes.text();
    console.log(`[connect-evolution-instance] fetchInstances (${fetchRes.status}): ${fetchText.substring(0, 400)}`);

    if (!fetchRes.ok) {
      return new Response(JSON.stringify({ success: false, error: `Erro Evolution API: ${fetchRes.status}`, details: fetchText }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let fetchData: any = null;
    try { fetchData = JSON.parse(fetchText); } catch {}
    const list: any[] = Array.isArray(fetchData) ? fetchData : (fetchData ? [fetchData] : []);

    // Evolution v1 returns [{ instance: { instanceName, status }, ... }]; v2 may flatten.
    const match = list.find((it: any) => {
      const n = it?.instance?.instanceName || it?.instanceName || it?.name;
      return n === instance_name;
    });

    if (!match) {
      return new Response(JSON.stringify({ success: false, error: `Instância "${instance_name}" não encontrada na Evolution API` }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const evoStatus: string = (match?.instance?.status || match?.status || "").toString().toLowerCase();
    const phoneNumber: string | null = match?.instance?.owner || match?.owner || match?.instance?.profileName || null;
    const isConnected = evoStatus === "open" || evoStatus === "connected";

    // 2) Try to get a fresh QR if not connected
    let qrCode: string | null = null;
    if (!isConnected) {
      try {
        const qrRes = await fetch(`${baseUrl}/instance/connect/${instance_name}`, { headers: { apikey: api_key } });
        if (qrRes.ok) {
          const qrData = await qrRes.json().catch(() => ({}));
          qrCode = qrData?.base64 || qrData?.qrcode?.base64 || null;
        }
      } catch (e) {
        console.warn("[connect-evolution-instance] QR fetch failed (non-fatal):", e);
      }
    }

    // 3) Avoid duplicates within the workspace
    const { data: existing } = await supabase
      .from("whatsapp_instances")
      .select("id")
      .eq("workspace_id", workspace_id)
      .eq("instance_name", instance_name)
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify({ success: false, error: "Esta instância já está conectada ao workspace" }), {
        status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4) Insert local row
    const { data: instance, error: insertError } = await supabase
      .from("whatsapp_instances")
      .insert({
        workspace_id,
        name,
        instance_name,
        status: isConnected ? "connected" : (qrCode ? "qr_required" : "disconnected"),
        qr_code: qrCode,
        is_default: true,
        is_active: true,
        phone_number: phoneNumber ? phoneNumber.toString().replace(/\D/g, "") || null : null,
      })
      .select()
      .single();

    if (insertError) {
      console.error("[connect-evolution-instance] DB error:", insertError);
      return new Response(JSON.stringify({ success: false, error: insertError.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 5) Store credentials in Vault
    let vaultRefs: { vault_url_id: string; vault_key_id: string };
    try {
      vaultRefs = await storeEvolutionCredentials(supabase, instance.id, api_url, api_key);
    } catch (e) {
      console.error("[connect-evolution-instance] vault error:", e);
      await supabase.from("whatsapp_instances").delete().eq("id", instance.id);
      return new Response(JSON.stringify({ success: false, error: e instanceof Error ? e.message : "Vault error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: secretsError } = await supabase
      .from("whatsapp_instance_secrets")
      .insert({
        instance_id: instance.id,
        vault_url_id: vaultRefs.vault_url_id,
        vault_key_id: vaultRefs.vault_key_id,
      });

    if (secretsError) {
      await supabase.from("whatsapp_instances").delete().eq("id", instance.id);
      return new Response(JSON.stringify({ success: false, error: secretsError.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 6) (Re)configure webhook so events flow into this project
    const webhookUrl = `${supabaseUrl}/functions/v1/whatsapp`;
    try {
      await fetch(`${baseUrl}/webhook/set/${instance_name}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: api_key },
        body: JSON.stringify({
          webhook: {
            enabled: true,
            url: webhookUrl,
            webhook_by_events: false,
            webhook_base64: false,
            events: ["MESSAGES_UPSERT", "CONNECTION_UPDATE", "QRCODE_UPDATED"],
          },
        }),
      });
    } catch (e) {
      console.warn("[connect-evolution-instance] Webhook setup failed (non-fatal):", e);
    }

    return new Response(JSON.stringify({
      success: true,
      instance_id: instance.id,
      qr_code: qrCode,
      status: instance.status,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error: unknown) {
    console.error("[connect-evolution-instance] Error:", error);
    return new Response(JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
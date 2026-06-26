import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { storeMetaWhatsAppCredentials } from "../_shared/vault.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing auth header");
    const jwt = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await supabase.auth.getUser(jwt);
    if (authErr || !user) throw new Error("Unauthorized");

    const { phone_id, verify_token, access_token, name, workspace_id } = await req.json();

    if (!phone_id || !verify_token || !access_token || !name || !workspace_id) {
      return new Response(JSON.stringify({ success: false, error: "Parâmetros incompletos" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if phone_id already exists
    const { data: existing } = await supabase
      .from("whatsapp_instances")
      .select("id")
      .eq("instance_name", phone_id)
      .maybeSingle();

    if (existing) {
       return new Response(JSON.stringify({ success: false, error: "Este Phone Number ID já está configurado" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Insert instance
    const { data: instance, error: insertError } = await supabase
      .from("whatsapp_instances")
      .insert({
        instance_name: phone_id, // We use instance_name as phone_id
        name: name,
        workspace_id: workspace_id,
        status: "connected",
        is_active: true,
      })
      .select("id")
      .single();

    if (insertError || !instance) throw new Error("Failed to insert instance: " + insertError?.message);

    // Store tokens in vault
    const vaultRefs = await storeMetaWhatsAppCredentials(supabase, instance.id, verify_token, access_token);

    // Link vault secrets to instance
    const { error: secretsErr } = await supabase
      .from("whatsapp_instance_secrets")
      .insert({
        instance_id: instance.id,
        vault_url_id: vaultRefs.vault_url_id, // using url_id for verify_token
        vault_key_id: vaultRefs.vault_key_id, // using key_id for access_token
      });

    if (secretsErr) throw new Error("Failed to link vault secrets: " + secretsErr.message);

    return new Response(JSON.stringify({ success: true, instance_id: instance.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

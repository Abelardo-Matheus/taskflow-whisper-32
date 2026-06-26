// Shared helper to read secrets from Supabase Vault.
// Only callable with the service role client (RPC enforces this server-side).

export async function readVaultSecret(supabase: any, secretId: string | null | undefined): Promise<string | null> {
  if (!secretId) return null;
  const { data, error } = await supabase.rpc("vault_read_secret", { _secret_id: secretId });
  if (error) {
    console.error("[vault] read error:", error.message);
    return null;
  }
  return (data as string | null) ?? null;
}

export async function readMetaWhatsAppCredentials(
  supabase: any,
  instanceId: string,
): Promise<{ verify_token: string; access_token: string } | null> {
  const { data: secrets, error } = await supabase
    .from("whatsapp_instance_secrets")
    .select("vault_url_id, vault_key_id")
    .eq("instance_id", instanceId)
    .maybeSingle();

  if (error || !secrets) return null;

  const [verify_token, access_token] = await Promise.all([
    readVaultSecret(supabase, secrets.vault_url_id),
    readVaultSecret(supabase, secrets.vault_key_id),
  ]);

  if (!verify_token || !access_token) return null;
  return { verify_token, access_token };
}

export async function storeMetaWhatsAppCredentials(
  supabase: any,
  instanceId: string,
  verifyToken: string,
  accessToken: string,
): Promise<{ vault_url_id: string; vault_key_id: string }> {
  // Use the vault.create_secret directly via service role
  const { data: urlSecret, error: urlErr } = await supabase
    .schema("vault")
    .from("secrets")
    .insert({ secret: verifyToken, name: `whatsapp_meta_verify_${instanceId}_${Date.now()}`, description: `Meta Verify Token for ${instanceId}` })
    .select("id")
    .single();
  if (urlErr) throw new Error(`vault verify_token insert failed: ${urlErr.message}`);

  const { data: keySecret, error: keyErr } = await supabase
    .schema("vault")
    .from("secrets")
    .insert({ secret: accessToken, name: `whatsapp_meta_access_${instanceId}_${Date.now()}`, description: `Meta Access Token for ${instanceId}` })
    .select("id")
    .single();
  if (keyErr) throw new Error(`vault access_token insert failed: ${keyErr.message}`);

  return { vault_url_id: urlSecret.id, vault_key_id: keySecret.id };
}

export async function deleteVaultSecrets(supabase: any, secretIds: (string | null | undefined)[]): Promise<void> {
  const ids = secretIds.filter(Boolean) as string[];
  if (ids.length === 0) return;
  const { error } = await supabase.schema("vault").from("secrets").delete().in("id", ids);
  if (error) console.warn("[vault] delete error:", error.message);
}

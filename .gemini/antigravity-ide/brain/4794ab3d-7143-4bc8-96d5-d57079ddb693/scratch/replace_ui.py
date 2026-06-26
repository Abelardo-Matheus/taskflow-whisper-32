import re

file_path = 'src/pages/ConfiguracoesPage.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

start_marker = '// --- WhatsApp Integration Component ---'
end_marker = '// --- Notification Preferences Component ---'

if start_marker in content and end_marker in content:
    pre = content.split(start_marker)[0]
    post = content.split(end_marker)[1]
    
    new_component = """// --- WhatsApp Integration Component ---
function WhatsAppIntegration({ profile }: { profile: any }) {
  const [phoneNumber, setPhoneNumber] = useState(profile?.phone || "");
  const [whatsappNotifs, setWhatsappNotifs] = useState(profile?.whatsapp_notifications || false);

  // Meta API credentials
  const [phoneId, setPhoneId] = useState("");
  const [verifyToken, setVerifyToken] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [displayName, setDisplayName] = useState("");
  
  const [isSaving, setIsSaving] = useState(false);
  const [instances, setInstances] = useState<any[]>([]);
  const [loadingInstances, setLoadingInstances] = useState(true);

  // Load instances
  useEffect(() => {
    const load = async () => {
      setLoadingInstances(true);
      const { data } = await supabase
        .from("whatsapp_instances")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      setInstances(data || []);
      setLoadingInstances(false);
    };
    load();
  }, []);

  const handleSaveConfig = async () => {
    if (!displayName.trim() || !phoneId.trim() || !verifyToken.trim() || !accessToken.trim()) {
      toast.error("Preencha todos os campos");
      return;
    }

    setIsSaving(true);
    try {
      const { data: profileData } = await supabase.from("profiles").select("workspace_id").eq("user_id", (await supabase.auth.getUser()).data.user?.id).single();

      const { data, error } = await supabase.functions.invoke("save-whatsapp-config", {
        body: {
          phone_id: phoneId.trim(),
          verify_token: verifyToken.trim(),
          access_token: accessToken.trim(),
          name: displayName.trim(),
          workspace_id: profileData?.workspace_id,
        },
      });

      if (error || !data?.success) throw new Error(data?.error || error?.message || "Erro");

      toast.success("WhatsApp conectado com sucesso! ✅");
      
      // Clear form
      setPhoneId("");
      setVerifyToken("");
      setAccessToken("");
      setDisplayName("");

      // Reload instances
      const { data: updated } = await supabase.from("whatsapp_instances").select("*").eq("is_active", true).order("created_at", { ascending: false });
      setInstances(updated || []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar configurações");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteInstance = async (id: string) => {
    if (!confirm("Tem certeza que deseja remover esta conexão? O webhook vai parar de funcionar.")) return;
    try {
      await supabase.from("whatsapp_instances").update({ is_active: false }).eq("id", id);
      setInstances(prev => prev.filter(i => i.id !== id));
      toast.success("Conexão removida");
    } catch {
      toast.error("Erro ao remover");
    }
  };

  const handleSavePhone = async () => {
    if (!profile) return;
    const { error } = await supabase.from("profiles").update({ phone: phoneNumber || null }).eq("id", profile.id);
    if (error) toast.error("Erro ao salvar");
    else toast.success("Telefone salvo!");
  };

  const handleToggleWhatsApp = async (checked: boolean) => {
    if (!profile) return;
    setWhatsappNotifs(checked);
    await supabase.from("profiles").update({ whatsapp_notifications: checked }).eq("id", profile.id);
  };

  if (loadingInstances) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
        <p className="text-sm text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  const connectedInstance = instances.find(i => i.status === "connected");

  return (
    <div className="space-y-6">
      {/* Phone + notifications section */}
      <div className="rounded-xl border bg-card p-6 space-y-4">
        <h3 className="font-heading text-base font-semibold text-card-foreground">Seu número</h3>
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">Número de telefone (com DDD)</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="+55 11 99999-9999" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} className="pl-9" />
            </div>
            <Button onClick={handleSavePhone}>Salvar</Button>
          </div>
        </div>
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div>
            <p className="text-sm font-medium text-card-foreground">Notificações WhatsApp</p>
            <p className="text-xs text-muted-foreground">Receba alertas de solicitações, prazos e atualizações</p>
          </div>
          <Switch checked={whatsappNotifs} onCheckedChange={handleToggleWhatsApp} />
        </div>
      </div>

      {/* Meta API Setup */}
      <div className="rounded-xl border bg-card p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-heading text-base font-semibold text-card-foreground mb-1">WhatsApp Oficial (Meta)</h3>
            <p className="text-sm text-muted-foreground">Configure a conexão direta com a API da Meta (WhatsApp Cloud API).</p>
          </div>
          {connectedInstance && (
            <div className="flex items-center gap-2 text-sm text-primary bg-primary/10 px-3 py-1.5 rounded-full">
              <Wifi className="h-3.5 w-3.5" /> Conectado
            </div>
          )}
        </div>

        {/* Existing instances list */}
        {instances.length > 0 && (
          <div className="space-y-3 mb-6">
            <h4 className="text-sm font-medium text-card-foreground">Conexões Ativas</h4>
            {instances.map((inst) => (
              <InstanceRow
                key={inst.id}
                instance={inst}
                onDelete={() => handleDeleteInstance(inst.id)}
                onUpdated={async () => {
                  const { data: updated } = await supabase.from("whatsapp_instances").select("*").eq("is_active", true).order("created_at", { ascending: false });
                  setInstances(updated || []);
                }}
              />
            ))}
          </div>
        )}

        {/* Create new instance form */}
        <div className="border-t pt-4 space-y-4">
          <h4 className="text-sm font-medium text-card-foreground">{instances.length > 0 ? "Nova conexão" : "Configurar Conexão"}</h4>
          
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Nome da conexão (para seu controle)</label>
              <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Ex: WhatsApp Principal" />
            </div>
            
            <div>
              <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <Globe className="h-3.5 w-3.5" /> Phone Number ID (ID do Número de Telefone)
              </label>
              <Input value={phoneId} onChange={(e) => setPhoneId(e.target.value)} placeholder="Ex: 104561234567890" className="font-mono text-sm mt-1" />
            </div>
            
            <div>
              <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <Key className="h-3.5 w-3.5" /> Access Token (Token de Acesso do Usuário de Sistema)
              </label>
              <Input type="password" value={accessToken} onChange={(e) => setAccessToken(e.target.value)} placeholder="EAAI..." className="font-mono text-sm mt-1" />
            </div>

            <div>
              <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <Shield className="h-3.5 w-3.5" /> Verify Token (Token de Verificação do Webhook)
              </label>
              <Input type="password" value={verifyToken} onChange={(e) => setVerifyToken(e.target.value)} placeholder="Seu token secreto criado no painel da Meta" className="font-mono text-sm mt-1" />
              <p className="text-xs text-muted-foreground mt-1">Você deve inserir este mesmo token na configuração do Webhook no painel da Meta.</p>
            </div>

            <Button onClick={handleSaveConfig} disabled={isSaving || !displayName.trim() || !phoneId.trim() || !verifyToken.trim() || !accessToken.trim()} className="w-full gap-2 mt-4">
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {isSaving ? "Salvando..." : "Salvar Configuração"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Single instance row with AI-allowed-phone ---
function InstanceRow({ instance, onDelete, onUpdated }: { instance: any; onDelete: () => void; onUpdated: () => void }) {
  const [expanded, setExpanded] = useState<null | "ai">(null);
  const [allowed, setAllowed] = useState<string>(instance.ai_allowed_phone || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const cleaned = allowed.replace(/\D/g, "") || null;
    const { error } = await supabase
      .from("whatsapp_instances")
      .update({ ai_allowed_phone: cleaned })
      .eq("id", instance.id);
    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar: " + error.message);
      return;
    }
    toast.success(cleaned ? "IA restrita ao número configurado" : "Restrição removida — IA responde a qualquer usuário cadastrado");
    onUpdated();
  };

  return (
    <div className="rounded-lg border bg-background">
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${instance.status === "connected" ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
            {instance.status === "connected" ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-card-foreground truncate">{instance.name}</p>
            <p className="text-xs text-muted-foreground">
              Phone ID: {instance.instance_name}
              {instance.ai_allowed_phone && <span className="ml-2 text-primary">• IA: {instance.ai_allowed_phone}</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setExpanded(expanded === "ai" ? null : "ai")}>
            Restringir IA
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={onDelete}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {expanded === "ai" && (
        <div className="border-t px-3 py-3 space-y-2 bg-muted/20">
          <label className="text-xs font-medium text-muted-foreground">Número autorizado a falar com a IA</label>
          <p className="text-xs text-muted-foreground">
            Se preenchido, a IA <strong>só responderá</strong> a este número. Deixe vazio para permitir qualquer usuário cadastrado.
          </p>
          <div className="flex gap-2">
            <Input
              value={allowed}
              onChange={(e) => setAllowed(e.target.value)}
              placeholder="Ex: 5511988887777 (com DDI e DDD, só dígitos)"
            />
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Notification Preferences Component ---
"""
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(pre + new_component + post)
    print("Success")
else:
    print("Markers not found")

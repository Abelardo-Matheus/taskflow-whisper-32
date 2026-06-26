import re

file_path = 'src/components/onboarding/StepWhatsApp.tsx'

new_content = """import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MessageSquare, Loader2, CheckCircle, SkipForward, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type View = "intro" | "credentials" | "connected";

export function StepWhatsApp() {
  const [view, setView] = useState<View>("intro");
  const [phoneId, setPhoneId] = useState("");
  const [verifyToken, setVerifyToken] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    supabase.from("whatsapp_instances").select("id, status").eq("is_active", true).then(({ data }) => {
      const connected = data?.find((i: any) => i.status === "connected");
      if (connected) {
        setView("connected");
      }
    });
  }, []);

  const handleCreate = async () => {
    if (!phoneId.trim() || !verifyToken.trim() || !accessToken.trim() || !displayName.trim()) {
      toast.error("Preencha todos os campos");
      return;
    }
    setCreating(true);
    const { data: profile } = await supabase.from("profiles").select("workspace_id").maybeSingle();
    const { data, error } = await supabase.functions.invoke("save-whatsapp-config", {
      body: {
        phone_id: phoneId.trim(),
        verify_token: verifyToken.trim(),
        access_token: accessToken.trim(),
        name: displayName.trim(),
        workspace_id: profile?.workspace_id,
      },
    });
    setCreating(false);
    if (error || !data?.success) {
      toast.error(data?.error || "Erro ao salvar credenciais");
      return;
    }
    setView("connected");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20">
          <MessageSquare className="h-6 w-6 text-emerald-600" />
        </div>
        <div>
          <h2 className="font-heading text-xl font-bold">WhatsApp Oficial <span className="text-xs font-normal text-muted-foreground">(opcional)</span></h2>
          <p className="text-sm text-muted-foreground">Conecte via API Oficial da Meta para usar a IA por WhatsApp.</p>
        </div>
      </div>

      {view === "intro" && (
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm space-y-2">
            <p className="font-medium">O que você precisa:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1">
              <li>Um App criado no portal de Desenvolvedores da Meta</li>
              <li>O ID do seu Número de Telefone (Phone Number ID)</li>
              <li>Um Token de Acesso permanente</li>
              <li>Um Token de Verificação (que você cria)</li>
            </ul>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setView("credentials")} className="flex-1 h-11">Configurar agora</Button>
            <Button variant="outline" onClick={() => toast.info("Você pode configurar depois nas Configurações → WhatsApp")} className="h-11 gap-2">
              <SkipForward className="h-4 w-4" /> Pular
            </Button>
          </div>
        </div>
      )}

      {view === "credentials" && (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium">Nome de exibição</label>
            <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Ex: WhatsApp Vendas" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium">Phone Number ID</label>
            <Input value={phoneId} onChange={(e) => setPhoneId(e.target.value)} placeholder="104561234567890" className="font-mono" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium">Access Token</label>
            <Input value={accessToken} onChange={(e) => setAccessToken(e.target.value)} placeholder="EAAI..." type="password" className="font-mono" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium">Verify Token</label>
            <Input value={verifyToken} onChange={(e) => setVerifyToken(e.target.value)} placeholder="Seu token de verificação" type="password" className="font-mono" />
          </div>
          <Button onClick={handleCreate} disabled={creating} className="w-full h-11 gap-2 mt-4">
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {creating ? "Salvando..." : "Salvar Configuração"}
          </Button>
        </div>
      )}

      {view === "connected" && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-6 text-center space-y-2">
          <CheckCircle className="h-10 w-10 text-emerald-500 mx-auto" />
          <p className="font-semibold">WhatsApp conectado!</p>
          <p className="text-sm text-muted-foreground">O webhook está configurado e pronto para uso.</p>
        </div>
      )}
    </div>
  );
}
"""

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(new_content)
print("Success")

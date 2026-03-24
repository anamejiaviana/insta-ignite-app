import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useClients } from "@/contexts/ClientContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Sparkles, Zap, Copy, Check } from "lucide-react";

export default function HookGenerator() {
  const { activeClient } = useClients();
  const { toast } = useToast();
  const [topic, setTopic] = useState("");
  const [hooks, setHooks] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const generateHooks = async () => {
    if (!activeClient) {
      toast({ variant: "destructive", title: "Selecciona un cliente primero" });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-hooks", {
        body: {
          topic: topic || undefined,
          client: {
            name: activeClient.name,
            type: activeClient.type,
            city: activeClient.city,
            tone: activeClient.tone,
            objective: activeClient.objective,
          },
          language: activeClient.content_language || "es",
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);
      setHooks(data.hooks || []);
      toast({ title: "¡Hooks generados!" });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error al generar hooks",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const copyHook = (hook: string, idx: number) => {
    navigator.clipboard.writeText(hook);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      <h1 className="text-3xl font-bold mb-8">Generador de Hooks</h1>

      <div className="glass rounded-2xl p-6 space-y-4 mb-8">
        <div className="space-y-2">
          <Label>Temática (opcional)</Label>
          <Input
            placeholder="Ej: ofertas de verano, nuevo producto, consejos..."
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className="bg-secondary border-border"
          />
        </div>
        <Button
          variant="gradient"
          onClick={generateHooks}
          disabled={loading || !activeClient}
          className="w-full"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Sparkles className="h-4 w-4 mr-2" />
          )}
          Generar hooks
        </Button>
      </div>

      {hooks.length === 0 && !loading && (
        <div className="glass rounded-2xl p-12 text-center">
          <Zap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Crea hooks irresistibles</h3>
          <p className="text-muted-foreground text-sm">
            Genera hooks que capten la atención en los primeros segundos.
          </p>
        </div>
      )}

      {loading && (
        <div className="glass rounded-2xl p-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Generando hooks...</p>
        </div>
      )}

      {hooks.length > 0 && (
        <div className="space-y-2">
          {hooks.map((hook, idx) => (
            <div
              key={idx}
              className="glass glass-hover rounded-xl p-4 flex items-center justify-between gap-3 group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className="h-7 w-7 rounded-lg flex items-center justify-center text-xs font-bold text-primary-foreground shrink-0"
                  style={{ background: "var(--gradient-primary)" }}
                >
                  {idx + 1}
                </span>
                <p className="font-medium text-sm">"{hook}"</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyHook(hook, idx)}
                className="sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0"
              >
                {copiedIdx === idx ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

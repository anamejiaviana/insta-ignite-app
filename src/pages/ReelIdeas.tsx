import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useClients } from "@/contexts/ClientContext";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Sparkles, Film, Copy, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ReelIdea {
  idea: string;
  objetivo: string;
  hook: string;
  guion: string;
  planos: string[];
  caption: string;
  hashtags: string[];
}

export default function ReelIdeas() {
  const { activeClient } = useClients();
  const { toast } = useToast();
  const [ideas, setIdeas] = useState<ReelIdea[]>([]);
  const [loading, setLoading] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const generateIdeas = async () => {
    if (!activeClient) {
      toast({ variant: "destructive", title: "Selecciona un cliente primero" });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-reel-ideas", {
        body: {
          client: {
            name: activeClient.name,
            type: activeClient.type,
            city: activeClient.city,
            tone: activeClient.tone,
            objective: activeClient.objective,
            keywords: activeClient.keywords,
          },
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);
      setIdeas(data.ideas || []);
      toast({ title: "¡10 ideas de reels generadas!" });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error al generar ideas",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Ideas de Reels</h1>
          {activeClient && (
            <p className="text-muted-foreground mt-1">
              Para{" "}
              <span className="text-primary font-medium">{activeClient.name}</span>
            </p>
          )}
        </div>
        <Button
          variant="gradient"
          onClick={generateIdeas}
          disabled={loading || !activeClient}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Sparkles className="h-4 w-4 mr-2" />
          )}
          Generar ideas
        </Button>
      </div>

      {ideas.length === 0 && !loading && (
        <div className="glass rounded-2xl p-12 text-center">
          <Film className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Sin ideas aún</h3>
          <p className="text-muted-foreground text-sm">
            Selecciona un cliente y genera 10 ideas de reels personalizadas.
          </p>
        </div>
      )}

      {loading && (
        <div className="glass rounded-2xl p-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Generando ideas de reels...</p>
        </div>
      )}

      <div className="space-y-4">
        {ideas.map((idea, idx) => (
          <Card key={idx} className="bg-card border-border">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span
                    className="h-8 w-8 rounded-lg flex items-center justify-center text-sm font-bold text-primary-foreground shrink-0"
                    style={{ background: "var(--gradient-primary)" }}
                  >
                    {idx + 1}
                  </span>
                  <CardTitle className="text-base">{idea.idea}</CardTitle>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    copyToClipboard(
                      `${idea.caption}\n\n${idea.hashtags.map((h) => `#${h}`).join(" ")}`,
                      idx
                    )
                  }
                >
                  {copiedIdx === idx ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <span className="text-muted-foreground font-medium">Objetivo:</span>{" "}
                {idea.objetivo}
              </div>
              <div>
                <span className="text-muted-foreground font-medium">Hook:</span>{" "}
                <span className="text-primary font-medium">"{idea.hook}"</span>
              </div>
              <div>
                <span className="text-muted-foreground font-medium">Mini guión:</span>
                <p className="mt-1 text-muted-foreground whitespace-pre-line">{idea.guion}</p>
              </div>
              <div>
                <span className="text-muted-foreground font-medium">Planos sugeridos:</span>
                <ul className="mt-1 space-y-1">
                  {idea.planos.map((p, i) => (
                    <li key={i} className="text-muted-foreground flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="pt-2 border-t border-border">
                <p className="text-muted-foreground">{idea.caption}</p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {idea.hashtags.map((h, i) => (
                    <span
                      key={i}
                      className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full"
                    >
                      #{h}
                    </span>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

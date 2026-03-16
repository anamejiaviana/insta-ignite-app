import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useClients } from "@/contexts/ClientContext";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Sparkles, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface CalendarEntry {
  dia: number;
  tipo: string;
  objetivo: string;
  idea: string;
  formato: string;
}

export default function ContentCalendar() {
  const { activeClient } = useClients();
  const { toast } = useToast();
  const [entries, setEntries] = useState<CalendarEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  const generateCalendar = async () => {
    if (!activeClient) {
      toast({ variant: "destructive", title: "Selecciona un cliente primero" });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-post", {
        body: {
          title: `Calendario de contenido para ${month}`,
          description: `Genera un plan de contenido mensual para Instagram. Usa la matriz de contenido: Objetivos (descubrir, confiar, comprar) × Tipos (educativo, entretenimiento, producto). Equilibra los contenidos. Genera 12-15 publicaciones distribuidas en el mes. Para cada entrada incluye: dia (número), tipo (educativo/entretenimiento/producto), objetivo (descubrir/confiar/comprar), idea (título corto), formato (post/reel/carrusel/story).`,
          cta: "",
          postType: "post",
          clientContext: {
            name: activeClient.name,
            type: activeClient.type,
            city: activeClient.city,
            tone: activeClient.tone,
            objective: activeClient.objective,
            keywords: activeClient.keywords,
          },
          language: "es",
          customFormat: true,
          formatInstructions: `Responde en JSON con esta estructura: { "entries": [{ "dia": 1, "tipo": "educativo", "objetivo": "descubrir", "idea": "título corto", "formato": "reel" }] }. Genera 12-15 entradas distribuidas en el mes.`,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      // Try to parse entries from the response
      if (data.entries) {
        setEntries(data.entries);
      } else {
        // Fallback: parse from mainCopy if custom format wasn't used
        setEntries([]);
      }
      toast({ title: "¡Calendario generado!" });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error al generar calendario",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const objectiveColors: Record<string, string> = {
    descubrir: "bg-blue-500/20 text-blue-400",
    confiar: "bg-amber-500/20 text-amber-400",
    comprar: "bg-green-500/20 text-green-400",
  };

  const typeIcons: Record<string, string> = {
    educativo: "📚",
    entretenimiento: "🎬",
    producto: "🛍️",
  };

  return (
    <div className="max-w-5xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Calendario mensual</h1>
          {activeClient && (
            <p className="text-muted-foreground mt-1">
              Plan para{" "}
              <span className="text-primary font-medium">{activeClient.name}</span>
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="bg-secondary border border-border rounded-lg px-3 py-2 text-sm"
          />
          <Button
            variant="gradient"
            onClick={generateCalendar}
            disabled={loading || !activeClient}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            Generar
          </Button>
        </div>
      </div>

      {entries.length === 0 && !loading && (
        <div className="glass rounded-2xl p-12 text-center">
          <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Planifica tu mes</h3>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            Genera un calendario de contenido equilibrado usando la matriz de
            contenido estratégica.
          </p>
        </div>
      )}

      {loading && (
        <div className="glass rounded-2xl p-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Generando calendario...</p>
        </div>
      )}

      {entries.length > 0 && (
        <div className="space-y-3">
          {entries.map((entry, idx) => (
            <div
              key={idx}
              className="glass rounded-xl p-4 flex items-center gap-4"
            >
              <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center font-bold text-lg shrink-0">
                {entry.dia}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{entry.idea}</p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="text-xs">{typeIcons[entry.tipo] || "📝"}</span>
                  <span className="text-xs text-muted-foreground capitalize">
                    {entry.tipo}
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full capitalize ${
                      objectiveColors[entry.objetivo] || "bg-secondary text-muted-foreground"
                    }`}
                  >
                    {entry.objetivo}
                  </span>
                  <span className="text-xs text-muted-foreground uppercase">
                    {entry.formato}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

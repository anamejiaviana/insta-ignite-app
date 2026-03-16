import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useClients } from "@/contexts/ClientContext";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Sparkles, Camera, Clapperboard } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ShootingReel {
  reel: string;
  hook: string;
  planos: string[];
  duracion: string;
}

interface ShootingPlan {
  reels: ShootingReel[];
  planosApoyo: string[];
  planosModulares: {
    contexto: string[];
    producto: string[];
    accion: string[];
    autoridad: string[];
    emocionales: string[];
  };
}

export default function ShootingDay() {
  const { activeClient } = useClients();
  const { toast } = useToast();
  const [plan, setPlan] = useState<ShootingPlan | null>(null);
  const [loading, setLoading] = useState(false);

  const generatePlan = async () => {
    if (!activeClient) {
      toast({ variant: "destructive", title: "Selecciona un cliente primero" });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-shooting-plan", {
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
      setPlan(data);
      toast({ title: "¡Plan de grabación generado!" });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error al generar plan",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Día de grabación</h1>
          {activeClient && (
            <p className="text-muted-foreground mt-1">
              Sesión para{" "}
              <span className="text-primary font-medium">{activeClient.name}</span>
            </p>
          )}
        </div>
        <Button
          variant="gradient"
          onClick={generatePlan}
          disabled={loading || !activeClient}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Sparkles className="h-4 w-4 mr-2" />
          )}
          Preparar sesión
        </Button>
      </div>

      {!plan && !loading && (
        <div className="glass rounded-2xl p-12 text-center">
          <Camera className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Planifica tu día de grabación</h3>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            Genera un plan de 3-4 reels para grabar en 30-40 minutos, con planos de apoyo y módulos reutilizables.
          </p>
        </div>
      )}

      {loading && (
        <div className="glass rounded-2xl p-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Preparando plan de grabación...</p>
        </div>
      )}

      {plan && (
        <div className="space-y-6">
          {/* Reels Table */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clapperboard className="h-5 w-5 text-primary" />
                Reels a grabar
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 pr-4 font-medium text-muted-foreground">Reel</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Hook</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Planos</th>
                      <th className="text-left py-3 pl-4 font-medium text-muted-foreground">Duración</th>
                    </tr>
                  </thead>
                  <tbody>
                    {plan.reels.map((reel, idx) => (
                      <tr key={idx} className="border-b border-border/50">
                        <td className="py-3 pr-4 font-medium">{reel.reel}</td>
                        <td className="py-3 px-4 text-primary">"{reel.hook}"</td>
                        <td className="py-3 px-4">
                          <ul className="space-y-1">
                            {reel.planos.map((p, i) => (
                              <li key={i} className="text-muted-foreground flex items-center gap-1.5">
                                <span className="h-1 w-1 rounded-full bg-primary shrink-0" />
                                {p}
                              </li>
                            ))}
                          </ul>
                        </td>
                        <td className="py-3 pl-4 text-muted-foreground">{reel.duracion}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Support Shots */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-lg">Planos extra de apoyo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {plan.planosApoyo.map((p, i) => (
                  <div
                    key={i}
                    className="bg-secondary/50 rounded-lg px-3 py-2 text-sm text-muted-foreground"
                  >
                    {p}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Modular Shots */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-lg">Grabación modular</CardTitle>
              <p className="text-sm text-muted-foreground">
                Con 12-15 planos puedes crear múltiples reels
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(plan.planosModulares).map(([category, shots]) => (
                  <div key={category}>
                    <h4 className="font-medium text-sm mb-2 capitalize">
                      Planos de {category}
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {(shots as string[]).map((shot, i) => (
                        <span
                          key={i}
                          className="text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full"
                        >
                          {shot}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

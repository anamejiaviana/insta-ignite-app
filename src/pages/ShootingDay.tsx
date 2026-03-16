import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useClients } from "@/contexts/ClientContext";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Sparkles, Camera, Clapperboard } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

interface WeeklyPlanItem {
  id: string;
  type: string;
  day: string;
  idea: string;
  hook: string;
  script: string;
  shots: string[];
  caption: string;
  hashtags: string[];
}

interface ShootingPlanData {
  reels: { reel: string; hook: string; planos: string[]; duracion: string }[];
  planosApoyo: string[];
}

export default function ShootingDay() {
  const { activeClient } = useClients();
  const { toast } = useToast();
  const [latestPlan, setLatestPlan] = useState<any>(null);
  const [numDays, setNumDays] = useState(1);
  const [shootingPlan, setShootingPlan] = useState<ShootingPlanData | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState(true);

  useEffect(() => {
    loadLatestWeeklyPlan();
  }, [activeClient]);

  const loadLatestWeeklyPlan = async () => {
    setLoadingPlan(true);
    if (!activeClient) {
      setLoadingPlan(false);
      return;
    }

    const { data } = await (supabase as any)
      .from("weekly_plans")
      .select("*")
      .eq("client_id", activeClient.id)
      .order("created_at", { ascending: false })
      .limit(1);

    if (data && data.length > 0) {
      setLatestPlan(data[0]);
    } else {
      setLatestPlan(null);
    }
    setLoadingPlan(false);
  };

  const generateShootingPlan = async () => {
    if (!latestPlan) {
      toast({ variant: "destructive", title: "No hay plan semanal. Genera uno primero desde el Dashboard." });
      return;
    }

    setLoading(true);
    try {
      const planData = latestPlan.plan_data;
      const reels = planData.reels || [];

      const { data, error } = await supabase.functions.invoke("generate-shooting-plan", {
        body: {
          client: {
            name: activeClient!.name,
            type: activeClient!.type,
            city: activeClient!.city,
            tone: activeClient!.tone,
            objective: activeClient!.objective,
            keywords: activeClient!.keywords,
          },
          existingReels: reels,
          numDays,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setShootingPlan(data);

      // Save to DB
      const user = (await supabase.auth.getUser()).data.user;
      if (user) {
        await (supabase as any).from("shooting_plans").insert({
          user_id: user.id,
          client_id: activeClient!.id,
          weekly_plan_id: latestPlan.id,
          num_days: numDays,
          plan_data: data,
        });
      }

      toast({ title: "¡Plan de grabación generado!" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error al generar plan", description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const reelsFromPlan = latestPlan?.plan_data?.reels || [];

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Día de grabación</h1>
        {activeClient && (
          <p className="text-muted-foreground mt-1">
            Sesión para{" "}
            <span className="text-primary font-medium">{activeClient.name}</span>
          </p>
        )}
      </div>

      {loadingPlan ? (
        <div className="glass rounded-2xl p-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Cargando plan semanal...</p>
        </div>
      ) : !latestPlan ? (
        <div className="glass rounded-2xl p-12 text-center">
          <Camera className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Sin plan semanal</h3>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            Primero genera tu plan de contenido semanal desde el Dashboard para poder organizar tu día de grabación.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Reels from weekly plan */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-base">Contenido a grabar</CardTitle>
              <p className="text-xs text-muted-foreground">
                Basado en tu plan semanal del {new Date(latestPlan.week_start).toLocaleDateString("es-ES")}
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {reelsFromPlan.map((reel: any, idx: number) => (
                  <div key={idx} className="p-3 rounded-lg bg-secondary/50">
                    <p className="font-medium text-sm">{reel.idea}</p>
                    <p className="text-xs text-primary mt-1">🎬 "{reel.hook}"</p>
                    {reel.shots && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {reel.shots.map((s: string, i: number) => (
                          <span key={i} className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full">{s}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Shooting days selector */}
          <div className="glass rounded-2xl p-6 space-y-4">
            <div className="space-y-2">
              <Label className="text-sm">¿Cuántos días de grabación quieres planificar?</Label>
              <div className="flex gap-2">
                {[1, 2, 3].map((n) => (
                  <button
                    key={n}
                    onClick={() => setNumDays(n)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      numDays === n
                        ? "text-primary-foreground"
                        : "bg-secondary text-muted-foreground hover:text-foreground"
                    }`}
                    style={numDays === n ? { background: "var(--gradient-primary)" } : undefined}
                  >
                    {n} {n === 1 ? "día" : "días"}
                  </button>
                ))}
              </div>
            </div>

            <Button variant="gradient" onClick={generateShootingPlan} disabled={loading} className="w-full">
              {loading ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Organizando sesión...</>
              ) : (
                <><Sparkles className="h-4 w-4 mr-2" /> Preparar sesión de grabación</>
              )}
            </Button>
          </div>

          {/* Shooting Plan Result */}
          {shootingPlan && (
            <>
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Clapperboard className="h-5 w-5 text-primary" />
                    Plan de grabación
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
                        {shootingPlan.reels.map((reel, idx) => (
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

              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-lg">Planos extra de apoyo</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {shootingPlan.planosApoyo.map((p, i) => (
                      <div key={i} className="bg-secondary/50 rounded-lg px-3 py-2 text-sm text-muted-foreground">{p}</div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}
    </div>
  );
}

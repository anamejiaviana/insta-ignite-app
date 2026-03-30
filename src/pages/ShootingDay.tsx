import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useClients } from "@/contexts/ClientContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Sparkles, Camera, Clapperboard, Lightbulb, CalendarDays, Copy, Check, Video, Eye, Move, Clock, Zap, RotateCcw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

interface StoryboardStep {
  paso: number;
  nombre: string;
  descripcion: string;
  tipo_plano: string;
  movimiento: string;
  duracion_segundos: number;
  texto_pantalla: string | null;
}

interface ShootingReelDetailed {
  reel: string;
  hook: string;
  storyboard: StoryboardStep[];
  textos_pantalla: string[];
  duracion: string;
  orden_grabacion: number;
}

interface PlanoApoyo {
  nombre: string;
  descripcion: string;
  tipo_plano: string;
  uso: string;
}

interface ShootingPlanData {
  reels: ShootingReelDetailed[];
  planosApoyo: PlanoApoyo[] | string[];
  orden_sesion: string[];
}

interface CustomIdeaPlan {
  hook: string;
  storyboard: StoryboardStep[];
  shots: string[];
  textos_pantalla: string[];
  orden_grabacion: string[];
  duracion_estimada: string;
  caption: string;
  hashtags: string[];
}

interface OptimizedContentItem {
  tipo: string;
  idea: string;
  hook: string;
  planos_necesarios: string[];
}

interface PlanoReutilizable {
  nombre: string;
  descripcion: string;
  tipo_plano: string;
  reutilizado_en: string[];
}

interface OptimizedPlanData {
  contenidos: OptimizedContentItem[];
  planos_reutilizables: PlanoReutilizable[];
  orden_grabacion: string[];
  total_planos: number;
  duracion_estimada: string;
  resumen: string;
}

type Mode = "calendar" | "custom" | "optimize";

export default function ShootingDay() {
  const { activeClient } = useClients();
  const { t } = useLanguage();
  const { toast } = useToast();
  const [mode, setMode] = useState<Mode>("calendar");
  const [latestPlan, setLatestPlan] = useState<any>(null);
  const [numDays, setNumDays] = useState(1);
  const [shootingPlan, setShootingPlan] = useState<ShootingPlanData | null>(null);
  const [customIdea, setCustomIdea] = useState("");
  const [customPlan, setCustomPlan] = useState<CustomIdeaPlan | null>(null);
  const [optimizedPlan, setOptimizedPlan] = useState<OptimizedPlanData | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState(true);
  const [copiedCaption, setCopiedCaption] = useState(false);

  useEffect(() => {
    loadLatestWeeklyPlan();
  }, [activeClient]);

  const loadLatestWeeklyPlan = async () => {
    setLoadingPlan(true);
    if (!activeClient) { setLoadingPlan(false); return; }
    const { data } = await (supabase as any)
      .from("weekly_plans")
      .select("*")
      .eq("client_id", activeClient.id)
      .order("created_at", { ascending: false })
      .limit(1);
    setLatestPlan(data?.[0] || null);
    setLoadingPlan(false);
  };

  const getClientBody = () => ({
    name: activeClient!.name,
    type: activeClient!.type,
    city: activeClient!.city,
    address: activeClient!.address,
    tone: activeClient!.tone,
    objective: activeClient!.objective,
    keywords: activeClient!.keywords,
  });

  const generateFromCalendar = async () => {
    if (!latestPlan) {
      toast({ variant: "destructive", title: t("noWeeklyPlanToast") });
      return;
    }
    setLoading(true);
    try {
      const reels = latestPlan.plan_data?.reels || [];
      const { data, error } = await supabase.functions.invoke("generate-shooting-plan", {
        body: {
          client: getClientBody(),
          existingReels: reels,
          numDays,
          language: activeClient!.content_language || "es",
        },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      setShootingPlan(data);

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
      toast({ title: t("shootingPlanGenerated") });
    } catch (error: any) {
      toast({ variant: "destructive", title: t("errorGeneratingShootingPlan"), description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const generateFromIdea = async () => {
    if (!customIdea.trim()) {
      toast({ variant: "destructive", title: t("writeIdeaFirst") });
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-shooting-plan", {
        body: {
          client: getClientBody(),
          customIdea: customIdea.trim(),
          language: activeClient!.content_language || "es",
        },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      setCustomPlan(data);

      const user = (await supabase.auth.getUser()).data.user;
      if (user) {
        await (supabase as any).from("shooting_plans").insert({
          user_id: user.id,
          client_id: activeClient!.id,
          num_days: 1,
          plan_data: { ...data, customIdea: customIdea.trim() },
        });
      }
      toast({ title: t("shootingPlanGenerated") });
    } catch (error: any) {
      toast({ variant: "destructive", title: t("errorGeneratingShootingPlan"), description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const generateOptimized = async () => {
    if (!latestPlan) {
      toast({ variant: "destructive", title: t("noWeeklyPlanToast") });
      return;
    }
    setLoading(true);
    try {
      const planData = latestPlan.plan_data;
      const allContent = [
        ...(planData.reels || []),
        ...(planData.posts || (planData.post ? [planData.post] : [])),
      ];
      const stories = planData.stories || [];

      const { data, error } = await supabase.functions.invoke("generate-shooting-plan", {
        body: {
          client: getClientBody(),
          optimizeMode: true,
          allContent,
          stories,
          language: activeClient!.content_language || "es",
        },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      setOptimizedPlan(data);

      const user = (await supabase.auth.getUser()).data.user;
      if (user) {
        await (supabase as any).from("shooting_plans").insert({
          user_id: user.id,
          client_id: activeClient!.id,
          weekly_plan_id: latestPlan.id,
          num_days: 1,
          plan_data: { ...data, mode: "optimize" },
        });
      }
      toast({ title: t("optimizedPlanGenerated") });
    } catch (error: any) {
      toast({ variant: "destructive", title: t("errorGeneratingShootingPlan"), description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const copyText = async (text: string) => {
    const { copyToClipboard } = await import("@/lib/clipboard");
    await copyToClipboard(text);
    setCopiedCaption(true);
    setTimeout(() => setCopiedCaption(false), 2000);
  };

  const reelsFromPlan = latestPlan?.plan_data?.reels || [];

  if (!activeClient) {
    return (
      <div className="max-w-4xl mx-auto animate-fade-in">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Día de grabación</h1>
        </div>
        <div className="glass rounded-2xl p-12 text-center">
          <Camera className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">{t("selectClient")}</h3>
          <p className="text-muted-foreground text-sm">{t("goToSettings")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">{t("shootingDay")}</h1>
        <p className="text-muted-foreground mt-1">
          {t("sessionFor")} <span className="text-primary font-medium">{activeClient.name}</span>
        </p>
      </div>

      {/* Mode selector */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setMode("calendar")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
            mode === "calendar"
              ? "text-primary-foreground"
              : "bg-secondary text-muted-foreground hover:text-foreground"
          }`}
          style={mode === "calendar" ? { background: "var(--gradient-primary)" } : undefined}
        >
          <CalendarDays className="h-4 w-4" />
          {t("fromWeeklyPlan")}
        </button>
        <button
          onClick={() => setMode("custom")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
            mode === "custom"
              ? "text-primary-foreground"
              : "bg-secondary text-muted-foreground hover:text-foreground"
          }`}
          style={mode === "custom" ? { background: "var(--gradient-primary)" } : undefined}
        >
          <Lightbulb className="h-4 w-4" />
          {t("fromIdea")}
        </button>
        <button
          onClick={() => setMode("optimize")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
            mode === "optimize"
              ? "text-primary-foreground"
              : "bg-secondary text-muted-foreground hover:text-foreground"
          }`}
          style={mode === "optimize" ? { background: "var(--gradient-primary)" } : undefined}
        >
          <Zap className="h-4 w-4" />
          {t("optimizeRecording")}
        </button>
      </div>

      {/* MODE 1: From weekly calendar */}
      {mode === "calendar" && (
        <>
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
                <Button variant="gradient" onClick={generateFromCalendar} disabled={loading} className="w-full">
                  {loading ? (
                    <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Organizando sesión...</>
                  ) : (
                    <><Sparkles className="h-4 w-4 mr-2" /> Preparar sesión de grabación</>
                  )}
                </Button>
              </div>

              {/* MODE 1 RESULTS */}
              {shootingPlan && (
                <CalendarShootingResults plan={shootingPlan} />
              )}
            </div>
          )}
        </>
      )}

      {/* MODE 2: From a custom idea */}
      {mode === "custom" && (
        <div className="space-y-6">
          <div className="glass rounded-2xl p-6 space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Describe el contenido que quieres grabar</Label>
              <Textarea
                value={customIdea}
                onChange={(e) => setCustomIdea(e.target.value)}
                placeholder="Ej: Unboxing mesa de comedor, Instalación de cocina, Preparación de plato especial, Presentación de producto..."
                className="min-h-[100px]"
              />
            </div>
            <Button variant="gradient" onClick={generateFromIdea} disabled={loading || !customIdea.trim()} className="w-full">
              {loading ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Generando plan...</>
              ) : (
                <><Sparkles className="h-4 w-4 mr-2" /> Generar plan de grabación</>
              )}
            </Button>
          </div>

          {/* MODE 2 RESULTS */}
          {customPlan && (
            <CustomShootingResults plan={customPlan} onCopy={copyText} copied={copiedCaption} />
          )}
        </div>
      )}

      {/* MODE 3: Optimize recording */}
      {mode === "optimize" && (
        <>
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
                Primero genera tu plan de contenido semanal desde el Dashboard.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <Card className="bg-card border-border">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "var(--gradient-primary)" }}>
                      <Zap className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold mb-1">Optimizar grabación de la semana</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Analiza todo el contenido planificado en tu calendario, identifica planos reutilizables y crea un plan de grabación eficiente.
                      </p>
                      <Button variant="gradient" onClick={generateOptimized} disabled={loading} className="w-full">
                        {loading ? (
                          <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Optimizando sesión...</>
                        ) : (
                          <><Zap className="h-4 w-4 mr-2" /> Optimizar grabación de la semana</>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {optimizedPlan && <OptimizedResults plan={optimizedPlan} />}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ───────── MODE 3 RESULTS: OPTIMIZED ───────── */
function OptimizedResults({ plan }: { plan: OptimizedPlanData }) {
  return (
    <div className="space-y-6">
      {/* Summary */}
      <Card className="bg-card border-border">
        <CardContent className="p-5">
          <div className="flex items-center gap-3 mb-3">
            <Clock className="h-5 w-5 text-primary" />
            <p className="text-sm font-medium">{plan.resumen}</p>
          </div>
          <div className="flex gap-4 text-sm text-muted-foreground">
            <span><strong className="text-foreground">{plan.total_planos}</strong> planos totales</span>
            <span><strong className="text-foreground">{plan.planos_reutilizables?.length || 0}</strong> reutilizables</span>
            <span>⏱ <strong className="text-foreground">{plan.duracion_estimada}</strong></span>
          </div>
        </CardContent>
      </Card>

      {/* Content items */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clapperboard className="h-5 w-5 text-primary" />
            Plan de sesión
          </CardTitle>
          <p className="text-xs text-muted-foreground">Contenido a grabar en esta sesión</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {plan.contenidos?.map((item, idx) => (
            <div key={idx} className="p-4 rounded-lg bg-secondary/50 space-y-2">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full uppercase ${
                  item.tipo === "reel" ? "bg-blue-500/20 text-blue-400" : "bg-green-500/20 text-green-400"
                }`}>
                  {item.tipo}
                </span>
                <span className="font-semibold text-sm">{item.idea}</span>
              </div>
              <p className="text-xs text-primary font-medium">🎬 "{item.hook}"</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {item.planos_necesarios?.map((p, i) => (
                  <span key={i} className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full">{p}</span>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Reusable shots */}
      {plan.planos_reutilizables && plan.planos_reutilizables.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-primary" />
              Planos reutilizables
            </CardTitle>
            <p className="text-xs text-muted-foreground">Graba estos planos una sola vez y úsalos en varios contenidos</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {plan.planos_reutilizables.map((p, i) => (
                <div key={i} className="bg-secondary/50 rounded-lg px-4 py-3 space-y-1.5">
                  <p className="text-sm font-medium">{p.nombre}</p>
                  <p className="text-xs text-muted-foreground">{p.descripcion}</p>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="outline" className="text-[10px]">📷 {p.tipo_plano}</Badge>
                    {p.reutilizado_en?.map((uso, j) => (
                      <Badge key={j} variant="outline" className="text-[10px] text-primary border-primary/30">{uso}</Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recording order */}
      {plan.orden_grabacion && plan.orden_grabacion.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Move className="h-5 w-5 text-primary" />
              Orden de grabación optimizado
            </CardTitle>
            <p className="text-xs text-muted-foreground">Sigue estos pasos para una sesión eficiente</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {plan.orden_grabacion.map((paso, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50">
                  <div className="flex-shrink-0 h-7 w-7 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">
                    {i + 1}
                  </div>
                  <p className="text-sm pt-1">{paso}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* ───────── MODE 1 RESULTS ───────── */
function CalendarShootingResults({ plan }: { plan: ShootingPlanData }) {
  return (
    <div className="space-y-6">
      {/* Reels with detailed storyboards */}
      {plan.reels.map((reel, idx) => (
        <Card key={idx} className="bg-card border-border">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Clapperboard className="h-5 w-5 text-primary" />
                {reel.reel}
              </CardTitle>
              <div className="flex items-center gap-2">
                {reel.orden_grabacion && (
                  <Badge variant="outline" className="text-xs">
                    Orden: {reel.orden_grabacion}
                  </Badge>
                )}
                <Badge variant="secondary" className="text-xs">
                  <Clock className="h-3 w-3 mr-1" />
                  {reel.duracion}
                </Badge>
              </div>
            </div>
            <p className="text-primary font-medium mt-1">🎬 "{reel.hook}"</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Storyboard */}
            {reel.storyboard && reel.storyboard.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Storyboard</h4>
                <div className="space-y-3">
                  {reel.storyboard.map((step, i) => (
                    <StoryboardStepCard key={i} step={step} />
                  ))}
                </div>
              </div>
            )}

            {/* On-screen text */}
            {reel.textos_pantalla && reel.textos_pantalla.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Eye className="h-3.5 w-3.5" /> Textos en pantalla
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {reel.textos_pantalla.map((t, i) => (
                    <div key={i} className="bg-secondary/50 rounded-lg px-3 py-2 text-sm font-medium text-center">
                      "{t}"
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {/* Session order */}
      {plan.orden_sesion && plan.orden_sesion.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Move className="h-5 w-5 text-primary" />
              Orden de la sesión
            </CardTitle>
            <p className="text-xs text-muted-foreground">Sigue estos pasos para una grabación eficiente</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {plan.orden_sesion.map((paso, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50">
                  <div className="flex-shrink-0 h-7 w-7 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">
                    {i + 1}
                  </div>
                  <p className="text-sm pt-1">{paso}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Support shots */}
      {plan.planosApoyo && plan.planosApoyo.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Video className="h-5 w-5 text-primary" />
              Planos extra de apoyo
            </CardTitle>
            <p className="text-xs text-muted-foreground">Graba estos planos adicionales para enriquecer tus reels</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {plan.planosApoyo.map((p, i) => {
                if (typeof p === "string") {
                  return (
                    <div key={i} className="bg-secondary/50 rounded-lg px-4 py-3 text-sm text-muted-foreground">{p}</div>
                  );
                }
                const plano = p as PlanoApoyo;
                return (
                  <div key={i} className="bg-secondary/50 rounded-lg px-4 py-3 space-y-1">
                    <p className="text-sm font-medium">{plano.nombre}</p>
                    <p className="text-xs text-muted-foreground">{plano.descripcion}</p>
                    <div className="flex gap-2 mt-1">
                      <Badge variant="outline" className="text-[10px]">{plano.tipo_plano}</Badge>
                      <Badge variant="outline" className="text-[10px] text-primary border-primary/30">{plano.uso}</Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* ───────── MODE 2 RESULTS ───────── */
function CustomShootingResults({ plan, onCopy, copied }: { plan: CustomIdeaPlan; onCopy: (t: string) => void; copied: boolean }) {
  return (
    <div className="space-y-6">
      {/* Hook */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clapperboard className="h-5 w-5 text-primary" />
            Hook
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-primary font-medium text-lg">"{plan.hook}"</p>
        </CardContent>
      </Card>

      {/* Storyboard */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg">Storyboard detallado</CardTitle>
          <p className="text-xs text-muted-foreground">Cada paso describe exactamente qué grabar</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {plan.storyboard.map((step, idx) => (
              <StoryboardStepCard key={idx} step={step} />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Shots list */}
      {plan.shots && plan.shots.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg">Lista de planos</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1.5">
              {plan.shots.map((s, i) => (
                <li key={i} className="text-sm text-muted-foreground flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                  {s}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* On-screen text */}
      {plan.textos_pantalla && plan.textos_pantalla.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" /> Textos en pantalla
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {plan.textos_pantalla.map((t, i) => (
                <div key={i} className="bg-secondary/50 rounded-lg px-3 py-2 text-sm font-medium text-center">
                  "{t}"
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recording order */}
      {plan.orden_grabacion && plan.orden_grabacion.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Move className="h-5 w-5 text-primary" /> Orden de grabación
            </CardTitle>
            <p className="text-xs text-muted-foreground">Orden óptimo para grabar (puede diferir del orden final del reel)</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {plan.orden_grabacion.map((paso, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50">
                  <div className="flex-shrink-0 h-7 w-7 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">
                    {i + 1}
                  </div>
                  <p className="text-sm pt-1">{paso}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Duration + Caption + Hashtags */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg">Caption y hashtags</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span className="font-medium text-foreground">Duración estimada:</span>
            {plan.duracion_estimada}
          </div>
          <div className="relative">
            <p className="text-sm bg-secondary/50 rounded-lg p-3 pr-10">{plan.caption}</p>
            <button
              onClick={() => onCopy(plan.caption + "\n\n" + plan.hashtags.map(h => `#${h}`).join(" "))}
              className="absolute top-2 right-2 p-1.5 rounded-md hover:bg-secondary"
            >
              {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4 text-muted-foreground" />}
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {plan.hashtags.map((h, i) => (
              <span key={i} className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">#{h}</span>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ───────── SHARED STORYBOARD STEP CARD ───────── */
function StoryboardStepCard({ step }: { step: StoryboardStep }) {
  return (
    <div className="flex gap-4 p-4 rounded-lg bg-secondary/50">
      <div className="flex-shrink-0 h-9 w-9 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm font-bold">
        {step.paso}
      </div>
      <div className="flex-1 space-y-1.5">
        {step.nombre && (
          <p className="text-sm font-semibold">{step.nombre}</p>
        )}
        <p className="text-sm text-muted-foreground">{step.descripcion}</p>
        <div className="flex flex-wrap gap-2 mt-1.5">
          <Badge variant="outline" className="text-[10px]">
            📷 {step.tipo_plano}
          </Badge>
          {step.movimiento && (
            <Badge variant="outline" className="text-[10px]">
              🎥 {step.movimiento}
            </Badge>
          )}
          <Badge variant="outline" className="text-[10px] text-primary border-primary/30">
            ⏱ {step.duracion_segundos}s
          </Badge>
        </div>
        {step.texto_pantalla && (
          <p className="text-xs bg-primary/10 text-primary px-2 py-1 rounded mt-1 inline-block">
            📝 "{step.texto_pantalla}"
          </p>
        )}
      </div>
    </div>
  );
}

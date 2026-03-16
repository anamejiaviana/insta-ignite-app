import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useClients } from "@/contexts/ClientContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Sparkles, Calendar, CheckCircle2, Pencil, ChevronLeft, ChevronRight, Film, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
  imagePrompt?: string;
}

interface StoredPlan {
  id: string;
  week_start: string;
  plan_data: {
    reels: WeeklyPlanItem[];
    post?: WeeklyPlanItem;
    posts?: WeeklyPlanItem[];
    stories: { idea: string; tipo: string }[];
  };
  created_at: string;
}

export default function ContentCalendar() {
  const { activeClient } = useClients();
  const { t } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [plans, setPlans] = useState<StoredPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlanIndex, setSelectedPlanIndex] = useState(0);
  const [generatedTitles, setGeneratedTitles] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadPlans();
  }, [activeClient]);

  useEffect(() => {
    if (activeClient) loadGeneratedPosts();
  }, [activeClient]);

  const loadPlans = async () => {
    setLoading(true);
    let query = (supabase as any)
      .from("weekly_plans")
      .select("*")
      .order("week_start", { ascending: false })
      .limit(50);

    if (activeClient) {
      query = query.eq("client_id", activeClient.id);
    }

    const { data } = await query;
    if (data) {
      setPlans(data);
      setSelectedPlanIndex(0);
    }
    setLoading(false);
  };

  const loadGeneratedPosts = async () => {
    const { data } = await (supabase as any)
      .from("generated_posts")
      .select("title")
      .eq("client_id", activeClient!.id);
    if (data) {
      setGeneratedTitles(new Set(data.map((p: any) => p.title?.toLowerCase().trim())));
    }
  };

  const isGenerated = (item: WeeklyPlanItem) => {
    return generatedTitles.has(item.idea?.toLowerCase().trim());
  };

  const generateContent = (item: WeeklyPlanItem) => {
    navigate("/create", {
      state: {
        fromCalendar: true,
        planId: selectedPlan?.id,
        prefill: {
          title: item.idea,
          postType: item.type,
          description: item.script,
          hook: item.hook,
          shots: item.shots,
          caption: item.caption,
          hashtags: item.hashtags,
          imagePrompt: item.imagePrompt,
        },
      },
    });
  };

  const selectedPlan = plans[selectedPlanIndex] || null;
  const planData = selectedPlan?.plan_data;
  const allItems = planData
    ? [
        ...(planData.reels || []),
        ...(planData.posts || (planData.post ? [planData.post] : [])),
      ]
    : [];

  const canGoPrev = selectedPlanIndex > 0;
  const canGoNext = selectedPlanIndex < plans.length - 1;

  const goToPrevWeek = () => {
    if (canGoPrev) setSelectedPlanIndex(selectedPlanIndex - 1);
  };

  const goToNextWeek = () => {
    if (canGoNext) setSelectedPlanIndex(selectedPlanIndex + 1);
  };

  const formatWeekLabel = (plan: StoredPlan) => {
    const start = new Date(plan.week_start);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return `${start.toLocaleDateString("es-ES", { day: "numeric", month: "short" })} – ${end.toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })}`;
  };

  const typeColors: Record<string, string> = {
    reel: "bg-blue-500/20 text-blue-400",
    post: "bg-green-500/20 text-green-400",
  };

  return (
    <div className="max-w-5xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">{t("calendar")}</h1>
          {activeClient && (
            <p className="text-muted-foreground mt-1">
              {t("plans")}{" "}
              <span className="text-primary font-medium">{activeClient.name}</span>
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate("/strategy/reels")}>
            <Film className="h-4 w-4 mr-1" /> {t("reelIdeas")}
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate("/strategy/hooks")}>
            <Zap className="h-4 w-4 mr-1" /> {t("hooks")}
          </Button>
          <Button variant="gradient" onClick={() => navigate("/")} size="sm">
            <Sparkles className="h-4 w-4 mr-2" />
            {t("generateWeeklyPlanBtn")}
          </Button>
        </div>
      </div>

      {loading && (
        <div className="glass rounded-2xl p-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Cargando planes...</p>
        </div>
      )}

      {!loading && plans.length === 0 && (
        <div className="glass rounded-2xl p-12 text-center">
          <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Sin planes aún</h3>
          <p className="text-muted-foreground text-sm max-w-md mx-auto mb-4">
            Genera tu primer plan semanal desde el Dashboard.
          </p>
          <Button variant="gradient" onClick={() => navigate("/")}>
            Ir al Dashboard
          </Button>
        </div>
      )}

      {!loading && plans.length > 0 && selectedPlan && (
        <div className="space-y-6">
          {/* Week navigator */}
          <div className="flex items-center justify-between glass rounded-xl px-4 py-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={goToNextWeek}
              disabled={!canGoNext}
              className="gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              Semana anterior
            </Button>
            <div className="text-center">
              <p className="font-semibold text-sm">{formatWeekLabel(selectedPlan)}</p>
              <p className="text-[10px] text-muted-foreground">
                Creado el {new Date(selectedPlan.created_at).toLocaleDateString("es-ES")}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={goToPrevWeek}
              disabled={!canGoPrev}
              className="gap-1"
            >
              Semana siguiente
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Plan selector if many plans for same period */}
          {plans.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {plans.map((plan, idx) => (
                <button
                  key={plan.id}
                  onClick={() => setSelectedPlanIndex(idx)}
                  className={`shrink-0 text-left px-3 py-2 rounded-lg text-xs transition-all ${
                    selectedPlanIndex === idx
                      ? "bg-primary/10 text-primary font-medium border border-primary/20"
                      : "bg-secondary/50 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Semana {new Date(plan.week_start).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}
                </button>
              ))}
            </div>
          )}

          {/* Content items */}
          <div className="space-y-4">
            {allItems.map((item, idx) => {
              const generated = isGenerated(item);
              return (
                <Card key={idx} className="bg-card border-border">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full uppercase ${typeColors[item.type] || "bg-secondary text-muted-foreground"}`}>
                            {item.type}
                          </span>
                          <span className="text-xs text-muted-foreground">{item.day}</span>
                          {generated && (
                            <Badge variant="outline" className="text-[10px] text-green-500 border-green-500/30 gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              generado
                            </Badge>
                          )}
                        </div>
                        <p className="font-semibold text-sm mb-1">{item.idea}</p>
                        <p className="text-xs text-primary font-medium mb-2">🎬 "{item.hook}"</p>
                        <p className="text-xs text-muted-foreground">{item.script}</p>
                        {item.shots && item.shots.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {item.shots.map((s, i) => (
                              <span key={i} className="text-[10px] bg-secondary px-2 py-0.5 rounded-full text-muted-foreground">{s}</span>
                            ))}
                          </div>
                        )}
                      </div>
                      <Button
                        variant={generated ? "outline" : "outline"}
                        size="sm"
                        onClick={() => generateContent(item)}
                        className="shrink-0"
                      >
                        {generated ? (
                          <><Pencil className="h-3.5 w-3.5 mr-1" /> Editar contenido</>
                        ) : (
                          <><Sparkles className="h-3.5 w-3.5 mr-1" /> Generar este contenido</>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {/* Stories */}
            {planData?.stories && planData.stories.length > 0 && (
              <Card className="bg-card border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Ideas de Stories</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    {planData.stories.map((story, idx) => (
                      <div key={idx} className="flex items-center gap-3 text-sm">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 shrink-0">{story.tipo}</span>
                        <span className="text-muted-foreground">{story.idea}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

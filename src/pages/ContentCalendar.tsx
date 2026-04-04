import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useClients } from "@/contexts/ClientContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Sparkles, Calendar, CheckCircle2, Circle, Pencil, ChevronLeft, ChevronRight, Film, Zap } from "lucide-react";
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
    carousels?: WeeklyPlanItem[];
    stories: { idea: string; tipo: string; text?: string }[];
    completed_items?: string[];
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

  useEffect(() => {
    loadPlans();
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

  const selectedPlan = plans[selectedPlanIndex] || null;
  const planData = selectedPlan?.plan_data;
  const completedItems = new Set(planData?.completed_items || []);

  const toggleCompleted = useCallback(async (itemKey: string) => {
    if (!selectedPlan) return;

    const current = new Set(selectedPlan.plan_data.completed_items || []);
    if (current.has(itemKey)) {
      current.delete(itemKey);
    } else {
      current.add(itemKey);
    }

    const newCompletedItems = Array.from(current);
    const updatedPlanData = { ...selectedPlan.plan_data, completed_items: newCompletedItems };

    // Optimistic update
    setPlans(prev => prev.map((p, i) =>
      i === selectedPlanIndex ? { ...p, plan_data: updatedPlanData } : p
    ));

    const { error } = await (supabase as any)
      .from("weekly_plans")
      .update({ plan_data: updatedPlanData as any })
      .eq("id", selectedPlan.id);

    if (error) {
      console.error("Failed to save completion state:", error);
      // Revert optimistic update on failure
      setPlans(prev => prev.map((p, i) =>
        i === selectedPlanIndex ? { ...p, plan_data: selectedPlan.plan_data } : p
      ));
      toast({
        title: "Error",
        description: "No se pudo guardar el estado. Inténtalo de nuevo.",
        variant: "destructive",
      });
    }
  }, [selectedPlan, selectedPlanIndex]);

  const allItems = planData
    ? [
        ...(planData.reels || []).map((item: WeeklyPlanItem, i: number) => ({ ...item, type: "reel", _key: `reel-${i}` })),
        ...(planData.posts || (planData.post ? [planData.post] : [])).map((item: WeeklyPlanItem, i: number) => ({ ...item, type: "post", _key: `post-${i}` })),
        ...(planData.carousels || []).map((item: WeeklyPlanItem, i: number) => ({ ...item, type: "carousel", _key: `carousel-${i}` })),
      ]
    : [];

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

  const canGoPrev = selectedPlanIndex > 0;
  const canGoNext = selectedPlanIndex < plans.length - 1;

  const formatWeekLabel = (plan: StoredPlan) => {
    const start = new Date(plan.week_start);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    const locale = "es-ES";
    return `${t("mondayShort")} ${start.toLocaleDateString(locale, { day: "numeric", month: "short" })} – ${t("sundayShort")} ${end.toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" })}`;
  };

  // Progress calculation
  const storyCount = planData?.stories?.length || 0;
  const totalItems = allItems.length + storyCount;
  const completedCount = allItems.filter(i => completedItems.has(i._key)).length
    + (planData?.stories || []).filter((_: any, i: number) => completedItems.has(`story-${i}`)).length;
  const progressPercent = totalItems > 0 ? Math.round((completedCount / totalItems) * 100) : 0;

  const typeColors: Record<string, string> = {
    reel: "bg-blue-500/20 text-blue-400",
    post: "bg-green-500/20 text-green-400",
    carousel: "bg-amber-500/20 text-amber-400",
    carrusel: "bg-amber-500/20 text-amber-400",
    story: "bg-purple-500/20 text-purple-400",
  };

  return (
    <div className="max-w-5xl mx-auto animate-fade-in px-1 sm:px-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">{t("calendar")}</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {t("calendarSubtitle")}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
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
          <p className="text-muted-foreground">{t("loadingPlans")}</p>
        </div>
      )}

      {!loading && plans.length === 0 && (
        <div className="glass rounded-2xl p-12 text-center">
          <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">{t("noPlansYet")}</h3>
          <p className="text-muted-foreground text-sm max-w-md mx-auto mb-4">
            {t("generateFirstPlan")}
          </p>
          <Button variant="gradient" onClick={() => navigate("/")}>
            {t("goToDashboard")}
          </Button>
        </div>
      )}

      {!loading && plans.length > 0 && selectedPlan && (
        <div className="space-y-6">
          {/* Week navigator */}
          <div className="flex items-center justify-between glass rounded-xl px-2 sm:px-4 py-3 gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => canGoNext && setSelectedPlanIndex(selectedPlanIndex + 1)}
              disabled={!canGoNext}
              className="gap-1 px-1 sm:px-3"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline">{t("previousWeek")}</span>
            </Button>
            <div className="text-center min-w-0 flex-1">
              <p className="font-semibold text-xs sm:text-sm truncate">{formatWeekLabel(selectedPlan)}</p>
              <p className="text-[10px] text-muted-foreground">
                {t("createdOn")} {new Date(selectedPlan.created_at).toLocaleDateString("es-ES")}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => canGoPrev && setSelectedPlanIndex(selectedPlanIndex - 1)}
              disabled={!canGoPrev}
              className="gap-1 px-1 sm:px-3"
            >
              <span className="hidden sm:inline">{t("nextWeek")}</span>
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

          {/* Weekly progress */}
          {totalItems > 0 && (
            <div className="glass rounded-xl px-4 py-3 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground font-medium capitalize">{t("weekProgress")}</span>
                <span className={completedCount === totalItems ? "text-green-500 font-medium" : "text-muted-foreground"}>
                  {completedCount === totalItems
                    ? t("allCompleted")
                    : `${completedCount} ${t("completedOf")} ${totalItems}`}
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-secondary overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500 ease-out"
                  style={{
                    width: `${progressPercent}%`,
                    background: completedCount === totalItems ? "hsl(var(--chart-2))" : "hsl(var(--primary))",
                  }}
                />
              </div>
            </div>
          )}

          {/* Content items */}
          <div className="space-y-4">
            {allItems.map((item) => {
              const isCompleted = completedItems.has(item._key);
              return (
                <Card key={item._key} className={`bg-card border-border transition-opacity ${isCompleted ? "opacity-70" : ""}`}>
                  <CardContent className="p-3 sm:p-5">
                    <div className="flex items-start gap-3 sm:gap-4">
                      {/* Completion toggle */}
                      <button
                        onClick={() => toggleCompleted(item._key)}
                        className="mt-0.5 shrink-0 transition-colors"
                        title={isCompleted ? t("unmarkCompleted") : t("markAsCompleted")}
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        ) : (
                          <Circle className="h-5 w-5 text-muted-foreground/40 hover:text-muted-foreground" />
                        )}
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full uppercase ${typeColors[item.type] || "bg-secondary text-muted-foreground"}`}>
                            {item.type}
                          </span>
                          <span className="text-xs text-muted-foreground">{item.day}</span>
                          {isCompleted && (
                            <Badge variant="outline" className="text-[10px] text-green-500 border-green-500/30 gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              {t("completed")}
                            </Badge>
                          )}
                        </div>
                        <p className={`font-semibold text-sm mb-1 ${isCompleted ? "line-through text-muted-foreground" : ""}`}>{item.idea}</p>
                        <p className="text-xs text-primary font-medium mb-2 break-words">🎬 "{item.hook}"</p>
                        <p className="text-xs text-muted-foreground break-words">{item.script}</p>
                        {item.shots && item.shots.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {item.shots.map((s: string, i: number) => (
                              <span key={i} className="text-[10px] bg-secondary px-2 py-0.5 rounded-full text-muted-foreground">{s}</span>
                            ))}
                          </div>
                        )}
                        <div className="mt-3 sm:hidden">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => generateContent(item)}
                            className="w-full"
                          >
                            {isCompleted ? (
                              <><Pencil className="h-3.5 w-3.5 mr-1" /> {t("editContent")}</>
                            ) : (
                              <><Sparkles className="h-3.5 w-3.5 mr-1" /> {t("generateThisContent")}</>
                            )}
                          </Button>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => generateContent(item)}
                        className="shrink-0 hidden sm:inline-flex"
                      >
                        {isCompleted ? (
                          <><Pencil className="h-3.5 w-3.5 mr-1" /> {t("editContent")}</>
                        ) : (
                          <><Sparkles className="h-3.5 w-3.5 mr-1" /> {t("generateThisContent")}</>
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
                  <CardTitle className="text-sm font-medium">{t("storiesIdeas")}</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    {planData.stories.map((story, idx) => {
                      const storyKey = `story-${idx}`;
                      const isStoryCompleted = completedItems.has(storyKey);
                      return (
                        <div key={idx} className={`space-y-1 transition-opacity ${isStoryCompleted ? "opacity-70" : ""}`}>
                          <div className="flex items-center gap-3 text-sm">
                            <button
                              onClick={() => toggleCompleted(storyKey)}
                              className="shrink-0 transition-colors"
                              title={isStoryCompleted ? t("unmarkCompleted") : t("markAsCompleted")}
                            >
                              {isStoryCompleted ? (
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                              ) : (
                                <Circle className="h-4 w-4 text-muted-foreground/40 hover:text-muted-foreground" />
                              )}
                            </button>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 shrink-0">{story.tipo}</span>
                            <span className={`text-muted-foreground ${isStoryCompleted ? "line-through" : ""}`}>{story.idea}</span>
                            {isStoryCompleted && (
                              <Badge variant="outline" className="text-[10px] text-green-500 border-green-500/30 gap-1 ml-auto">
                                <CheckCircle2 className="h-3 w-3" />
                              </Badge>
                            )}
                          </div>
                          {story.text && (
                            <p className="text-xs text-muted-foreground/70 ml-7 pl-1 border-l-2 border-purple-500/20">
                              {story.text}
                            </p>
                          )}
                        </div>
                      );
                    })}
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

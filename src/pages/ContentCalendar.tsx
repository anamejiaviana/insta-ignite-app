import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useClients } from "@/contexts/ClientContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, Sparkles, Calendar, CheckCircle2, Circle, Pencil,
  ChevronLeft, ChevronRight, Film, Zap, Archive, ChevronDown,
  ChevronUp, Image, LayoutGrid, MessageSquare, Play,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

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

interface PlanMeta {
  id: string;
  week_start: string;
  created_at: string;
  is_archived: boolean;
}

interface StoredPlanData {
  reels: WeeklyPlanItem[];
  post?: WeeklyPlanItem;
  posts?: WeeklyPlanItem[];
  carousels?: WeeklyPlanItem[];
  stories: { idea: string; tipo: string; text?: string; day?: string }[];
  completed_items?: string[];
}

type EnrichedItem = WeeklyPlanItem & { type: string; _key: string; _dayIndex: number };
type EnrichedStory = { idea: string; tipo: string; text?: string; _key: string; _dayIndex: number };

// Map day names (Spanish/Catalan) to 0-6 index (Mon-Sun)
const DAY_MAP: Record<string, number> = {
  lunes: 0, dilluns: 0,
  martes: 1, dimarts: 1,
  miércoles: 2, miercoles: 2, dimecres: 2,
  jueves: 3, dijous: 3,
  viernes: 4, divendres: 4,
  sábado: 5, sabado: 5, dissabte: 5,
  domingo: 6, diumenge: 6,
  monday: 0, tuesday: 1, wednesday: 2, thursday: 3, friday: 4, saturday: 5, sunday: 6,
};

function getDayIndex(day: string): number {
  return DAY_MAP[day.toLowerCase().trim()] ?? 0;
}

const TYPE_CONFIG: Record<string, { icon: typeof Film; label: string; color: string; bgColor: string; borderColor: string }> = {
  reel: { icon: Play, label: "Reel", color: "text-blue-400", bgColor: "bg-blue-500/15", borderColor: "border-blue-500/30" },
  post: { icon: Image, label: "Post", color: "text-emerald-400", bgColor: "bg-emerald-500/15", borderColor: "border-emerald-500/30" },
  carousel: { icon: LayoutGrid, label: "Carousel", color: "text-amber-400", bgColor: "bg-amber-500/15", borderColor: "border-amber-500/30" },
  story: { icon: MessageSquare, label: "Story", color: "text-purple-400", bgColor: "bg-purple-500/15", borderColor: "border-purple-500/30" },
};

export default function ContentCalendar() {
  const { activeClient } = useClients();
  const { t } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const returnToPlanId = (location.state as any)?.returnToPlanId as string | undefined;
  const [activeMetas, setActiveMetas] = useState<PlanMeta[]>([]);
  const [archivedMetas, setArchivedMetas] = useState<PlanMeta[]>([]);
  const [selectedPlanData, setSelectedPlanData] = useState<StoredPlanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [selectedPlanIndex, setSelectedPlanIndex] = useState(0);
  const [showArchived, setShowArchived] = useState(false);

  useEffect(() => {
    loadPlanMetas();
  }, [activeClient]);

  const loadPlanMetas = async () => {
    setLoading(true);
    let query = (supabase as any)
      .from("weekly_plans")
      .select("id, week_start, created_at, is_archived")
      .order("week_start", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(20);

    if (activeClient) {
      query = query.eq("client_id", activeClient.id);
    }

    const { data } = await query;
    if (data) {
      const active = (data as PlanMeta[]).filter((p) => !p.is_archived);
      const archived = (data as PlanMeta[]).filter((p) => p.is_archived);
      setActiveMetas(active);
      setArchivedMetas(archived);

      const targetPlanId = returnToPlanId;
      if (targetPlanId) {
        const idx = active.findIndex((p) => p.id === targetPlanId);
        setSelectedPlanIndex(idx >= 0 ? idx : 0);
      } else {
        setSelectedPlanIndex(0);
      }
    }
    setLoading(false);
  };

  const selectedMeta = activeMetas[selectedPlanIndex] || null;

  useEffect(() => {
    if (!selectedMeta) {
      setSelectedPlanData(null);
      return;
    }
    loadSelectedPlanData(selectedMeta.id);
  }, [selectedMeta?.id]);

  const loadSelectedPlanData = async (planId: string) => {
    setLoadingDetail(true);
    const { data } = await (supabase as any)
      .from("weekly_plans")
      .select("plan_data")
      .eq("id", planId)
      .single();

    if (data) {
      setSelectedPlanData(data.plan_data);
    }
    setLoadingDetail(false);
  };

  const planData = selectedPlanData;
  const completedItems = new Set(planData?.completed_items || []);

  const toggleCompleted = useCallback(async (itemKey: string) => {
    if (!selectedMeta || !selectedPlanData) return;

    const current = new Set(selectedPlanData.completed_items || []);
    if (current.has(itemKey)) {
      current.delete(itemKey);
    } else {
      current.add(itemKey);
    }

    const newCompletedItems = Array.from(current);
    const updatedPlanData = { ...selectedPlanData, completed_items: newCompletedItems };
    const previousPlanData = selectedPlanData;

    setSelectedPlanData(updatedPlanData);

    const { error } = await (supabase as any)
      .from("weekly_plans")
      .update({ plan_data: updatedPlanData as any })
      .eq("id", selectedMeta.id);

    if (error) {
      console.error("Failed to save completion state:", error);
      setSelectedPlanData(previousPlanData);
      toast({
        title: "Error",
        description: "No se pudo guardar el estado. Inténtalo de nuevo.",
        variant: "destructive",
      });
    }
  }, [selectedMeta, selectedPlanData]);

  // Build enriched items with day index
  const allItems: EnrichedItem[] = planData
    ? [
        ...(planData.reels || []).map((item, i) => ({ ...item, type: "reel", _key: `reel-${i}`, _dayIndex: getDayIndex(item.day) })),
        ...(planData.posts || (planData.post ? [planData.post] : [])).map((item, i) => ({ ...item, type: "post", _key: `post-${i}`, _dayIndex: getDayIndex(item.day) })),
        ...(planData.carousels || []).map((item, i) => ({ ...item, type: "carousel", _key: `carousel-${i}`, _dayIndex: getDayIndex(item.day) })),
      ]
    : [];

  // Stories don't have a `day` field in plan data, so distribute them
  // across the week on days with least content to avoid piling on Monday.
  const allStories: EnrichedStory[] = (() => {
    if (!planData?.stories?.length) return [];
    const stories = planData.stories.map((s, i) => ({ ...s, _key: `story-${i}`, _dayIndex: -1 }));

    // If a story has an explicit day, use it
    stories.forEach(s => {
      const raw = (planData.stories.find((_, i) => `story-${i}` === s._key) as any)?.day;
      if (raw && DAY_MAP[raw.toLowerCase().trim()] !== undefined) {
        s._dayIndex = DAY_MAP[raw.toLowerCase().trim()];
      }
    });

    // For stories without a day, distribute to days with least total items
    const dayCounts = Array.from({ length: 7 }, (_, i) =>
      allItems.filter(it => it._dayIndex === i).length + stories.filter(st => st._dayIndex === i).length
    );

    stories.forEach(s => {
      if (s._dayIndex >= 0) return;
      // Find day with least content
      const minCount = Math.min(...dayCounts);
      const bestDay = dayCounts.indexOf(minCount);
      s._dayIndex = bestDay;
      dayCounts[bestDay]++;
    });

    return stories;
  })();

  const generateContent = (item: WeeklyPlanItem) => {
    navigate("/create", {
      state: {
        fromCalendar: true,
        planId: selectedMeta?.id,
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
  const canGoNext = selectedPlanIndex < activeMetas.length - 1;

  const formatWeekLabel = (plan: PlanMeta) => {
    const start = new Date(plan.week_start);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    const locale = "es-ES";
    return `${start.toLocaleDateString(locale, { day: "numeric", month: "short" })} – ${end.toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" })}`;
  };

  // Day headers with actual dates
  const getDayHeaders = (weekStart: string) => {
    const start = new Date(weekStart);
    const keys: Array<{ shortKey: string; date: Date }> = [
      { shortKey: "mondayShort", date: new Date(start) },
      { shortKey: "tuesdayShort", date: new Date(start) },
      { shortKey: "wednesdayShort", date: new Date(start) },
      { shortKey: "thursdayShort", date: new Date(start) },
      { shortKey: "fridayShort", date: new Date(start) },
      { shortKey: "saturdayShort", date: new Date(start) },
      { shortKey: "sundayShort", date: new Date(start) },
    ];
    keys.forEach((k, i) => {
      k.date = new Date(start);
      k.date.setDate(start.getDate() + i);
    });
    return keys;
  };

  // Progress
  const storyCount = allStories.length;
  const totalItems = allItems.length + storyCount;
  const completedCount = allItems.filter(i => completedItems.has(i._key)).length
    + allStories.filter(s => completedItems.has(s._key)).length;
  const progressPercent = totalItems > 0 ? Math.round((completedCount / totalItems) * 100) : 0;

  // Group items by day for grid
  const itemsByDay: Array<{ items: EnrichedItem[]; stories: EnrichedStory[] }> = Array.from({ length: 7 }, () => ({ items: [], stories: [] }));
  allItems.forEach(item => itemsByDay[item._dayIndex].items.push(item));
  allStories.forEach(story => itemsByDay[story._dayIndex].stories.push(story));

  // Unassigned stories (no day) go to a pool shown after the grid
  const unassignedStories = allStories.filter(s => !s._dayIndex && !DAY_MAP[(planData?.stories?.find((_s, i) => `story-${i}` === s._key)?.day || "").toLowerCase().trim()]);

  return (
    <div className="max-w-[1400px] mx-auto animate-fade-in px-1 sm:px-2 lg:px-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">{t("calendar")}</h1>
          <p className="text-muted-foreground mt-1 text-sm">{t("calendarSubtitle")}</p>
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

      {/* Loading */}
      {loading && (
        <div className="glass rounded-2xl p-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">{t("loadingPlans")}</p>
        </div>
      )}

      {/* Empty state */}
      {!loading && activeMetas.length === 0 && archivedMetas.length === 0 && (
        <div className="glass rounded-2xl p-12 text-center">
          <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">{t("noPlansYet")}</h3>
          <p className="text-muted-foreground text-sm max-w-md mx-auto mb-4">{t("generateFirstPlan")}</p>
          <Button variant="gradient" onClick={() => navigate("/")}>{t("goToDashboard")}</Button>
        </div>
      )}

      {/* Main content */}
      {!loading && (activeMetas.length > 0 || archivedMetas.length > 0) && (
        <div className="space-y-4">
          {selectedMeta && (
            <>
              {/* Week navigation */}
              <div className="flex items-center justify-between glass rounded-xl px-2 sm:px-4 py-3 gap-1">
                <Button variant="ghost" size="sm" onClick={() => canGoNext && setSelectedPlanIndex(selectedPlanIndex + 1)} disabled={!canGoNext} className="gap-1 px-1 sm:px-3">
                  <ChevronLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">{t("previousWeek")}</span>
                </Button>
                <div className="text-center min-w-0 flex-1">
                  <div className="flex items-center justify-center gap-2">
                    <p className="font-semibold text-xs sm:text-sm truncate">{formatWeekLabel(selectedMeta)}</p>
                    <Badge variant="outline" className="text-[10px] text-primary border-primary/30">{t("activePlan")}</Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {t("createdOn")} {new Date(selectedMeta.created_at).toLocaleDateString("es-ES")}
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => canGoPrev && setSelectedPlanIndex(selectedPlanIndex - 1)} disabled={!canGoPrev} className="gap-1 px-1 sm:px-3">
                  <span className="hidden sm:inline">{t("nextWeek")}</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              {/* Progress bar */}
              {!loadingDetail && totalItems > 0 && (
                <div className="glass rounded-xl px-4 py-3 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground font-medium capitalize">{t("weekProgress")}</span>
                    <span className={completedCount === totalItems ? "text-green-500 font-medium" : "text-muted-foreground"}>
                      {completedCount === totalItems ? t("allCompleted") : `${completedCount} ${t("completedOf")} ${totalItems}`}
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

              {/* Loading detail */}
              {loadingDetail && (
                <div className="glass rounded-xl p-8 text-center">
                  <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">{t("loadingPlans")}</p>
                </div>
              )}

              {/* === DESKTOP: 7-column grid === */}
              {!loadingDetail && (
                <>
                  <div className="hidden lg:block">
                    <WeekGrid
                      dayHeaders={getDayHeaders(selectedMeta.week_start)}
                      itemsByDay={itemsByDay}
                      completedItems={completedItems}
                      onToggle={toggleCompleted}
                      onGenerate={generateContent}
                      t={t}
                    />
                  </div>

                  {/* === MOBILE/TABLET: grouped by day === */}
                  <div className="lg:hidden space-y-3">
                    <MobileDayList
                      dayHeaders={getDayHeaders(selectedMeta.week_start)}
                      itemsByDay={itemsByDay}
                      completedItems={completedItems}
                      onToggle={toggleCompleted}
                      onGenerate={generateContent}
                      t={t}
                    />
                  </div>
                </>
              )}
            </>
          )}

          {/* Archived plans */}
          {archivedMetas.length > 0 && (
            <Collapsible open={showArchived} onOpenChange={setShowArchived}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full gap-2 text-muted-foreground">
                  <Archive className="h-4 w-4" />
                  {showArchived ? t("hideArchivedPlans") : t("showArchivedPlans")} ({archivedMetas.length})
                  {showArchived ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-3 mt-3">
                {archivedMetas.map((plan) => (
                  <div key={plan.id} className="glass rounded-xl p-3 sm:p-4 opacity-70">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-medium">{formatWeekLabel(plan)}</p>
                          <Badge variant="outline" className="text-[10px] text-muted-foreground">{t("archivedBadge")}</Badge>
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          {t("createdOn")} {new Date(plan.created_at).toLocaleDateString("es-ES")}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Desktop 7-column grid ───────────────────────────────────────

interface WeekGridProps {
  dayHeaders: Array<{ shortKey: string; date: Date }>;
  itemsByDay: Array<{ items: EnrichedItem[]; stories: EnrichedStory[] }>;
  completedItems: Set<string>;
  onToggle: (key: string) => void;
  onGenerate: (item: WeeklyPlanItem) => void;
  t: (key: any) => string;
}

function WeekGrid({ dayHeaders, itemsByDay, completedItems, onToggle, onGenerate, t }: WeekGridProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className="grid grid-cols-7 gap-2">
      {/* Day column headers */}
      {dayHeaders.map((dh, i) => {
        const isToday = dh.date.toDateString() === today.toDateString();
        return (
          <div
            key={i}
            className={cn(
              "text-center py-2 rounded-t-lg border-b-2",
              isToday ? "border-primary bg-primary/5" : "border-border bg-card/50"
            )}
          >
            <p className={cn("text-xs font-semibold uppercase tracking-wide", isToday ? "text-primary" : "text-muted-foreground")}>
              {t(dh.shortKey as any)}
            </p>
            <p className={cn("text-lg font-bold", isToday ? "text-primary" : "text-foreground")}>
              {dh.date.getDate()}
            </p>
          </div>
        );
      })}

      {/* Day columns content */}
      {dayHeaders.map((dh, dayIdx) => {
        const dayItems = itemsByDay[dayIdx];
        const isToday = dh.date.toDateString() === today.toDateString();
        return (
          <div
            key={`col-${dayIdx}`}
            className={cn(
              "min-h-[140px] rounded-b-lg p-1.5 space-y-2 border border-t-0",
              isToday ? "border-primary/20 bg-primary/[0.03]" : "border-border/50 bg-card/30"
            )}
          >
            {dayItems.items.map((item) => (
              <ContentCard
                key={item._key}
                item={item}
                isCompleted={completedItems.has(item._key)}
                onToggle={() => onToggle(item._key)}
                onGenerate={() => onGenerate(item)}
                t={t}
                compact
              />
            ))}
            {dayItems.stories.map((story) => (
              <StoryChip
                key={story._key}
                story={story}
                isCompleted={completedItems.has(story._key)}
                onToggle={() => onToggle(story._key)}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}

// ─── Mobile: grouped by day ──────────────────────────────────────

interface MobileDayListProps {
  dayHeaders: Array<{ shortKey: string; date: Date }>;
  itemsByDay: Array<{ items: EnrichedItem[]; stories: EnrichedStory[] }>;
  completedItems: Set<string>;
  onToggle: (key: string) => void;
  onGenerate: (item: WeeklyPlanItem) => void;
  t: (key: any) => string;
}

function MobileDayList({ dayHeaders, itemsByDay, completedItems, onToggle, onGenerate, t }: MobileDayListProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <>
      {dayHeaders.map((dh, dayIdx) => {
        const dayItems = itemsByDay[dayIdx];
        const hasContent = dayItems.items.length > 0 || dayItems.stories.length > 0;
        if (!hasContent) return null;

        const isToday = dh.date.toDateString() === today.toDateString();

        return (
          <div key={dayIdx} className={cn("rounded-xl overflow-hidden border", isToday ? "border-primary/30" : "border-border/50")}>
            {/* Day header */}
            <div className={cn(
              "flex items-center gap-2 px-3 py-2",
              isToday ? "bg-primary/10" : "bg-card/60"
            )}>
              <div className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold",
                isToday ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"
              )}>
                {dh.date.getDate()}
              </div>
              <span className={cn("text-sm font-semibold", isToday ? "text-primary" : "text-foreground")}>
                {t(dh.shortKey as any)}
              </span>
              {isToday && <Badge className="text-[10px] bg-primary/20 text-primary border-0 ml-auto">Hoy</Badge>}
            </div>

            {/* Items */}
            <div className="p-2 space-y-2 bg-card/20">
              {dayItems.items.map((item) => (
                <ContentCard
                  key={item._key}
                  item={item}
                  isCompleted={completedItems.has(item._key)}
                  onToggle={() => onToggle(item._key)}
                  onGenerate={() => onGenerate(item)}
                  t={t}
                  compact={false}
                />
              ))}
              {dayItems.stories.map((story) => (
                <StoryChip
                  key={story._key}
                  story={story}
                  isCompleted={completedItems.has(story._key)}
                  onToggle={() => onToggle(story._key)}
                />
              ))}
            </div>
          </div>
        );
      })}
    </>
  );
}

// ─── Content Card (compact for desktop, expanded for mobile) ─────

interface ContentCardProps {
  item: EnrichedItem;
  isCompleted: boolean;
  onToggle: () => void;
  onGenerate: () => void;
  t: (key: any) => string;
  compact: boolean;
}

function ContentCard({ item, isCompleted, onToggle, onGenerate, t, compact }: ContentCardProps) {
  const config = TYPE_CONFIG[item.type] || TYPE_CONFIG.post;
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "rounded-lg border transition-all group",
        isCompleted
          ? "border-green-500/20 bg-green-500/5 opacity-75"
          : `${config.borderColor} bg-card/80 hover:bg-card`,
      )}
    >
      <div className={cn("p-2.5", compact ? "space-y-1.5" : "space-y-2")}>
        {/* Type badge row */}
        <div className="flex items-center justify-between gap-1">
          <div className={cn("flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold", config.bgColor, config.color)}>
            <Icon className="h-3 w-3" />
            {config.label}
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onToggle(); }}
            className="shrink-0 transition-colors"
            title={isCompleted ? t("unmarkCompleted") : t("markAsCompleted")}
          >
            {isCompleted ? (
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            ) : (
              <Circle className="h-4 w-4 text-muted-foreground/30 hover:text-muted-foreground" />
            )}
          </button>
        </div>

        {/* Title */}
        <p className={cn(
          "font-medium leading-snug",
          compact ? "text-xs line-clamp-2" : "text-sm",
          isCompleted && "line-through text-muted-foreground"
        )}>
          {item.idea}
        </p>

        {/* Hook preview - only on non-compact */}
        {!compact && item.hook && (
          <p className="text-xs text-primary/80 line-clamp-1">🎬 "{item.hook}"</p>
        )}

        {/* Status + Action */}
        <div className="flex items-center justify-between gap-1 pt-0.5">
          <StatusBadge isCompleted={isCompleted} t={t} />
          <button
            onClick={onGenerate}
            className={cn(
              "text-[11px] font-medium px-2 py-1 rounded-md transition-colors flex items-center gap-1",
              isCompleted
                ? "text-muted-foreground hover:text-foreground hover:bg-secondary"
                : "text-primary hover:bg-primary/10"
            )}
          >
            {isCompleted ? (
              <><Pencil className="h-3 w-3" /> {compact ? t("editContent") : t("editContent")}</>
            ) : (
              <><Sparkles className="h-3 w-3" /> {compact ? t("generateThisContent").split(" ").slice(0, 1).join(" ") : t("generateThisContent")}</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Status Badge ────────────────────────────────────────────────

function StatusBadge({ isCompleted, t }: { isCompleted: boolean; t: (key: any) => string }) {
  if (isCompleted) {
    return (
      <span className="flex items-center gap-1 text-[10px] font-medium text-green-500">
        <CheckCircle2 className="h-3 w-3" />
        {t("statusDone")}
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
      <Circle className="h-3 w-3" />
      {t("statusPending")}
    </span>
  );
}

// ─── Story Chip ──────────────────────────────────────────────────

function StoryChip({ story, isCompleted, onToggle }: { story: EnrichedStory; isCompleted: boolean; onToggle: () => void }) {
  const config = TYPE_CONFIG.story;

  return (
    <div className={cn(
      "rounded-md border px-2.5 py-1.5 flex items-center gap-2 transition-all",
      isCompleted
        ? "border-green-500/20 bg-green-500/5 opacity-75"
        : `${config.borderColor} bg-purple-500/5`
    )}>
      <button onClick={onToggle} className="shrink-0">
        {isCompleted ? (
          <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
        ) : (
          <Circle className="h-3.5 w-3.5 text-muted-foreground/30 hover:text-muted-foreground" />
        )}
      </button>
      <MessageSquare className={cn("h-3 w-3 shrink-0", config.color)} />
      <span className={cn("text-xs flex-1 line-clamp-1", isCompleted && "line-through text-muted-foreground")}>
        {story.idea}
      </span>
    </div>
  );
}

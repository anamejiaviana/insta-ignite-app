import { useClients } from "@/contexts/ClientContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { Sparkles, Calendar, Camera, FolderOpen, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

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

interface WeeklyPlan {
  reels: WeeklyPlanItem[];
  posts: WeeklyPlanItem[];
  stories: { idea: string; tipo: string; text?: string }[];
}

export default function Dashboard() {
  const { activeClient, clients, setActiveClientId } = useClients();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [recentPosts, setRecentPosts] = useState<any[]>([]);
  const [specialDates, setSpecialDates] = useState("");
  const [loading, setLoading] = useState(false);
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyPlan | null>(null);
  const [numPublications, setNumPublications] = useState("3");
  const [contentPreference, setContentPreference] = useState("balanced");

  useEffect(() => {
    loadRecentPosts();
  }, [activeClient]);

  const loadRecentPosts = async () => {
    const { data } = await supabase
      .from("generated_posts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(5);
    if (data) setRecentPosts(data);
  };

  const generateWeeklyPlan = async () => {
    if (!activeClient) {
      toast({ variant: "destructive", title: t("selectBusinessFirst") });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-weekly-plan", {
        body: {
          client: {
            name: activeClient.name,
            type: activeClient.type,
            city: activeClient.city,
            tone: activeClient.tone,
            objective: activeClient.objective,
            keywords: activeClient.keywords,
            inspirationAccount: activeClient.inspiration_account,
          },
          specialDates: specialDates || undefined,
          language: activeClient.content_language || "es",
          numPublications: parseInt(numPublications),
          contentPreference,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setWeeklyPlan(data);

      const user = (await supabase.auth.getUser()).data.user;
      if (user) {
        const now = new Date();
        const monday = new Date(now);
        monday.setDate(now.getDate() - now.getDay() + 1);

        await (supabase as any).from("weekly_plans").insert({
          user_id: user.id,
          client_id: activeClient.id,
          week_start: monday.toISOString().split("T")[0],
          special_dates: specialDates || null,
          content_language: activeClient.content_language || "es",
          plan_data: data,
        });
      }

      toast({ title: t("weeklyPlanGenerated") });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: t("errorGeneratingPlan"),
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const generateContent = (item: WeeklyPlanItem) => {
    navigate("/create", {
      state: {
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

  const quickActions = [
    { label: t("calendarNav"), icon: Calendar, path: "/strategy/calendar" },
    { label: t("recordingDay"), icon: Camera, path: "/shooting" },
    { label: t("libraryNav"), icon: FolderOpen, path: "/library" },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in px-4 md:px-0">
      {/* Header with client selector */}
      <div>
        <h1 className="text-3xl font-bold">{t("dashboard")}</h1>
        {clients.length > 0 ? (
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className="text-sm text-muted-foreground">{t("business")}:</span>
            {clients.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveClientId(c.id)}
                className={`text-sm px-3 py-1 rounded-full transition-all ${
                  activeClient?.id === c.id
                    ? "text-primary-foreground font-medium"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
                style={
                  activeClient?.id === c.id
                    ? { background: "var(--gradient-primary)" }
                    : undefined
                }
              >
                {c.name}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground mt-1 text-sm">
            {t("startAddingBusiness")}{" "}
            <button onClick={() => navigate("/settings")} className="text-primary underline">
              {t("settings")}
            </button>
          </p>
        )}
      </div>

      {/* Main CTA: Generate weekly plan */}
      {activeClient && (
        <Card className="bg-card border-border overflow-hidden">
          <div className="p-6 md:p-8">
            <h2 className="text-xl font-bold mb-1">
              {t("whatToPublish")}
            </h2>
            <p className="text-sm text-muted-foreground mb-5">
              {t("customizeWeeklyPlan")}
            </p>

            <div className="space-y-5">
              {/* Number of publications */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  {t("howManyPublications")}
                </Label>
                <div className="flex gap-2">
                  {["2", "3", "4", "5"].map((n) => (
                    <button
                      key={n}
                      onClick={() => setNumPublications(n)}
                      className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                        numPublications === n
                          ? "text-primary-foreground"
                          : "bg-secondary text-muted-foreground hover:text-foreground"
                      }`}
                      style={numPublications === n ? { background: "var(--gradient-primary)" } : undefined}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              {/* Content type preference */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  {t("contentTypePreference")}
                </Label>
                <div className="flex gap-2">
                  {[
                    { value: "more_reels", labelKey: "moreReels" as const },
                    { value: "balanced", labelKey: "balanced" as const },
                    { value: "more_posts", labelKey: "morePosts" as const },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setContentPreference(opt.value)}
                      className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                        contentPreference === opt.value
                          ? "text-primary-foreground"
                          : "bg-secondary text-muted-foreground hover:text-foreground"
                      }`}
                      style={contentPreference === opt.value ? { background: "var(--gradient-primary)" } : undefined}
                    >
                      {t(opt.labelKey)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Special dates */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  {t("specialDatesOptional")}
                </Label>
                <Input
                  placeholder={t("specialDatesPlaceholder")}
                  value={specialDates}
                  onChange={(e) => setSpecialDates(e.target.value)}
                  className="bg-secondary border-border"
                />
              </div>
              <Button
                variant="gradient"
                size="xl"
                onClick={generateWeeklyPlan}
                disabled={loading}
                className="w-full whitespace-normal text-base md:text-lg px-4 md:px-10"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    {t("generatingPlan")}
                  </>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5" />
                    {t("generateWeeklyContent")}
                  </>
                )}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Weekly Plan Results */}
      {weeklyPlan && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold">{t("yourWeeklyPlan")}</h3>

          {/* Reels */}
          {weeklyPlan.reels.map((reel, idx) => (
            <Card key={idx} className="bg-card border-border">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400">
                        REEL
                      </span>
                      <span className="text-xs text-muted-foreground">{reel.day}</span>
                    </div>
                    <p className="font-semibold text-sm mb-1">{reel.idea}</p>
                    <p className="text-xs text-primary font-medium mb-2">🎬 "{reel.hook}"</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">{reel.script}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => generateContent(reel)}
                    className="shrink-0"
                  >
                    <Sparkles className="h-3.5 w-3.5 mr-1" />
                    {t("generate")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Posts */}
          {weeklyPlan.posts?.map((post, idx) => (
            <Card key={idx} className="bg-card border-border">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">
                        POST
                      </span>
                      <span className="text-xs text-muted-foreground">{post.day}</span>
                    </div>
                    <p className="font-semibold text-sm mb-1">{post.idea}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">{post.caption}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => generateContent(post)}
                    className="shrink-0"
                  >
                    <Sparkles className="h-3.5 w-3.5 mr-1" />
                    {t("generate")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Stories */}
          {weeklyPlan.stories && weeklyPlan.stories.length > 0 && (
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">{t("storiesIdeas")}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {weeklyPlan.stories.map((story, idx) => (
                    <div key={idx} className="flex items-center gap-3 text-sm">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 shrink-0">
                        {story.tipo}
                      </span>
                      <span className="text-muted-foreground">{story.idea}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-3 gap-2 md:gap-3">
        {quickActions.map((action) => (
          <button
            key={action.label}
            onClick={() => navigate(action.path)}
            className="glass glass-hover rounded-xl p-3 md:p-5 flex flex-col items-center gap-2 md:gap-2.5 text-center transition-all hover:shadow-glow"
          >
            <div
              className="h-10 w-10 rounded-xl flex items-center justify-center"
              style={{ background: "var(--gradient-primary)" }}
            >
              <action.icon className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-medium text-xs">{action.label}</span>
          </button>
        ))}
      </div>

      {/* Recent Content */}
      {recentPosts.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base">{t("recentContent")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentPosts.map((post) => (
                <button
                  key={post.id}
                  onClick={() => navigate("/library", { state: { openPost: post.id } })}
                  className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 w-full text-left hover:bg-secondary/80 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{post.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {post.post_type} · {new Date(post.created_at).toLocaleDateString("es-ES")}
                    </p>
                  </div>
                  {post.generated_image_url && (
                    <img src={post.generated_image_url} alt="" className="h-10 w-10 rounded object-cover ml-3 shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

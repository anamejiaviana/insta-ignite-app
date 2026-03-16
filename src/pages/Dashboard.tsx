import { useClients } from "@/contexts/ClientContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { Sparkles, Calendar, Camera, FolderOpen, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

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
  post: WeeklyPlanItem;
  stories: { idea: string; tipo: string }[];
}

export default function Dashboard() {
  const { activeClient, clients, setActiveClientId } = useClients();
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
      toast({ variant: "destructive", title: "Selecciona un negocio primero" });
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
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setWeeklyPlan(data);

      // Save to DB
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

      toast({ title: "¡Plan semanal generado!" });
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
    { label: "Calendario", icon: Calendar, path: "/strategy/calendar" },
    { label: "Día de grabación", icon: Camera, path: "/shooting" },
    { label: "Biblioteca", icon: FolderOpen, path: "/library" },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in">
      {/* Header with client selector */}
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        {clients.length > 0 ? (
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className="text-sm text-muted-foreground">Negocio:</span>
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
            Empieza añadiendo tu negocio en{" "}
            <button onClick={() => navigate("/settings")} className="text-primary underline">
              Configuración
            </button>
          </p>
        )}
      </div>

      {/* Main CTA: Generate weekly plan */}
      {activeClient && (
        <Card className="bg-card border-border overflow-hidden">
          <div className="p-6 md:p-8">
            <h2 className="text-xl font-bold mb-1">
              ¿Qué publico esta semana?
            </h2>
            <p className="text-sm text-muted-foreground mb-5">
              Genera tu plan de contenido: 2 reels, 1 post e ideas de stories
            </p>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  ¿Hay fechas especiales esta semana? (opcional)
                </Label>
                <Input
                  placeholder="Ej: Black Friday, aniversario del local, nueva carta..."
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
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Generando plan...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5" />
                    Generar mi contenido de esta semana
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
          <h3 className="text-lg font-bold">Tu plan semanal</h3>

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
                    Generar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Post */}
          {weeklyPlan.post && (
            <Card className="bg-card border-border">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">
                        POST
                      </span>
                      <span className="text-xs text-muted-foreground">{weeklyPlan.post.day}</span>
                    </div>
                    <p className="font-semibold text-sm mb-1">{weeklyPlan.post.idea}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">{weeklyPlan.post.caption}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => generateContent(weeklyPlan.post)}
                    className="shrink-0"
                  >
                    <Sparkles className="h-3.5 w-3.5 mr-1" />
                    Generar
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Stories */}
          {weeklyPlan.stories && weeklyPlan.stories.length > 0 && (
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Ideas de Stories</CardTitle>
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
      <div className="grid grid-cols-3 gap-3">
        {quickActions.map((action) => (
          <button
            key={action.label}
            onClick={() => navigate(action.path)}
            className="glass glass-hover rounded-xl p-5 flex flex-col items-center gap-2.5 text-center transition-all hover:shadow-glow"
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
            <CardTitle className="text-base">Contenido reciente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentPosts.map((post) => (
                <div
                  key={post.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-secondary/50"
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
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

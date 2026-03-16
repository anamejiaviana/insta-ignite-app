import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useClients } from "@/contexts/ClientContext";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Sparkles, Calendar, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
    post: WeeklyPlanItem;
    stories: { idea: string; tipo: string }[];
  };
  created_at: string;
}

export default function ContentCalendar() {
  const { activeClient } = useClients();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [plans, setPlans] = useState<StoredPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<StoredPlan | null>(null);

  useEffect(() => {
    loadPlans();
  }, [activeClient]);

  const loadPlans = async () => {
    setLoading(true);
    let query = (supabase as any)
      .from("weekly_plans")
      .select("*")
      .order("week_start", { ascending: false })
      .limit(20);

    if (activeClient) {
      query = query.eq("client_id", activeClient.id);
    }

    const { data } = await query;
    if (data) {
      setPlans(data);
      if (data.length > 0 && !selectedPlan) {
        setSelectedPlan(data[0]);
      }
    }
    setLoading(false);
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

  const planData = selectedPlan?.plan_data;
  const allItems = planData
    ? [...(planData.reels || []), ...(planData.post ? [planData.post] : [])]
    : [];

  const typeColors: Record<string, string> = {
    reel: "bg-blue-500/20 text-blue-400",
    post: "bg-green-500/20 text-green-400",
  };

  return (
    <div className="max-w-5xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Calendario</h1>
          {activeClient && (
            <p className="text-muted-foreground mt-1">
              Planes para{" "}
              <span className="text-primary font-medium">{activeClient.name}</span>
            </p>
          )}
        </div>
        <Button variant="gradient" onClick={() => navigate("/")} size="sm">
          <Sparkles className="h-4 w-4 mr-2" />
          Generar plan semanal
        </Button>
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

      {!loading && plans.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Plan list */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Planes anteriores</h3>
            {plans.map((plan) => (
              <button
                key={plan.id}
                onClick={() => setSelectedPlan(plan)}
                className={`w-full text-left p-3 rounded-lg text-sm transition-all ${
                  selectedPlan?.id === plan.id
                    ? "bg-primary/10 text-primary font-medium border border-primary/20"
                    : "bg-secondary/50 text-muted-foreground hover:text-foreground"
                }`}
              >
                <p className="font-medium">Semana {new Date(plan.week_start).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}</p>
                <p className="text-xs mt-0.5 opacity-70">
                  {new Date(plan.created_at).toLocaleDateString("es-ES")}
                </p>
              </button>
            ))}
          </div>

          {/* Plan detail */}
          <div className="lg:col-span-3 space-y-4">
            {allItems.map((item, idx) => (
              <Card key={idx} className="bg-card border-border">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full uppercase ${typeColors[item.type] || "bg-secondary text-muted-foreground"}`}>
                          {item.type}
                        </span>
                        <span className="text-xs text-muted-foreground">{item.day}</span>
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
                    <Button variant="outline" size="sm" onClick={() => generateContent(item)} className="shrink-0">
                      <Sparkles className="h-3.5 w-3.5 mr-1" />
                      Generar este contenido
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}

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

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useClients } from "@/contexts/ClientContext";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FolderOpen, Copy, Check, Trash2, Calendar, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

type TabType = "posts" | "plans" | "shooting";

export default function Library() {
  const { clients, activeClient } = useClients();
  const { t } = useLanguage();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<TabType>("posts");
  const [posts, setPosts] = useState<any[]>([]);
  const [weeklyPlans, setWeeklyPlans] = useState<any[]>([]);
  const [shootingPlans, setShootingPlans] = useState<any[]>([]);
  const [filterClient, setFilterClient] = useState("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [filterClient, activeTab]);

  const loadData = async () => {
    if (activeTab === "posts") {
      let query = supabase.from("generated_posts").select("*").order("created_at", { ascending: false });
      if (filterClient !== "all") query = query.eq("client_id", filterClient);
      const { data } = await query;
      if (data) setPosts(data);
    } else if (activeTab === "plans") {
      let query = (supabase as any).from("weekly_plans").select("*").order("created_at", { ascending: false });
      if (filterClient !== "all") query = query.eq("client_id", filterClient);
      const { data } = await query;
      if (data) setWeeklyPlans(data);
    } else {
      let query = (supabase as any).from("shooting_plans").select("*").order("created_at", { ascending: false });
      if (filterClient !== "all") query = query.eq("client_id", filterClient);
      const { data } = await query;
      if (data) setShootingPlans(data);
    }
  };

  const copyCaption = (post: any) => {
    const text = `${post.main_copy}\n\n${(post.hashtags || []).map((h: string) => `#${h}`).join(" ")}`;
    navigator.clipboard.writeText(text);
    setCopiedId(post.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const deletePost = async (id: string) => {
    const { error } = await supabase.from("generated_posts").delete().eq("id", id);
    if (!error) {
      setPosts((prev) => prev.filter((p) => p.id !== id));
      toast({ title: t("contentDeleted") });
    }
  };

  const deleteWeeklyPlan = async (id: string) => {
    const { error } = await (supabase as any).from("weekly_plans").delete().eq("id", id);
    if (!error) {
      setWeeklyPlans((prev) => prev.filter((p) => p.id !== id));
      toast({ title: t("planDeleted") });
    }
  };

  const deleteShootingPlan = async (id: string) => {
    const { error } = await (supabase as any).from("shooting_plans").delete().eq("id", id);
    if (!error) {
      setShootingPlans((prev) => prev.filter((p) => p.id !== id));
      toast({ title: t("planDeleted") });
    }
  };

  const tabs = [
    { id: "posts" as TabType, label: t("posts"), count: posts.length },
    { id: "plans" as TabType, label: t("weeklyPlans"), count: weeklyPlans.length },
    { id: "shooting" as TabType, label: t("recordingSessions"), count: shootingPlans.length },
  ];

  const clientName = (clientId: string) => clients.find(c => c.id === clientId)?.name || "";

  return (
    <div className="max-w-5xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">{t("library")}</h1>
        <Select value={filterClient} onValueChange={setFilterClient}>
          <SelectTrigger className="w-[180px] bg-secondary border-border">
            <SelectValue placeholder={t("allBusinesses")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allBusinesses")}</SelectItem>
            {clients.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 p-1 bg-secondary/50 rounded-lg w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === tab.id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Posts tab */}
      {activeTab === "posts" && (
        <>
          {posts.length === 0 && (
            <div className="glass rounded-2xl p-12 text-center">
              <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">{t("noContent")}</h3>
              <p className="text-muted-foreground text-sm">{t("generatedContentAppearsHere")}</p>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {posts.map((post) => (
              <Card key={post.id} className="bg-card border-border overflow-hidden group">
                {post.generated_image_url && (
                  <div className="aspect-square overflow-hidden">
                    <img src={post.generated_image_url} alt={post.title} className="w-full h-full object-cover" />
                  </div>
                )}
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{post.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {post.post_type} · {new Date(post.created_at).toLocaleDateString("es-ES")}
                        {post.client_id && ` · ${clientName(post.client_id)}`}
                      </p>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => copyCaption(post)}>
                        {copiedId === post.id ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => deletePost(post.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  {post.main_copy && <p className="text-xs text-muted-foreground mt-2 line-clamp-3">{post.main_copy}</p>}
                  {post.hashtags && post.hashtags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {post.hashtags.slice(0, 5).map((h: string, i: number) => (
                        <span key={i} className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">#{h}</span>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Weekly Plans tab */}
      {activeTab === "plans" && (
        <>
          {weeklyPlans.length === 0 && (
            <div className="glass rounded-2xl p-12 text-center">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Sin planes semanales</h3>
              <p className="text-muted-foreground text-sm">Los planes que generes aparecerán aquí.</p>
            </div>
          )}
          <div className="space-y-3">
            {weeklyPlans.map((plan) => {
              const pd = plan.plan_data;
              const reelCount = pd?.reels?.length || 0;
              const hasPost = !!pd?.post;
              const storyCount = pd?.stories?.length || 0;
              return (
                <Card key={plan.id} className="bg-card border-border group">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">
                        Semana del {new Date(plan.week_start).toLocaleDateString("es-ES", { day: "numeric", month: "long" })}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {reelCount} reels · {hasPost ? "1 post" : "0 posts"} · {storyCount} stories
                        {plan.client_id && ` · ${clientName(plan.client_id)}`}
                      </p>
                      {plan.special_dates && (
                        <p className="text-xs text-primary mt-1">📅 {plan.special_dates}</p>
                      )}
                    </div>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => deleteWeeklyPlan(plan.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* Shooting Plans tab */}
      {activeTab === "shooting" && (
        <>
          {shootingPlans.length === 0 && (
            <div className="glass rounded-2xl p-12 text-center">
              <Camera className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Sin sesiones de grabación</h3>
              <p className="text-muted-foreground text-sm">Las sesiones planificadas aparecerán aquí.</p>
            </div>
          )}
          <div className="space-y-3">
            {shootingPlans.map((plan) => {
              const pd = plan.plan_data;
              const reelCount = pd?.reels?.length || 0;
              return (
                <Card key={plan.id} className="bg-card border-border group">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">
                        Sesión de {plan.num_days} {plan.num_days === 1 ? "día" : "días"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {reelCount} reels · {new Date(plan.created_at).toLocaleDateString("es-ES")}
                        {plan.client_id && ` · ${clientName(plan.client_id)}`}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => deleteShootingPlan(plan.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

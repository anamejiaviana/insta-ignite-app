import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { EditableCopyBlock } from "@/components/post/EditableCopyBlock";
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
import { FolderOpen, Copy, Check, Trash2, Calendar, Camera, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

type TabType = "posts" | "plans" | "shooting";
type DetailView =
  | { type: "post"; data: any }
  | { type: "plan"; data: any }
  | { type: "shooting"; data: any }
  | null;

export default function Library() {
  const { clients } = useClients();
  const { t } = useLanguage();
  const { toast } = useToast();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<TabType>("posts");
  const [posts, setPosts] = useState<any[]>([]);
  const [weeklyPlans, setWeeklyPlans] = useState<any[]>([]);
  const [shootingPlans, setShootingPlans] = useState<any[]>([]);
  const [filterClient, setFilterClient] = useState("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<DetailView>(null);

  useEffect(() => {
    loadData();
  }, [filterClient, activeTab]);

  // Handle deep-link from Dashboard recent content
  useEffect(() => {
    const state = location.state as any;
    if (state?.openPost && posts.length > 0) {
      const found = posts.find((p) => p.id === state.openPost);
      if (found) {
        setDetail({ type: "post", data: found });
        // Clear state so it doesn't re-trigger
        window.history.replaceState({}, document.title);
      }
    }
  }, [location.state, posts]);

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

  const copyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const deletePost = async (id: string) => {
    const { error } = await supabase.from("generated_posts").delete().eq("id", id);
    if (!error) {
      setPosts((prev) => prev.filter((p) => p.id !== id));
      if (detail?.type === "post" && detail.data.id === id) setDetail(null);
      toast({ title: t("contentDeleted") });
    }
  };

  const deleteWeeklyPlan = async (id: string) => {
    const { error } = await (supabase as any).from("weekly_plans").delete().eq("id", id);
    if (!error) {
      setWeeklyPlans((prev) => prev.filter((p) => p.id !== id));
      if (detail?.type === "plan" && detail.data.id === id) setDetail(null);
      toast({ title: t("planDeleted") });
    }
  };

  const deleteShootingPlan = async (id: string) => {
    const { error } = await (supabase as any).from("shooting_plans").delete().eq("id", id);
    if (!error) {
      setShootingPlans((prev) => prev.filter((p) => p.id !== id));
      if (detail?.type === "shooting" && detail.data.id === id) setDetail(null);
      toast({ title: t("planDeleted") });
    }
  };

  const tabs = [
    { id: "posts" as TabType, label: t("posts"), count: posts.length },
    { id: "plans" as TabType, label: t("weeklyPlans"), count: weeklyPlans.length },
    { id: "shooting" as TabType, label: t("recordingSessions"), count: shootingPlans.length },
  ];

  const clientName = (clientId: string) => clients.find(c => c.id === clientId)?.name || "";

  // --- Detail Views ---

  if (detail?.type === "post") return <PostDetail post={detail.data} onBack={() => setDetail(null)} onDelete={deletePost} copyText={copyText} copiedId={copiedId} t={t} clientName={clientName} />;
  if (detail?.type === "plan") return <WeeklyPlanDetail plan={detail.data} onBack={() => setDetail(null)} onDelete={deleteWeeklyPlan} t={t} clientName={clientName} />;
  if (detail?.type === "shooting") return <ShootingPlanDetail plan={detail.data} onBack={() => setDetail(null)} onDelete={deleteShootingPlan} t={t} clientName={clientName} />;

  // --- List View ---
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
          {posts.length === 0 && <EmptyState icon={<FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />} title={t("noContent")} desc={t("generatedContentAppearsHere")} />}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {posts.map((post) => (
              <Card key={post.id} className="bg-card border-border overflow-hidden group cursor-pointer hover:border-primary/30 transition-colors" onClick={() => setDetail({ type: "post", data: post })}>
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
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => copyText(`${post.main_copy}\n\n${(post.hashtags || []).map((h: string) => `#${h}`).join(" ")}`, post.id)}>
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
          {weeklyPlans.length === 0 && <EmptyState icon={<Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />} title={t("noWeeklyPlans")} desc={t("plansAppearHere")} />}
          <div className="space-y-3">
            {weeklyPlans.map((plan) => {
              const pd = plan.plan_data;
              const reelCount = pd?.reels?.length || 0;
              const postCount = pd?.posts?.length || (pd?.post ? 1 : 0);
              const storyCount = pd?.stories?.length || 0;
              return (
                <Card key={plan.id} className="bg-card border-border group cursor-pointer hover:border-primary/30 transition-colors" onClick={() => setDetail({ type: "plan", data: plan })}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">
                        {t("weekOfLabel")} {new Date(plan.week_start).toLocaleDateString("es-ES", { day: "numeric", month: "long" })}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {reelCount} reels · {postCount} posts · {storyCount} stories
                        {plan.client_id && ` · ${clientName(plan.client_id)}`}
                      </p>
                      {plan.special_dates && <p className="text-xs text-primary mt-1">📅 {plan.special_dates}</p>}
                    </div>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => { e.stopPropagation(); deleteWeeklyPlan(plan.id); }}>
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
          {shootingPlans.length === 0 && <EmptyState icon={<Camera className="h-12 w-12 text-muted-foreground mx-auto mb-4" />} title={t("noRecordingSessions")} desc={t("sessionsAppearHere")} />}
          <div className="space-y-3">
            {shootingPlans.map((plan) => {
              const pd = plan.plan_data;
              const reelCount = pd?.reels?.length || 0;
              return (
                <Card key={plan.id} className="bg-card border-border group cursor-pointer hover:border-primary/30 transition-colors" onClick={() => setDetail({ type: "shooting", data: plan })}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">
                        {t("sessionOfDays")} {plan.num_days} {plan.num_days === 1 ? t("day") : t("days")}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {reelCount} reels · {new Date(plan.created_at).toLocaleDateString("es-ES")}
                        {plan.client_id && ` · ${clientName(plan.client_id)}`}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => { e.stopPropagation(); deleteShootingPlan(plan.id); }}>
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

// --- Shared ---

function EmptyState({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="glass rounded-2xl p-12 text-center">
      {icon}
      <h3 className="text-lg font-medium mb-2">{title}</h3>
      <p className="text-muted-foreground text-sm">{desc}</p>
    </div>
  );
}

function DetailHeader({ onBack, onDelete, id, t }: { onBack: () => void; onDelete: (id: string) => void; id: string; t: (k: any) => string }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <Button variant="ghost" size="sm" onClick={onBack} className="gap-1">
        <ArrowLeft className="h-4 w-4" /> {t("backToLibrary")}
      </Button>
      <Button variant="ghost" size="sm" className="text-destructive" onClick={() => { onDelete(id); }}>
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

// --- Post Detail ---

function PostDetail({ post, onBack, onDelete, copyText, copiedId, t, clientName }: any) {
  const fullCaption = `${post.main_copy || ""}\n\n${(post.hashtags || []).map((h: string) => `#${h}`).join(" ")}`;
  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      <DetailHeader onBack={onBack} onDelete={onDelete} id={post.id} t={t} />
      <div className="space-y-4">
        {post.generated_image_url && (
          <div className="rounded-xl overflow-hidden max-w-md mx-auto">
            <img src={post.generated_image_url} alt={post.title} className="w-full object-cover" />
          </div>
        )}
        <div className="space-y-1">
          <h2 className="text-xl font-bold">{post.title}</h2>
          <p className="text-sm text-muted-foreground">
            {post.post_type} · {new Date(post.created_at).toLocaleDateString("es-ES")}
            {post.client_id && ` · ${clientName(post.client_id)}`}
          </p>
        </div>
        {post.main_copy && (
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex justify-between items-start gap-2 mb-2">
                <p className="text-xs font-medium text-muted-foreground uppercase">Caption</p>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => copyText(fullCaption, post.id)}>
                  {copiedId === post.id ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                </Button>
              </div>
              <p className="text-sm whitespace-pre-wrap">{post.main_copy}</p>
            </CardContent>
          </Card>
        )}
        {post.story_copy && (
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <p className="text-xs font-medium text-muted-foreground uppercase mb-2">Story</p>
              <p className="text-sm whitespace-pre-wrap">{post.story_copy}</p>
            </CardContent>
          </Card>
        )}
        {post.cta && (
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <p className="text-xs font-medium text-muted-foreground uppercase mb-2">CTA</p>
              <p className="text-sm">{post.cta}</p>
            </CardContent>
          </Card>
        )}
        {post.hashtags && post.hashtags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {post.hashtags.map((h: string, i: number) => (
              <span key={i} className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">#{h}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// --- Weekly Plan Detail ---

function WeeklyPlanDetail({ plan, onBack, onDelete, t, clientName }: any) {
  const pd = plan.plan_data;
  const allItems = [...(pd?.reels || []), ...(pd?.posts || (pd?.post ? [pd.post] : []))];
  const typeColors: Record<string, string> = {
    reel: "bg-blue-500/20 text-blue-400",
    post: "bg-green-500/20 text-green-400",
  };

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      <DetailHeader onBack={onBack} onDelete={onDelete} id={plan.id} t={t} />
      <div className="space-y-1 mb-6">
        <h2 className="text-xl font-bold">
          {t("weekOfLabel")} {new Date(plan.week_start).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })}
        </h2>
        <p className="text-sm text-muted-foreground">
          {plan.client_id && clientName(plan.client_id)}
          {plan.special_dates && ` · 📅 ${plan.special_dates}`}
        </p>
      </div>

      <div className="space-y-4">
        {allItems.map((item: any, idx: number) => (
          <Card key={idx} className="bg-card border-border">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full uppercase ${typeColors[item.type] || "bg-secondary text-muted-foreground"}`}>
                  {item.type}
                </span>
                {item.day && <span className="text-xs text-muted-foreground">{item.day}</span>}
              </div>
              <p className="font-semibold text-sm mb-1">{item.idea}</p>
              {item.hook && <p className="text-xs text-primary font-medium mb-2">🎬 "{item.hook}"</p>}
              {item.script && <p className="text-xs text-muted-foreground mb-2">{item.script}</p>}
              {item.shots && item.shots.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {item.shots.map((s: string, i: number) => (
                    <span key={i} className="text-[10px] bg-secondary px-2 py-0.5 rounded-full text-muted-foreground">{s}</span>
                  ))}
                </div>
              )}
              {item.caption && <p className="text-xs text-muted-foreground italic">"{item.caption}"</p>}
              {item.hashtags && item.hashtags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {item.hashtags.map((h: string, i: number) => (
                    <span key={i} className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">#{h}</span>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {pd?.stories && pd.stories.length > 0 && (
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">{t("storiesIdeas")}</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                {pd.stories.map((story: any, idx: number) => (
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
  );
}

// --- Shooting Plan Detail ---

function ShootingPlanDetail({ plan, onBack, onDelete, t, clientName }: any) {
  const pd = plan.plan_data;
  const reels = pd?.reels || [];
  const supportShots = pd?.planos_apoyo || pd?.support_shots || [];
  const reusableShots = pd?.planos_reutilizables || [];
  const recordingOrder = pd?.orden_grabacion || [];
  const estimatedDuration = pd?.duracion_estimada || "";

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      <DetailHeader onBack={onBack} onDelete={onDelete} id={plan.id} t={t} />
      <div className="space-y-1 mb-6">
        <h2 className="text-xl font-bold">
          {t("sessionOfDays")} {plan.num_days} {plan.num_days === 1 ? t("day") : t("days")}
        </h2>
        <p className="text-sm text-muted-foreground">
          {new Date(plan.created_at).toLocaleDateString("es-ES")}
          {plan.client_id && ` · ${clientName(plan.client_id)}`}
        </p>
      </div>

      <div className="space-y-4">
        {reels.map((reel: any, idx: number) => (
          <Card key={idx} className="bg-card border-border">
            <CardContent className="p-5">
              <Badge className="mb-2 bg-blue-500/20 text-blue-400 border-0">Reel {idx + 1}</Badge>
              <p className="font-semibold text-sm mb-1">{reel.idea || reel.title}</p>
              {reel.hook && <p className="text-xs text-primary font-medium mb-2">🎬 "{reel.hook}"</p>}
              {reel.storyboard && reel.storyboard.length > 0 && (
                <div className="mt-2 space-y-1">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase">{t("storyboard")}</p>
                  {reel.storyboard.map((step: any, i: number) => (
                    <p key={i} className="text-xs text-muted-foreground">
                      {i + 1}. {typeof step === "string" ? step : step.description || step.accion || JSON.stringify(step)}
                    </p>
                  ))}
                </div>
              )}
              {reel.shots && reel.shots.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {reel.shots.map((s: string, i: number) => (
                    <span key={i} className="text-[10px] bg-secondary px-2 py-0.5 rounded-full text-muted-foreground">{s}</span>
                  ))}
                </div>
              )}
              {reel.caption && <p className="text-xs text-muted-foreground italic mt-2">"{reel.caption}"</p>}
            </CardContent>
          </Card>
        ))}

        {reusableShots.length > 0 && (
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">{t("reusableShots")}</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex flex-wrap gap-1.5">
                {reusableShots.map((shot: any, i: number) => (
                  <Badge key={i} variant="outline" className="text-xs">{typeof shot === "string" ? shot : shot.nombre || shot.name}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {recordingOrder.length > 0 && (
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">{t("recordingOrder")}</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-2">
              {recordingOrder.map((step: any, i: number) => (
                <div key={i} className="flex gap-3 items-start text-sm">
                  <span className="text-xs font-bold text-primary shrink-0">{i + 1}.</span>
                  <span className="text-muted-foreground">{typeof step === "string" ? step : step.descripcion || step.description || JSON.stringify(step)}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {supportShots.length > 0 && (
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">{t("supportShots")}</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex flex-wrap gap-1.5">
                {supportShots.map((shot: string, i: number) => (
                  <Badge key={i} variant="secondary" className="text-xs">{shot}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {estimatedDuration && (
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4">
              <p className="text-sm font-medium text-primary">⏱ {estimatedDuration}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

import { useClients } from "@/contexts/ClientContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { PenSquare, Film, Calendar, Camera } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Dashboard() {
  const { activeClient, clients } = useClients();
  const navigate = useNavigate();
  const [recentPosts, setRecentPosts] = useState<any[]>([]);

  useEffect(() => {
    loadRecentPosts();
  }, [activeClient]);

  const loadRecentPosts = async () => {
    let query = supabase
      .from("generated_posts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(5);

    const { data } = await query;
    if (data) setRecentPosts(data);
  };

  const quickActions = [
    { label: "Crear contenido", icon: PenSquare, path: "/create" },
    { label: "Ideas de reels", icon: Film, path: "/strategy/reels" },
    { label: "Calendario mensual", icon: Calendar, path: "/strategy/calendar" },
    { label: "Día de grabación", icon: Camera, path: "/shooting" },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        {activeClient ? (
          <p className="text-muted-foreground mt-1">
            Cliente activo:{" "}
            <span className="text-primary font-medium">{activeClient.name}</span>
            {activeClient.city && ` · ${activeClient.city}`}
          </p>
        ) : clients.length === 0 ? (
          <p className="text-muted-foreground mt-1">
            Empieza añadiendo tu primer cliente en{" "}
            <button
              onClick={() => navigate("/settings")}
              className="text-primary underline"
            >
              Configuración
            </button>
          </p>
        ) : null}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {quickActions.map((action) => (
          <button
            key={action.label}
            onClick={() => navigate(action.path)}
            className="glass glass-hover rounded-xl p-6 flex flex-col items-center gap-3 text-center transition-all hover:shadow-glow"
          >
            <div
              className="h-12 w-12 rounded-xl flex items-center justify-center"
              style={{ background: "var(--gradient-primary)" }}
            >
              <action.icon className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="font-medium text-sm">{action.label}</span>
          </button>
        ))}
      </div>

      {/* Active Client Info */}
      {activeClient && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">{activeClient.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              {activeClient.type && (
                <div>
                  <p className="text-muted-foreground text-xs">Tipo</p>
                  <p className="font-medium">{activeClient.type}</p>
                </div>
              )}
              {activeClient.city && (
                <div>
                  <p className="text-muted-foreground text-xs">Ciudad</p>
                  <p className="font-medium">{activeClient.city}</p>
                </div>
              )}
              {activeClient.tone && (
                <div>
                  <p className="text-muted-foreground text-xs">Tono</p>
                  <p className="font-medium">{activeClient.tone}</p>
                </div>
              )}
              {activeClient.objective && (
                <div>
                  <p className="text-muted-foreground text-xs">Objetivo</p>
                  <p className="font-medium">{activeClient.objective}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Content */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg">Contenido reciente</CardTitle>
        </CardHeader>
        <CardContent>
          {recentPosts.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No hay contenido generado aún.
            </p>
          ) : (
            <div className="space-y-3">
              {recentPosts.map((post) => (
                <div
                  key={post.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-secondary/50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{post.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {post.post_type} ·{" "}
                      {new Date(post.created_at).toLocaleDateString("es-ES")}
                    </p>
                  </div>
                  {post.generated_image_url && (
                    <img
                      src={post.generated_image_url}
                      alt=""
                      className="h-10 w-10 rounded object-cover ml-3 shrink-0"
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

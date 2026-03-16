import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useClients } from "@/contexts/ClientContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { FolderOpen, Copy, Check, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export default function Library() {
  const { clients, activeClient } = useClients();
  const { toast } = useToast();
  const [posts, setPosts] = useState<any[]>([]);
  const [filterType, setFilterType] = useState("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    loadPosts();
  }, [activeClient, filterType]);

  const loadPosts = async () => {
    let query = supabase
      .from("generated_posts")
      .select("*")
      .order("created_at", { ascending: false });

    if (filterType !== "all") {
      query = query.eq("post_type", filterType);
    }

    const { data } = await query;
    if (data) setPosts(data);
  };

  const copyCaption = (post: any) => {
    const text = `${post.main_copy}\n\n${(post.hashtags || []).map((h: string) => `#${h}`).join(" ")}`;
    navigator.clipboard.writeText(text);
    setCopiedId(post.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const deletePost = async (id: string) => {
    const { error } = await supabase.from("generated_posts").delete().eq("id", id);
    if (error) {
      toast({ variant: "destructive", title: "Error al eliminar" });
    } else {
      setPosts((prev) => prev.filter((p) => p.id !== id));
      toast({ title: "Contenido eliminado" });
    }
  };

  return (
    <div className="max-w-5xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Biblioteca</h1>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[160px] bg-secondary border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="post">Posts</SelectItem>
            <SelectItem value="reel">Reels</SelectItem>
            <SelectItem value="carousel">Carruseles</SelectItem>
            <SelectItem value="story">Stories</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {posts.length === 0 && (
        <div className="glass rounded-2xl p-12 text-center">
          <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Biblioteca vacía</h3>
          <p className="text-muted-foreground text-sm">
            El contenido que generes aparecerá aquí.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {posts.map((post) => (
          <Card key={post.id} className="bg-card border-border overflow-hidden group">
            {post.generated_image_url && (
              <div className="aspect-square overflow-hidden">
                <img
                  src={post.generated_image_url}
                  alt={post.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{post.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {post.post_type} ·{" "}
                    {new Date(post.created_at).toLocaleDateString("es-ES")}
                  </p>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => copyCaption(post)}
                  >
                    {copiedId === post.id ? (
                      <Check className="h-3.5 w-3.5 text-green-500" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-destructive"
                    onClick={() => deletePost(post.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              {post.main_copy && (
                <p className="text-xs text-muted-foreground mt-2 line-clamp-3">
                  {post.main_copy}
                </p>
              )}
              {post.hashtags && post.hashtags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {post.hashtags.slice(0, 5).map((h: string, i: number) => (
                    <span
                      key={i}
                      className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full"
                    >
                      #{h}
                    </span>
                  ))}
                  {post.hashtags.length > 5 && (
                    <span className="text-[10px] text-muted-foreground">
                      +{post.hashtags.length - 5}
                    </span>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

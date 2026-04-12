import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  Trash2,
  Copy,
  Image as ImageIcon,
  Film,
  Layers,
  CircleDot,
  Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Post {
  id: string;
  post_type: string;
  title: string;
  description: string | null;
  cta: string | null;
  generated_image_url: string | null;
  main_copy: string | null;
  story_copy: string | null;
  hashtags: string[] | null;
  created_at: string;
}

interface PostHistoryProps {
  userId: string;
}

const POST_TYPE_ICONS: Record<string, typeof ImageIcon> = {
  post: ImageIcon,
  reel: Film,
  carousel: Layers,
  story: CircleDot,
};

export function PostHistory({ userId }: PostHistoryProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadPosts();
  }, [userId]);

  const loadPosts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("generated_posts")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPosts(data || []);
    } catch (error: any) {
      console.error("Error loading posts:", error);
    } finally {
      setLoading(false);
    }
  };

  const deletePost = async (id: string) => {
    try {
      // Collect image URLs before deleting the row
      const post = posts.find((p) => p.id === id);
      const imageUrls = [post?.generated_image_url, post?.original_image_url];

      const { error } = await supabase
        .from("generated_posts")
        .delete()
        .eq("id", id);

      if (error) throw error;
      setPosts(posts.filter((p) => p.id !== id));
      if (selectedPost?.id === id) setSelectedPost(null);
      toast({ title: "Post eliminado" });
      // Cleanup orphaned storage files (best-effort)
      const { cleanupStorageUrls } = await import("@/lib/storageCleanup");
      cleanupStorageUrls(imageUrls);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error al eliminar",
        description: error.message,
      });
    }
  };

  const copyToClipboard = async (text: string) => {
    const { copyToClipboard: copy } = await import("@/lib/clipboard");
    await copy(text);
    toast({ title: "Copiado al portapapeles" });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-secondary flex items-center justify-center">
          <ImageIcon className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium mb-2">Sin posts guardados</h3>
        <p className="text-muted-foreground text-sm">
          Los posts que generes aparecerán aquí
        </p>
      </div>
    );
  }

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      {/* Posts Grid */}
      <div className="lg:col-span-1 space-y-3 max-h-[600px] overflow-y-auto pr-2">
        {posts.map((post) => {
          const Icon = POST_TYPE_ICONS[post.post_type] || ImageIcon;
          const isSelected = selectedPost?.id === post.id;

          return (
            <button
              key={post.id}
              onClick={() => setSelectedPost(post)}
              className={cn(
                "w-full p-4 rounded-xl border text-left transition-all duration-300",
                isSelected
                  ? "border-primary bg-primary/10"
                  : "border-border bg-card hover:border-primary/50"
              )}
            >
              <div className="flex items-start gap-3">
                {post.generated_image_url ? (
                  <img
                    src={post.generated_image_url}
                    alt={post.title}
                    className="w-14 h-14 rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-lg bg-secondary flex items-center justify-center">
                    <Icon className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm truncate">{post.title}</h4>
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    <Icon className="h-3 w-3" />
                    <span className="capitalize">{post.post_type}</span>
                    <span>•</span>
                    <Calendar className="h-3 w-3" />
                    <span>
                      {new Date(post.created_at).toLocaleDateString("es")}
                    </span>
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Post Detail */}
      <div className="lg:col-span-2">
        {selectedPost ? (
          <div className="glass rounded-xl p-6 space-y-5 animate-fade-in">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold">{selectedPost.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {new Date(selectedPost.created_at).toLocaleDateString("es", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => deletePost(selectedPost.id)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            {selectedPost.generated_image_url && (
              <img
                src={selectedPost.generated_image_url}
                alt={selectedPost.title}
                className={cn(
                  "w-full rounded-lg object-cover",
                  selectedPost.post_type === "reel" ||
                    selectedPost.post_type === "story"
                    ? "max-h-[400px] object-contain bg-secondary"
                    : "aspect-square max-w-[300px]"
                )}
              />
            )}

            {selectedPost.main_copy && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">Copy principal</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(selectedPost.main_copy!)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-sm bg-secondary rounded-lg p-3 whitespace-pre-wrap max-h-[150px] overflow-y-auto">
                  {selectedPost.main_copy}
                </p>
              </div>
            )}

            {selectedPost.story_copy && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">Copy para Stories</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(selectedPost.story_copy!)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-sm bg-secondary rounded-lg p-3">
                  {selectedPost.story_copy}
                </p>
              </div>
            )}

            {selectedPost.hashtags && selectedPost.hashtags.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">
                    Hashtags ({selectedPost.hashtags.length})
                  </h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      copyToClipboard(
                        selectedPost.hashtags!.map((h) => `#${h}`).join(" ")
                      )
                    }
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedPost.hashtags.map((tag, i) => (
                    <span
                      key={i}
                      className="text-xs bg-primary/20 text-primary px-2 py-1 rounded-full"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="glass rounded-xl p-12 text-center">
            <p className="text-muted-foreground">
              Selecciona un post para ver los detalles
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useClients } from "@/contexts/ClientContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ImageIcon, Sparkles, Upload, Wand2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface MediaAsset {
  id: string;
  image_url: string;
  source: "generated" | "uploaded" | "edited";
  original_prompt: string | null;
  file_name: string | null;
  created_at: string;
}

const SOURCE_FILTERS = [
  { value: "all", labelKey: "mediaAll" as const },
  { value: "generated", labelKey: "mediaGenerated" as const, icon: Sparkles },
  { value: "uploaded", labelKey: "mediaUploaded" as const, icon: Upload },
  { value: "edited", labelKey: "mediaEdited" as const, icon: Wand2 },
];

export default function MediaLibrary() {
  const { activeClient } = useClients();
  const { t } = useLanguage();
  const { toast } = useToast();
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [selectedAsset, setSelectedAsset] = useState<MediaAsset | null>(null);

  useEffect(() => {
    if (activeClient) loadAssets();
  }, [activeClient?.id]);

  const loadAssets = async () => {
    if (!activeClient) return;
    setLoading(true);
    try {
      let query = (supabase as any)
        .from("media_assets")
        .select("id, image_url, source, original_prompt, file_name, created_at")
        .eq("client_id", activeClient.id)
        .order("created_at", { ascending: false })
        .limit(100);

      const { data, error } = await query;
      if (error) throw error;
      setAssets((data as MediaAsset[]) || []);
    } catch (e: any) {
      console.error("Error loading media assets:", e);
    } finally {
      setLoading(false);
    }
  };

  const filteredAssets = filter === "all" ? assets : assets.filter((a) => a.source === filter);

  const sourceLabel = (source: string) => {
    if (source === "generated") return t("mediaGenerated");
    if (source === "edited") return t("mediaEdited");
    return t("mediaUploaded");
  };

  return (
    <div className="max-w-5xl mx-auto animate-fade-in">
      <h1 className="text-3xl font-bold">{t("mediaLibraryTitle")}</h1>
      <p className="text-sm text-muted-foreground mt-1 mb-6">{t("mediaLibrarySubtitle")}</p>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        {SOURCE_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={cn(
              "py-2 px-4 rounded-lg text-sm font-medium transition-all flex items-center gap-2",
              filter === f.value
                ? "text-primary-foreground shadow-md"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            )}
            style={filter === f.value ? { background: "var(--gradient-primary)" } : undefined}
          >
            {f.icon && <f.icon className="h-4 w-4" />}
            {t(f.labelKey)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredAssets.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-1">{t("mediaEmptyTitle")}</h3>
          <p className="text-sm text-muted-foreground">{t("mediaEmptyDesc")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {filteredAssets.map((asset) => (
            <button
              key={asset.id}
              onClick={() => setSelectedAsset(selectedAsset?.id === asset.id ? null : asset)}
              className={cn(
                "group relative aspect-square rounded-xl overflow-hidden border-2 transition-all",
                selectedAsset?.id === asset.id
                  ? "border-primary shadow-glow"
                  : "border-transparent hover:border-primary/40"
              )}
            >
              <img
                src={asset.image_url}
                alt={asset.file_name || ""}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-xs text-white/90 font-medium">{sourceLabel(asset.source)}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Detail panel */}
      {selectedAsset && (
        <div className="glass rounded-2xl p-5 mt-6 animate-fade-in">
          <div className="flex flex-col sm:flex-row gap-5">
            <img
              src={selectedAsset.image_url}
              alt=""
              className="w-full sm:w-64 h-64 object-contain rounded-xl bg-secondary"
            />
            <div className="flex-1 space-y-3">
              <div>
                <span className="text-xs text-muted-foreground">{t("mediaSourceLabel")}</span>
                <p className="text-sm font-medium">{sourceLabel(selectedAsset.source)}</p>
              </div>
              {selectedAsset.original_prompt && (
                <div>
                  <span className="text-xs text-muted-foreground">{t("mediaPromptLabel")}</span>
                  <p className="text-sm text-muted-foreground line-clamp-4">{selectedAsset.original_prompt}</p>
                </div>
              )}
              <div>
                <span className="text-xs text-muted-foreground">{t("mediaDateLabel")}</span>
                <p className="text-sm">
                  {new Date(selectedAsset.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

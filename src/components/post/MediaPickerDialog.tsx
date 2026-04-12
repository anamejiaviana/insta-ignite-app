import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface MediaAsset {
  id: string;
  image_url: string;
  source: string;
  original_prompt: string | null;
  created_at: string;
}

interface MediaPickerDialogProps {
  open: boolean;
  onClose: () => void;
  onSelect: (imageUrl: string) => void;
  clientId: string;
}

export function MediaPickerDialog({ open, onClose, onSelect, clientId }: MediaPickerDialogProps) {
  const { t } = useLanguage();
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && clientId) {
      setLoading(true);
      (supabase as any)
        .from("media_assets")
        .select("id, image_url, source, original_prompt, created_at")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false })
        .limit(50)
        .then(({ data }: any) => {
          setAssets((data as MediaAsset[]) || []);
          setLoading(false);
        });
    }
  }, [open, clientId]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("mediaSelectTitle")}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : assets.length === 0 ? (
          <div className="text-center py-12">
            <ImageIcon className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">{t("mediaSelectEmpty")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {assets.map((asset) => (
              <button
                key={asset.id}
                onClick={() => {
                  onSelect(asset.image_url);
                  onClose();
                }}
                className="aspect-square rounded-lg overflow-hidden border-2 border-transparent hover:border-primary transition-all"
              >
                <img
                  src={asset.image_url}
                  alt=""
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

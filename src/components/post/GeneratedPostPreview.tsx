import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { EditableCopyBlock } from "./EditableCopyBlock";
import {
  Copy,
  Download,
  RefreshCw,
  Save,
  ArrowLeft,
  Loader2,
  Hash,
  MessageSquare,
  Smartphone,
  Camera,
  Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface GeneratedPost {
  mainCopy: string;
  storyCopy: string;
  hashtags: string[];
  imagePrompt: string;
  imageUrl?: string;
}

interface GeneratedPostPreviewProps {
  post: GeneratedPost;
  postType: string;
  loading: boolean;
  onSave: () => void;
  onReset: () => void;
  onRegenerateImage: () => void;
  onCopyChange?: (mainCopy: string, storyCopy: string) => void;
  fromCalendar?: boolean;
  prefillData?: {
    title?: string;
    hook?: string;
    shots?: string[];
    script?: string;
  };
}

export function GeneratedPostPreview({
  post,
  postType,
  loading,
  onSave,
  onReset,
  onRegenerateImage,
  onCopyChange,
  fromCalendar,
  prefillData,
}: GeneratedPostPreviewProps) {
  const { toast } = useToast();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [editedMainCopy, setEditedMainCopy] = useState(post.mainCopy);
  const [editedStoryCopy, setEditedStoryCopy] = useState(post.storyCopy);

  const handleMainCopyChange = (val: string) => {
    setEditedMainCopy(val);
    onCopyChange?.(val, editedStoryCopy);
  };

  const handleStoryCopyChange = (val: string) => {
    setEditedStoryCopy(val);
    onCopyChange?.(editedMainCopy, val);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: `${label} copiado` });
  };

  const downloadImage = () => {
    if (!post.imageUrl) return;
    const link = document.createElement("a");
    link.href = post.imageUrl;
    link.download = `instagram-${postType}-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrepareShootingDay = () => {
    navigate("/shooting", {
      state: {
        prefillIdea: prefillData?.title || "",
        fromContent: true,
      },
    });
  };

  const hashtagsText = post.hashtags.map((h) => `#${h}`).join(" ");

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top actions - calendar-aware */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        {fromCalendar ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/strategy/calendar")}
          >
            <Calendar className="h-4 w-4 mr-2" />
            {t("backToCalendarPrimary")}
          </Button>
        ) : (
          <Button variant="ghost" size="sm" onClick={onReset}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t("generateAnotherPost")}
          </Button>
        )}
        <div className="flex items-center gap-2">
          {fromCalendar && (
            <Button variant="ghost" size="sm" onClick={onReset}>
              {t("generateAnotherPost")}
            </Button>
          )}
          <Button variant="gradient" onClick={onSave}>
            <Save className="h-4 w-4 mr-2" />
            Guardar en historial
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Image Preview */}
        <div className="space-y-3">
          <h4 className="font-medium flex items-center gap-2">
            <Smartphone className="h-4 w-4 text-primary" />
            Imagen
          </h4>
          <div
            className={cn(
              "relative rounded-xl overflow-hidden bg-secondary flex items-center justify-center",
              postType === "reel" || postType === "story"
                ? "aspect-[9/16] max-h-[500px]"
                : "aspect-square"
            )}
          >
            {loading ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">
                  Generando imagen...
                </span>
              </div>
            ) : post.imageUrl ? (
              <img
                src={post.imageUrl}
                alt="Generated post"
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-muted-foreground">Sin imagen</span>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onRegenerateImage} disabled={loading}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Regenerar
            </Button>
            <Button variant="outline" size="sm" onClick={downloadImage} disabled={!post.imageUrl || loading}>
              <Download className="h-4 w-4 mr-2" />
              Descargar
            </Button>
          </div>
        </div>

        {/* Content Preview */}
        <div className="space-y-5">
          {/* Main Copy - Editable */}
          <EditableCopyBlock
            label="Copy principal"
            icon={<MessageSquare className="h-4 w-4 text-primary" />}
            value={editedMainCopy}
            originalValue={post.mainCopy}
            onChange={handleMainCopyChange}
          />

          {/* Story Copy - Editable */}
          <EditableCopyBlock
            label="Copy para Stories"
            icon={<Smartphone className="h-4 w-4 text-primary" />}
            value={editedStoryCopy}
            originalValue={post.storyCopy}
            onChange={handleStoryCopyChange}
          />

          {/* Hashtags */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-medium flex items-center gap-2">
                <Hash className="h-4 w-4 text-primary" />
                Hashtags ({post.hashtags.length})
              </h4>
              <Button variant="ghost" size="sm" onClick={() => copyToClipboard(hashtagsText, "Hashtags")}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <div className="glass rounded-lg p-4">
              <div className="flex flex-wrap gap-2">
                {post.hashtags.map((tag, i) => (
                  <span key={i} className="text-xs bg-primary/20 text-primary px-2 py-1 rounded-full">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Copy All */}
          <Button
            variant="secondary"
            className="w-full"
            onClick={() => copyToClipboard(`${post.mainCopy}\n\n${hashtagsText}`, "Contenido completo")}
          >
            <Copy className="h-4 w-4 mr-2" />
            Copiar todo (copy + hashtags)
          </Button>

          {/* Prepare shooting day - for reels from calendar */}
          {(postType === "reel" || postType === "story") && (
            <Button
              variant="outline"
              className="w-full"
              onClick={handlePrepareShootingDay}
            >
              <Camera className="h-4 w-4 mr-2" />
              {t("prepareShootingDay")}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

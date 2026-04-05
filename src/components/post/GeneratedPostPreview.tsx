import { useEffect, useState } from "react";
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
  Check,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface GeneratedPost {
  mainCopy: string;
  storyCopy: string;
  hashtags: string[];
  imagePrompt: string;
  imageUrl?: string;
  slidePrompts?: string[];
  imageUrls?: string[];
}

interface GeneratedPostPreviewProps {
  post: GeneratedPost;
  postType: string;
  loading: boolean;
  loadingMessage?: string;
  onSave: () => Promise<void> | void;
  onReset: () => void;
  onRegenerateImage: () => void;
  onCopyChange?: (mainCopy: string, storyCopy: string) => void;
  fromCalendar?: boolean;
  calendarPlanId?: string;
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
  loadingMessage,
  onSave,
  onReset,
  onRegenerateImage,
  onCopyChange,
  fromCalendar,
  calendarPlanId,
  prefillData,
}: GeneratedPostPreviewProps) {
  const { toast } = useToast();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [editedMainCopy, setEditedMainCopy] = useState(post.mainCopy);
  const [editedStoryCopy, setEditedStoryCopy] = useState(post.storyCopy);
  const [saved, setSaved] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const isCarousel = postType === "carousel" && (post.imageUrls?.length ?? 0) > 0;
  const carouselImages = post.imageUrls || [];
  const totalSlides = carouselImages.length;

  useEffect(() => {
    setEditedMainCopy(post.mainCopy);
  }, [post.mainCopy]);

  useEffect(() => {
    setEditedStoryCopy(post.storyCopy);
  }, [post.storyCopy]);

  const handleMainCopyChange = (val: string) => {
    setEditedMainCopy(val);
    onCopyChange?.(val, editedStoryCopy);
  };

  const handleStoryCopyChange = (val: string) => {
    setEditedStoryCopy(val);
    onCopyChange?.(editedMainCopy, val);
  };

  const copyToClipboard = async (text: string, label: string) => {
    const { copyToClipboard: copy } = await import("@/lib/clipboard");
    await copy(text);
    toast({ title: `${label} copiado` });
  };

  const downloadImage = () => {
    const url = isCarousel ? carouselImages[currentSlide] : post.imageUrl;
    if (!url) return;
    const link = document.createElement("a");
    link.href = url;
    link.download = `instagram-${postType}-${isCarousel ? `slide${currentSlide + 1}-` : ""}${Date.now()}.png`;
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

  const handleSave = async () => {
    await onSave();
    setSaved(true);
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
            onClick={() => navigate("/strategy/calendar", { state: { returnToPlanId: calendarPlanId } })}
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
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 overflow-hidden">
        {/* Image Preview */}
        <div className="space-y-3 min-w-0">
          <h4 className="font-medium flex items-center gap-2 text-sm sm:text-base">
            <Smartphone className="h-4 w-4 text-primary shrink-0" />
            <span className="truncate">{isCarousel ? `Imagen ${currentSlide + 1} ${t("carouselSlideOf")} ${totalSlides}` : "Imagen"}</span>
          </h4>
          <div
            className={cn(
              "relative rounded-xl overflow-hidden bg-secondary flex items-center justify-center w-full",
              postType === "reel" || postType === "story"
                ? "aspect-[9/16] max-h-[500px]"
                : "aspect-square"
            )}
          >
            {loading ? (
              <div className="flex flex-col items-center gap-3 px-4 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">
                  {loadingMessage ?? (isCarousel ? t("generatingCarousel") : t("generatingImage"))}
                </span>
              </div>
            ) : isCarousel ? (
              carouselImages[currentSlide] ? (
                <img
                  src={carouselImages[currentSlide]}
                  alt={`Carousel slide ${currentSlide + 1}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">
                    {t("generatingImageN")} {currentSlide + 1}...
                  </span>
                </div>
              )
            ) : post.imageUrl ? (
              <img
                src={post.imageUrl}
                alt="Generated post"
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-muted-foreground">Sin imagen</span>
            )}

            {/* Carousel navigation arrows */}
            {isCarousel && totalSlides > 1 && !loading && (
              <>
                <button
                  onClick={() => setCurrentSlide((prev) => Math.max(0, prev - 1))}
                  disabled={currentSlide === 0}
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/80 backdrop-blur-sm rounded-full p-1.5 disabled:opacity-30 hover:bg-background transition-colors"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setCurrentSlide((prev) => Math.min(totalSlides - 1, prev + 1))}
                  disabled={currentSlide === totalSlides - 1}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/80 backdrop-blur-sm rounded-full p-1.5 disabled:opacity-30 hover:bg-background transition-colors"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </>
            )}
          </div>

          {/* Carousel dots */}
          {isCarousel && totalSlides > 1 && (
            <div className="flex justify-center gap-1.5">
              {carouselImages.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentSlide(i)}
                  className={cn(
                    "w-2 h-2 rounded-full transition-all",
                    i === currentSlide ? "bg-primary w-4" : "bg-muted-foreground/30"
                  )}
                />
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={onRegenerateImage} disabled={loading}>
              <RefreshCw className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="text-xs sm:text-sm">Regenerar</span>
            </Button>
            <Button variant="outline" size="sm" onClick={downloadImage} disabled={!(isCarousel ? carouselImages[currentSlide] : post.imageUrl) || loading}>
              <Download className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="text-xs sm:text-sm">{isCarousel ? "Slide" : "Descargar"}</span>
            </Button>
            {isCarousel && totalSlides > 1 && (
              <Button variant="outline" size="sm" onClick={() => {
                carouselImages.forEach((url, i) => {
                  setTimeout(() => {
                    const link = document.createElement("a");
                    link.href = url;
                    link.download = `instagram-carousel-slide${i + 1}-${Date.now()}.png`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }, i * 300);
                });
              }} disabled={loading}>
                <Download className="h-4 w-4 mr-1 sm:mr-2" />
                <span className="text-xs sm:text-sm">Todas ({totalSlides})</span>
              </Button>
            )}
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
            onClick={() => copyToClipboard(`${editedMainCopy}\n\n${hashtagsText}`, "Contenido completo")}
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

      {/* Bottom save section */}
      <div className="border-t border-border pt-6 space-y-3">
        {!saved && (
          <p className="text-sm text-muted-foreground text-center">
            ⚠️ Este contenido no se guardará automáticamente. Guárdalo en el historial para no perderlo.
          </p>
        )}
        <Button
          variant={saved ? "outline" : "gradient"}
          size="xl"
          className="w-full"
          onClick={handleSave}
          disabled={saved}
        >
          {saved ? (
            <><Check className="h-5 w-5 mr-2 text-green-500" /> Contenido guardado en el historial</>
          ) : (
            <><Save className="h-5 w-5 mr-2" /> Guardar en historial</>
          )}
        </Button>
      </div>
    </div>
  );
}

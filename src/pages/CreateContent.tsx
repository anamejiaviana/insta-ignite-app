import { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useClients } from "@/contexts/ClientContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { GeneratedPostPreview } from "@/components/post/GeneratedPostPreview";
import { Loader2, Sparkles, Upload, Wand2, Image, ArrowLeft } from "lucide-react";

const POST_TYPES = [
  { value: "post", label: "Post" },
  { value: "reel", label: "Reel" },
  { value: "carousel", label: "Carrusel" },
  { value: "story", label: "Story" },
];

const VISUAL_STYLES = [
  "fotografía gourmet",
  "lifestyle",
  "minimalista",
  "editorial",
  "instagram moderno",
  "dark mood",
  "fondo claro",
];

const IMAGE_SOURCES = [
  { value: "generate", label: "generateWithAI", icon: Sparkles },
  { value: "upload", label: "uploadImage", icon: Upload },
  { value: "edit", label: "editWithAI", icon: Wand2 },
];

interface GeneratedPost {
  mainCopy: string;
  storyCopy: string;
  hashtags: string[];
  imagePrompt: string;
  imageUrl?: string;
  slidePrompts?: string[];
  imageUrls?: string[];
}

interface PrefillData {
  title: string;
  postType: string;
  description?: string;
  hook?: string;
  shots?: string[];
  caption?: string;
  hashtags?: string[];
  imagePrompt?: string;
}

export default function CreateContent() {
  const { activeClient } = useClients();
  const { t } = useLanguage();
  const { toast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const locState = location.state as any;
  const prefill = locState?.prefill as PrefillData | undefined;
  const fromCalendar = locState?.fromCalendar === true;
  const calendarPlanId = locState?.planId as string | undefined;

  const [postType, setPostType] = useState(prefill?.postType || "post");
  const [visualStyle, setVisualStyle] = useState("");
  const [imageSource, setImageSource] = useState("generate");
  const [title, setTitle] = useState(prefill?.title || "");
  const [description, setDescription] = useState(prefill?.description || "");
  const [objective, setObjective] = useState("");
  const [cta, setCta] = useState("");
  const [editPrompt, setEditPrompt] = useState("");
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [generatedPost, setGeneratedPost] = useState<GeneratedPost | null>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"content" | "image">("content");
  const [carouselSlideCount, setCarouselSlideCount] = useState(3);
  const editedCopiesRef = useRef<{ mainCopy: string; storyCopy: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (prefill?.caption) {
      // Set initial post with caption data, then generate storyCopy via AI
      const initialPost: GeneratedPost = {
        mainCopy: prefill.caption,
        storyCopy: "",
        hashtags: prefill.hashtags || [],
        imagePrompt: prefill.imagePrompt || "",
      };
      setGeneratedPost(initialPost);

      // Generate storyCopy from the caption
      const generateStoryCopy = async () => {
        try {
          const clientContext = activeClient
            ? {
                name: activeClient.name,
                type: activeClient.type,
                city: activeClient.city,
                address: activeClient.address,
                tone: activeClient.tone,
                objective: activeClient.objective,
                keywords: activeClient.keywords,
                extra_context: activeClient.extra_context,
              }
            : null;

          const { data, error } = await supabase.functions.invoke("generate-post", {
            body: {
              title: prefill.title,
              description: prefill.description || prefill.caption,
              postType: prefill.postType,
              clientContext,
              language: activeClient?.content_language || "es",
              customFormat: true,
              formatInstructions: `A partir del siguiente copy principal, genera SOLO una versión corta para Stories de Instagram (máx 200 caracteres, directo e impactante). Responde en JSON: { "storyCopy": "..." }`,
            },
          });

          if (!error && data && !data.error && data.storyCopy) {
            setGeneratedPost((prev) =>
              prev ? { ...prev, storyCopy: data.storyCopy } : null
            );
          }
        } catch (e) {
          console.error("Error generating storyCopy:", e);
        }
      };

      generateStoryCopy();

      if (prefill.imagePrompt) {
        setStep("image");
        if (prefill.postType === "carousel") {
          // For carousels from calendar, generate slide prompts via AI then generate images
          const generateCarouselFromCalendar = async () => {
            try {
              const clientContext = activeClient
                ? {
                    name: activeClient.name,
                    type: activeClient.type,
                    city: activeClient.city,
                    address: activeClient.address,
                    tone: activeClient.tone,
                    objective: activeClient.objective,
                    keywords: activeClient.keywords,
                    extra_context: activeClient.extra_context,
                  }
                : null;

              const { data, error } = await supabase.functions.invoke("generate-post", {
                body: {
                  title: prefill.title,
                  description: prefill.description || prefill.caption,
                  postType: "carousel",
                  clientContext,
                  language: activeClient?.content_language || "es",
                  carouselSlideCount: carouselSlideCount,
                },
              });

              if (!error && data && !data.error && data.slidePrompts?.length > 0) {
                setGeneratedPost((prev) =>
                  prev
                    ? {
                        ...prev,
                        mainCopy: data.mainCopy || prev.mainCopy,
                        storyCopy: data.storyCopy || prev.storyCopy,
                        hashtags: data.hashtags || prev.hashtags,
                        imagePrompt: data.imagePrompt || prev.imagePrompt,
                        slidePrompts: data.slidePrompts,
                      }
                    : null
                );
                await generateCarouselImages(data.slidePrompts);
              } else if (prefill.imagePrompt) {
                // Fallback: generate single image if no slide prompts returned
                await generateImage(prefill.imagePrompt);
              }
            } catch (e) {
              console.error("Error generating carousel from calendar:", e);
            }
          };
          generateCarouselFromCalendar();
        } else {
          generateImage(prefill.imagePrompt);
        }
      }
    }
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setUploadedImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const generateContent = async () => {
    if (!title.trim()) {
      toast({ variant: "destructive", title: t("enterTitle") });
      return;
    }
    setLoading(true);
    setStep("content");
    try {
      const clientContext = activeClient
        ? {
            name: activeClient.name,
            type: activeClient.type,
            city: activeClient.city,
            address: activeClient.address,
            tone: activeClient.tone,
            objective: activeClient.objective,
            keywords: activeClient.keywords,
            extra_context: activeClient.extra_context,
          }
        : null;

      const { data, error } = await supabase.functions.invoke("generate-post", {
        body: {
          title,
          description,
          cta,
          objective,
          postType,
          visualStyle: visualStyle || activeClient?.default_visual_style,
          clientContext,
          language: activeClient?.content_language || "es",
          carouselSlideCount: postType === "carousel" ? carouselSlideCount : undefined,
        },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setGeneratedPost(data);
      setStep("image");

      if (postType === "carousel" && data.slidePrompts?.length > 0) {
        await generateCarouselImages(data.slidePrompts);
      } else if (imageSource === "generate") {
        await generateImage(data.imagePrompt);
      } else if (imageSource === "edit" && uploadedImage) {
        await editImage(uploadedImage, data.imagePrompt);
      } else if (imageSource === "upload" && uploadedImage) {
        setGeneratedPost((prev) => prev ? { ...prev, imageUrl: uploadedImage } : null);
      }
      toast({ title: t("contentGenerated") });
    } catch (error: any) {
      toast({ variant: "destructive", title: t("errorGenerating"), description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const generateImage = async (prompt: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("generate-image", {
        body: { prompt, postType, brandConfig: { visual_style: visualStyle || activeClient?.default_visual_style } },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      setGeneratedPost((prev) => prev ? { ...prev, imageUrl: data.imageUrl } : null);
    } catch (error: any) {
      toast({ variant: "destructive", title: t("errorGeneratingImage"), description: error.message });
    }
  };

  const generateCarouselImages = async (prompts: string[]) => {
    const urls: string[] = [];
    for (let i = 0; i < prompts.length; i++) {
      try {
        const { data, error } = await supabase.functions.invoke("generate-image", {
          body: {
            prompt: prompts[i],
            postType: "carousel",
            brandConfig: { visual_style: visualStyle || activeClient?.default_visual_style },
            slideIndex: i + 1,
            totalSlides: prompts.length,
          },
        });
        if (error) throw error;
        if (data.error) throw new Error(data.error);
        urls.push(data.imageUrl);
        setGeneratedPost((prev) => prev ? { ...prev, imageUrls: [...urls] } : null);
      } catch (error: any) {
        console.error(`Error generating carousel image ${i + 1}:`, error);
        urls.push("");
      }
    }
    // Set first image as imageUrl for backward compatibility
    if (urls.length > 0 && urls[0]) {
      setGeneratedPost((prev) => prev ? { ...prev, imageUrl: urls[0], imageUrls: urls } : null);
    }
  };

  const editImage = async (imageUrl: string, prompt: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("edit-image", {
        body: { imageUrl, editPrompt: editPrompt || prompt, postType, brandConfig: { visual_style: visualStyle } },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      setGeneratedPost((prev) => prev ? { ...prev, imageUrl: data.imageUrl } : null);
    } catch (error: any) {
      toast({ variant: "destructive", title: t("errorEditingImage"), description: error.message });
    }
  };

  const savePost = async () => {
    if (!generatedPost) return;
    try {
      const insertData: any = {
        user_id: (await supabase.auth.getUser()).data.user?.id,
        post_type: postType,
        title,
        description,
        cta,
        generated_image_url: generatedPost.imageUrl,
        original_image_url: uploadedImage,
        main_copy: editedCopiesRef.current?.mainCopy ?? generatedPost.mainCopy,
        story_copy: editedCopiesRef.current?.storyCopy ?? generatedPost.storyCopy,
        hashtags: generatedPost.hashtags,
        client_id: activeClient?.id || null,
        visual_style: visualStyle,
        objective,
        content_category: "post",
        content_data: postType === "carousel" && generatedPost.imageUrls?.length
          ? { carouselImageUrls: generatedPost.imageUrls }
          : null,
      };

      const { error } = await (supabase as any).from("generated_posts").insert(insertData);
      if (error) throw error;
      toast({ title: t("savedToLibrary") });
    } catch (error: any) {
      toast({ variant: "destructive", title: t("errorSaving"), description: error.message });
    }
  };

  const resetGenerator = () => {
    setGeneratedPost(null);
    setTitle("");
    setDescription("");
    setObjective("");
    setCta("");
    setUploadedImage(null);
    setEditPrompt("");
    setStep("content");
  };

  const hasPrefillDetails = prefill?.hook || prefill?.shots;

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      {/* Back to calendar link */}
      {fromCalendar && !generatedPost && (
        <button
          onClick={() => navigate("/strategy/calendar", { state: { returnToPlanId: calendarPlanId } })}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("backToCalendar")}
        </button>
      )}

      <h1 className="text-3xl font-bold">{t("createContent")}</h1>
      <p className="text-sm text-muted-foreground mt-1 mb-8">{t("createContentSubtitle")}</p>

      {/* Show prefill details if coming from weekly plan */}
      {hasPrefillDetails && !generatedPost && (
        <div className="glass rounded-2xl p-5 mb-6 space-y-3">
          <h3 className="text-sm font-medium text-primary">{t("weeklyPlanContent")}</h3>
          {prefill?.hook && (
            <div>
              <span className="text-xs text-muted-foreground">{t("hook")}:</span>
              <p className="text-sm font-medium">"{prefill.hook}"</p>
            </div>
          )}
          {prefill?.shots && prefill.shots.length > 0 && (
            <div>
              <span className="text-xs text-muted-foreground">{t("shots")}:</span>
              <ul className="mt-1 space-y-0.5">
                {prefill.shots.map((s, i) => (
                  <li key={i} className="text-sm text-muted-foreground flex items-center gap-2">
                    <span className="h-1 w-1 rounded-full bg-primary shrink-0" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {!generatedPost ? (
        <div className="glass rounded-2xl p-6 md:p-8 space-y-6">
          {/* Post Type */}
          <div className="space-y-2">
            <Label>{t("contentType")}</Label>
            <div className="grid grid-cols-4 gap-2">
              {POST_TYPES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setPostType(t.value)}
                  className={`py-2.5 px-3 rounded-lg text-sm font-medium transition-all ${
                    postType === t.value
                      ? "text-primary-foreground shadow-md"
                      : "bg-secondary text-muted-foreground hover:text-foreground"
                  }`}
                  style={postType === t.value ? { background: "var(--gradient-primary)" } : undefined}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Carousel slide count */}
          {postType === "carousel" && (
            <div className="space-y-2">
              <Label>{t("carouselSlideCount")}</Label>
              <div className="flex items-center gap-3">
                {[2, 3, 4, 5, 6, 7, 8, 10].map((n) => (
                  <button
                    key={n}
                    onClick={() => setCarouselSlideCount(n)}
                    className={`w-10 h-10 rounded-lg text-sm font-medium transition-all ${
                      carouselSlideCount === n
                        ? "text-primary-foreground shadow-md"
                        : "bg-secondary text-muted-foreground hover:text-foreground"
                    }`}
                    style={carouselSlideCount === n ? { background: "var(--gradient-primary)" } : undefined}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>{t("visualStyle")}</Label>
            <Select value={visualStyle} onValueChange={setVisualStyle}>
              <SelectTrigger className="bg-secondary border-border">
                <SelectValue placeholder={t("selectVisualStyle")} />
              </SelectTrigger>
              <SelectContent>
                {VISUAL_STYLES.map((s) => (
                  <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Image Source - only for posts */}
          {postType === "post" && (
            <div className="space-y-2">
              <Label>{t("imageSource")}</Label>
              <div className="grid grid-cols-3 gap-2">
                {IMAGE_SOURCES.map((src) => (
                  <button
                    key={src.value}
                    onClick={() => setImageSource(src.value)}
                    className={`py-2.5 px-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                      imageSource === src.value
                        ? "text-primary-foreground shadow-md"
                        : "bg-secondary text-muted-foreground hover:text-foreground"
                    }`}
                    style={imageSource === src.value ? { background: "var(--gradient-primary)" } : undefined}
                  >
                    <src.icon className="h-4 w-4" />
                    <span className="hidden sm:inline">{t(src.label as any)}</span>
                  </button>
                ))}
              </div>
              {imageSource === "edit" && (
                <p className="text-xs text-muted-foreground mt-1">{t("editWithAIDesc")}</p>
              )}
              {(imageSource === "upload" || imageSource === "edit") && (
                <div className="space-y-3 mt-3">
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                  <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="w-full h-28 border-dashed">
                    {uploadedImage ? (
                      <img src={uploadedImage} alt="Preview" className="max-h-24 rounded-lg object-contain" />
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Image className="h-8 w-8" />
                        <span className="text-sm">{t("uploadImage")}</span>
                      </div>
                    )}
                  </Button>
                  {imageSource === "edit" && uploadedImage && (
                    <Textarea placeholder={t("editInstructions")} value={editPrompt} onChange={(e) => setEditPrompt(e.target.value)} className="bg-secondary border-border" />
                  )}
                </div>
              )}
            </div>
          )}

          {/* Content Fields */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t("ideaOrTitle")}</Label>
              <Input placeholder={t("ideaPlaceholder")} value={title} onChange={(e) => setTitle(e.target.value)} className="bg-secondary border-border" />
            </div>
            <div className="space-y-2">
              <Label>{t("contextOptional")}</Label>
              <Textarea placeholder={t("describeContext")} value={description} onChange={(e) => setDescription(e.target.value)} className="bg-secondary border-border min-h-[80px]" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{t("objective")}</Label>
                <Select value={objective} onValueChange={setObjective}>
                  <SelectTrigger className="bg-secondary border-border">
                    <SelectValue placeholder={t("select")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="descubrir">{t("discover")}</SelectItem>
                    <SelectItem value="confiar">{t("trust")}</SelectItem>
                    <SelectItem value="comprar">{t("buy")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t("ctaLabel")}</Label>
                <Input placeholder={t("ctaPlaceholder")} value={cta} onChange={(e) => setCta(e.target.value)} className="bg-secondary border-border" />
              </div>
            </div>
          </div>

          <Button variant="gradient" size="xl" onClick={generateContent} disabled={loading || !title.trim()} className="w-full">
            {loading ? (
              <><Loader2 className="h-5 w-5 animate-spin" /> {t("generating")}</>
            ) : (
              <><Sparkles className="h-5 w-5" /> {t("generateContentBtn")}</>
            )}
          </Button>
        </div>
      ) : (
        <div className="glass rounded-2xl p-6 md:p-8 animate-fade-in">
          <GeneratedPostPreview
            post={generatedPost}
            postType={postType}
            loading={loading && step === "image"}
            onSave={savePost}
            onReset={resetGenerator}
            onRegenerateImage={() => {
              if (postType === "carousel" && generatedPost.slidePrompts?.length) {
                generateCarouselImages(generatedPost.slidePrompts);
              } else if (generatedPost.imagePrompt) {
                generateImage(generatedPost.imagePrompt);
              }
            }}
            onCopyChange={(mainCopy, storyCopy) => { editedCopiesRef.current = { mainCopy, storyCopy }; }}
            fromCalendar={fromCalendar}
            calendarPlanId={calendarPlanId}
            prefillData={prefill ? { title: prefill.title, hook: prefill.hook, shots: prefill.shots, script: prefill.description } : undefined}
          />
        </div>
      )}
    </div>
  );
}

import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useClients } from "@/contexts/ClientContext";
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
import { Loader2, Sparkles, Upload, Image, Wand2 } from "lucide-react";

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
  { value: "generate", label: "Generar con IA", icon: Sparkles },
  { value: "upload", label: "Subir imagen", icon: Upload },
  { value: "edit", label: "Editar con IA", icon: Wand2 },
];

interface GeneratedPost {
  mainCopy: string;
  storyCopy: string;
  hashtags: string[];
  imagePrompt: string;
  imageUrl?: string;
}

export default function CreateContent() {
  const { activeClient, clients } = useClients();
  const { toast } = useToast();

  const [postType, setPostType] = useState("post");
  const [visualStyle, setVisualStyle] = useState("");
  const [imageSource, setImageSource] = useState("generate");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [objective, setObjective] = useState("");
  const [cta, setCta] = useState("");
  const [editPrompt, setEditPrompt] = useState("");
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [generatedPost, setGeneratedPost] = useState<GeneratedPost | null>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"content" | "image">("content");
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      toast({ variant: "destructive", title: "Introduce un título" });
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
            tone: activeClient.tone,
            objective: activeClient.objective,
            keywords: activeClient.keywords,
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
          language: "es",
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setGeneratedPost(data);
      setStep("image");

      if (imageSource === "generate") {
        await generateImage(data.imagePrompt);
      } else if (imageSource === "edit" && uploadedImage) {
        await editImage(uploadedImage, data.imagePrompt);
      } else if (imageSource === "upload" && uploadedImage) {
        setGeneratedPost((prev) =>
          prev ? { ...prev, imageUrl: uploadedImage } : null
        );
      }

      toast({ title: "¡Contenido generado!" });
    } catch (error: any) {
      console.error("Generation error:", error);
      toast({
        variant: "destructive",
        title: "Error al generar",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const generateImage = async (prompt: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("generate-image", {
        body: {
          prompt,
          postType,
          brandConfig: { visual_style: visualStyle || activeClient?.default_visual_style },
        },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      setGeneratedPost((prev) =>
        prev ? { ...prev, imageUrl: data.imageUrl } : null
      );
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error al generar imagen",
        description: error.message,
      });
    }
  };

  const editImage = async (imageUrl: string, prompt: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("edit-image", {
        body: {
          imageUrl,
          editPrompt: editPrompt || prompt,
          postType,
          brandConfig: { visual_style: visualStyle },
        },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      setGeneratedPost((prev) =>
        prev ? { ...prev, imageUrl: data.imageUrl } : null
      );
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error al editar imagen",
        description: error.message,
      });
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
        main_copy: generatedPost.mainCopy,
        story_copy: generatedPost.storyCopy,
        hashtags: generatedPost.hashtags,
        client_id: activeClient?.id || null,
        visual_style: visualStyle,
        objective,
        content_category: "post",
      };

      const { error } = await (supabase as any)
        .from("generated_posts")
        .insert(insertData);
      if (error) throw error;
      toast({ title: "Post guardado en biblioteca" });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error al guardar",
        description: error.message,
      });
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

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      <h1 className="text-3xl font-bold mb-8">Crear contenido</h1>

      {!generatedPost ? (
        <div className="glass rounded-2xl p-6 md:p-8 space-y-6">
          {/* Post Type */}
          <div className="space-y-2">
            <Label>Tipo de contenido</Label>
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
                  style={
                    postType === t.value
                      ? { background: "var(--gradient-primary)" }
                      : undefined
                  }
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Visual Style */}
          <div className="space-y-2">
            <Label>Estilo visual</Label>
            <Select value={visualStyle} onValueChange={setVisualStyle}>
              <SelectTrigger className="bg-secondary border-border">
                <SelectValue placeholder="Seleccionar estilo visual" />
              </SelectTrigger>
              <SelectContent>
                {VISUAL_STYLES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Image Source */}
          <div className="space-y-2">
            <Label>Origen de la imagen</Label>
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
                  style={
                    imageSource === src.value
                      ? { background: "var(--gradient-primary)" }
                      : undefined
                  }
                >
                  <src.icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{src.label}</span>
                </button>
              ))}
            </div>

            {(imageSource === "upload" || imageSource === "edit") && (
              <div className="space-y-3 mt-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-28 border-dashed"
                >
                  {uploadedImage ? (
                    <img
                      src={uploadedImage}
                      alt="Preview"
                      className="max-h-24 rounded-lg object-contain"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Image className="h-8 w-8" />
                      <span className="text-sm">Subir imagen</span>
                    </div>
                  )}
                </Button>
                {imageSource === "edit" && uploadedImage && (
                  <Textarea
                    placeholder="Instrucciones de edición (opcional)..."
                    value={editPrompt}
                    onChange={(e) => setEditPrompt(e.target.value)}
                    className="bg-secondary border-border"
                  />
                )}
              </div>
            )}
          </div>

          {/* Content Fields */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Idea o título del contenido *</Label>
              <Input
                placeholder="Ej: 5 tips para mejorar tu productividad"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="bg-secondary border-border"
              />
            </div>
            <div className="space-y-2">
              <Label>Contexto</Label>
              <Textarea
                placeholder="Describe el contexto, a quién va dirigido..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="bg-secondary border-border min-h-[80px]"
              />
            </div>
            <div className="space-y-2">
              <Label>Objetivo</Label>
              <Select value={objective} onValueChange={setObjective}>
                <SelectTrigger className="bg-secondary border-border">
                  <SelectValue placeholder="¿Cuál es el objetivo?" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="descubrir">Descubrir</SelectItem>
                  <SelectItem value="confiar">Confiar</SelectItem>
                  <SelectItem value="comprar">Comprar</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>CTA (Call To Action)</Label>
              <Input
                placeholder="Ej: Guarda este post, Visita el link en bio..."
                value={cta}
                onChange={(e) => setCta(e.target.value)}
                className="bg-secondary border-border"
              />
            </div>
          </div>

          {/* Generate Button */}
          <Button
            variant="gradient"
            size="xl"
            onClick={generateContent}
            disabled={loading || !title.trim()}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Generando...
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5" />
                Generar contenido
              </>
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
            onRegenerateImage={() =>
              generatedPost.imagePrompt &&
              generateImage(generatedPost.imagePrompt)
            }
          />
        </div>
      )}
    </div>
  );
}

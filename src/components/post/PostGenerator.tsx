import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { PostTypeSelector } from "./PostTypeSelector";
import { ImageSourceSelector } from "./ImageSourceSelector";
import { GeneratedPostPreview } from "./GeneratedPostPreview";
import { Loader2, Sparkles, Upload } from "lucide-react";

interface BrandConfig {
  brand_name?: string;
  brand_voice?: string;
  visual_style?: string;
  default_language?: string;
  color_palette?: string[];
  logo_url?: string | null;
}

interface GeneratedPost {
  mainCopy: string;
  storyCopy: string;
  hashtags: string[];
  imagePrompt: string;
  imageUrl?: string;
}

interface PostGeneratorProps {
  userId: string;
  brandConfig?: BrandConfig | null;
}

export function PostGenerator({ userId, brandConfig }: PostGeneratorProps) {
  const [postType, setPostType] = useState("post");
  const [imageSource, setImageSource] = useState("generate");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [cta, setCta] = useState("");
  const [editPrompt, setEditPrompt] = useState("");
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [generatedPost, setGeneratedPost] = useState<GeneratedPost | null>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"content" | "image">("content");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedImage(reader.result as string);
      };
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
      const { data, error } = await supabase.functions.invoke("generate-post", {
        body: {
          title,
          description,
          cta,
          postType,
          brandConfig,
          language: brandConfig?.default_language || "es",
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setGeneratedPost(data);
      setStep("image");

      // If generating image, do it automatically
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
          brandConfig,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setGeneratedPost((prev) =>
        prev ? { ...prev, imageUrl: data.imageUrl } : null
      );
    } catch (error: any) {
      console.error("Image generation error:", error);
      toast({
        variant: "destructive",
        title: "Error al generar imagen",
        description: error.message,
      });
    }
  };

  const editImage = async (imageUrl: string, prompt: string) => {
    try {
      const finalPrompt = editPrompt || prompt;
      const { data, error } = await supabase.functions.invoke("edit-image", {
        body: {
          imageUrl,
          editPrompt: finalPrompt,
          postType,
          brandConfig,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setGeneratedPost((prev) =>
        prev ? { ...prev, imageUrl: data.imageUrl } : null
      );
    } catch (error: any) {
      console.error("Image edit error:", error);
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
      const { error } = await supabase.from("generated_posts").insert({
        user_id: userId,
        post_type: postType,
        title,
        description,
        cta,
        generated_image_url: generatedPost.imageUrl,
        original_image_url: uploadedImage,
        main_copy: generatedPost.mainCopy,
        story_copy: generatedPost.storyCopy,
        hashtags: generatedPost.hashtags,
      });

      if (error) throw error;
      toast({ title: "Post guardado en historial" });
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
    setCta("");
    setUploadedImage(null);
    setEditPrompt("");
    setStep("content");
  };

  return (
    <div className="space-y-8">
      {!generatedPost ? (
        <>
          <section className="space-y-4">
            <h3 className="text-lg font-semibold">Tipo de publicación</h3>
            <PostTypeSelector selected={postType} onSelect={setPostType} />
          </section>

          <section className="space-y-4">
            <h3 className="text-lg font-semibold">Origen de la imagen</h3>
            <ImageSourceSelector
              selected={imageSource}
              onSelect={setImageSource}
            />

            {(imageSource === "upload" || imageSource === "edit") && (
              <div className="space-y-3">
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
                  className="w-full h-32 border-dashed"
                >
                  {uploadedImage ? (
                    <img
                      src={uploadedImage}
                      alt="Preview"
                      className="max-h-28 rounded-lg object-contain"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Upload className="h-8 w-8" />
                      <span>Haz clic para subir imagen</span>
                    </div>
                  )}
                </Button>

                {imageSource === "edit" && uploadedImage && (
                  <div className="space-y-2">
                    <Label>Instrucciones de edición (opcional)</Label>
                    <Textarea
                      placeholder="Ej: Añade texto con el título, mejora los colores, hazla más vibrante..."
                      value={editPrompt}
                      onChange={(e) => setEditPrompt(e.target.value)}
                      className="bg-secondary border-border"
                    />
                  </div>
                )}
              </div>
            )}
          </section>

          <section className="space-y-4">
            <h3 className="text-lg font-semibold">Contenido del post</h3>

            <div className="space-y-2">
              <Label htmlFor="title">Título de la publicación *</Label>
              <Input
                id="title"
                placeholder="Ej: 5 tips para mejorar tu productividad"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="bg-secondary border-border"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descripción / Contexto</Label>
              <Textarea
                id="description"
                placeholder="Describe de qué trata tu post, a quién va dirigido, qué valor aporta..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="bg-secondary border-border min-h-[100px]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cta">Call To Action (CTA)</Label>
              <Input
                id="cta"
                placeholder="Ej: Guarda este post, Comenta tu favorito, Visita el link en bio..."
                value={cta}
                onChange={(e) => setCta(e.target.value)}
                className="bg-secondary border-border"
              />
            </div>
          </section>

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
                Generar Post Completo
              </>
            )}
          </Button>
        </>
      ) : (
        <GeneratedPostPreview
          post={generatedPost}
          postType={postType}
          loading={loading && step === "image"}
          onSave={savePost}
          onReset={resetGenerator}
          onRegenerateImage={() =>
            generatedPost.imagePrompt && generateImage(generatedPost.imagePrompt)
          }
        />
      )}
    </div>
  );
}

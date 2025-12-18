import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Palette, Upload, X } from "lucide-react";

interface BrandConfig {
  id?: string;
  brand_name: string;
  brand_voice: string;
  visual_style: string;
  default_language: string;
  color_palette: string[];
  logo_url: string | null;
}

interface BrandConfigFormProps {
  userId: string;
  onSave?: () => void;
}

const LANGUAGES = [
  { value: "es", label: "Español" },
  { value: "en", label: "English" },
  { value: "pt", label: "Português" },
  { value: "fr", label: "Français" },
  { value: "de", label: "Deutsch" },
];

export function BrandConfigForm({ userId, onSave }: BrandConfigFormProps) {
  const [config, setConfig] = useState<BrandConfig>({
    brand_name: "",
    brand_voice: "",
    visual_style: "",
    default_language: "es",
    color_palette: [],
    logo_url: null,
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newColor, setNewColor] = useState("#ff6b4a");
  const { toast } = useToast();

  useEffect(() => {
    loadConfig();
  }, [userId]);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("brand_configs")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;
      if (data) {
        setConfig({
          ...data,
          color_palette: (data.color_palette as string[]) || [],
        });
      }
    } catch (error: any) {
      console.error("Error loading config:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        user_id: userId,
        brand_name: config.brand_name,
        brand_voice: config.brand_voice,
        visual_style: config.visual_style,
        default_language: config.default_language,
        color_palette: config.color_palette,
        logo_url: config.logo_url,
      };

      const { error } = await supabase
        .from("brand_configs")
        .upsert(payload, { onConflict: "user_id" });

      if (error) throw error;
      toast({ title: "Configuración guardada" });
      onSave?.();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error al guardar",
        description: error.message,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${userId}/logo.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("post-images")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("post-images")
        .getPublicUrl(fileName);

      setConfig({ ...config, logo_url: urlData.publicUrl });
      toast({ title: "Logo subido" });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error al subir logo",
        description: error.message,
      });
    }
  };

  const addColor = () => {
    if (!config.color_palette.includes(newColor)) {
      setConfig({
        ...config,
        color_palette: [...config.color_palette, newColor],
      });
    }
  };

  const removeColor = (color: string) => {
    setConfig({
      ...config,
      color_palette: config.color_palette.filter((c) => c !== color),
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>Nombre de marca</Label>
        <Input
          placeholder="Tu marca o negocio"
          value={config.brand_name}
          onChange={(e) => setConfig({ ...config, brand_name: e.target.value })}
          className="bg-secondary border-border"
        />
      </div>

      <div className="space-y-2">
        <Label>Voz de marca</Label>
        <Textarea
          placeholder="Describe el tono y personalidad de tu marca. Ej: Profesional pero cercano, inspirador, directo..."
          value={config.brand_voice}
          onChange={(e) => setConfig({ ...config, brand_voice: e.target.value })}
          className="bg-secondary border-border min-h-[100px]"
        />
      </div>

      <div className="space-y-2">
        <Label>Estilo visual</Label>
        <Textarea
          placeholder="Describe tu estilo visual. Ej: Minimalista, colores vibrantes, fotografía lifestyle, ilustraciones modernas..."
          value={config.visual_style}
          onChange={(e) => setConfig({ ...config, visual_style: e.target.value })}
          className="bg-secondary border-border min-h-[100px]"
        />
      </div>

      <div className="space-y-2">
        <Label>Idioma por defecto</Label>
        <select
          value={config.default_language}
          onChange={(e) =>
            setConfig({ ...config, default_language: e.target.value })
          }
          className="w-full h-10 px-3 rounded-lg bg-secondary border border-border text-foreground"
        >
          {LANGUAGES.map((lang) => (
            <option key={lang.value} value={lang.value}>
              {lang.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-3">
        <Label className="flex items-center gap-2">
          <Palette className="h-4 w-4" />
          Paleta de colores
        </Label>
        <div className="flex flex-wrap gap-2 mb-3">
          {config.color_palette.map((color) => (
            <div
              key={color}
              className="flex items-center gap-1 bg-secondary rounded-lg p-1 pr-2"
            >
              <div
                className="w-6 h-6 rounded-md"
                style={{ backgroundColor: color }}
              />
              <span className="text-xs">{color}</span>
              <button
                onClick={() => removeColor(color)}
                className="text-muted-foreground hover:text-destructive ml-1"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="color"
            value={newColor}
            onChange={(e) => setNewColor(e.target.value)}
            className="w-10 h-10 rounded-lg cursor-pointer bg-transparent"
          />
          <Button variant="outline" size="sm" onClick={addColor}>
            Añadir color
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        <Label>Logo</Label>
        {config.logo_url && (
          <div className="relative w-24 h-24 rounded-lg overflow-hidden bg-secondary">
            <img
              src={config.logo_url}
              alt="Logo"
              className="w-full h-full object-contain"
            />
            <button
              onClick={() => setConfig({ ...config, logo_url: null })}
              className="absolute top-1 right-1 p-1 bg-background/80 rounded-full"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}
        <label className="flex items-center gap-2 cursor-pointer">
          <Button variant="outline" size="sm" asChild>
            <span>
              <Upload className="h-4 w-4 mr-2" />
              Subir logo
            </span>
          </Button>
          <input
            type="file"
            accept="image/*"
            onChange={handleLogoUpload}
            className="hidden"
          />
        </label>
      </div>

      <Button
        variant="gradient"
        size="lg"
        onClick={handleSave}
        disabled={saving}
        className="w-full"
      >
        {saving ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <>
            <Save className="h-4 w-4" />
            Guardar configuración
          </>
        )}
      </Button>
    </div>
  );
}

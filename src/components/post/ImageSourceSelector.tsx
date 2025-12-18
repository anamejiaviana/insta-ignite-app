import { cn } from "@/lib/utils";
import { Upload, Wand2, Sparkles } from "lucide-react";

const IMAGE_SOURCES = [
  {
    id: "upload",
    name: "Subir imagen",
    description: "Usa tu propia imagen",
    icon: Upload,
  },
  {
    id: "edit",
    name: "Editar con IA",
    description: "Modifica una imagen existente",
    icon: Wand2,
  },
  {
    id: "generate",
    name: "Generar con IA",
    description: "Crea una imagen desde cero",
    icon: Sparkles,
  },
];

interface ImageSourceSelectorProps {
  selected: string;
  onSelect: (source: string) => void;
}

export function ImageSourceSelector({
  selected,
  onSelect,
}: ImageSourceSelectorProps) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {IMAGE_SOURCES.map((source) => {
        const Icon = source.icon;
        const isSelected = selected === source.id;

        return (
          <button
            key={source.id}
            onClick={() => onSelect(source.id)}
            className={cn(
              "relative p-4 rounded-xl border transition-all duration-300 text-center",
              isSelected
                ? "border-primary bg-primary/10 shadow-glow"
                : "border-border bg-card hover:border-primary/50 hover:bg-card/80"
            )}
          >
            <Icon
              className={cn(
                "h-8 w-8 mx-auto mb-2 transition-colors",
                isSelected ? "text-primary" : "text-muted-foreground"
              )}
            />
            <h4 className="font-medium text-sm">{source.name}</h4>
            <p className="text-xs text-muted-foreground mt-1 hidden md:block">
              {source.description}
            </p>
          </button>
        );
      })}
    </div>
  );
}

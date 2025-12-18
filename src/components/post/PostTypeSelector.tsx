import { cn } from "@/lib/utils";
import { Image, Film, Layers, CircleDot } from "lucide-react";

const POST_TYPES = [
  {
    id: "post",
    name: "Post",
    description: "Publicación estática 1:1",
    icon: Image,
    dimensions: "1080x1080",
  },
  {
    id: "reel",
    name: "Reel",
    description: "Video vertical 9:16",
    icon: Film,
    dimensions: "1080x1920",
  },
  {
    id: "carousel",
    name: "Carrusel",
    description: "Múltiples imágenes 1:1",
    icon: Layers,
    dimensions: "1080x1080",
  },
  {
    id: "story",
    name: "Story",
    description: "Historia vertical 9:16",
    icon: CircleDot,
    dimensions: "1080x1920",
  },
];

interface PostTypeSelectorProps {
  selected: string;
  onSelect: (type: string) => void;
}

export function PostTypeSelector({ selected, onSelect }: PostTypeSelectorProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {POST_TYPES.map((type) => {
        const Icon = type.icon;
        const isSelected = selected === type.id;

        return (
          <button
            key={type.id}
            onClick={() => onSelect(type.id)}
            className={cn(
              "relative p-4 rounded-xl border transition-all duration-300 text-left",
              isSelected
                ? "border-primary bg-primary/10 shadow-glow"
                : "border-border bg-card hover:border-primary/50 hover:bg-card/80"
            )}
          >
            {isSelected && (
              <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary animate-pulse" />
            )}
            <Icon
              className={cn(
                "h-6 w-6 mb-2 transition-colors",
                isSelected ? "text-primary" : "text-muted-foreground"
              )}
            />
            <h4 className="font-medium text-sm">{type.name}</h4>
            <p className="text-xs text-muted-foreground mt-1">
              {type.description}
            </p>
          </button>
        );
      })}
    </div>
  );
}

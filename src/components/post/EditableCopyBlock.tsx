import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Copy, Save, RotateCcw, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface EditableCopyBlockProps {
  label: string;
  icon: React.ReactNode;
  value: string;
  originalValue: string;
  onChange: (value: string) => void;
  onSave?: () => void;
  saving?: boolean;
}

export function EditableCopyBlock({
  label,
  icon,
  value,
  originalValue,
  onChange,
  onSave,
  saving,
}: EditableCopyBlockProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const isModified = value !== originalValue;

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    toast({ title: `${label} copiado` });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRestore = () => {
    onChange(originalValue);
    toast({ title: "Texto original restaurado" });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="font-medium flex items-center gap-2">
          {icon}
          {label}
        </h4>
        {isModified && (
          <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full">
            Editado
          </span>
        )}
      </div>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-[120px] text-sm bg-secondary/50 border-border resize-y"
      />
      <div className="flex flex-wrap gap-2">
        <Button variant="ghost" size="sm" onClick={handleCopy}>
          {copied ? <Check className="h-3.5 w-3.5 mr-1 text-green-500" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
          Copiar texto
        </Button>
        {onSave && (
          <Button variant="default" size="sm" onClick={onSave} disabled={saving || !isModified}>
            <Save className="h-3.5 w-3.5 mr-1" />
            {saving ? "Guardando..." : "Guardar cambios"}
          </Button>
        )}
        {isModified && (
          <Button variant="outline" size="sm" onClick={handleRestore}>
            <RotateCcw className="h-3.5 w-3.5 mr-1" />
            Restaurar original
          </Button>
        )}
      </div>
    </div>
  );
}

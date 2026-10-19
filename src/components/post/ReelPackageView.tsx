import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Film, Lightbulb, Loader2, Type, Clapperboard, ImagePlus, Download } from "lucide-react";
import type { ReelPackage } from "@/lib/contentRules";

interface Props {
  reel?: ReelPackage;
  coverUrl?: string;
  coverIdea?: string;
  loading: boolean;
  onGenerateCover: () => void;
  onCopy: (text: string, label: string) => void;
}

function Section({ icon, title, copyText, onCopy, children }: {
  icon: React.ReactNode; title: string; copyText?: string; onCopy: Props["onCopy"]; children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="font-medium flex items-center gap-2 text-sm">{icon}{title}</h4>
        {copyText && (
          <Button variant="ghost" size="sm" onClick={() => onCopy(copyText, title)}>
            <Copy className="h-4 w-4" />
          </Button>
        )}
      </div>
      <div className="glass rounded-lg p-4 text-sm">{children}</div>
    </div>
  );
}

export function ReelPackageView({ reel, coverUrl, coverIdea, loading, onGenerateCover, onCopy }: Props) {
  const [coverOpen, setCoverOpen] = useState(false);
  const storyboard = reel?.storyboard ?? [];
  const onScreen = reel?.onScreenTexts ?? [];
  const tips = reel?.recordingTips ?? [];

  return (
    <div className="space-y-5 min-w-0">
      {reel?.hook && (
        <Section icon={<Film className="h-4 w-4 text-primary" />} title="Hook (primeros 3 s)" copyText={reel.hook} onCopy={onCopy}>
          <p className="font-medium">"{reel.hook}"</p>
        </Section>
      )}

      {reel?.script && (
        <Section icon={<Type className="h-4 w-4 text-primary" />} title="Guion" copyText={reel.script} onCopy={onCopy}>
          <p className="whitespace-pre-wrap text-muted-foreground">{reel.script}</p>
        </Section>
      )}

      {storyboard.length > 0 && (
        <Section
          icon={<Clapperboard className="h-4 w-4 text-primary" />}
          title="Planos a grabar"
          copyText={storyboard.map((s, i) => `${i + 1}. ${s.shot}${s.duration ? ` (${s.duration})` : ""}${s.onScreenText ? ` — Texto: ${s.onScreenText}` : ""}`).join("\n")}
          onCopy={onCopy}
        >
          <ol className="space-y-2">
            {storyboard.map((s, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-primary font-medium shrink-0">{i + 1}.</span>
                <div>
                  <p>{s.shot}{s.duration && <span className="text-muted-foreground"> · {s.duration}</span>}</p>
                  {s.onScreenText && <p className="text-xs text-muted-foreground">Texto en pantalla: {s.onScreenText}</p>}
                </div>
              </li>
            ))}
          </ol>
        </Section>
      )}

      {onScreen.length > 0 && (
        <Section icon={<Type className="h-4 w-4 text-primary" />} title="Textos en pantalla" copyText={onScreen.join("\n")} onCopy={onCopy}>
          <ul className="space-y-1">
            {onScreen.map((x, i) => <li key={i}>• {x}</li>)}
          </ul>
        </Section>
      )}

      {tips.length > 0 && (
        <Section icon={<Lightbulb className="h-4 w-4 text-primary" />} title="Consejos de grabación" onCopy={onCopy}>
          <ul className="space-y-1 text-muted-foreground">
            {tips.map((x, i) => <li key={i}>• {x}</li>)}
          </ul>
        </Section>
      )}

      <p className="text-xs text-muted-foreground">
        Anypostly no genera vídeos: graba tú los planos con el móvil en vertical (9:16) siguiendo este guion.
      </p>

      {/* Portada: opción manual y voluntaria */}
      <div className="border border-dashed border-border rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h4 className="font-medium flex items-center gap-2 text-sm">
            <ImagePlus className="h-4 w-4 text-primary" /> Portada (opcional)
          </h4>
          {!coverOpen && !coverUrl && !loading && (
            <Button variant="ghost" size="sm" onClick={() => setCoverOpen(true)}>Ver opción</Button>
          )}
        </div>
        {(coverOpen || coverUrl || loading) && (
          <>
            {coverIdea && <p className="text-xs text-muted-foreground">Idea de portada: {coverIdea}</p>}
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Generando portada...
              </div>
            ) : coverUrl ? (
              <div className="space-y-2">
                <img src={coverUrl} alt="Portada del reel" className="w-full max-h-[400px] aspect-[9/16] object-cover rounded-lg" />
                <a href={coverUrl} download className="inline-flex items-center gap-1 text-xs underline">
                  <Download className="h-3 w-3" /> Descargar portada
                </a>
              </div>
            ) : null}
            <Button variant="outline" size="sm" onClick={onGenerateCover} disabled={loading || !coverIdea}>
              <ImagePlus className="h-4 w-4 mr-2" />
              {coverUrl ? "Generar otra portada" : "Generar portada con IA"}
            </Button>
            <p className="text-xs text-muted-foreground">Cada portada generada gasta 1 imagen de tu plan.</p>
          </>
        )}
      </div>
    </div>
  );
}

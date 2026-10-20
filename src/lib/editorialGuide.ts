// Editorial guide ("manual editorial"): wizard answers -> AI draft -> owner-approved manual.
// Only the APPROVED manual is ever sent to generators, as a compact, capped text.

export interface GuideAnswers {
  offer?: string;
  difference?: string;
  story?: string;
  audienceWho?: string[];
  audienceNeeds?: string;
  voiceTraits?: string[];
  voiceAvoid?: string[];
  pillars?: string[];
  customPillars?: string;
  emojis?: "none" | "few" | "many";
  length?: "short" | "medium" | "long";
  address?: "informal" | "formal" | "mixed";
  alwaysSay?: string;
  neverSay?: string;
  visualStyle?: string[];
  colors?: string;
  photoNotes?: string;
}

export interface EditorialManual {
  brandDescription: string;
  audience: string;
  voice: { description: string; do: string[]; dont: string[] };
  pillars: { name: string; description: string }[];
  formats: { post: string; carousel: string; reel: string; story: string };
  visual: string;
  sampleCopy: string;
}

export const MAX_GUIDE_CHARS = 1800;

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const arr = (v: unknown) => (Array.isArray(v) ? v.map(str).filter(Boolean) : []);

/** Normalises whatever the AI returned into a safe manual shape (never throws). */
export function normalizeManual(raw: any): EditorialManual {
  const r = raw && typeof raw === "object" ? raw : {};
  const v = r.voice && typeof r.voice === "object" ? r.voice : {};
  const f = r.formats && typeof r.formats === "object" ? r.formats : {};
  const pillars = Array.isArray(r.pillars)
    ? r.pillars
        .map((p: any) => (typeof p === "string" ? { name: p, description: "" } : { name: str(p?.name), description: str(p?.description) }))
        .filter((p: any) => p.name)
        .slice(0, 6)
    : [];
  return {
    brandDescription: str(r.brandDescription),
    audience: str(r.audience),
    voice: { description: str(v.description), do: arr(v.do).slice(0, 8), dont: arr(v.dont).slice(0, 8) },
    pillars,
    formats: { post: str(f.post), carousel: str(f.carousel), reel: str(f.reel), story: str(f.story) },
    visual: str(r.visual),
    sampleCopy: str(r.sampleCopy),
  };
}

/** Compact text sent to generators. Excludes the sample copy (avoids cloning it) and is capped to control AI cost. */
export function buildGuideContext(m: EditorialManual | null | undefined): string {
  if (!m) return "";
  const parts: string[] = [];
  if (m.brandDescription) parts.push(`Marca: ${m.brandDescription}`);
  if (m.audience) parts.push(`Cliente ideal: ${m.audience}`);
  if (m.voice.description) parts.push(`Voz: ${m.voice.description}`);
  if (m.voice.do.length) parts.push(`Sí: ${m.voice.do.join("; ")}`);
  if (m.voice.dont.length) parts.push(`No: ${m.voice.dont.join("; ")}`);
  if (m.pillars.length) parts.push(`Pilares: ${m.pillars.map((p) => (p.description ? `${p.name} (${p.description})` : p.name)).join("; ")}`);
  const f = m.formats;
  const fm = [f.post && `Post: ${f.post}`, f.carousel && `Carrusel: ${f.carousel}`, f.reel && `Reel: ${f.reel}`, f.story && `Story: ${f.story}`].filter(Boolean);
  if (fm.length) parts.push(fm.join(" | "));
  if (m.visual) parts.push(`Visual: ${m.visual}`);
  if (!parts.length) return "";
  const text = parts.join("\n");
  return text.length > MAX_GUIDE_CHARS ? text.slice(0, MAX_GUIDE_CHARS - 1) + "…" : text;
}

/**
 * Tone value sent to every text generator. All deployed generators already read `tone`,
 * so the approved guide applies without server changes. Without an approved guide the
 * original tone is returned untouched (backward compatible).
 */
export function aiTone(tone: string | null | undefined, guideText: string | null | undefined): string | null {
  const g = (guideText || "").trim();
  if (!g) return tone ?? null;
  const base = (tone || "").trim();
  return `${base ? base + ". " : ""}MANUAL EDITORIAL APROBADO POR EL NEGOCIO (respétalo; no inventes datos que no aparezcan aquí):\n${g}`;
}

const LANG: Record<string, string> = { es: "español", ca: "català", en: "English" };

export function buildDraftRequest(answers: GuideAnswers, language: string) {
  const a = answers;
  const lines = [
    a.offer && `Qué ofrece: ${a.offer}`,
    a.difference && `Qué le hace diferente: ${a.difference}`,
    a.story && `Historia (aportada por el negocio): ${a.story}`,
    a.audienceWho?.length && `Cliente ideal: ${a.audienceWho.join(", ")}`,
    a.audienceNeeds && `Qué busca/necesita su cliente: ${a.audienceNeeds}`,
    a.voiceTraits?.length && `Cómo quiere sonar: ${a.voiceTraits.join(", ")}`,
    a.voiceAvoid?.length && `Cómo NO quiere sonar: ${a.voiceAvoid.join(", ")}`,
    (a.pillars?.length || a.customPillars) && `Temas de los que quiere hablar: ${[...(a.pillars || []), a.customPillars].filter(Boolean).join(", ")}`,
    a.emojis && `Emojis: ${a.emojis}`,
    a.length && `Longitud de textos: ${a.length}`,
    a.address && `Trato al cliente: ${a.address}`,
    a.alwaysSay && `Siempre decir/mencionar: ${a.alwaysSay}`,
    a.neverSay && `Nunca decir: ${a.neverSay}`,
    a.visualStyle?.length && `Estilo visual: ${a.visualStyle.join(", ")}`,
    a.colors && `Colores: ${a.colors}`,
    a.photoNotes && `Notas sobre fotos: ${a.photoNotes}`,
  ].filter(Boolean);
  const langName = LANG[language] || language || "español";
  const formatInstructions = `Responde SOLO con JSON válido, todo el texto en ${langName}, con esta estructura:
{"brandDescription":"2-3 frases","audience":"2-3 frases","voice":{"description":"1-2 frases","do":["4-6 reglas"],"dont":["4-6 reglas"]},"pillars":[{"name":"","description":"1 frase"}] (entre 4 y 6),"formats":{"post":"instrucción breve","carousel":"","reel":"","story":""},"visual":"2-3 frases","sampleCopy":"un caption de ejemplo de 60-120 palabras con 5 hashtags"}
REGLAS: es una PROPUESTA que el negocio revisará. Usa SOLO los datos aportados; si falta algo, escribe algo genérico y prudente del sector sin inventar premios, años, precios, cifras, ingredientes, nombres ni historia. No digas que has leído su web ni sus redes. Tono cálido y natural, sin sensacionalismo.`;
  return {
    title: "Manual editorial del negocio (propuesta)",
    description: lines.join("\n") || "El negocio no ha aportado detalles adicionales.",
    customFormat: true,
    formatInstructions,
  };
}

// Reglas de negocio de generación de contenido.
// Un Reel es vídeo grabado por el usuario: nunca se generan/editan imágenes de IA
// automáticamente (ni consume cuota). La portada es una acción manual aparte.

export function isReel(postType: string) {
  return postType === "reel";
}

/** ¿Debe el flujo generar/editar imágenes de IA automáticamente tras el texto? */
export function shouldAutoGenerateImage(postType: string, imageSource: string): boolean {
  if (isReel(postType)) return false;
  if (postType === "carousel") return true;
  return imageSource === "generate" || imageSource === "edit";
}

export interface ReelShot {
  shot: string;
  duration?: string;
  onScreenText?: string;
}

export type ReelVoiceMode = "voiceover" | "to_camera" | "music_only";

export interface ReelVoiceover {
  text: string;
  estimatedDuration?: string;
}

export interface ReelPackage {
  voiceMode?: ReelVoiceMode;
  voiceover?: ReelVoiceover;
  hook?: string;
  script?: string;
  storyboard?: ReelShot[];
  onScreenTexts?: string[];
  recordingTips?: string[];
  coverIdea?: string;
}

export const REEL_FORMAT_INSTRUCTIONS = `Esto es un REEL (vídeo que grabará el propio negocio). NO describas imágenes generadas por IA para el contenido principal.
Responde SIEMPRE en formato JSON válido con esta estructura exacta:
{
  "mainCopy": "Caption del reel (máx 2200 caracteres)",
  "storyCopy": "Versión corta para stories (máx 200 caracteres)",
  "hashtags": ["hashtag1", ...] (exactamente 5, específicos del nicho, sin #),
  "hook": "Frase de gancho para los primeros 3 segundos",
  "script": "Guion hablado/narrado completo, en orden",
  "storyboard": [{ "shot": "Descripción del plano a grabar", "duration": "p.ej. 3s", "onScreenText": "Texto en pantalla para este plano (o vacío)" }] (entre 4 y 8 planos),
  "onScreenTexts": ["texto en pantalla 1", ...],
  "recordingTips": ["consejo práctico de grabación: luz, encuadre vertical 9:16, audio, etc."] (3 a 5, realistas para un negocio local con móvil),
  "imagePrompt": "Idea de portada (solo referencia; no se generará automáticamente)"__VOICE__
}`;

/** Instrucción de locución según el modo elegido. "music_only" no genera locución. */
export function voiceoverInstruction(mode: ReelVoiceMode): string {
  if (mode === "music_only") return "";
  const who = mode === "to_camera"
    ? "para que una persona del negocio lo diga mirando a cámara (primera persona, como hablando con un cliente)"
    : "para leer como voz en off sobre los planos";
  return `"voiceover": { "text": "Guion de LOCUCIÓN completo y fluido ${who}. Estilo natural, cálido y cercano, en el idioma indicado, frases cortas fáciles de decir en voz alta, sin acotaciones técnicas ni nombres de planos. Debe seguir el orden de los planos y poder leerse a ritmo tranquilo en la duración total estimada (aprox. 2,5 palabras por segundo). No inventes datos del negocio (precios, años, premios, cifras).", "estimatedDuration": "duración aproximada de la lectura, p.ej. 25s" }`;
}

export function buildReelInstructions(mode: ReelVoiceMode = "voiceover"): string {
  const v = voiceoverInstruction(mode);
  const extra = mode === "music_only"
    ? "\nModo SOLO MÚSICA Y TEXTOS: NO incluyas locución ni campo voiceover; el mensaje se cuenta con los textos en pantalla. El campo script describe el desarrollo visual."
    : "";
  return REEL_FORMAT_INSTRUCTIONS.replace("__VOICE__", v ? `,\n  ${v}` : "") + extra;
}

export function extractReelPackage(data: any): ReelPackage | undefined {
  if (!data) return undefined;
  const vo = data.voiceover;
  const pkg: ReelPackage = {
    voiceover: vo && typeof vo === "object" && typeof vo.text === "string" && vo.text.trim()
      ? { text: vo.text.trim(), estimatedDuration: typeof vo.estimatedDuration === "string" ? vo.estimatedDuration : undefined }
      : typeof vo === "string" && vo.trim() ? { text: vo.trim() } : undefined,
    hook: typeof data.hook === "string" ? data.hook : undefined,
    script: typeof data.script === "string" ? data.script : undefined,
    storyboard: Array.isArray(data.storyboard)
      ? data.storyboard
          .map((s: any) => (typeof s === "string" ? { shot: s } : s))
          .filter((s: any) => s && typeof s.shot === "string")
      : undefined,
    onScreenTexts: Array.isArray(data.onScreenTexts) ? data.onScreenTexts.filter((x: any) => typeof x === "string") : undefined,
    recordingTips: Array.isArray(data.recordingTips) ? data.recordingTips.filter((x: any) => typeof x === "string") : undefined,
    coverIdea: typeof data.imagePrompt === "string" ? data.imagePrompt : undefined,
  };
  return pkg;
}

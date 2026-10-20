// Reglas de negocio de generación de contenido.
// Un Reel es vídeo grabado por el usuario: nunca se generan/editan imágenes de IA
// automáticamente (ni consume cuota). La portada es una acción manual aparte.

export function isReel(postType: string) {
  return postType === "reel";
}

/** Fuente de imagen por defecto: la foto real del negocio. */
export const DEFAULT_IMAGE_SOURCE = "upload";

/**
 * ¿Usa este contenido la IA de imagen (gasta cupo)? Solo si el usuario eligió
 * expresamente "Mejorar con IA" o "Generar desde cero". Nunca en Reels.
 */
export function shouldAutoGenerateImage(postType: string, imageSource: string): boolean {
  if (isReel(postType)) return false;
  return imageSource === "generate" || imageSource === "edit";
}

/** Imágenes de cupo que gastará la acción elegida (editar y generar comparten cupo). */
export function imageCost(postType: string, imageSource: string, slideCount: number, photoCount: number): number {
  if (!shouldAutoGenerateImage(postType, imageSource)) return 0;
  if (postType === "carousel") return imageSource === "edit" ? photoCount : slideCount;
  return 1;
}

export const EDIT_PRESETS = [
  { id: "light", label: "Mejorar luz", instruction: "mejora la iluminación de forma natural (más luminosa, sombras suaves)" },
  { id: "color", label: "Color natural", instruction: "corrige el balance de blancos y deja colores naturales y apetecibles, sin saturar" },
  { id: "crop", label: "Encuadre para Instagram", instruction: "reencuadra y endereza la foto para Instagram centrando el sujeto principal, sin deformarlo" },
  { id: "background", label: "Limpiar fondo", instruction: "ordena y suaviza el fondo quitando solo distracciones pequeñas (manchas, cables, objetos sueltos irrelevantes), sin cambiar el lugar" },
  { id: "sharp", label: "Más nitidez", instruction: "aumenta ligeramente la nitidez y reduce el ruido" },
] as const;

export const PRESERVE_IDENTITY_RULE =
  "Edita ESTA foto real del negocio. Conserva exactamente el producto, las personas (caras, cuerpo, ropa), los ingredientes, el local, los textos y logotipos que ya aparecen. No añadas ni quites productos, personas, ingredientes ni objetos importantes y no inventes elementos nuevos. No añadas texto.";

/** Prompt de edición: siempre conserva la identidad; por defecto solo una mejora suave. */
export function buildEditPrompt(presetIds: string[], freeText: string): string {
  const chosen = EDIT_PRESETS.filter((p) => presetIds.includes(p.id)).map((p) => p.instruction);
  const extra = freeText.trim();
  const changes = chosen.length || extra
    ? [...chosen, ...(extra ? [extra] : [])].join("; ")
    : "mejora suave de luz y color, aspecto natural y profesional";
  return `${PRESERVE_IDENTITY_RULE} Cambios permitidos: ${changes}.`;
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

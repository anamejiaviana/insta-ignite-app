import { registerLimitToken } from "./aiLimitNotice";
import { supabase } from "@/integrations/supabase/client";

export type AiLimitCode = "trial_expired" | "image_limit_reached" | "text_limit_reached" | "trial_daily_cap" | "no_plan";
const CODES: AiLimitCode[] = ["trial_expired", "image_limit_reached", "text_limit_reached", "trial_daily_cap", "no_plan"];

/** Maps a server error body to a known limit code (or null for other errors). */
export function classifyAiError(body: unknown): AiLimitCode | null {
  const code = (body as any)?.error;
  return CODES.includes(code) ? code : null;
}

/** Typed error for a controlled 403/429 limit response; the friendly notice already explains it. */
export class AiLimitError extends Error {
  readonly code: AiLimitCode;
  readonly context: unknown;
  constructor(code: AiLimitCode, context: unknown) {
    super(registerLimitToken(code));
    this.name = "AiLimitError";
    this.code = code;
    this.context = context;
  }
}

export const isAiLimitError = (e: unknown): e is AiLimitError => e instanceof AiLimitError;

export const AI_LIMIT_EVENT = "anypostly:ai-limit";

let installed = false;
/** Wraps functions.invoke once: a controlled limit response becomes an AiLimitError and opens the friendly notice. */
export function installAiErrorInterceptor() {
  if (installed) return;
  installed = true;
  // `supabase.functions` returns a new client on every access, so patch the shared prototype.
  const proto: any = Object.getPrototypeOf(supabase.functions);
  const original = proto.invoke;
  proto.invoke = async function (this: unknown, ...args: any[]) {
    const res = await original.apply(this, args);
    try {
      const ctx = res?.error?.context;
      if (!ctx || typeof ctx.clone !== "function" || ![403, 429].includes(ctx.status)) return res;
      const code = classifyAiError(await ctx.clone().json().catch(() => null));
      if (!code) return res;
      window.dispatchEvent(new CustomEvent(AI_LIMIT_EVENT, { detail: code }));
      return { ...res, error: new AiLimitError(code, ctx) };
    } catch {
      return res; // never break the caller
    }
  };
}

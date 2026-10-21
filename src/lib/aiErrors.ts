import { supabase } from "@/integrations/supabase/client";

export type AiLimitCode = "trial_expired" | "image_limit_reached" | "text_limit_reached" | "trial_daily_cap" | "no_plan";
const CODES: AiLimitCode[] = ["trial_expired", "image_limit_reached", "text_limit_reached", "trial_daily_cap", "no_plan"];

/** Maps a server error body to a known limit code (or null for other errors). */
export function classifyAiError(body: unknown): AiLimitCode | null {
  const code = (body as any)?.error;
  return CODES.includes(code) ? code : null;
}

export const AI_LIMIT_EVENT = "anypostly:ai-limit";

let installed = false;
/** Wraps functions.invoke once so every AI screen surfaces the same clear notice. */
export function installAiErrorInterceptor() {
  if (installed) return;
  installed = true;
  const fns: any = supabase.functions;
  const original = fns.invoke.bind(fns);
  fns.invoke = async (...args: any[]) => {
    const res = await original(...args);
    try {
      let body: unknown = res?.data;
      const ctx = res?.error?.context;
      if (ctx && typeof ctx.clone === "function") body = await ctx.clone().json().catch(() => null);
      const code = classifyAiError(body);
      if (code) window.dispatchEvent(new CustomEvent(AI_LIMIT_EVENT, { detail: code }));
    } catch { /* never break the caller */ }
    return res;
  };
}

import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { supabase } from "@/integrations/supabase/client";
import type { TranslationKey } from "@/contexts/LanguageContext";

export type StripeEnv = "sandbox" | "live";
export type PlanKey = "solo" | "pro" | "studio";

const clientToken = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN as string | undefined;

/** null = payments not configured for this build (never silently route to live). */
export function paymentsEnvironment(token = clientToken): StripeEnv | null {
  if (token?.startsWith("pk_test_")) return "sandbox";
  if (token?.startsWith("pk_live_")) return "live";
  return null;
}

let stripePromise: Promise<Stripe | null> | null = null;
export function getStripe() {
  if (!paymentsEnvironment()) throw new Error("payments not configured");
  if (!stripePromise) stripePromise = loadStripe(clientToken as string);
  return stripePromise;
}

export const PLAN_RANK: Record<PlanKey, number> = { solo: 1, pro: 2, studio: 3 };
export const PRICE_TO_PLAN: Record<string, PlanKey> = { solo_monthly: "solo", pro_monthly: "pro", studio_monthly: "studio" };

/** Upgrades are immediate and prorated; downgrades wait for the end of the paid period. */
export function planChangeKind(current: PlanKey, target: PlanKey): "same" | "upgrade" | "downgrade" {
  if (current === target) return "same";
  return PLAN_RANK[target] > PLAN_RANK[current] ? "upgrade" : "downgrade";
}

/** past_due keeps access during the retry grace period; canceled keeps it until the paid period ends. */
export function hasPaidAccess(s: { status: string | null; current_period_end: string | null } | null, now = Date.now()) {
  if (!s?.status) return false;
  const end = s.current_period_end ? new Date(s.current_period_end).getTime() : null;
  if (["active", "trialing", "past_due"].includes(s.status)) return end === null || end > now;
  return s.status === "canceled" && end !== null && end > now;
}

const ERROR_KEYS: Record<string, TranslationKey> = {
  payments_unavailable: "billErrUnavailable",
  already_subscribed: "billErrAlready",
  not_needed: "billErrNotNeeded",
  payment_failed: "billErrPayment",
  auth_failed: "billErrAuth",
  past_due: "billErrPastDue",
  no_subscription: "billErrNoSub",
};
export function billingErrorKey(code: string | null | undefined): TranslationKey {
  return (code && ERROR_KEYS[code]) || "billErrGeneric";
}

/** Calls a payment function; returns data or a server error code (never trusts the browser for prices). */
export async function callBilling<T>(fn: string, body: Record<string, unknown>): Promise<{ data?: T; code?: string }> {
  const { data, error } = await supabase.functions.invoke(fn, { body: { ...body, environment: paymentsEnvironment(), origin: window.location.origin } });
  if (!error) return { data: data as T };
  const ctx = (error as { context?: Response }).context;
  const parsed = ctx && typeof ctx.clone === "function" ? await ctx.clone().json().catch(() => null) : null;
  return { code: parsed?.error ?? "unknown" };
}

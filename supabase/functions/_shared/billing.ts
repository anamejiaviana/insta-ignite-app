// Shared billing rules for payment functions. The price for each plan is chosen HERE (server-side),
// never taken from the browser. Plan state in user_plans changes only through syncSubscription
// (called by the verified webhook and right after server-side plan changes).
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.88.0";
import { corsHeaders, verifyUser } from "./guard.ts";
import { type StripeEnv, createStripeClient } from "./stripe.ts";

export { corsHeaders, verifyUser };
export type PlanKey = "solo" | "pro" | "studio";

export const PLAN_PRICE: Record<PlanKey, string> = { solo: "solo_monthly", pro: "pro_monthly", studio: "studio_monthly" };
export const PRICE_PLAN_NAME: Record<string, string> = { solo_monthly: "basic", pro_monthly: "pro", studio_monthly: "studio" };
export const PRICE_RANK: Record<string, number> = { solo_monthly: 1, pro_monthly: 2, studio_monthly: 3 };

// Grace policy: past_due keeps access while the payment provider retries the card (about 2 weeks);
// when retries are exhausted the subscription becomes canceled/unpaid and access ends.
export const ACCESS_STATUSES = new Set(["active", "trialing", "past_due"]);

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

export const adminClient = () => createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

export function parseEnv(v: unknown): StripeEnv | null {
  return v === "sandbox" || v === "live" ? v : null;
}

/** Test mode only works for listed testers, so test cards can never grant a real plan to anyone else. */
export async function sandboxAllowed(admin: SupabaseClient, env: StripeEnv, userId: string) {
  if (env === "live") return true;
  const { data } = await admin.from("billing_testers").select("user_id").eq("user_id", userId).maybeSingle();
  return !!data;
}

export function priceKey(price: any): string | null {
  return price?.lookup_key ?? price?.metadata?.lovable_external_id ?? null;
}

export function safeReturnBase(origin: unknown): string | null {
  if (typeof origin !== "string") return null;
  try {
    const u = new URL(origin);
    const ok = (u.protocol === "https:" && /(^|\.)(lovable\.app|lovableproject\.com|lovable\.dev)$/.test(u.hostname))
      || (u.protocol === "http:" && u.hostname === "localhost");
    return ok ? u.origin : null;
  } catch { return null; }
}

/** Re-reads the subscription from the provider (source of truth) and mirrors it into our tables. */
export async function syncSubscription(admin: SupabaseClient, env: StripeEnv, subscriptionId: string) {
  const stripe = createStripeClient(env);
  const sub: any = await stripe.subscriptions.retrieve(subscriptionId);
  let userId: string | undefined = sub.metadata?.userId;
  if (!userId) {
    const cust: any = await stripe.customers.retrieve(typeof sub.customer === "string" ? sub.customer : sub.customer.id);
    userId = cust?.metadata?.userId;
  }
  if (!userId) { console.error("subscription without userId", sub.id); return; }
  if (!(await sandboxAllowed(admin, env, userId))) { console.warn("sandbox event for non-tester ignored", userId); return; }

  const item = sub.items?.data?.[0];
  const key = priceKey(item?.price);
  const planName = key ? PRICE_PLAN_NAME[key] ?? null : null;
  const periodEnd = item?.current_period_end ?? sub.current_period_end;

  const { error: upErr } = await admin.from("subscriptions").upsert({
    user_id: userId,
    provider: "stripe",
    environment: env,
    provider_customer_id: typeof sub.customer === "string" ? sub.customer : sub.customer?.id,
    provider_subscription_id: sub.id,
    price_id: key,
    plan_name: planName,
    status: sub.status,
    current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    cancel_at_period_end: !!sub.cancel_at_period_end || !!sub.cancel_at,
    last_event_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }, { onConflict: "provider_subscription_id" });
  if (upErr) throw upErr;

  let hasAccess = ACCESS_STATUSES.has(sub.status) && !!planName;
  let effectivePlan = planName;
  if (!hasAccess) {
    // Never revoke if the user still has another subscription with access.
    const { data: others } = await admin.from("subscriptions").select("plan_name,status")
      .eq("user_id", userId).neq("provider_subscription_id", sub.id).in("status", [...ACCESS_STATUSES]);
    const other = (others ?? []).find((o: any) => o.plan_name);
    if (other) { hasAccess = true; effectivePlan = other.plan_name; }
  }
  const { error } = await admin.rpc("apply_billing_state", { _user_id: userId, _plan_name: effectivePlan, _has_access: hasAccess });
  if (error) throw error;
}

export async function currentSubscriptionRow(admin: SupabaseClient, userId: string, env: StripeEnv) {
  const { data } = await admin.from("subscriptions").select("*").eq("user_id", userId).eq("environment", env)
    .in("status", [...ACCESS_STATUSES]).order("created_at", { ascending: false }).limit(1).maybeSingle();
  return data as any;
}

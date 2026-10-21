import { createStripeClient } from "../_shared/stripe.ts";
import { adminClient, corsHeaders, json, parseEnv, safeReturnBase, sandboxAllowed, verifyUser } from "../_shared/billing.ts";

// Portal: update card, download invoices, edit billing/tax data, cancel at period end. Plan changes go through change-plan.
async function portalConfigId(stripe: ReturnType<typeof createStripeClient>) {
  const list = await stripe.billingPortal.configurations.list({ active: true, limit: 20 });
  const mine = list.data.find((c: any) => c.metadata?.app === "anypostly");
  if (mine) return mine.id;
  const created = await stripe.billingPortal.configurations.create({
    metadata: { app: "anypostly" },
    features: {
      payment_method_update: { enabled: true },
      invoice_history: { enabled: true },
      customer_update: { enabled: true, allowed_updates: ["address", "name", "tax_id", "email"] },
      subscription_cancel: { enabled: true, mode: "at_period_end", proration_behavior: "none" },
      subscription_update: { enabled: false },
    },
  } as any);
  return created.id;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  try {
    const userId = await verifyUser(req);
    if (!userId) return json({ error: "unauthorized" }, 401);
    const body = await req.json().catch(() => ({}));
    const env = parseEnv(body.environment);
    const base = safeReturnBase(body.origin);
    if (!env || !base) return json({ error: "invalid_request" }, 400);
    const admin = adminClient();
    if (!(await sandboxAllowed(admin, env, userId))) return json({ error: "payments_unavailable" }, 403);

    const { data: sub } = await admin.from("subscriptions").select("provider_customer_id")
      .eq("user_id", userId).eq("environment", env).not("provider_customer_id", "is", null)
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (!sub?.provider_customer_id) return json({ error: "no_subscription" }, 404);

    const stripe = createStripeClient(env);
    const portal = await stripe.billingPortal.sessions.create({
      customer: sub.provider_customer_id,
      configuration: await portalConfigId(stripe),
      return_url: `${base}/plans`,
    });
    return json({ url: portal.url });
  } catch (e) {
    console.error("portal error", e);
    return json({ error: "portal_failed" }, 500);
  }
});

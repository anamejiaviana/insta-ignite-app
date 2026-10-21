import { createStripeClient } from "../_shared/stripe.ts";
import {
  PLAN_PRICE, type PlanKey, adminClient, corsHeaders, currentSubscriptionRow, json, parseEnv,
  safeReturnBase, sandboxAllowed, verifyUser,
} from "../_shared/billing.ts";

async function resolveOrCreateCustomer(stripe: ReturnType<typeof createStripeClient>, options: { email?: string; userId: string }) {
  if (!/^[a-zA-Z0-9_-]+$/.test(options.userId)) throw new Error("Invalid userId");
  const found = await stripe.customers.search({ query: `metadata['userId']:'${options.userId}'`, limit: 1 });
  if (found.data.length) return found.data[0].id;
  if (options.email) {
    const existing = await stripe.customers.list({ email: options.email, limit: 1 });
    if (existing.data.length) {
      const customer = existing.data[0];
      if (customer.metadata?.userId !== options.userId) {
        await stripe.customers.update(customer.id, { metadata: { ...customer.metadata, userId: options.userId } });
      }
      return customer.id;
    }
  }
  const created = await stripe.customers.create({ ...(options.email && { email: options.email }), metadata: { userId: options.userId } });
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
    const plan = body.plan as PlanKey;
    const base = safeReturnBase(body.origin);
    if (!env || !PLAN_PRICE[plan] || !base) return json({ error: "invalid_request" }, 400);

    const admin = adminClient();
    if (!(await sandboxAllowed(admin, env, userId))) return json({ error: "payments_unavailable" }, 403);

    const { data: up } = await admin.from("user_plans").select("status").eq("user_id", userId).maybeSingle();
    if (up?.status === "comp") return json({ error: "not_needed" }, 409);
    if (await currentSubscriptionRow(admin, userId, env)) return json({ error: "already_subscribed" }, 409);

    const { data: u } = await admin.auth.admin.getUserById(userId);
    const stripe = createStripeClient(env);
    const prices = await stripe.prices.list({ lookup_keys: [PLAN_PRICE[plan]], active: true });
    const price = prices.data[0];
    if (!price || price.tax_behavior !== "inclusive" || price.currency !== "eur") {
      console.error("price misconfigured", PLAN_PRICE[plan], price?.tax_behavior);
      return json({ error: "price_unavailable" }, 503);
    }
    const customerId = await resolveOrCreateCustomer(stripe, { email: u?.user?.email ?? undefined, userId });

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      ui_mode: "embedded_page",
      line_items: [{ price: price.id, quantity: 1 }],
      customer: customerId,
      customer_update: { address: "auto", name: "auto" },
      billing_address_collection: "required",
      automatic_tax: { enabled: true },
      tax_id_collection: { enabled: true },
      return_url: `${base}/checkout/return?session_id={CHECKOUT_SESSION_ID}`,
      metadata: { userId, plan, managed_payments: "false" },
      subscription_data: { metadata: { userId, plan } },
    });
    return json({ clientSecret: session.client_secret });
  } catch (e) {
    console.error("create-checkout error", e);
    return json({ error: "checkout_failed" }, 500);
  }
});

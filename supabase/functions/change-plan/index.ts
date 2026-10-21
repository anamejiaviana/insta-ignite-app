import { createStripeClient } from "../_shared/stripe.ts";
import {
  PLAN_PRICE, PRICE_RANK, type PlanKey, adminClient, corsHeaders, currentSubscriptionRow, json, parseEnv,
  sandboxAllowed, syncSubscription, verifyUser,
} from "../_shared/billing.ts";

// Upgrade: immediate, prorated difference charged now (fails cleanly if the card is declined).
// Downgrade: scheduled for the end of the paid period. Existing businesses are never deleted;
// the business trigger only blocks creating new ones above the new limit.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  try {
    const userId = await verifyUser(req);
    if (!userId) return json({ error: "unauthorized" }, 401);
    const body = await req.json().catch(() => ({}));
    const env = parseEnv(body.environment);
    const plan = body.plan as PlanKey;
    const action = body.action === "cancel" || body.action === "resume" ? body.action : "change";
    if (!env || (action === "change" && !PLAN_PRICE[plan])) return json({ error: "invalid_request" }, 400);
    const admin = adminClient();
    if (!(await sandboxAllowed(admin, env, userId))) return json({ error: "payments_unavailable" }, 403);

    const row = await currentSubscriptionRow(admin, userId, env);
    if (!row?.provider_subscription_id) return json({ error: "no_subscription" }, 404);

    const stripe = createStripeClient(env);
    const sub: any = await stripe.subscriptions.retrieve(row.provider_subscription_id);
    if (sub.metadata?.userId !== userId) return json({ error: "forbidden" }, 403);

    // Cancel always takes effect at the end of the paid period; a pending downgrade is dropped first
    // (the provider does not allow cancelling a subscription that has a scheduled change).
    if (action !== "change") {
      if (sub.schedule) await stripe.subscriptionSchedules.release(typeof sub.schedule === "string" ? sub.schedule : sub.schedule.id);
      await stripe.subscriptions.update(sub.id, { cancel_at_period_end: action === "cancel" });
      await syncSubscription(admin, env, sub.id);
      return json({ result: action === "cancel" ? "cancel_scheduled" : "resumed" });
    }
    if (sub.status === "past_due") return json({ error: "past_due" }, 409);
    if (sub.schedule) {
      await stripe.subscriptionSchedules.release(typeof sub.schedule === "string" ? sub.schedule : sub.schedule.id);
      sub.schedule = null;
    }
    // Choosing a plan again undoes a pending cancellation.
    if (sub.cancel_at_period_end) await stripe.subscriptions.update(sub.id, { cancel_at_period_end: false });
    const item = sub.items.data[0];
    const currentKey = item.price.lookup_key as string;
    const targetKey = PLAN_PRICE[plan];
    const prices = await stripe.prices.list({ lookup_keys: [targetKey], active: true });
    const target = prices.data[0];
    if (!target || target.tax_behavior !== "inclusive") return json({ error: "price_unavailable" }, 503);

    // Any pending scheduled change is replaced by the new choice.
    if (sub.schedule) {
      await stripe.subscriptionSchedules.release(typeof sub.schedule === "string" ? sub.schedule : sub.schedule.id);
    }
    if (currentKey === targetKey) {
      await syncSubscription(admin, env, sub.id);
      return json({ result: "unchanged" });
    }

    if (PRICE_RANK[targetKey] > PRICE_RANK[currentKey]) {
      await stripe.subscriptions.update(sub.id, {
        items: [{ id: item.id, price: target.id, quantity: 1 }],
        proration_behavior: "always_invoice",
        payment_behavior: "error_if_incomplete",
        metadata: { ...sub.metadata, plan },
      });
      await syncSubscription(admin, env, sub.id);
      return json({ result: "upgraded" });
    }

    const sched: any = await stripe.subscriptionSchedules.create({ from_subscription: sub.id });
    const phase = sched.phases[0];
    await stripe.subscriptionSchedules.update(sched.id, {
      end_behavior: "release",
      phases: [
        { items: [{ price: item.price.id, quantity: 1 }], start_date: phase.start_date, end_date: phase.end_date },
        { items: [{ price: target.id, quantity: 1 }], duration: { interval: "month", interval_count: 1 }, metadata: { userId, plan } },
      ],
    } as any);
    await syncSubscription(admin, env, sub.id);
    return json({ result: "downgrade_scheduled", effective_at: new Date(phase.end_date * 1000).toISOString() });
  } catch (e: any) {
    console.error("change-plan error", e);
    if (e?.type === "StripeCardError" || e?.code === "card_declined") return json({ error: "payment_failed" }, 402);
    return json({ error: "change_failed" }, 500);
  }
});

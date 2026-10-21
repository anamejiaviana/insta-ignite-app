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
    const action = ["cancel", "resume", "abandon"].includes(body.action) ? body.action : "change";
    if (!env || (action === "change" && !PLAN_PRICE[plan])) return json({ error: "invalid_request" }, 400);
    const admin = adminClient();
    if (!(await sandboxAllowed(admin, env, userId))) return json({ error: "payments_unavailable" }, 403);

    const row = await currentSubscriptionRow(admin, userId, env);
    if (!row?.provider_subscription_id) return json({ error: "no_subscription" }, 404);

    const stripe = createStripeClient(env);
    const sub: any = await stripe.subscriptions.retrieve(row.provider_subscription_id);
    if (sub.metadata?.userId !== userId) return json({ error: "forbidden" }, 403);

    // An upgrade whose bank verification was failed or abandoned leaves an unpaid charge: void it so it can
    // never be collected later and the plan stays as it was.
    if (sub.pending_update && sub.latest_invoice) {
      const inv: any = await stripe.invoices.retrieve(typeof sub.latest_invoice === "string" ? sub.latest_invoice : sub.latest_invoice.id);
      if (inv.status === "open") await stripe.invoices.voidInvoice(inv.id).catch((e: any) => console.error("void failed", e?.message));
    }
    if (action === "abandon") return json({ result: "abandoned" });

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

    if (currentKey === targetKey) {
      await syncSubscription(admin, env, sub.id);
      return json({ result: "unchanged" });
    }

    if (PRICE_RANK[targetKey] > PRICE_RANK[currentKey]) {
      // pending_if_incomplete: the new plan only applies once the prorated charge is paid.
      // If the bank asks for 3D Secure, the browser completes it with the returned client secret.
      const updated: any = await stripe.subscriptions.update(sub.id, {
        items: [{ id: item.id, price: target.id, quantity: 1 }],
        proration_behavior: "always_invoice",
        payment_behavior: "pending_if_incomplete",
        expand: ["latest_invoice.payments"],
      } as any);
      if (updated.pending_update) {
        const inv = updated.latest_invoice;
        const ref = inv?.payments?.data?.find((p: any) => p.payment?.payment_intent)?.payment?.payment_intent;
        const pi: any = ref ? await stripe.paymentIntents.retrieve(typeof ref === "string" ? ref : ref.id) : null;
        if (pi?.status === "requires_action") return json({ result: "requires_action", clientSecret: pi.client_secret });
        // Declined: void the charge so it can never be collected later; the plan stays as it was.
        if (inv?.id && inv.status === "open") await stripe.invoices.voidInvoice(inv.id).catch((e: any) => console.error("void failed", e?.message));
        return json({ error: "payment_failed" }, 402);
      }
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
    // Declined cards and cards that need 3D Secure during an upgrade both leave the plan unchanged.
    const payCodes = ["card_declined", "authentication_required", "subscription_payment_intent_requires_action", "expired_card", "insufficient_funds"];
    if (e?.type === "StripeCardError" || payCodes.includes(e?.code)) return json({ error: "payment_failed" }, 402);
    return json({ error: "change_failed" }, 500);
  }
});

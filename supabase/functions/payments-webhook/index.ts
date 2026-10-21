import { type StripeEnv, verifyWebhook } from "../_shared/stripe.ts";
import { adminClient, syncSubscription } from "../_shared/billing.ts";

const ok = (extra: Record<string, unknown> = {}) =>
  new Response(JSON.stringify({ received: true, ...extra }), { status: 200, headers: { "Content-Type": "application/json" } });

function subscriptionIdOf(event: any): string | null {
  const o = event.data.object;
  if (event.type.startsWith("customer.subscription.")) return o.id;
  if (event.type.startsWith("invoice.")) {
    const s = o.parent?.subscription_details?.subscription ?? o.subscription;
    return typeof s === "string" ? s : s?.id ?? null;
  }
  if (event.type.startsWith("checkout.session.")) return typeof o.subscription === "string" ? o.subscription : o.subscription?.id ?? null;
  return null;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const rawEnv = new URL(req.url).searchParams.get("env");
  if (rawEnv !== "sandbox" && rawEnv !== "live") return ok({ ignored: "invalid env" });
  const env: StripeEnv = rawEnv;

  let event;
  try { event = await verifyWebhook(req, env); } catch (e) {
    console.error("signature rejected", (e as Error).message);
    return new Response("Invalid signature", { status: 400 });
  }

  const admin = adminClient();
  // Idempotency: an event id is processed once; it is recorded only after success so retries still work.
  const { data: seen } = await admin.from("billing_events").select("event_id").eq("event_id", event.id).maybeSingle();
  if (seen) return ok({ duplicate: true });

  try {
    const subId = subscriptionIdOf(event);
    // Always re-read current state from the provider, so out-of-order events can't regress the plan.
    if (subId) await syncSubscription(admin, env, subId);
    else console.log("event without subscription", event.type);

    const userId = event.data.object?.metadata?.userId ?? null;
    await admin.from("billing_events").upsert({
      event_id: event.id, provider: "stripe", event_type: event.type,
      user_id: userId && /^[0-9a-f-]{36}$/.test(userId) ? userId : null,
    }, { onConflict: "event_id", ignoreDuplicates: true });
    return ok();
  } catch (e) {
    console.error("webhook processing error", event.type, e);
    return new Response("Webhook error", { status: 500 });
  }
});

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { paymentsEnvironment } from "@/lib/billing";

export interface SubscriptionRow {
  price_id: string | null;
  plan_name: string | null;
  status: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  provider_customer_id: string | null;
}

/** Reads the user's latest subscription for this build's environment (display only; the server re-checks). */
export function useSubscription() {
  const [sub, setSub] = useState<SubscriptionRow | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const env = paymentsEnvironment();
    const { data: { user } } = await supabase.auth.getUser();
    if (!env || !user) { setSub(null); setLoading(false); return null; }
    const { data } = await supabase.from("subscriptions")
      .select("price_id, plan_name, status, current_period_end, cancel_at_period_end, provider_customer_id")
      .eq("user_id", user.id).eq("environment", env)
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    setSub((data as SubscriptionRow) ?? null);
    setLoading(false);
    return data as SubscriptionRow | null;
  }, []);

  useEffect(() => { refresh(); }, [refresh]);
  return { sub, loading, refresh };
}

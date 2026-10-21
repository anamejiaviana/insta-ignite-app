import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export type PlanStatus = "trial" | "active" | "expired" | "comp" | "legacy";

export interface UserPlan {
  plan_name: string;
  business_limit: number; // -1 = unlimited
  status: PlanStatus;
  trial_ends_at: string | null;
}

/** Trial is over when status is expired, or trial and the end date passed (the server enforces the same rule). */
export function isTrialExpired(p: Pick<UserPlan, "status" | "trial_ends_at"> | null, now = Date.now()) {
  if (!p) return false;
  if (p.status === "expired") return true;
  return p.status === "trial" && (!p.trial_ends_at || new Date(p.trial_ends_at).getTime() <= now);
}

export function trialDaysLeft(p: Pick<UserPlan, "trial_ends_at"> | null, now = Date.now()) {
  if (!p?.trial_ends_at) return 0;
  return Math.max(0, Math.ceil((new Date(p.trial_ends_at).getTime() - now) / 86400000));
}

/** Mirrors the server rule `get_business_limit` (the database trigger is what actually enforces it). -1 = unlimited. */
export function businessLimitFor(p: Pick<UserPlan, "status" | "plan_name" | "business_limit"> | null) {
  if (!p) return 1;
  switch (p.status) {
    case "comp": return -1;
    case "expired": return 0;
    case "trial": return 1;
    case "active": return p.plan_name === "studio" ? 5 : p.plan_name === "pro" ? 3 : 1;
    default: return p.business_limit;
  }
}

export function useUserPlan() {
  const [plan, setPlan] = useState<UserPlan | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetchPlan = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) {
        setLoading(false);
        return;
      }

      const { data } = await (supabase as any)
        .from("user_plans")
        .select("plan_name, business_limit, status, trial_ends_at")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!cancelled) {
        setPlan(data
          ? { plan_name: data.plan_name, business_limit: data.business_limit, status: data.status ?? "legacy", trial_ends_at: data.trial_ends_at ?? null }
          : { plan_name: "basic", business_limit: 1, status: "legacy", trial_ends_at: null });
        setLoading(false);
      }
    };

    fetchPlan();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchPlan();
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const businessLimit = businessLimitFor(plan);
  const isUnlimited = plan ? businessLimit === -1 : false;
  const isTrial = plan?.status === "trial" || plan?.status === "expired";
  const expired = isTrialExpired(plan);

  const canAddBusiness = (currentCount: number) => {
    if (!plan) return false;
    if (businessLimit === -1) return true;
    return currentCount < businessLimit;
  };

  return { plan, loading, businessLimit, isUnlimited, isTrial, expired, daysLeft: trialDaysLeft(plan), canAddBusiness };
}

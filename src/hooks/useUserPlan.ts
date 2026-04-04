import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface UserPlan {
  plan_name: string;
  business_limit: number; // -1 = unlimited
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
        .select("plan_name, business_limit")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!cancelled) {
        setPlan(data ? { plan_name: data.plan_name, business_limit: data.business_limit } : { plan_name: "basic", business_limit: 1 });
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

  const isUnlimited = plan ? plan.business_limit === -1 : false;

  const canAddBusiness = (currentCount: number) => {
    if (!plan) return false;
    if (plan.business_limit === -1) return true;
    return currentCount < plan.business_limit;
  };

  return { plan, loading, isUnlimited, canAddBusiness };
}

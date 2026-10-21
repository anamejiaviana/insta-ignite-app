import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { isTrialExpired } from "@/hooks/useUserPlan";

export interface ImageUsage {
  current: number;
  limit: number;
  remaining: number;
  limitReached: boolean;
  textCurrent?: number;
  textLimit?: number;
  isTrial?: boolean;
  expired?: boolean;
}

export const TRIAL_IMAGE_LIMIT = 5;
export const TRIAL_TEXT_LIMIT = 40;

export function useImageUsage() {
  const [usage, setUsage] = useState<ImageUsage>({ current: 0, limit: 30, remaining: 30, limitReached: false });
  const [loading, setLoading] = useState(true);

  const fetchUsage = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data: plan } = await (supabase as any)
      .from("user_plans").select("status, trial_ends_at").eq("user_id", user.id).maybeSingle();
    const isTrial = plan?.status === "trial" || plan?.status === "expired";
    const expired = isTrialExpired(plan ?? null);
    // Trial quotas are a single total (month = 'trial'); paid/legacy plans are monthly.
    const month = isTrial ? "trial" : new Date().toISOString().slice(0, 7);

    const [limitRes, countsRes] = await Promise.all([
      (supabase as any).rpc('get_image_limit', { _user_id: user.id }),
      (supabase as any)
        .from('usage_counters')
        .select('resource_type, count')
        .eq('user_id', user.id)
        .eq('month', month)
        .in('resource_type', ['images', 'text']),
    ]);

    const rows: { resource_type: string; count: number }[] = countsRes.data ?? [];
    const limit = isTrial ? TRIAL_IMAGE_LIMIT : (limitRes.data ?? 30);
    const current = rows.find((r) => r.resource_type === 'images')?.count ?? 0;
    const textCurrent = rows.find((r) => r.resource_type === 'text')?.count ?? 0;
    const remaining = expired ? 0 : Math.max(0, limit - current);

    setUsage({
      current, limit, remaining, limitReached: expired || current >= limit,
      textCurrent, textLimit: isTrial ? TRIAL_TEXT_LIMIT : undefined, isTrial, expired,
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchUsage();
  }, [fetchUsage]);

  return { usage, loading, refreshUsage: fetchUsage };
}

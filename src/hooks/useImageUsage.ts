import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ImageUsage {
  current: number;
  limit: number;
  remaining: number;
  limitReached: boolean;
}

export function useImageUsage() {
  const [usage, setUsage] = useState<ImageUsage>({ current: 0, limit: 30, remaining: 30, limitReached: false });
  const [loading, setLoading] = useState(true);

  const fetchUsage = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const month = new Date().toISOString().slice(0, 7);

    // Fetch limit and current count in parallel
    const [limitRes, countRes] = await Promise.all([
      (supabase as any).rpc('get_image_limit', { _user_id: user.id }),
      (supabase as any)
        .from('usage_counters')
        .select('count')
        .eq('user_id', user.id)
        .eq('resource_type', 'images')
        .eq('month', month)
        .maybeSingle(),
    ]);

    const limit = limitRes.data ?? 30;
    const current = countRes.data?.count ?? 0;
    const remaining = Math.max(0, limit - current);

    setUsage({ current, limit, remaining, limitReached: current >= limit });
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchUsage();
  }, [fetchUsage]);

  return { usage, loading, refreshUsage: fetchUsage };
}

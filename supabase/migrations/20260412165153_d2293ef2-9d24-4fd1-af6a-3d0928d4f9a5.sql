
-- Admin view: usage overview per user per month
CREATE OR REPLACE VIEW public.usage_overview AS
SELECT
  uc.user_id,
  uc.month,
  uc.resource_type,
  uc.count,
  COALESCE(up.plan_name, 'basic') AS plan_name,
  public.get_image_limit(uc.user_id) AS image_limit,
  (SELECT COUNT(*)::int FROM public.clients c WHERE c.user_id = uc.user_id) AS business_count
FROM public.usage_counters uc
LEFT JOIN public.user_plans up ON up.user_id = uc.user_id
ORDER BY uc.month DESC, uc.count DESC;

-- RLS: only admins can query the view
ALTER VIEW public.usage_overview SET (security_invoker = true);

-- Grant select to authenticated (RLS on usage_counters already limits to own data + admin)
GRANT SELECT ON public.usage_overview TO authenticated;

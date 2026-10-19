CREATE OR REPLACE FUNCTION public.get_text_limit(_user_id uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT COALESCE((
    SELECT CASE
      WHEN up.business_limit = -1 THEN 9999
      WHEN up.plan_name = 'studio' THEN 1000
      WHEN up.plan_name = 'pro' THEN 500
      ELSE 200 END
    FROM public.user_plans up WHERE up.user_id = _user_id LIMIT 1), 200)
$$;

-- Atomic reserve: one statement, row-locked, never exceeds the limit under concurrency.
CREATE OR REPLACE FUNCTION public.reserve_quota(_user_id uuid, _resource_type text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  _month text := to_char(now() AT TIME ZONE 'utc', 'YYYY-MM');
  _limit integer;
  _new integer;
  _cur integer;
BEGIN
  IF _resource_type = 'images' THEN
    _limit := COALESCE(public.get_image_limit(_user_id), 30);
  ELSIF _resource_type = 'text' THEN
    _limit := public.get_text_limit(_user_id);
  ELSE
    RAISE EXCEPTION 'unknown resource type';
  END IF;

  INSERT INTO public.usage_counters (user_id, resource_type, month, count)
  VALUES (_user_id, _resource_type, _month, 1)
  ON CONFLICT (user_id, resource_type, month)
  DO UPDATE SET count = usage_counters.count + 1, updated_at = now()
  WHERE usage_counters.count < _limit
  RETURNING count INTO _new;

  IF _new IS NULL THEN
    SELECT count INTO _cur FROM public.usage_counters
    WHERE user_id = _user_id AND resource_type = _resource_type AND month = _month;
    RETURN jsonb_build_object('allowed', false, 'current', COALESCE(_cur, 0), 'limit', _limit, 'month', _month);
  END IF;
  RETURN jsonb_build_object('allowed', true, 'current', _new, 'limit', _limit, 'month', _month);
END $$;

-- Refund a reservation when the AI call fails.
CREATE OR REPLACE FUNCTION public.release_quota(_user_id uuid, _resource_type text, _month text)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path TO 'public' AS $$
  UPDATE public.usage_counters SET count = GREATEST(count - 1, 0), updated_at = now()
  WHERE user_id = _user_id AND resource_type = _resource_type AND month = _month;
$$;

-- get_image_limit: only your own limit (service role unrestricted).
CREATE OR REPLACE FUNCTION public.get_image_limit(_user_id uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT CASE
    WHEN auth.role() <> 'service_role' AND _user_id IS DISTINCT FROM auth.uid() THEN NULL
    ELSE COALESCE((
      SELECT CASE
        WHEN up.business_limit = -1 THEN 9999
        WHEN up.plan_name = 'studio' THEN 150
        WHEN up.plan_name = 'pro' THEN 80
        ELSE 30 END
      FROM public.user_plans up WHERE up.user_id = _user_id LIMIT 1), 30)
  END
$$;

REVOKE EXECUTE ON FUNCTION public.reserve_quota(uuid, text) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.release_quota(uuid, text, text) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.get_text_limit(uuid) FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.reserve_quota(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_quota(uuid, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_text_limit(uuid) TO service_role;
REVOKE EXECUTE ON FUNCTION public.get_image_limit(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_image_limit(uuid) TO authenticated, service_role;
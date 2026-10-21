CREATE OR REPLACE FUNCTION public.reserve_quota(_user_id uuid, _resource_type text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  _month text := to_char(now() AT TIME ZONE 'utc', 'YYYY-MM');
  _limit integer; _new integer; _cur integer; _g integer;
  _status text; _ends timestamptz;
  _global uuid := '00000000-0000-0000-0000-000000000000';
  _global_cap constant integer := 30;
BEGIN
  IF _resource_type NOT IN ('images','text') THEN RAISE EXCEPTION 'unknown resource type'; END IF;
  SELECT status, trial_ends_at INTO _status, _ends FROM public.user_plans WHERE user_id = _user_id;
  IF _status IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'no_plan', 'current', 0, 'limit', 0, 'month', _month);
  END IF;
  IF _status = 'expired' OR (_status = 'trial' AND (_ends IS NULL OR now() >= _ends)) THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'trial_expired', 'current', 0, 'limit', 0, 'month', 'trial');
  END IF;
  IF _status = 'trial' THEN
    _month := 'trial';
    _limit := CASE WHEN _resource_type = 'images' THEN 5 ELSE 40 END;
  ELSIF _resource_type = 'images' THEN
    _limit := COALESCE(public.get_image_limit(_user_id), 30);
  ELSE
    _limit := public.get_text_limit(_user_id);
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
    RETURN jsonb_build_object('allowed', false, 'reason', 'limit', 'current', COALESCE(_cur, 0), 'limit', _limit, 'month', _month);
  END IF;
  IF _status = 'trial' AND _resource_type = 'images' THEN
    INSERT INTO public.usage_counters (user_id, resource_type, month, count)
    VALUES (_global, 'trial_images_daily', to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD'), 1)
    ON CONFLICT (user_id, resource_type, month)
    DO UPDATE SET count = usage_counters.count + 1, updated_at = now()
    WHERE usage_counters.count < _global_cap
    RETURNING count INTO _g;
    IF _g IS NULL THEN
      UPDATE public.usage_counters SET count = GREATEST(count - 1, 0), updated_at = now()
      WHERE user_id = _user_id AND resource_type = _resource_type AND month = _month;
      RETURN jsonb_build_object('allowed', false, 'reason', 'trial_daily_cap', 'current', _new - 1, 'limit', _limit, 'month', _month);
    END IF;
  END IF;
  RETURN jsonb_build_object('allowed', true, 'current', _new, 'limit', _limit, 'month', _month);
END $function$;
REVOKE ALL ON FUNCTION public.reserve_quota(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_quota(uuid, text) TO service_role;
-- Plan status: existing accounts keep their access (legacy / comp); new signups get a 7-day trial.
ALTER TABLE public.user_plans ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'legacy';
ALTER TABLE public.user_plans ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz;
UPDATE public.user_plans SET status = 'comp' WHERE business_limit = -1;
ALTER TABLE public.user_plans ALTER COLUMN status SET DEFAULT 'trial';
ALTER TABLE public.user_plans ADD CONSTRAINT user_plans_status_check
  CHECK (status IN ('trial','active','expired','comp','legacy'));

-- Only the backend (service role / migrations) may change status or trial dates.
CREATE OR REPLACE FUNCTION public.protect_plan_status()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF COALESCE(auth.role(), '') IN ('authenticated','anon')
     AND (NEW.status IS DISTINCT FROM OLD.status OR NEW.trial_ends_at IS DISTINCT FROM OLD.trial_ends_at
          OR (OLD.status = 'trial' AND (NEW.business_limit IS DISTINCT FROM OLD.business_limit OR NEW.plan_name IS DISTINCT FROM OLD.plan_name))) THEN
    RAISE EXCEPTION 'plan status can only be changed by the backend';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS protect_plan_status ON public.user_plans;
CREATE TRIGGER protect_plan_status BEFORE UPDATE ON public.user_plans
  FOR EACH ROW EXECUTE FUNCTION public.protect_plan_status();

-- New signups: one trial per account (user_id is unique, never re-granted).
CREATE OR REPLACE FUNCTION public.handle_new_user_plan()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.user_plans (user_id, plan_name, business_limit, status, trial_ends_at)
  VALUES (NEW.id, 'basic', 1, 'trial', now() + interval '7 days')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.get_image_limit(_user_id uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN auth.role() <> 'service_role' AND _user_id IS DISTINCT FROM auth.uid() THEN NULL
    ELSE COALESCE((
      SELECT CASE
        WHEN up.status IN ('trial','expired') THEN 5
        WHEN up.business_limit = -1 THEN 9999
        WHEN up.plan_name = 'studio' THEN 150
        WHEN up.plan_name = 'pro' THEN 80
        ELSE 30 END
      FROM public.user_plans up WHERE up.user_id = _user_id LIMIT 1), 30)
  END
$$;

CREATE OR REPLACE FUNCTION public.get_text_limit(_user_id uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((
    SELECT CASE
      WHEN up.status IN ('trial','expired') THEN 40
      WHEN up.business_limit = -1 THEN 9999
      WHEN up.plan_name = 'studio' THEN 1000
      WHEN up.plan_name = 'pro' THEN 500
      ELSE 200 END
    FROM public.user_plans up WHERE up.user_id = _user_id LIMIT 1), 200)
$$;

-- Trial quotas are TOTAL (month = 'trial'); all trials share a daily image cap (sentinel user id).
CREATE OR REPLACE FUNCTION public.reserve_quota(_user_id uuid, _resource_type text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _month text := to_char(now() AT TIME ZONE 'utc', 'YYYY-MM');
  _limit integer; _new integer; _cur integer; _g integer;
  _status text; _ends timestamptz;
  _global uuid := '00000000-0000-0000-0000-000000000000';
  _global_cap constant integer := 200;
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
END $$;

CREATE OR REPLACE FUNCTION public.release_quota(_user_id uuid, _resource_type text, _month text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.usage_counters SET count = GREATEST(count - 1, 0), updated_at = now()
  WHERE user_id = _user_id AND resource_type = _resource_type AND month = _month;
  IF _month = 'trial' AND _resource_type = 'images' THEN
    UPDATE public.usage_counters SET count = GREATEST(count - 1, 0), updated_at = now()
    WHERE user_id = '00000000-0000-0000-0000-000000000000' AND resource_type = 'trial_images_daily'
      AND month = to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD');
  END IF;
END $$;

REVOKE EXECUTE ON FUNCTION public.reserve_quota(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.release_quota(uuid, text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_text_limit(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_quota(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_quota(uuid, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_text_limit(uuid) TO service_role;
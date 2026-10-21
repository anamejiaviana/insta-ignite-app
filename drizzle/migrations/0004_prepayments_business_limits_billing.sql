-- Business limit per plan/status (single source of truth)
CREATE OR REPLACE FUNCTION public.get_business_limit(_user_id uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT COALESCE((
    SELECT CASE
      WHEN up.status = 'comp' THEN -1
      WHEN up.status = 'expired' THEN 0
      WHEN up.status = 'trial' THEN 1
      WHEN up.status = 'active' THEN CASE up.plan_name WHEN 'studio' THEN 5 WHEN 'pro' THEN 3 ELSE 1 END
      ELSE up.business_limit  -- legacy keeps its stored limit (-1 = unlimited)
    END
    FROM public.user_plans up WHERE up.user_id = _user_id LIMIT 1), 1)
$$;
REVOKE ALL ON FUNCTION public.get_business_limit(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_business_limit(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.enforce_business_limit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE _limit integer; _count integer;
BEGIN
  IF COALESCE(auth.role(), '') = 'service_role' THEN RETURN NEW; END IF;
  -- serialize concurrent inserts for the same owner
  PERFORM pg_advisory_xact_lock(hashtext('clients:' || NEW.user_id::text));
  _limit := public.get_business_limit(NEW.user_id);
  IF _limit = -1 THEN RETURN NEW; END IF;
  SELECT count(*) INTO _count FROM public.clients WHERE user_id = NEW.user_id;
  IF _count >= _limit THEN
    RAISE EXCEPTION 'business_limit_reached' USING ERRCODE = 'P0001', DETAIL = format('limit=%s', _limit);
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.enforce_business_limit() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS enforce_business_limit ON public.clients;
CREATE TRIGGER enforce_business_limit BEFORE INSERT ON public.clients
FOR EACH ROW EXECUTE FUNCTION public.enforce_business_limit();

-- AI limits: comp by status, active by plan_name, legacy unchanged
CREATE OR REPLACE FUNCTION public.get_image_limit(_user_id uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN auth.role() <> 'service_role' AND _user_id IS DISTINCT FROM auth.uid() THEN NULL
    ELSE COALESCE((
      SELECT CASE
        WHEN up.status = 'comp' THEN 9999
        WHEN up.status IN ('trial','expired') THEN 5
        WHEN up.status = 'active' THEN CASE up.plan_name WHEN 'studio' THEN 150 WHEN 'pro' THEN 80 ELSE 30 END
        WHEN up.business_limit = -1 THEN 9999
        WHEN up.plan_name = 'studio' THEN 150
        WHEN up.plan_name = 'pro' THEN 80
        ELSE 30 END
      FROM public.user_plans up WHERE up.user_id = _user_id LIMIT 1), 30)
  END
$$;

CREATE OR REPLACE FUNCTION public.get_text_limit(_user_id uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT COALESCE((
    SELECT CASE
      WHEN up.status = 'comp' THEN 9999
      WHEN up.status IN ('trial','expired') THEN 40
      WHEN up.status = 'active' THEN CASE up.plan_name WHEN 'studio' THEN 1000 WHEN 'pro' THEN 500 ELSE 200 END
      WHEN up.business_limit = -1 THEN 9999
      WHEN up.plan_name = 'studio' THEN 1000
      WHEN up.plan_name = 'pro' THEN 500
      ELSE 200 END
    FROM public.user_plans up WHERE up.user_id = _user_id LIMIT 1), 200)
$$;

-- Users (non-admin) can never change status, dates, plan name or business limit
CREATE OR REPLACE FUNCTION public.protect_plan_status()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $$
BEGIN
  IF COALESCE(auth.role(), '') IN ('authenticated','anon') THEN
    IF NEW.status IS DISTINCT FROM OLD.status OR NEW.trial_ends_at IS DISTINCT FROM OLD.trial_ends_at THEN
      RAISE EXCEPTION 'plan status can only be changed by the backend';
    END IF;
    IF (NEW.plan_name IS DISTINCT FROM OLD.plan_name OR NEW.business_limit IS DISTINCT FROM OLD.business_limit)
       AND (OLD.status = 'trial' OR NOT public.has_role(auth.uid(), 'admin')) THEN
      RAISE EXCEPTION 'plan can only be changed by the backend';
    END IF;
  END IF;
  RETURN NEW;
END $$;

-- Billing structure only (no provider wired, no rows)
CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  provider text NOT NULL DEFAULT 'stripe',
  environment text NOT NULL DEFAULT 'test',
  provider_customer_id text,
  provider_subscription_id text UNIQUE,
  price_id text,
  plan_name text,
  status text,
  current_period_end timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  last_event_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own subscription" ON public.subscriptions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins view subscriptions" ON public.subscriptions FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER set_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TABLE public.billing_events (
  event_id text PRIMARY KEY,
  provider text NOT NULL DEFAULT 'stripe',
  event_type text NOT NULL,
  user_id uuid,
  processed_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.billing_events TO service_role;
GRANT SELECT ON public.billing_events TO authenticated;
ALTER TABLE public.billing_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own billing events" ON public.billing_events FOR SELECT TO authenticated USING (auth.uid() = user_id);
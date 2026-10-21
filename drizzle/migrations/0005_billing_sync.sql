ALTER TABLE public.user_plans ADD COLUMN IF NOT EXISTS pre_billing_status text, ADD COLUMN IF NOT EXISTS pre_billing_plan text;
CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_provider_sub_uidx ON public.subscriptions(provider_subscription_id);
CREATE INDEX IF NOT EXISTS subscriptions_user_env_idx ON public.subscriptions(user_id, environment);

-- Only the verified payments webhook (service_role) calls this. Paid access => status 'active' with the paid plan.
-- When access ends, the account returns to legacy/comp if it was one before paying, otherwise 'expired'.
CREATE OR REPLACE FUNCTION public.apply_billing_state(_user_id uuid, _plan_name text, _has_access boolean)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.user_plans%ROWTYPE;
BEGIN
  IF _plan_name IS NOT NULL AND _plan_name NOT IN ('basic','pro','studio') THEN
    RAISE EXCEPTION 'invalid plan';
  END IF;
  SELECT * INTO r FROM public.user_plans WHERE user_id = _user_id FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO public.user_plans(user_id, plan_name, business_limit, status) VALUES (_user_id, 'basic', 1, 'expired');
    SELECT * INTO r FROM public.user_plans WHERE user_id = _user_id FOR UPDATE;
  END IF;
  IF _has_access THEN
    UPDATE public.user_plans SET
      pre_billing_status = CASE WHEN r.status = 'active' THEN r.pre_billing_status ELSE r.status END,
      pre_billing_plan   = CASE WHEN r.status = 'active' THEN r.pre_billing_plan ELSE r.plan_name END,
      status = 'active', plan_name = _plan_name, updated_at = now()
    WHERE user_id = _user_id;
    RETURN 'active';
  ELSIF r.status = 'active' THEN
    UPDATE public.user_plans SET
      status = CASE WHEN r.pre_billing_status IN ('legacy','comp') THEN r.pre_billing_status ELSE 'expired' END,
      plan_name = CASE WHEN r.pre_billing_status IN ('legacy','comp') THEN COALESCE(r.pre_billing_plan, r.plan_name) ELSE r.plan_name END,
      pre_billing_status = NULL, pre_billing_plan = NULL, updated_at = now()
    WHERE user_id = _user_id;
    RETURN 'ended';
  END IF;
  RETURN r.status;
END $$;
REVOKE ALL ON FUNCTION public.apply_billing_state(uuid, text, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_billing_state(uuid, text, boolean) TO service_role;
GRANT ALL ON public.subscriptions TO service_role;
GRANT ALL ON public.billing_events TO service_role;

-- Usage counters table
CREATE TABLE public.usage_counters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  resource_type text NOT NULL DEFAULT 'images',
  month text NOT NULL,
  count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, resource_type, month)
);

ALTER TABLE public.usage_counters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own usage"
  ON public.usage_counters FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own usage"
  ON public.usage_counters FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own usage"
  ON public.usage_counters FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all usage"
  ON public.usage_counters FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Helper: get image limit for a user based on their plan
CREATE OR REPLACE FUNCTION public.get_image_limit(_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN up.business_limit = -1 THEN 9999
    WHEN up.plan_name = 'studio' THEN 150
    WHEN up.plan_name = 'pro' THEN 80
    ELSE 30
  END
  FROM public.user_plans up
  WHERE up.user_id = _user_id
  LIMIT 1
$$;

-- Helper: atomically increment usage, returns new count
CREATE OR REPLACE FUNCTION public.increment_usage(_user_id uuid, _resource_type text, _month text, _amount integer DEFAULT 1)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_count integer;
BEGIN
  INSERT INTO public.usage_counters (user_id, resource_type, month, count)
  VALUES (_user_id, _resource_type, _month, _amount)
  ON CONFLICT (user_id, resource_type, month)
  DO UPDATE SET count = usage_counters.count + _amount, updated_at = now()
  RETURNING count INTO new_count;
  RETURN new_count;
END;
$$;

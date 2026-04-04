
-- 1. Create user_plans table
CREATE TABLE public.user_plans (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    plan_name text NOT NULL DEFAULT 'basic',
    business_limit integer NOT NULL DEFAULT 1,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 2. Enable RLS
ALTER TABLE public.user_plans ENABLE ROW LEVEL SECURITY;

-- 3. RLS policies
CREATE POLICY "Users can view own plan"
ON public.user_plans FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all plans"
ON public.user_plans FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4. Updated_at trigger
CREATE TRIGGER handle_user_plans_updated_at
  BEFORE UPDATE ON public.user_plans
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 5. Auto-assign basic plan on new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user_plan()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_plans (user_id, plan_name, business_limit)
  VALUES (NEW.id, 'basic', 1)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_assign_plan
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_plan();

-- 6. Backfill existing users with basic plan
INSERT INTO public.user_plans (user_id, plan_name, business_limit)
SELECT id, 'basic', 1 FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

-- 7. Set admin user to unlimited
UPDATE public.user_plans
SET plan_name = 'admin', business_limit = -1
WHERE user_id = '89c3b55f-ad2b-40fd-b4a7-bb6a2de9a11d';


-- Add content_language and inspiration_account to clients
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS content_language text DEFAULT 'es';
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS inspiration_account text;

-- Create weekly_plans table
CREATE TABLE public.weekly_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  week_start date NOT NULL,
  special_dates text,
  content_language text DEFAULT 'es',
  plan_data jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.weekly_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own weekly plans" ON public.weekly_plans FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own weekly plans" ON public.weekly_plans FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own weekly plans" ON public.weekly_plans FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Users can update own weekly plans" ON public.weekly_plans FOR UPDATE USING (auth.uid() = user_id);

-- Create shooting_plans table
CREATE TABLE public.shooting_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  weekly_plan_id uuid REFERENCES public.weekly_plans(id) ON DELETE SET NULL,
  num_days integer DEFAULT 1,
  plan_data jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.shooting_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own shooting plans" ON public.shooting_plans FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own shooting plans" ON public.shooting_plans FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own shooting plans" ON public.shooting_plans FOR DELETE USING (auth.uid() = user_id);

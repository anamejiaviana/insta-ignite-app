
-- Create clients table
CREATE TABLE public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  type text,
  city text,
  tone text,
  objective text,
  keywords text[] DEFAULT '{}',
  default_visual_style text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own clients" ON public.clients FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own clients" ON public.clients FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own clients" ON public.clients FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own clients" ON public.clients FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER set_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- Extend generated_posts
ALTER TABLE public.generated_posts ADD COLUMN client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL;
ALTER TABLE public.generated_posts ADD COLUMN visual_style text;
ALTER TABLE public.generated_posts ADD COLUMN content_category text DEFAULT 'post';
ALTER TABLE public.generated_posts ADD COLUMN content_data jsonb;
ALTER TABLE public.generated_posts ADD COLUMN objective text;

CREATE TABLE public.editorial_guides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  draft jsonb,
  approved jsonb,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.editorial_guides TO authenticated;
GRANT ALL ON public.editorial_guides TO service_role;
ALTER TABLE public.editorial_guides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own guides select" ON public.editorial_guides FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Own guides insert" ON public.editorial_guides FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.clients c WHERE c.id = client_id AND c.user_id = auth.uid()));
CREATE POLICY "Own guides update" ON public.editorial_guides FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.clients c WHERE c.id = client_id AND c.user_id = auth.uid()));
CREATE POLICY "Own guides delete" ON public.editorial_guides FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER set_editorial_guides_updated_at BEFORE UPDATE ON public.editorial_guides
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
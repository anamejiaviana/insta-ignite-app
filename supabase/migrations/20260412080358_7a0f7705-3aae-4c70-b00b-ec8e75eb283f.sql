
CREATE TABLE public.media_assets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  source text NOT NULL DEFAULT 'uploaded' CHECK (source IN ('generated', 'uploaded', 'edited')),
  original_prompt text,
  file_name text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(client_id, image_url)
);

ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own media assets"
  ON public.media_assets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own media assets"
  ON public.media_assets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own media assets"
  ON public.media_assets FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX idx_media_assets_client ON public.media_assets(client_id);
CREATE INDEX idx_media_assets_user ON public.media_assets(user_id);

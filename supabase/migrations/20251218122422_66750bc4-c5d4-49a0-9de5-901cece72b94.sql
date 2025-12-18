-- Brand configurations table
CREATE TABLE public.brand_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  brand_name TEXT,
  brand_voice TEXT,
  visual_style TEXT,
  default_language TEXT DEFAULT 'es',
  color_palette JSONB DEFAULT '[]'::jsonb,
  logo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Posts history table
CREATE TABLE public.generated_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  post_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  cta TEXT,
  generated_image_url TEXT,
  original_image_url TEXT,
  main_copy TEXT,
  story_copy TEXT,
  hashtags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.brand_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_posts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for brand_configs
CREATE POLICY "Users can view their own brand config" 
ON public.brand_configs 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own brand config" 
ON public.brand_configs 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own brand config" 
ON public.brand_configs 
FOR UPDATE 
USING (auth.uid() = user_id);

-- RLS Policies for generated_posts
CREATE POLICY "Users can view their own posts" 
ON public.generated_posts 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own posts" 
ON public.generated_posts 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own posts" 
ON public.generated_posts 
FOR DELETE 
USING (auth.uid() = user_id);

-- Update timestamp function (if not exists)
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger for brand_configs
CREATE TRIGGER update_brand_configs_updated_at
BEFORE UPDATE ON public.brand_configs
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Storage bucket for images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('post-images', 'post-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Users can upload their own images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'post-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Images are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'post-images');

CREATE POLICY "Users can delete their own images" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'post-images' AND auth.uid()::text = (storage.foldername(name))[1]);
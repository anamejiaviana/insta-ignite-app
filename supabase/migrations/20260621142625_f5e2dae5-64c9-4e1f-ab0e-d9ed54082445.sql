
-- 1. Lock down usage_counters: only service role (edge functions) can write
DROP POLICY IF EXISTS "Users can insert own usage" ON public.usage_counters;
DROP POLICY IF EXISTS "Users can update own usage" ON public.usage_counters;

-- 2. Brand configs: add DELETE policy
CREATE POLICY "Users can delete their own brand config"
ON public.brand_configs
FOR DELETE
USING (auth.uid() = user_id);

-- 3. Shooting plans: add UPDATE policy
CREATE POLICY "Users can update own shooting plans"
ON public.shooting_plans
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 4. Storage: add UPDATE policy scoped to user folder
CREATE POLICY "Users can update their own images"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'post-images' AND (auth.uid())::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'post-images' AND (auth.uid())::text = (storage.foldername(name))[1]);

-- 5. Prevent listing of the public bucket via the Data API.
-- Public URLs continue to work because the bucket itself is public; the SELECT
-- policy was only needed for object listing via the storage API.
DROP POLICY IF EXISTS "Images are publicly accessible" ON storage.objects;

-- 6. Revoke EXECUTE on SECURITY DEFINER functions that should only be called
-- server-side (edge functions use service_role and are unaffected).
REVOKE EXECUTE ON FUNCTION public.increment_usage(uuid, text, text, integer) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user_plan() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user_role() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.handle_updated_at() FROM anon, authenticated, public;
-- get_image_limit and has_role remain callable: get_image_limit is used by the
-- client usage hook; has_role is referenced inside RLS policies.

-- Drop existing FK constraints and recreate with ON DELETE CASCADE for client_id

-- weekly_plans → clients (CASCADE)
ALTER TABLE public.weekly_plans 
  DROP CONSTRAINT IF EXISTS weekly_plans_client_id_fkey;
ALTER TABLE public.weekly_plans
  ADD CONSTRAINT weekly_plans_client_id_fkey 
    FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;

-- generated_posts → clients (CASCADE)
ALTER TABLE public.generated_posts 
  DROP CONSTRAINT IF EXISTS generated_posts_client_id_fkey;
ALTER TABLE public.generated_posts
  ADD CONSTRAINT generated_posts_client_id_fkey 
    FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;

-- shooting_plans → clients (CASCADE)
ALTER TABLE public.shooting_plans 
  DROP CONSTRAINT IF EXISTS shooting_plans_client_id_fkey;
ALTER TABLE public.shooting_plans
  ADD CONSTRAINT shooting_plans_client_id_fkey 
    FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;

-- shooting_plans → weekly_plans (SET NULL, so deleting a plan doesn't delete shooting plans)
ALTER TABLE public.shooting_plans 
  DROP CONSTRAINT IF EXISTS shooting_plans_weekly_plan_id_fkey;
ALTER TABLE public.shooting_plans
  ADD CONSTRAINT shooting_plans_weekly_plan_id_fkey 
    FOREIGN KEY (weekly_plan_id) REFERENCES public.weekly_plans(id) ON DELETE SET NULL;

-- media_assets → clients (CASCADE)
ALTER TABLE public.media_assets 
  DROP CONSTRAINT IF EXISTS media_assets_client_id_fkey;
ALTER TABLE public.media_assets
  ADD CONSTRAINT media_assets_client_id_fkey 
    FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;
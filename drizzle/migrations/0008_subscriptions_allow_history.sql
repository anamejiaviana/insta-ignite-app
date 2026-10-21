-- A user can re-subscribe after cancelling, so keep one row per provider subscription (history), not per user.
ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_user_id_key;
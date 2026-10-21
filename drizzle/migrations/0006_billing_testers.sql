-- Test-mode checkouts/webhooks only change plans for accounts listed here, so test cards can never grant a real plan to anyone else.
CREATE TABLE public.billing_testers (
  user_id uuid PRIMARY KEY,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.billing_testers TO service_role;
ALTER TABLE public.billing_testers ENABLE ROW LEVEL SECURITY;
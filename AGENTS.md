# Project rules

- Every edge function that calls the AI Gateway must be wrapped with `guarded()` from `supabase/functions/_shared/guard.ts` — it verifies the JWT cryptographically (401 otherwise), reserves quota atomically via `reserve_quota` before the AI call and refunds via `release_quota` on failure, so cost abuse is impossible from the client.
- Quota RPCs (`reserve_quota`, `release_quota`, `increment_usage`, `get_text_limit`) are service_role-only; per-plan limit values live in the SQL functions `get_image_limit` / `get_text_limit`, so changing limits is a migration, not a code change.

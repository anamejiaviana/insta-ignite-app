// Shared protection for every AI-consuming edge function:
// 1) verifies the JWT cryptographically (getClaims) — anonymous / invalid => 401, AI never called
// 2) reserves quota atomically in SQL before the AI call (user id from the verified token only)
// 3) refunds the reservation if the handler fails (status >= 400 or throws)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.88.0";

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

export async function verifyUser(req: Request): Promise<string | null> {
  const authHeader = req.headers.get('Authorization') ?? req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data, error } = await sb.auth.getClaims(token);
  const claims = data?.claims;
  if (error || !claims?.sub || claims.role !== 'authenticated') return null;
  return claims.sub as string;
}

type Resource = 'images' | 'text';

export function guarded(
  resource: Resource,
  analyticsType: string | null,
  handler: (req: Request, userId: string) => Promise<Response>,
) {
  return async (req: Request): Promise<Response> => {
    if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

    let userId: string | null = null;
    try { userId = await verifyUser(req); } catch (e) { console.error('auth error', e); }
    if (!userId) return json({ error: 'unauthorized' }, 401);

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: q, error: qErr } = await admin.rpc('reserve_quota', { _user_id: userId, _resource_type: resource });
    if (qErr || !q) {
      console.error('quota error', qErr);
      return json({ error: 'quota_unavailable' }, 503); // fail closed
    }
    if (!q.allowed) {
      return json({ error: resource === 'images' ? 'image_limit_reached' : 'text_limit_reached', current: q.current, limit: q.limit }, 429);
    }

    const refund = () => admin.rpc('release_quota', { _user_id: userId, _resource_type: resource, _month: q.month })
      .then(({ error }) => { if (error) console.error('refund failed', error); });

    let res: Response;
    try {
      res = await handler(req, userId);
    } catch (e) {
      console.error('handler threw', e);
      await refund();
      return json({ error: e instanceof Error ? e.message : 'Unknown error' }, 500);
    }
    if (res.status >= 400) {
      await refund();
    } else if (analyticsType) {
      await admin.rpc('increment_usage', { _user_id: userId, _resource_type: analyticsType, _month: q.month, _amount: 1 });
    }
    return res;
  };
}

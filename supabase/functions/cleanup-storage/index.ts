import { createClient } from "https://esm.sh/@supabase/supabase-js@2.88.0";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

const BUCKET = "post-images";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create authenticated client to verify user
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { urls } = await req.json();
    if (!Array.isArray(urls) || urls.length === 0) {
      return new Response(JSON.stringify({ deleted: [], skipped: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role client for DB checks and storage deletion
    const adminClient = createClient(supabaseUrl, serviceKey);

    const deleted: string[] = [];
    const skipped: string[] = [];

    for (const url of urls) {
      if (!url || typeof url !== "string") continue;

      // Extract storage path from URL
      const storagePath = extractStoragePath(url, supabaseUrl);
      if (!storagePath) {
        skipped.push(url);
        continue;
      }

      // Check if this URL is still referenced anywhere
      const stillReferenced = await isUrlStillReferenced(adminClient, url);
      if (stillReferenced) {
        skipped.push(url);
        continue;
      }

      // Safe to delete from storage
      const { error: deleteError } = await adminClient.storage
        .from(BUCKET)
        .remove([storagePath]);

      if (deleteError) {
        console.error(`Failed to delete ${storagePath}:`, deleteError.message);
        skipped.push(url);
      } else {
        deleted.push(url);
      }
    }

    return new Response(JSON.stringify({ deleted, skipped }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("cleanup-storage error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function extractStoragePath(url: string, supabaseUrl: string): string | null {
  if (!url.includes(supabaseUrl)) return null;
  const marker = `/object/public/${BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return url.substring(idx + marker.length);
}

async function isUrlStillReferenced(
  client: ReturnType<typeof createClient>,
  url: string
): Promise<boolean> {
  // Check media_assets
  const { count: mediaCount } = await client
    .from("media_assets")
    .select("id", { count: "exact", head: true })
    .eq("image_url", url);
  if (mediaCount && mediaCount > 0) return true;

  // Check generated_posts - generated_image_url
  const { count: genCount } = await client
    .from("generated_posts")
    .select("id", { count: "exact", head: true })
    .eq("generated_image_url", url);
  if (genCount && genCount > 0) return true;

  // Check generated_posts - original_image_url
  const { count: origCount } = await client
    .from("generated_posts")
    .select("id", { count: "exact", head: true })
    .eq("original_image_url", url);
  if (origCount && origCount > 0) return true;

  return false;
}

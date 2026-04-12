import { supabase } from "@/integrations/supabase/client";

/**
 * Sends a list of image URLs to the cleanup-storage edge function.
 * The function checks if each URL is still referenced in the DB
 * before deleting the file from storage.
 * 
 * Safe to call with any URLs — unreferenced files are deleted,
 * still-referenced files are skipped.
 */
export async function cleanupStorageUrls(urls: (string | null | undefined)[]): Promise<void> {
  const validUrls = urls.filter((u): u is string => !!u && u.length > 0);
  if (validUrls.length === 0) return;

  try {
    await supabase.functions.invoke("cleanup-storage", {
      body: { urls: validUrls },
    });
  } catch (err) {
    // Storage cleanup is best-effort — don't block the user flow
    console.warn("Storage cleanup failed (non-blocking):", err);
  }
}

/**
 * Collects all image URLs associated with a client/business from
 * generated_posts and media_assets. Call this BEFORE deleting
 * the client so CASCADE doesn't remove the rows first.
 */
export async function collectClientImageUrls(clientId: string): Promise<string[]> {
  const urls: string[] = [];

  // Collect from generated_posts
  const { data: posts } = await supabase
    .from("generated_posts")
    .select("generated_image_url, original_image_url")
    .eq("client_id", clientId);

  if (posts) {
    for (const p of posts) {
      if (p.generated_image_url) urls.push(p.generated_image_url);
      if (p.original_image_url) urls.push(p.original_image_url);
    }
  }

  // Collect from media_assets
  const { data: assets } = await (supabase as any)
    .from("media_assets")
    .select("image_url")
    .eq("client_id", clientId);

  if (assets) {
    for (const a of assets) {
      if (a.image_url) urls.push(a.image_url);
    }
  }

  return [...new Set(urls)]; // deduplicate
}

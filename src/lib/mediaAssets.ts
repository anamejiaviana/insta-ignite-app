import { supabase } from "@/integrations/supabase/client";

/**
 * Saves an image to the media_assets repository.
 * Deduplicates by client_id + image_url (unique constraint).
 */
export async function saveMediaAsset({
  userId,
  clientId,
  imageUrl,
  source,
  originalPrompt,
}: {
  userId: string;
  clientId: string;
  imageUrl: string;
  source: "generated" | "uploaded" | "edited";
  originalPrompt?: string;
}) {
  // Skip data URIs — only store persistent URLs
  if (!imageUrl || imageUrl.startsWith("data:")) return;

  try {
    await (supabase as any).from("media_assets").upsert(
      {
        user_id: userId,
        client_id: clientId,
        image_url: imageUrl,
        source,
        original_prompt: originalPrompt || null,
      },
      { onConflict: "client_id,image_url" }
    );
  } catch (e) {
    // Silent — don't block creation flow for asset indexing
    console.error("Error saving media asset:", e);
  }
}

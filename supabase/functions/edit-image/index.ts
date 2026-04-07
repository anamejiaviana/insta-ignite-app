import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.88.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function base64ToUint8Array(base64: string): Uint8Array {
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

async function uploadToStorage(base64DataUrl: string): Promise<string | null> {
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.warn('Storage credentials not available, returning base64 as fallback');
    return null;
  }

  try {
    const match = base64DataUrl.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!match) {
      console.warn('Invalid base64 data URL format, returning as-is');
      return null;
    }
    const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
    const base64Data = match[2];
    const bytes = base64ToUint8Array(base64Data);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const fileName = `${crypto.randomUUID()}.${ext}`;
    const filePath = `edited/${fileName}`;

    const { error } = await supabase.storage
      .from('post-images')
      .upload(filePath, bytes, {
        contentType: `image/${match[1]}`,
        upsert: false,
      });

    if (error) {
      console.error('Storage upload error:', error);
      return null;
    }

    const { data: publicData } = supabase.storage
      .from('post-images')
      .getPublicUrl(filePath);

    return publicData.publicUrl;
  } catch (e) {
    console.error('Upload to storage failed:', e);
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageUrl, editPrompt, postType, brandConfig } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const brandContext = brandConfig?.visual_style 
      ? `Estilo visual: ${brandConfig.visual_style}. ` 
      : '';

    const enhancedPrompt = `${brandContext}${editPrompt}. 
    Optimizado para ${postType} de Instagram.
    Mantén alta calidad y aspecto profesional.`;

    console.log('Editing image with prompt:', enhancedPrompt);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image-preview',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: enhancedPrompt
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageUrl
                }
              }
            ]
          }
        ],
        modalities: ['image', 'text']
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Límite de solicitudes excedido. Intenta de nuevo en un momento.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    console.log('Image edit response received');

    let editedImageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    
    if (!editedImageUrl) {
      throw new Error('No edited image generated');
    }

    // Upload to Storage if it's a base64 data URL
    if (editedImageUrl.startsWith('data:image/')) {
      const storageUrl = await uploadToStorage(editedImageUrl);
      if (storageUrl) {
        console.log('Edited image uploaded to Storage successfully');
        editedImageUrl = storageUrl;
      } else {
        console.warn('Storage upload failed, returning base64 as fallback');
      }
    }

    return new Response(JSON.stringify({ imageUrl: editedImageUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Error in edit-image function:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

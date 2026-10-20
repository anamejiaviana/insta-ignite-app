import { guarded } from "../_shared/guard.ts";
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

async function uploadToStorage(base64DataUrl: string, userId: string): Promise<string | null> {
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
    // Carpeta por usuario verificado (las URLs antiguas en edited/ siguen funcionando)
    const filePath = `${userId}/edited/${fileName}`;

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



serve(guarded('images', null, async (req, userId) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageUrl, editPrompt, postType, brandConfig } = await req.json();

    // Solo se editan fotos del propio almacenamiento de la app (o una foto recién subida en base64).
    const storagePrefix = `${Deno.env.get('SUPABASE_URL')}/storage/v1/object/public/post-images/`;
    if (typeof imageUrl !== 'string' || !(imageUrl.startsWith(storagePrefix) || /^data:image\/(png|jpe?g|webp);base64,/.test(imageUrl))) {
      return new Response(JSON.stringify({ error: 'invalid_image_url' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
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

    // La IA no siempre puede descargar URLs externas (URL_TIMEOUT). Enviamos la foto ya incrustada.
    let inlineImage = imageUrl;
    if (!imageUrl.startsWith('data:')) {
      const imgRes = await fetch(imageUrl);
      if (!imgRes.ok) {
        return new Response(JSON.stringify({ error: 'No se pudo leer la foto subida. Vuelve a subirla.' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const buf = new Uint8Array(await imgRes.arrayBuffer());
      if (buf.length > 15 * 1024 * 1024) {
        return new Response(JSON.stringify({ error: 'La foto es demasiado grande.' }), {
          status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      let bin = '';
      for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
      const ct = imgRes.headers.get('content-type') || 'image/jpeg';
      inlineImage = `data:${ct};base64,${btoa(bin)}`;
    }

    const callGateway = () => fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
              { type: 'text', text: enhancedPrompt },
              { type: 'image_url', image_url: { url: inlineImage } },
            ],
          },
        ],
        modalities: ['image', 'text'],
      }),
    });

    // Reintento acotado solo para fallos temporales (5xx), máx. 2 intentos más.
    let response = await callGateway();
    for (let attempt = 1; attempt <= 2 && response.status >= 500; attempt++) {
      console.warn('AI Gateway', response.status, '- retry', attempt);
      await response.text();
      await new Promise((r) => setTimeout(r, 1500 * attempt + Math.random() * 500));
      response = await callGateway();
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      const msg = response.status === 429
        ? 'Hay mucha demanda ahora mismo. Intenta de nuevo en un momento.'
        : response.status === 402
        ? 'El servicio de IA no tiene saldo disponible ahora mismo.'
        : response.status >= 500
        ? 'El servicio de IA no está disponible ahora mismo. Inténtalo en unos minutos; no se ha gastado tu cupo.'
        : 'La IA no pudo procesar esta foto. Prueba con otra foto.';
      return new Response(JSON.stringify({ error: msg }), {
        status: response.status >= 500 ? 503 : response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    console.log('Image edit response received');

    let editedImageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    
    if (!editedImageUrl) {
      return new Response(JSON.stringify({ error: 'La IA no devolvió ninguna foto. Prueba de nuevo o con otra foto; no se ha gastado tu cupo.' }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Upload to Storage if it's a base64 data URL
    if (editedImageUrl.startsWith('data:image/')) {
      const storageUrl = await uploadToStorage(editedImageUrl, userId);
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
}));

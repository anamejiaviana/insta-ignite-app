import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.88.0";

function extractUserId(req: Request): string | null {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) return null;
  try {
    const token = authHeader.replace('Bearer ', '');
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.sub || null;
  } catch { return null; }
}

function trackUsage(userId: string, resourceType: string) {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) return;
  const sb = createClient(url, key);
  const month = new Date().toISOString().slice(0, 7);
  sb.rpc('increment_usage', { _user_id: userId, _resource_type: resourceType, _month: month, _amount: 1 }).then(() => {});
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { title, description, cta, objective, postType, visualStyle, clientContext, brandConfig, language, customFormat, formatInstructions, carouselSlideCount } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY is not configured');

    let contextBlock = '';
    if (clientContext) {
      const addressLine = clientContext.address
        ? `Dirección real del negocio: ${clientContext.address}`
        : 'IMPORTANTE: Este negocio NO tiene dirección registrada. NO inventes ninguna dirección, calle, número, código postal ni ubicación exacta. Si necesitas referirte a la ubicación, usa frases genéricas como "Ven a vernos", "Te esperamos", "Visítanos".';
      const extraContextLine = clientContext.extra_context
        ? `Contexto adicional de la cuenta: ${clientContext.extra_context}`
        : '';
      contextBlock = `
      Negocio: ${clientContext.name || ''}
      Tipo: ${clientContext.type || ''}
      Ciudad: ${clientContext.city || ''}
      ${addressLine}
      Tono de marca: ${clientContext.tone || 'Profesional y cercana'}
      Objetivo: ${clientContext.objective || ''}
      Palabras clave: ${(clientContext.keywords || []).join(', ')}
      ${extraContextLine}
      `;
    } else if (brandConfig) {
      contextBlock = `
      Voz de marca: ${brandConfig.brand_voice || 'Profesional y cercana'}
      Estilo visual: ${brandConfig.visual_style || 'Moderno y limpio'}
      Nombre de marca: ${brandConfig.brand_name || ''}
      IMPORTANTE: NO inventes direcciones, calles ni ubicaciones exactas del negocio.
      `;
    }

    let responseFormat = '';
    if (customFormat && formatInstructions) {
      responseFormat = formatInstructions;
    } else if (postType === 'carousel' && carouselSlideCount && carouselSlideCount > 1) {
      responseFormat = `Responde SIEMPRE en formato JSON válido con esta estructura exacta:
    {
      "mainCopy": "El copy principal del post (máx 2200 caracteres, optimizado para engagement)",
      "storyCopy": "Versión corta para stories (máx 200 caracteres, directo e impactante)",
      "hashtags": ["hashtag1", "hashtag2", ...] (exactamente 5 hashtags relevantes y específicos del nicho, sin el símbolo #),
      "imagePrompt": "Descripción general del estilo visual del carrusel",
      "slidePrompts": ["descripción detallada para la imagen de la slide 1", "descripción detallada para la imagen de la slide 2", ...] (exactamente ${carouselSlideCount} descripciones, cada una diferente pero coherente con el tema del carrusel. Cada slide debe aportar algo nuevo: un punto diferente, un dato, un ángulo visual distinto. NO repitas la misma descripción.)
    }`;
    } else {
      responseFormat = `Responde SIEMPRE en formato JSON válido con esta estructura exacta:
    {
      "mainCopy": "El copy principal del post (máx 2200 caracteres, optimizado para engagement)",
      "storyCopy": "Versión corta para stories (máx 200 caracteres, directo e impactante)",
      "hashtags": ["hashtag1", "hashtag2", ...] (exactamente 5 hashtags relevantes y específicos del nicho, sin el símbolo #),
      "imagePrompt": "Descripción detallada para generar la imagen perfecta para este post"
    }`;
    }

    const langMap: Record<string, string> = { es: 'español', ca: 'català', en: 'English' };
    const langName = langMap[language] || 'español';

    const isReel = postType === 'reel';
    const reelGuidance = isReel ? `
    PRINCIPIOS DE CALIDAD PARA REELS:
    - Estructura interna: HOOK → CONFLICTO/TENSIÓN → VALOR REAL → REVELACIÓN → CTA EMOCIONAL
    - El hook debe romper patrón: contraste, error común, verdad incómoda o frustración reconocible. NUNCA "Hoy te voy a contar..." ni "¿Sabías que...?"
    - El guion debe conectar con lo que la audiencia SIENTE, no solo explicar
    - El valor debe ser concreto y específico, no genérico ("sé constante", "crea contenido de valor" están PROHIBIDOS)
    - El CTA debe ser una continuación emocional natural, no "sígueme para más"
    - Evitar clichés de content creator y lenguaje corporativo vacío
    ` : '';

    const systemPrompt = `Eres un experto copywriter para Instagram especializado en negocios locales. Genera contenido optimizado para engagement y retención.
    TODO el contenido (captions, stories, hashtags) DEBE estar en ${langName}.
    ${contextBlock}
    ${reelGuidance}
    ${responseFormat}`;

    const reelRequirements = isReel ? `
    - El mainCopy debe seguir estructura emocional: hook potente → problema/tensión reconocible → valor concreto → revelación → CTA que conecte con el dolor/deseo activado
    - El hook (primera línea) debe ROMPER PATRÓN: contraste, error revelado, frustración o dato inesperado
    - El valor debe ser ESPECÍFICO: técnicas, datos, ejemplos prácticos. NO consejos vagos
    - El CTA debe sentirse como continuación natural del contenido emocional, no genérico` : '';

    const userPrompt = `Genera contenido para Instagram con estos datos:
    - Tipo de publicación: ${postType}
    - Título: ${title}
    - Descripción/Contexto: ${description || 'No especificado'}
    - Objetivo: ${objective || 'engagement'}
    - CTA: ${cta || 'No especificado'}
    - Estilo visual: ${visualStyle || 'moderno'}
    - Idioma del contenido: ${langName}
    
    El contenido debe:
    - Estar escrito completamente en ${langName}
    - Ser persuasivo, auténtico y optimizado para el algoritmo de Instagram
    - Incluir palabras clave del negocio cuando tenga sentido
    - Mencionar la ciudad cuando sea relevante
    - Integrar el CTA de forma natural
    - Los hashtags deben ser específicos del nicho, NO genéricos como #love o #instagood
    - Incluir 5 hashtags relevantes al final del caption${reelRequirements}`;

    console.log('Generating post content...');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
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
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Créditos agotados. Recarga tu plan.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    let parsed;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Parse error:', parseError);
      throw new Error('Failed to parse AI response');
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Error in generate-post function:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

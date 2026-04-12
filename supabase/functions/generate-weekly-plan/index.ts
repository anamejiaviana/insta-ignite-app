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
    const { client, specialDates, language, numPublications = 3, contentPreference = 'balanced' } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY is not configured');

    const langMap: Record<string, string> = {
      es: 'español',
      ca: 'català',
      en: 'English',
    };
    const langName = langMap[language] || 'español';

    const specialDatesBlock = specialDates
      ? `\nFECHAS ESPECIALES esta semana: ${specialDates}. Prioriza crear contenido relacionado con estas fechas.`
      : '';

    // Calculate content distribution
    const total = Math.max(2, Math.min(5, numPublications));
    let numReels: number, numPosts: number, numCarousels = 0;
    if (contentPreference === 'more_reels') {
      numReels = Math.min(total, Math.ceil(total * 0.75));
      numPosts = total - numReels;
      if (numPosts < 1) { numPosts = 1; numReels = total - 1; }
    } else if (contentPreference === 'more_posts') {
      numPosts = Math.min(total, Math.ceil(total * 0.75));
      numReels = total - numPosts;
      if (numReels < 1) { numReels = 1; numPosts = total - 1; }
    } else if (contentPreference === 'with_carousels') {
      numReels = Math.max(1, Math.floor(total * 0.4));
      numCarousels = Math.max(1, Math.floor(total * 0.3));
      numPosts = total - numReels - numCarousels;
      if (numPosts < 0) { numPosts = 0; }
    } else {
      // balanced: distribute evenly across reels, posts, and carousels
      numReels = Math.max(1, Math.floor(total / 3));
      numCarousels = Math.max(1, Math.floor(total / 3));
      numPosts = total - numReels - numCarousels;
      if (numPosts < 1) { numPosts = 1; numCarousels = total - numReels - numPosts; }
    }

    const reelExamples = Array.from({ length: numReels }, (_, i) => `        {
          "id": "reel-${i + 1}",
          "type": "reel",
          "day": "Día de la semana",
          "idea": "Título de la idea",
          "hook": "Frase gancho que ROMPA PATRÓN en 3 segundos (contraste, error, verdad incómoda o frustración reconocible)",
          "script": "Guion con estructura emocional: hook → tensión/problema reconocible → valor concreto y específico → revelación → CTA emocional natural",
          "shots": ["plano 1", "plano 2", "plano 3"],
          "caption": "Caption optimizado con CTA emocional coherente con el contenido",
          "hashtags": ["hashtag1", "hashtag2", "hashtag3", "hashtag4", "hashtag5"]
        }`).join(',\n');

    const postExamples = Array.from({ length: numPosts }, (_, i) => `        {
          "id": "post-${i + 1}",
          "type": "post",
          "day": "Día de la semana",
          "idea": "Título de la idea",
          "hook": "Primera línea del caption",
          "script": "Descripción de lo que debe mostrar la imagen",
          "shots": [],
          "caption": "Caption optimizado con CTA",
          "hashtags": ["hashtag1", "hashtag2", "hashtag3", "hashtag4", "hashtag5"],
          "imagePrompt": "Prompt detallado en inglés para generar la imagen del post"
        }`).join(',\n');

    const carouselExamples = numCarousels > 0 ? Array.from({ length: numCarousels }, (_, i) => `        {
          "id": "carousel-${i + 1}",
          "type": "carousel",
          "day": "Día de la semana",
          "idea": "Título de la idea del carrusel",
          "hook": "Primera línea del caption del carrusel",
          "script": "Descripción del contenido del carrusel y qué muestra cada slide",
          "shots": [],
          "caption": "Caption optimizado con CTA para el carrusel",
          "hashtags": ["hashtag1", "hashtag2", "hashtag3", "hashtag4", "hashtag5"],
          "imagePrompt": "Prompt detallado en inglés para generar la primera imagen del carrusel"
        }`).join(',\n') : '';

    const carouselBlock = numCarousels > 0 ? `
      "carousels": [
${carouselExamples}
      ],` : '';

    const carouselRule = numCarousels > 0
      ? ` El array "carousels" debe tener exactamente ${numCarousels} elementos. Cada carrusel debe incluir "imagePrompt".`
      : '';

    const systemPrompt = `Eres un estratega de contenido para Instagram especializado en negocios locales con profundo conocimiento de retención y psicología de audiencia.
    Generas planes de contenido semanales prácticos, emocionalmente potentes y grabables.
    
    PRINCIPIOS DE CALIDAD PARA REELS (aplicar a TODOS los reels del plan):
    - Estructura interna: HOOK → CONFLICTO/TENSIÓN → VALOR REAL → REVELACIÓN → CTA EMOCIONAL
    - Hooks que ROMPAN PATRÓN: contraste, error común, verdad incómoda, frustración reconocible o dato sorprendente
    - PROHIBIDO: "Hoy te voy a contar...", "3 tips para...", "¿Sabías que...?", hooks genéricos o predecibles
    - Los guiones deben conectar con lo que la audiencia SIENTE, no solo explicar
    - El valor debe ser CONCRETO: técnicas específicas, datos, ejemplos prácticos. NUNCA "sé constante" o "crea contenido de valor"
    - Los CTAs deben ser continuación emocional natural del reel, NO "sígueme para más"
    - Variar tono y ángulo entre reels: educativo, emocional, revelador, behind the scenes, contraste
    - Evitar clichés de content creator y lenguaje corporativo vacío
    
    TODO el contenido generado (ideas, hooks, guiones, captions, hashtags) DEBE estar en ${langName}.
    
    Responde SIEMPRE en formato JSON válido con esta estructura exacta:
    {
      "reels": [
${reelExamples}
      ],
      "posts": [
${postExamples}
      ],${carouselBlock}
      "stories": [
        {
          "idea": "Idea para story",
          "tipo": "encuesta/pregunta/behind the scenes/promoción",
          "text": "Texto completo para la story, incluyendo copy, opciones de encuesta si aplica, y CTA"
        }
      ]
    }
    
    IMPORTANTE: El array "reels" debe tener exactamente ${numReels} elementos. El array "posts" debe tener exactamente ${numPosts} elementos.${carouselRule} Cada post debe incluir "imagePrompt". Cada story DEBE incluir el campo "text" con el texto completo para publicar en la story.`;

    const addressInstruction = client.address
      ? `Dirección real del negocio: ${client.address}. Puedes usarla en CTAs cuando sea natural.`
      : 'IMPORTANTE: Este negocio NO tiene dirección registrada. NUNCA inventes direcciones, calles, números ni ubicaciones exactas. Usa frases genéricas como "Ven a vernos", "Te esperamos", "Visítanos" si necesitas referirte a la ubicación.';

    const userPrompt = `Genera un plan de contenido semanal para Instagram:
    
    Negocio: ${client.name || 'Mi negocio'}
    Tipo: ${client.type || 'negocio local'}
    Ciudad: ${client.city || ''}
    ${addressInstruction}
    Tono: ${client.tone || 'cercano y profesional'}
    Objetivo: ${client.objective || 'atraer clientes'}
    Palabras clave: ${(client.keywords || []).join(', ')}
    ${client.inspirationAccount ? `Cuenta de inspiración: ${client.inspirationAccount}` : ''}
    ${specialDatesBlock}
    
    Genera:
    1. Exactamente ${numReels} reel${numReels > 1 ? 's' : ''} (distribuidos en la semana)
    2. Exactamente ${numPosts} post${numPosts > 1 ? 's' : ''} estático${numPosts > 1 ? 's' : ''} (cada uno con prompt para imagen en inglés)${numCarousels > 0 ? `
    3. Exactamente ${numCarousels} carrusel${numCarousels > 1 ? 'es' : ''} (contenido educativo o de producto con múltiples imágenes, cada uno con prompt para imagen en inglés)
    4. 3-4 ideas de stories` : `
    3. 3-4 ideas de stories`}
    
    Requisitos:
    - Los hooks de los reels deben ROMPER PATRÓN: contraste, error revelado, frustración reconocible, dato inesperado. NO usar "Hoy te enseño...", "3 tips para..." ni "¿Sabías que...?"
    - Los guiones de reels deben tener tensión emocional y valor CONCRETO (técnicas, datos, ejemplos), NO consejos vagos
    - Los CTAs de reels deben conectar emocionalmente con el dolor o deseo activado, no ser genéricos
    - Contenido grabable en 15-30 minutos en el propio negocio
    - Captions con palabras clave del negocio
    - Mencionar la ciudad cuando sea natural
    - NO inventar direcciones ni ubicaciones exactas que no se hayan proporcionado
    - Incluir CTA en cada caption
    - 5 hashtags específicos del nicho por contenido (sin #)
    - Ideas prácticas y realistas para un negocio pequeño
    - Equilibrar entre educativo, entretenimiento y producto
    - Variar tono y ángulo entre contenidos para que no suenen repetitivos
    - Todo el contenido en ${langName}`;

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
        return new Response(JSON.stringify({ error: 'Límite de solicitudes excedido.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Créditos agotados.' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    let parsed;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
      else throw new Error('No JSON found');
    } catch {
      throw new Error('Failed to parse AI response');
    }

    // Normalize: if AI returned "post" (singular), convert to "posts" array
    if (parsed.post && !parsed.posts) {
      parsed.posts = [parsed.post];
      delete parsed.post;
    }
    // Normalize: if AI returned "carousel" (singular), convert to "carousels" array
    if (parsed.carousel && !parsed.carousels) {
      parsed.carousels = [parsed.carousel];
      delete parsed.carousel;
    }
    // Ensure carousels is always an array if present
    if (!parsed.carousels) {
      parsed.carousels = [];
    }

    // Normalize type field on each item to match its array
    (parsed.reels || []).forEach((r: any) => { r.type = 'reel'; });
    (parsed.posts || []).forEach((p: any) => { p.type = 'post'; });
    (parsed.carousels || []).forEach((c: any) => { c.type = 'carousel'; });

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

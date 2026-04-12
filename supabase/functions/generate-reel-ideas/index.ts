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
    const { client, language } = await req.json();
    const langMap: Record<string, string> = { es: 'español', ca: 'català', en: 'English' };
    const langName = langMap[language] || 'español';
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY is not configured');

    const systemPrompt = `Eres un estratega de contenido para Instagram especializado en negocios locales con un profundo conocimiento de retención y psicología de audiencia.
    Generas ideas de reels virales, emocionalmente potentes y grabables en 15-30 minutos en el propio negocio.
    
    PRINCIPIOS DE CALIDAD PARA REELS:
    - Cada reel debe seguir internamente la estructura: HOOK → CONFLICTO/TENSIÓN → VALOR REAL → REVELACIÓN → CTA EMOCIONAL
    - El hook debe romper patrón: usar contraste, error común, verdad incómoda, frustración reconocible o dato sorprendente. NUNCA empezar con frases genéricas como "Hoy te voy a contar..." o "¿Sabías que...?"
    - El guion debe conectar emocionalmente con lo que la audiencia SIENTE, no solo explicar un tema
    - El valor debe ser concreto y específico, no consejos vagos como "sé constante" o "crea contenido de valor"
    - El CTA debe ser una continuación emocional natural del reel, no un "sígueme para más" genérico
    - Cada reel debe sentirse diferente: variar tono, estructura y ángulo emocional
    - Evitar clichés de "content creator" y lenguaje corporativo vacío
    
    TODO el contenido generado (ideas, hooks, guiones, captions, hashtags) DEBE estar en ${langName}.
    
    Responde SIEMPRE en formato JSON válido con esta estructura:
    {
      "ideas": [
        {
          "idea": "Título corto de la idea",
          "objetivo": "descubrir|confiar|comprar",
          "hook": "Frase de hook para los primeros 3 segundos (debe crear curiosidad, contraste o sorpresa inmediata)",
          "guion": "Mini guión con estructura emocional: hook → tensión/problema reconocible → valor concreto → revelación → cierre con CTA natural",
          "planos": ["plano 1", "plano 2", "plano 3"],
          "caption": "Caption optimizado para Instagram con CTA emocional coherente con el contenido del reel",
          "hashtags": ["hashtag1", "hashtag2"]
        }
      ]
    }`;

    const addressInstruction = client.address
      ? `- Dirección: ${client.address}`
      : '- Dirección: NO proporcionada. NO inventes direcciones ni ubicaciones exactas.';

    const userPrompt = `Genera exactamente 10 ideas de reels para este negocio:
    - Nombre: ${client.name}
    - Tipo: ${client.type}
    - Ciudad: ${client.city}
    ${addressInstruction}
    - Tono: ${client.tone}
    - Objetivo: ${client.objective}
    - Palabras clave: ${(client.keywords || []).join(', ')}
    
    Las ideas deben:
    - Ser grabables en 15-30 minutos en el propio negocio
    - Empezar con hooks que ROMPAN PATRÓN: contraste, error revelado, frustración reconocible, dato inesperado o pregunta provocadora
    - NO usar hooks genéricos como "Hoy te enseño...", "3 tips para...", "¿Sabías que...?"
    - Cada guion debe tener tensión emocional: plantear un problema real → dar una solución concreta y específica → cerrar con una revelación o cambio de perspectiva
    - El valor debe ser CONCRETO: técnicas específicas, datos reales, ejemplos prácticos. NO consejos vagos
    - Los CTAs deben conectar emocionalmente con el dolor o deseo que el reel activa, no ser genéricos
    - Incluir procesos reales del negocio
    - Mencionar la ciudad cuando tenga sentido
    - NUNCA inventar direcciones ni ubicaciones exactas que no se hayan proporcionado
    - No ser ideas complejas o irreales
    - Variar el tono y ángulo entre ideas (educativo, emocional, revelador, behind the scenes, contraste antes/después)
    - Cada caption debe incluir 5 hashtags específicos del nicho`;

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

    const userId = extractUserId(req);
    if (userId) trackUsage(userId, 'text_reel_ideas');

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

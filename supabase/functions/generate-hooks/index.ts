import { guarded } from "../_shared/guard.ts";
import { TONE_GUIDELINES, HOOK_GUIDANCE } from "../_shared/tone.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.88.0";



const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(guarded('text', 'text_hooks', async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { topic, client, language } = await req.json();
    const langMap: Record<string, string> = { es: 'español', ca: 'català', en: 'English' };
    const langName = langMap[language] || 'español';
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY is not configured');

    const systemPrompt = `Eres un copywriter experto en hooks para Instagram y TikTok de negocios locales.
    Generas hooks cálidos, específicos y honestos que captan la atención en los primeros 3 segundos.
    ${TONE_GUIDELINES}
    ${HOOK_GUIDANCE}
    TODOS los hooks DEBEN estar escritos en ${langName}.
    
    Responde SIEMPRE en formato JSON válido:
    {
      "hooks": ["hook 1", "hook 2", ...]
    }`;

    const topicContext = topic ? `sobre el tema: ${topic}` : '';

    const userPrompt = `Genera 15 hooks atractivos ${topicContext} para este negocio:
    - Nombre: ${client.name}
    - Tipo: ${client.type}
    - Ciudad: ${client.city}
    - Tono: ${client.tone}
    - Objetivo: ${client.objective}
    ${client.address ? `- Dirección: ${client.address}` : '- Dirección: NO proporcionada. NO inventes direcciones.'}
    
    Los hooks deben:
    - Captar la atención en 3 segundos
    - Generar curiosidad positiva (detalle concreto, pregunta genuina, beneficio)
    - Ser directos y concisos
    - Respetar el tono declarado del negocio
    - Ser variados (preguntas genuinas, detalles del proceso, beneficios, mini historias, consejos), sin provocaciones, acusaciones ni datos inventados
    - Poder usarse tanto en reels como en captions
    - NUNCA inventar direcciones ni ubicaciones exactas que no se hayan proporcionado`;

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
}));

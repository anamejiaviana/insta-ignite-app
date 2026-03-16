import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { client } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY is not configured');

    const systemPrompt = `Eres un director de producción audiovisual especializado en contenido para Instagram de negocios locales.
    Planificas sesiones de grabación eficientes de 30-40 minutos.
    
    Responde SIEMPRE en formato JSON válido con esta estructura:
    {
      "reels": [
        {
          "reel": "Nombre del reel",
          "hook": "Hook de los primeros 3 segundos",
          "planos": ["plano detallado 1", "plano 2", "plano 3"],
          "duracion": "estimación en minutos"
        }
      ],
      "planosApoyo": ["plano exterior del local", "plano ambiente", "detalle de producto", "manos trabajando", "clientes disfrutando", "profesional explicando"],
      "planosModulares": {
        "contexto": ["plano 1", "plano 2", "plano 3"],
        "producto": ["plano 1", "plano 2", "plano 3"],
        "accion": ["plano 1", "plano 2", "plano 3"],
        "autoridad": ["plano 1", "plano 2"],
        "emocionales": ["plano 1", "plano 2"]
      }
    }`;

    const userPrompt = `Prepara un plan de grabación para una sesión de 30-40 minutos en este negocio:
    - Nombre: ${client.name}
    - Tipo: ${client.type}
    - Ciudad: ${client.city}
    - Tono: ${client.tone}
    - Objetivo: ${client.objective}
    - Palabras clave: ${(client.keywords || []).join(', ')}
    
    Genera:
    1. 3-4 reels para grabar en la sesión
    2. 6 planos extra de apoyo adaptados al negocio
    3. 12-15 planos modulares reutilizables organizados en: contexto, producto, acción, autoridad, emocionales
    
    Los planos deben ser realistas y grabables en el negocio.
    La idea es que con los planos modulares se puedan crear múltiples reels después.`;

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
});

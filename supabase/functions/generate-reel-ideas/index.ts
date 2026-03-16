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
    const { client, language } = await req.json();
    const langMap: Record<string, string> = { es: 'español', ca: 'català', en: 'English' };
    const langName = langMap[language] || 'español';
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY is not configured');

    const systemPrompt = `Eres un estratega de contenido para Instagram especializado en negocios locales. 
    Generas ideas de reels virales, realistas y grabables en 15-30 minutos en el propio negocio.
    
    Responde SIEMPRE en formato JSON válido con esta estructura:
    {
      "ideas": [
        {
          "idea": "Título corto de la idea",
          "objetivo": "descubrir|confiar|comprar",
          "hook": "Frase de hook para los primeros 3 segundos",
          "guion": "Mini guión con los pasos del reel",
          "planos": ["plano 1", "plano 2", "plano 3"],
          "caption": "Caption optimizado para Instagram",
          "hashtags": ["hashtag1", "hashtag2"]
        }
      ]
    }`;

    const userPrompt = `Genera exactamente 10 ideas de reels para este negocio:
    - Nombre: ${client.name}
    - Tipo: ${client.type}
    - Ciudad: ${client.city}
    - Tono: ${client.tone}
    - Objetivo: ${client.objective}
    - Palabras clave: ${(client.keywords || []).join(', ')}
    
    Las ideas deben:
    - Ser grabables en 15-30 minutos en el propio negocio
    - Tener hooks fuertes en los primeros segundos
    - Incluir procesos reales del negocio
    - Generar curiosidad
    - Ser útiles o educativas
    - Mencionar la ciudad cuando tenga sentido
    - No ser ideas complejas o irreales
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

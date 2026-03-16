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
    const { client, specialDates, language } = await req.json();

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

    const systemPrompt = `Eres un estratega de contenido para Instagram especializado en negocios locales.
    Generas planes de contenido semanales prácticos y grabables.
    
    TODO el contenido generado (ideas, hooks, guiones, captions, hashtags) DEBE estar en ${langName}.
    
    Responde SIEMPRE en formato JSON válido con esta estructura exacta:
    {
      "reels": [
        {
          "id": "reel-1",
          "type": "reel",
          "day": "Lunes",
          "idea": "Título de la idea",
          "hook": "Frase gancho de 3 segundos",
          "script": "Mini guión paso a paso",
          "shots": ["plano 1", "plano 2", "plano 3"],
          "caption": "Caption optimizado para Instagram con CTA",
          "hashtags": ["hashtag1", "hashtag2", "hashtag3", "hashtag4", "hashtag5"]
        }
      ],
      "post": {
        "id": "post-1",
        "type": "post",
        "day": "Miércoles",
        "idea": "Título de la idea",
        "hook": "Primera línea del caption",
        "script": "Descripción de lo que debe mostrar la imagen",
        "shots": [],
        "caption": "Caption optimizado con CTA",
        "hashtags": ["hashtag1", "hashtag2", "hashtag3", "hashtag4", "hashtag5"],
        "imagePrompt": "Prompt detallado para generar la imagen del post"
      },
      "stories": [
        {
          "idea": "Idea para story",
          "tipo": "encuesta/pregunta/behind the scenes/promoción"
        }
      ]
    }`;

    const userPrompt = `Genera un plan de contenido semanal para Instagram:
    
    Negocio: ${client.name || 'Mi negocio'}
    Tipo: ${client.type || 'negocio local'}
    Ciudad: ${client.city || ''}
    Tono: ${client.tone || 'cercano y profesional'}
    Objetivo: ${client.objective || 'atraer clientes'}
    Palabras clave: ${(client.keywords || []).join(', ')}
    ${client.inspirationAccount ? `Cuenta de inspiración: ${client.inspirationAccount}` : ''}
    ${specialDatesBlock}
    
    Genera:
    1. Exactamente 2 reels (distribuidos en la semana)
    2. Exactamente 1 post estático (con prompt para imagen)
    3. 3-4 ideas de stories
    
    Requisitos:
    - Hooks fuertes que capten atención en 3 segundos
    - Contenido grabable en 15-30 minutos en el propio negocio
    - Captions con palabras clave del negocio
    - Mencionar la ciudad cuando sea natural
    - Incluir CTA en cada caption
    - 5 hashtags específicos del nicho por contenido (sin #)
    - Ideas prácticas y realistas para un negocio pequeño
    - Equilibrar entre educativo, entretenimiento y producto
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

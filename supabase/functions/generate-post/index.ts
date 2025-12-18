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
    const { title, description, cta, postType, brandConfig, language } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const brandContext = brandConfig ? `
    Voz de marca: ${brandConfig.brand_voice || 'Profesional y cercana'}
    Estilo visual: ${brandConfig.visual_style || 'Moderno y limpio'}
    Nombre de marca: ${brandConfig.brand_name || ''}
    ` : '';

    const systemPrompt = `Eres un experto copywriter para Instagram. Genera contenido optimizado para engagement.
    ${brandContext}
    
    Responde SIEMPRE en formato JSON válido con esta estructura exacta:
    {
      "mainCopy": "El copy principal del post (máx 2200 caracteres, optimizado para engagement)",
      "storyCopy": "Versión corta para stories (máx 200 caracteres, directo e impactante)",
      "hashtags": ["hashtag1", "hashtag2", ...] (entre 8 y 15 hashtags relevantes y específicos, sin el símbolo #),
      "imagePrompt": "Descripción detallada para generar la imagen perfecta para este post"
    }`;

    const userPrompt = `Genera contenido para Instagram con estos datos:
    - Tipo de publicación: ${postType}
    - Título: ${title}
    - Descripción/Contexto: ${description}
    - CTA (Call To Action): ${cta}
    - Idioma: ${language || 'es'}
    
    El contenido debe ser persuasivo, auténtico y optimizado para el algoritmo de Instagram.
    Los hashtags deben ser específicos del nicho, NO genéricos como #love o #instagood.
    El CTA debe integrarse de forma natural en el copy.`;

    console.log('Generating post content...');
    
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
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
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    console.log('AI response:', content);

    // Parse JSON from response
    let parsed;
    try {
      // Extract JSON from response (handle markdown code blocks)
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

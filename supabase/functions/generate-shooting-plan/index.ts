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
    const { client, existingReels, numDays, customIdea, language, optimizeMode, allContent, stories } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY is not configured');

    const langMap: Record<string, string> = { es: 'español', ca: 'català', en: 'English' };
    const langName = langMap[language] || 'español';

    let systemPrompt: string;
    let userPrompt: string;

    if (optimizeMode) {
      // MODE 3: Optimize recording for all weekly content
      const contentList = (allContent || []).map((c: any, i: number) =>
        `${i + 1}. [${(c.type || 'reel').toUpperCase()}] "${c.idea}" - Hook: "${c.hook}" - Planos: ${(c.shots || []).join(', ')}`
      ).join('\n');

      const storiesList = (stories || []).map((s: any) => `- [STORY] ${s.idea} (${s.tipo})`).join('\n');

      systemPrompt = `Eres un director de producción audiovisual profesional. Analizas contenido planificado para Instagram y creas planes de grabación OPTIMIZADOS que identifican planos reutilizables y minimizan el tiempo de grabación.

      TODO el contenido generado DEBE estar en ${langName}.

      Responde SIEMPRE en formato JSON válido con esta estructura exacta:
      {
        "contenidos": [
          {
            "tipo": "reel o post",
            "idea": "nombre del contenido",
            "hook": "hook del contenido",
            "planos_necesarios": ["plano 1", "plano 2", "plano 3"]
          }
        ],
        "planos_reutilizables": [
          {
            "nombre": "plano exterior del local",
            "descripcion": "Grabar fachada con luz natural",
            "tipo_plano": "plano general",
            "reutilizado_en": ["Reel 1", "Reel 2", "Post 1"]
          }
        ],
        "orden_grabacion": ["Paso 1: preparar escena", "Paso 2: grabar planos generales reutilizables", "Paso 3: grabar reel 1"],
        "total_planos": 12,
        "duracion_estimada": "30-40 minutos",
        "resumen": "Con estos 12 planos puedes grabar todo el contenido de la semana en aproximadamente 30 minutos."
      }`;

      userPrompt = `Analiza TODO este contenido semanal planificado y crea un plan de grabación OPTIMIZADO:

      Negocio: ${client.name || 'Mi negocio'}
      Tipo: ${client.type || 'negocio local'}
      Ciudad: ${client.city || ''}
      ${client.address ? `Dirección: ${client.address}` : 'NO inventes direcciones ni ubicaciones exactas del negocio.'}

      CONTENIDO PLANIFICADO:
${contentList}
${storiesList ? `\nIDEAS DE STORIES:\n${storiesList}` : ''}

      Instrucciones:
      1. Lista cada contenido con su tipo, idea, hook y planos necesarios
      2. Identifica TODOS los planos que se pueden reutilizar entre varios contenidos (ej: plano exterior, plano ambiente, detalle producto, manos trabajando, persona explicando, cliente disfrutando)
      3. Crea un orden de grabación optimizado que agrupe planos similares
      4. Calcula el total de planos únicos necesarios
      5. Estima el tiempo total de grabación
      6. Genera un resumen tipo: "Con estos X planos puedes grabar todo el contenido de la semana en aproximadamente Y minutos."

      Todo en ${langName}.`;
    } else if (customIdea) {
      // MODE 2: Generate from a specific idea/topic
      systemPrompt = `Eres un director de producción audiovisual profesional especializado en contenido para Instagram de negocios locales, con profundo conocimiento de retención y narrativa visual.
      Creas planes de grabación extremadamente detallados con storyboard paso a paso, incluyendo tipo de plano, movimiento de cámara, y textos en pantalla.
      
      PRINCIPIOS DE RETENCIÓN VISUAL PARA REELS:
      - El primer plano (1-3 segundos) debe ser visualmente impactante para retener: movimiento, contraste, acción inmediata o plano inesperado
      - Cambiar tipo de plano cada 2-4 segundos para mantener ritmo dinámico
      - Los textos en pantalla deben REFORZAR el hook y crear curiosidad, no solo describir lo que se ve
      - Incluir momentos de contraste visual (antes/después, problema/solución, detalle/general)
      - El storyboard debe tener ritmo narrativo: tensión → desarrollo → revelación
      - Los planos deben servir a la estructura emocional del guion, no solo documentar
      
      TODO el contenido generado DEBE estar en ${langName}.
      
      Responde SIEMPRE en formato JSON válido con esta estructura exacta:
      {
        "hook": "Frase gancho potente que ROMPA PATRÓN en los primeros 3 segundos (contraste, error, verdad incómoda o frustración reconocible)",
        "storyboard": [
          {
            "paso": 1,
            "nombre": "Plano de contexto",
            "descripcion": "Descripción detallada de qué se graba, cómo y desde qué ángulo",
            "tipo_plano": "plano general / plano medio / primer plano / detalle / cenital / contrapicado",
            "movimiento": "estático / paneo / seguimiento / zoom in / zoom out",
            "duracion_segundos": 3,
            "texto_pantalla": "Texto superpuesto sugerido o null"
          }
        ],
        "shots": ["descripción completa del plano 1", "descripción completa del plano 2"],
        "textos_pantalla": ["texto superpuesto 1", "texto superpuesto 2", "texto superpuesto 3", "texto superpuesto 4"],
        "orden_grabacion": ["Plano 3 (no requiere preparación)", "Plano 1 (preparar escena)", "Plano 2 (acción principal)"],
        "duracion_estimada": "15-20 minutos",
        "caption": "Caption optimizado para Instagram con CTA emocional y palabras clave",
        "hashtags": ["hashtag1", "hashtag2", "hashtag3", "hashtag4", "hashtag5"]
      }`;

      userPrompt = `Crea un plan de grabación PROFESIONAL y DETALLADO para este contenido de Instagram:

      IDEA: ${customIdea}
      
      Negocio: ${client.name || 'Mi negocio'}
      Tipo: ${client.type || 'negocio local'}
      Ciudad: ${client.city || ''}
      ${client.address ? `Dirección: ${client.address}` : 'NO inventes direcciones ni ubicaciones exactas.'}
      Tono: ${client.tone || 'cercano y profesional'}
      Objetivo: ${client.objective || 'atraer clientes'}
      Palabras clave: ${(client.keywords || []).join(', ')}
      
      Genera:
      1. Un hook potente que ROMPA PATRÓN (contraste, error revelado, frustración reconocible, dato inesperado). NO uses "Hoy te enseño..." ni "¿Sabías que...?"
      2. Un storyboard MUY DETALLADO de 6-10 pasos orientado a RETENCIÓN:
         - El primer plano debe ser visualmente impactante (movimiento, acción, contraste)
         - Cambiar tipo de plano cada 2-4 segundos para mantener ritmo
         - Incluir momentos de contraste visual (antes/después, detalle/general)
         - Cada paso debe tener: nombre del plano, descripción detallada, tipo de plano, movimiento de cámara, duración en segundos, texto sugerido para superponer
      3. Lista completa de planos necesarios (shots)
      4. 4-5 textos para superponer que REFUERCEN el hook y creen curiosidad (no solo describir lo visible)
      5. Orden óptimo de grabación (puede diferir del orden final del reel)
      6. Duración estimada de grabación total
      7. Caption con estructura emocional: hook → tensión → valor → CTA natural que conecte con el dolor/deseo activado
      8. 5 hashtags estratégicos (sin #)
      
      Todo debe ser grabable en el propio negocio en 15-30 minutos.
      Todo el contenido en ${langName}.`;
    } else {
      // MODE 1: Organize existing weekly plan content into detailed shooting plan
      const reelsContext = existingReels && existingReels.length > 0
        ? `REELS YA PLANIFICADOS (del plan semanal):
${existingReels.map((r: any, i: number) => `${i + 1}. "${r.idea}" - Hook: "${r.hook}" - Planos sugeridos: ${(r.shots || []).join(', ')}`).join('\n')}

Organiza estos reels en una sesión de grabación de ${numDays || 1} día(s).`
        : `Genera 3-4 reels para grabar en ${numDays || 1} día(s) para este negocio.`;

      systemPrompt = `Eres un director de producción audiovisual profesional especializado en contenido para Instagram de negocios locales, con profundo conocimiento de retención y narrativa visual.
      Planificas sesiones de grabación eficientes y detalladas de 30-40 minutos por día.
      
      PRINCIPIOS DE RETENCIÓN VISUAL:
      - Primer plano de cada reel debe ser visualmente impactante para retener (movimiento, contraste, acción inmediata)
      - Cambiar tipo de plano cada 2-4 segundos para ritmo dinámico
      - Textos en pantalla deben reforzar el hook y crear curiosidad
      - Incluir momentos de contraste visual (antes/después, problema/solución)
      - Los hooks deben ROMPER PATRÓN, no ser genéricos
      
      TODO el contenido generado DEBE estar en ${langName}.
      
      Responde SIEMPRE en formato JSON válido con esta estructura exacta:
      {
        "reels": [
          {
            "reel": "Nombre descriptivo del reel",
            "hook": "Hook potente que ROMPA PATRÓN en los primeros 3 segundos",
            "storyboard": [
              {
                "paso": 1,
                "nombre": "Plano de contexto",
                "descripcion": "Descripción detallada del plano orientada a retención",
                "tipo_plano": "plano general / plano medio / primer plano / detalle",
                "movimiento": "estático / paneo / seguimiento / zoom in",
                "duracion_segundos": 3,
                "texto_pantalla": "Texto superpuesto que refuerza hook o null"
              }
            ],
            "textos_pantalla": ["texto 1", "texto 2"],
            "duracion": "estimación en minutos de grabación",
            "orden_grabacion": 1
          }
        ],
        "planosApoyo": [
          {
            "nombre": "Plano exterior del local",
            "descripcion": "Grabar fachada con luz natural, incluir letrero",
            "tipo_plano": "plano general",
            "uso": "intro / transición / contexto"
          }
        ],
        "orden_sesion": ["Paso 1: preparar escena X", "Paso 2: grabar planos de contexto", "Paso 3: grabar acciones"]
      }`;

      userPrompt = `Prepara un plan de grabación PROFESIONAL y DETALLADO para ${numDays || 1} día(s) en este negocio:
      - Nombre: ${client.name}
      - Tipo: ${client.type}
      - Ciudad: ${client.city}
      ${client.address ? `- Dirección: ${client.address}` : '- NO inventes direcciones ni ubicaciones exactas.'}
      - Tono: ${client.tone}
      - Objetivo: ${client.objective}
      - Palabras clave: ${(client.keywords || []).join(', ')}
      
      ${reelsContext}
      
      Para CADA reel genera:
      1. Nombre y hook que ROMPA PATRÓN (contraste, error, verdad incómoda, frustración). NO uses hooks genéricos
      2. Storyboard detallado de 4-6 pasos ORIENTADO A RETENCIÓN:
         - Primer plano visualmente impactante (movimiento, acción, contraste)
         - Cambiar tipo de plano cada 2-4 segundos
         - Descripción precisa de qué grabar con indicaciones de ritmo
         - Tipo de plano y movimiento de cámara
         - Duración en segundos
         - Textos en pantalla que refuercen el hook y creen curiosidad (no solo descriptivos)
      3. Textos en pantalla sugeridos (2-3 por reel) que aporten tensión narrativa
      4. Duración estimada de grabación
      5. Número de orden de grabación recomendado
      
      También genera:
      6. 6-8 planos extra de apoyo DETALLADOS adaptados al negocio, incluyendo planos de contraste y transición dinámicos
      7. Un orden de sesión optimizado (los pasos a seguir durante la grabación)
      
      Los planos deben ser realistas y grabables en el negocio.
      Distribuye el trabajo realísticamente en ${numDays || 1} día(s).
      Todo el contenido en ${langName}.`;
    }

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

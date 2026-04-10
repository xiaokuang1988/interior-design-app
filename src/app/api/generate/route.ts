import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'OPENAI_API_KEY not configured' }, { status: 500 });
  }

  try {
    const { image, style, room, customPrompt } = await req.json();
    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    const styleDescriptions: Record<string, string> = {
      japanese: 'Japanese Zen style (wabi-sabi aesthetics, natural wood elements, tatami, shoji screens, neutral earthy tones, minimal and serene)',
      nordic: 'Scandinavian Nordic style (bright and airy, white walls, light wood furniture, clean geometric lines, indoor plants, functional design)',
      modern: 'Modern minimalist style (clean lines, neutral palette with gray/white/black, metal and glass accents, hidden storage, LED strip lighting)',
      chinese: 'Modern Chinese style (rosewood furniture accents, ink painting decorations, screen dividers, lantern-inspired lighting, dark wood flooring)',
      industrial: 'Industrial loft style (exposed brick walls, metal pipes, concrete flooring, vintage Edison bulbs, leather sofa, raw textures)',
      wabisabi: 'Wabi-sabi style (beauty of imperfection, natural handmade materials, earthy muted tones, handmade ceramics, organic textures)',
    };

    const styleEn = styleDescriptions[style] || styleDescriptions.modern;

    // Step 1: GPT-4o analyzes the floor plan and generates a precise room description
    // Build system prompt based on room selection
    let systemPrompt: string;
    
    if (room === '__overview__') {
      // Full apartment bird's eye view
      systemPrompt = `You are a professional interior designer and 3D visualization expert. The user uploaded a floor plan (madori/間取り図).
They want a 3D bird's-eye view rendering of the ENTIRE apartment, showing all rooms furnished and decorated.

Analyze the floor plan very carefully:
- Read ALL room labels and their dimensions (in 畲 or m²)
- Note the EXACT layout: which rooms are adjacent, where walls are, door positions
- Note window and balcony positions
- Note the kitchen, bathroom, and toilet positions

Write a detailed English description for generating a 3D isometric/bird's-eye cutaway view of this entire apartment.
The rendering should show:
- The apartment from above at a 45-degree angle, with walls partially cut away to show interiors
- EVERY room furnished according to its function and the specified style
- Room proportions MUST match the floor plan layout exactly
- Correct adjacency between rooms as shown in the plan
- The overall shape of the apartment must match the floor plan

The description must be one coherent English paragraph. Do NOT include Chinese text.
Style: architectural visualization, 3D cutaway rendering, professional quality.`;
    } else if (room) {
      systemPrompt = `You are a professional interior designer. The user uploaded a floor plan (madori/間取り図).
They want to see a photorealistic interior rendering of the "${room}" room from this floor plan.

Analyze the floor plan VERY carefully:
- Find the EXACT room labeled "${room}" on the plan
- Read its dimensions (in 畲 or m²) from the labels
- Note PRECISELY where windows are on which walls
- Note door position and which direction it opens
- Note what rooms are adjacent
- Note if it has balcony access

CRITICAL: The generated room MUST match the floor plan's proportions. If the room is rectangular and narrow, describe it as such. If it's roughly square, describe it as square. Get the window wall correct.

Write a detailed English description for generating a photorealistic interior photo of THAT SPECIFIC ROOM as seen from standing at the doorway looking in.
Include: exact room shape and proportions from the plan, window placement on the correct wall, furniture appropriate for the actual room dimensions, the specified design style, realistic lighting from windows, flooring, wall treatment.

IMPORTANT: Do NOT mention people or living beings. Do NOT use the word "bedroom" - use "private room" or the room label instead. Focus purely on furniture, materials, colors, and architectural elements.

The description must be one coherent English paragraph. Do NOT include Chinese text.
Make it photorealistic, like a professional interior design magazine photograph.`;
    } else {
      systemPrompt = `You are a professional interior designer. The user uploaded a floor plan (madori/間取り図).
They want to see a photorealistic interior rendering of the main living area (LDK/リビング) from this floor plan.

Analyze the floor plan VERY carefully:
- Identify the LDK or main living room and read its exact dimensions
- Note PRECISELY where windows and balcony are located
- Note the kitchen layout if it's an LDK
- Note the room shape (L-shaped? rectangular? open plan?)

CRITICAL: The room proportions in the rendering MUST match the floor plan. If the LDK is long and narrow, describe it that way.

Write a detailed English description for generating a photorealistic interior photo of the LDK as seen from the entrance hallway.
Include: exact room proportions from the plan, correct window/balcony wall, furniture layout for the actual dimensions, the specified design style, natural lighting, flooring, kitchen area.

The description must be one coherent English paragraph. Do NOT include Chinese text.
Make it photorealistic, like a professional interior design magazine photograph.`;
    }

    const analyzeResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Design style: ${styleEn}. ${customPrompt ? `Additional requests: ${customPrompt}` : ''} Please analyze this floor plan and write a detailed image generation prompt for ${room || 'the main living area'}.`,
              },
              { type: 'image_url', image_url: { url: image, detail: 'high' } },
            ],
          },
        ],
        max_tokens: 600,
        temperature: 0.5,
      }),
    });

    if (!analyzeResponse.ok) {
      const err = await analyzeResponse.text();
      console.error('GPT-4o error:', err);
      return NextResponse.json({ error: `分析平面图失败: ${analyzeResponse.status}` }, { status: 502 });
    }

    const analyzeData = await analyzeResponse.json();
    const imagePrompt = analyzeData.choices?.[0]?.message?.content ?? '';

    if (!imagePrompt) {
      return NextResponse.json({ error: '无法生成描述' }, { status: 500 });
    }

    // Step 2: Generate with DALL-E 3
    const dallePrompt = room === '__overview__'
      ? `3D isometric bird's-eye cutaway architectural visualization of a furnished apartment, professional quality, soft lighting, detailed interiors visible through cut-away walls: ${imagePrompt}`
      : `Photorealistic interior design photograph, professional magazine quality, taken with a wide-angle lens from the doorway perspective, room proportions must be accurate: ${imagePrompt}`;
    const dalleResponse = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: dallePrompt,
        n: 1,
        size: '1792x1024',
        quality: 'hd',
        response_format: 'url',
      }),
    });

    if (!dalleResponse.ok) {
      const err = await dalleResponse.text();
      console.error('DALL-E error:', err);
      try {
        const errData = JSON.parse(err);
        return NextResponse.json({
          error: `图片生成失败: ${errData.error?.message || dalleResponse.status}`,
        }, { status: 502 });
      } catch {
        return NextResponse.json({ error: `图片生成失败: ${dalleResponse.status}` }, { status: 502 });
      }
    }

    const dalleData = await dalleResponse.json();
    const generatedUrl = dalleData.data?.[0]?.url;
    const revisedPrompt = dalleData.data?.[0]?.revised_prompt;

    if (!generatedUrl) {
      return NextResponse.json({ error: '图片生成失败' }, { status: 500 });
    }

    return NextResponse.json({
      imageUrl: generatedUrl,
      prompt: imagePrompt,
      revisedPrompt,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

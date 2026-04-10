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
    const systemPrompt = room
      ? `You are a professional interior designer. The user uploaded a floor plan (madori/間取り図). 
They want to see a photorealistic interior rendering of the "${room}" room from this floor plan.

Analyze the floor plan carefully:
- Identify the exact room "${room}" on the plan
- Note its approximate dimensions (from the labels if visible)
- Note window positions, door positions, and adjacent rooms
- Note if it's a corner room, has a balcony, etc.

Then write a detailed English description for generating a photorealistic interior photo of THAT SPECIFIC ROOM as seen from standing at the doorway looking in. 
Include: room proportions matching the plan, window placement matching the plan, furniture appropriate for the room size, the specified design style, realistic lighting from the windows, flooring, wall treatment, and decorative details.

The description must be one coherent English paragraph suitable as an AI image generation prompt. Do NOT include any Chinese text.
Make it photorealistic, like a professional interior design magazine photograph.`
      : `You are a professional interior designer. The user uploaded a floor plan (madori/間取り図).
They want to see a photorealistic interior rendering of the main living area (LDK/リビング) from this floor plan.

Analyze the floor plan carefully:
- Identify the LDK or main living room
- Note its approximate dimensions from labels
- Note window positions, balcony access, and room shape
- Note the kitchen layout if it's an LDK

Then write a detailed English description for generating a photorealistic interior photo of the LDK/living room as seen from the entrance hallway.
Include: room proportions matching the plan, window and balcony placement, furniture layout appropriate for the actual room size, the specified design style, realistic natural lighting, flooring, wall treatment, kitchen area if applicable.

The description must be one coherent English paragraph suitable as an AI image generation prompt. Do NOT include any Chinese text.
Make it photorealistic, like a professional interior design magazine photograph.`;

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
    const dalleResponse = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: `Photorealistic interior design photograph, professional magazine quality, taken with a wide-angle lens from the doorway perspective: ${imagePrompt}`,
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

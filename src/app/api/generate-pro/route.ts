import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 120;

const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;

// Style prompts - detailed for realistic interior rendering
const stylePrompts: Record<string, string> = {
  japanese:
    'Japanese Zen interior design style: tatami mats, shoji paper sliding screens, low wooden furniture, futon or low platform bed, tokonoma alcove, natural wood beams, wabi-sabi ceramics, bonsai plants, warm indirect lighting, neutral earthy palette of beige/cream/brown',
  nordic:
    'Scandinavian Nordic interior design style: bright white walls, light oak hardwood floor, minimalist light-colored furniture, large windows with sheer curtains, indoor green plants, wool throw blankets, clean geometric lines, pastel accent colors, pendant lights, cozy hygge atmosphere',
  modern:
    'Modern minimalist interior design style: clean straight lines, neutral palette of white/gray/black, sleek low-profile furniture, hidden built-in storage, LED strip ambient lighting, glass and metal accents, polished concrete or marble surfaces, abstract wall art, open spacious feel',
  chinese:
    'Modern New Chinese interior design style: dark rosewood furniture with Ming dynasty inspired lines, ink wash painting wall art, lattice screen room dividers, red and gold accent pillows, paper lantern pendant lights, bamboo decorations, dark wood flooring, silk cushions, calligraphy scrolls',
  industrial:
    'Industrial loft interior design style: exposed red brick walls, visible metal ductwork and pipes on ceiling, polished concrete flooring, vintage Edison filament bulbs, worn leather Chesterfield sofa, reclaimed wood coffee table, metal frame shelving, large factory-style windows, raw urban aesthetic',
  wabisabi:
    'Wabi-sabi interior design style: beauty of imperfection, raw plaster textured walls in cream/beige, handmade irregular ceramic vases, weathered aged wood furniture, linen and cotton natural fabrics, dried flower arrangements, soft diffused natural light, organic asymmetric shapes, muted earth tones',
};

async function waitForPrediction(predictionId: string): Promise<{ output: string[] | string; error?: string }> {
  const maxAttempts = 60;
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const res = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
      headers: { Authorization: `Bearer ${REPLICATE_API_TOKEN}` },
    });
    if (!res.ok) {
      return { output: [], error: `Replicate API error: ${res.status}` };
    }
    const data = await res.json();
    if (data.status === 'succeeded') {
      return { output: data.output };
    }
    if (data.status === 'failed' || data.status === 'canceled') {
      return { output: [], error: data.error || 'Generation failed' };
    }
  }
  return { output: [], error: 'Timeout waiting for generation' };
}

export async function POST(req: NextRequest) {
  if (!REPLICATE_API_TOKEN) {
    return NextResponse.json({ error: 'REPLICATE_API_TOKEN not configured' }, { status: 500 });
  }

  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    return NextResponse.json({ error: 'OPENAI_API_KEY not configured' }, { status: 500 });
  }

  try {
    const { image, style, room, customPrompt } = await req.json();
    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    const baseStylePrompt = stylePrompts[style] || stylePrompts.modern;
    const roomLabel = room === '__overview__' ? 'the entire apartment (bird-eye 3D cutaway view)' : room || 'the main living area (LDK)';
    const isOverview = room === '__overview__';

    // Step 1: GPT-4o deeply analyzes the floor plan
    const systemPrompt = isOverview
      ? `You are an expert architectural visualization prompt engineer. The user uploaded a Japanese floor plan (間取り図).
Your task: write a DETAILED image generation prompt for a 3D isometric bird's-eye cutaway view of the ENTIRE apartment.

Analyze the floor plan meticulously:
1. Read ALL room labels (LDK, 洋室1, 洋室2, etc.) and their exact dimensions in 畳 or m²
2. Map the EXACT layout: which rooms are adjacent, wall positions, corridor layout
3. Note ALL windows (usually marked on exterior walls) and balcony positions
4. Note bathroom, toilet, kitchen, 洗面室 positions
5. Note the entrance (玄関) position

Write a prompt that will generate a BEAUTIFUL 3D isometric cutaway rendering showing:
- The apartment from above at 30-degree angle, walls cut at half height to reveal interiors
- EVERY room fully furnished with appropriate furniture for its function
- Furniture must match the specified style
- Room proportions MUST accurately reflect the floor plan
- Warm, inviting lighting throughout
- High-end architectural visualization quality

Output ONLY the prompt text, no explanation. Maximum 200 words. English only.`
      : `You are an expert architectural visualization prompt engineer. The user uploaded a Japanese floor plan (間取り図).
Your task: write a DETAILED image generation prompt for a photorealistic INTERIOR PERSPECTIVE VIEW of the "${room || 'LDK'}" room.

Analyze the floor plan meticulously:
1. Find the "${room || 'LDK'}" room and read its exact dimensions
2. Determine the room's SHAPE (rectangular? square? L-shaped?) and PROPORTIONS (aspect ratio)
3. Identify which wall has windows and which direction they face
4. Note the door position (this is where the camera viewpoint will be)
5. Check if it connects to a balcony
6. Note ceiling height (assume 2.4m standard Japanese)

Write a prompt that will generate a PHOTOREALISTIC interior photograph showing:
- Camera positioned at the doorway, looking INTO the room (eye level ~1.5m)
- CORRECT room proportions matching the floor plan (if room is 6畳/~10m², it should look compact, not huge)
- Windows on the CORRECT wall as shown in the floor plan
- FULLY FURNISHED with appropriate furniture:
  * LDK: sofa, dining table with chairs, TV unit, kitchen counter/cabinets, pendant lights
  * 洋室/bedroom: bed with bedding, nightstand, wardrobe/closet, desk area if space allows
  * Other rooms: appropriate furniture for function
- All furniture must match the specified design style
- Natural light streaming through windows, warm interior lighting
- Realistic materials: wood grain, fabric textures, wall paint/wallpaper
- Professional interior photography quality, wide-angle lens (24mm equivalent)

Output ONLY the prompt text, no explanation. Maximum 200 words. English only.
CRITICAL: The room must look LIVED-IN and FURNISHED. Empty rooms are NOT acceptable.`;

    const analyzeResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openaiKey}`,
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
                text: `Design style: ${baseStylePrompt}. ${customPrompt ? `Additional requirements: ${customPrompt}` : ''}\n\nAnalyze this floor plan and write the image generation prompt for ${roomLabel}.`,
              },
              { type: 'image_url', image_url: { url: image, detail: 'high' } },
            ],
          },
        ],
        max_tokens: 500,
        temperature: 0.4,
      }),
    });

    if (!analyzeResponse.ok) {
      const err = await analyzeResponse.text();
      console.error('GPT-4o error:', err);
      return NextResponse.json({ error: `平面图分析失败: ${analyzeResponse.status}` }, { status: 502 });
    }

    const analyzeData = await analyzeResponse.json();
    const imagePrompt = analyzeData.choices?.[0]?.message?.content ?? '';

    if (!imagePrompt) {
      return NextResponse.json({ error: '无法生成描述' }, { status: 500 });
    }

    // Step 2: Use Replicate FLUX or SDXL for high-quality generation
    // Using black-forest-labs/flux-1.1-pro for best quality
    const replicateResponse = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${REPLICATE_API_TOKEN}`,
      },
      body: JSON.stringify({
        model: 'black-forest-labs/flux-1.1-pro',
        input: {
          prompt: imagePrompt,
          aspect_ratio: isOverview ? '1:1' : '16:9',
          output_format: 'png',
          safety_tolerance: 5,
          prompt_upsampling: true,
        },
      }),
    });

    if (!replicateResponse.ok) {
      const err = await replicateResponse.text();
      console.error('Replicate create error:', err);
      return NextResponse.json(
        { error: `Replicate API error (${replicateResponse.status}): ${err}` },
        { status: 502 }
      );
    }

    const prediction = await replicateResponse.json();

    // Step 3: Poll for result
    const result = await waitForPrediction(prediction.id);

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 502 });
    }

    const outputUrl = Array.isArray(result.output) ? result.output[0] : result.output;

    if (!outputUrl) {
      return NextResponse.json({ error: '生成失败，未返回图片' }, { status: 500 });
    }

    return NextResponse.json({
      imageUrl: outputUrl,
      prompt: imagePrompt,
      engine: 'replicate-flux-pro',
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    console.error('Generate-pro error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

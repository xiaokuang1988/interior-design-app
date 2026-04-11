import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 120; // ControlNet can take longer

const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;

// Style prompts optimized for ControlNet interior design
const stylePrompts: Record<string, string> = {
  japanese:
    'Japanese Zen interior design, tatami mats, shoji screens, natural wood furniture, wabi-sabi aesthetics, warm ambient lighting, tokonoma alcove, minimalist, neutral earthy tones, professional interior photography',
  nordic:
    'Scandinavian Nordic interior design, bright and airy, white walls, light oak furniture, clean lines, indoor plants, large windows with natural light, hygge atmosphere, wool textiles, professional interior photography',
  modern:
    'Modern minimalist interior design, clean lines, neutral palette, gray white black, metal and glass accents, hidden storage, LED strip lighting, sleek furniture, professional interior photography',
  chinese:
    'Modern Chinese interior design, rosewood furniture accents, ink painting decorations, screen dividers, lantern-inspired lighting, dark wood flooring, silk cushions, professional interior photography',
  industrial:
    'Industrial loft interior design, exposed brick walls, metal pipes, concrete flooring, vintage Edison bulbs, leather sofa, raw textures, open ceiling, professional interior photography',
  wabisabi:
    'Wabi-sabi interior design, beauty of imperfection, natural handmade materials, earthy muted tones, handmade ceramics, organic textures, raw plaster walls, aged wood, professional interior photography',
};

async function waitForPrediction(predictionId: string): Promise<{ output: string[] | string; error?: string }> {
  const maxAttempts = 60; // 60 * 2s = 120s max
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
    // still processing, continue polling
  }
  return { output: [], error: 'Timeout waiting for generation' };
}

export async function POST(req: NextRequest) {
  if (!REPLICATE_API_TOKEN) {
    return NextResponse.json({ error: 'REPLICATE_API_TOKEN not configured' }, { status: 500 });
  }

  const openaiKey = process.env.OPENAI_API_KEY;

  try {
    const { image, style, room, customPrompt } = await req.json();
    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    const baseStylePrompt = stylePrompts[style] || stylePrompts.modern;

    // Step 1: Use GPT-4o to analyze the floor plan and generate a detailed room description
    let detailedPrompt = baseStylePrompt;

    if (openaiKey) {
      const roomLabel = room === '__overview__' ? 'the entire apartment' : room || 'the main living area (LDK)';
      const analyzeResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: `You are a professional interior designer. Analyze this floor plan image and write a concise interior design prompt for "${roomLabel}".

Focus on:
- Room dimensions and proportions from the plan
- Window positions and natural light direction
- Door positions
- The specific style requested

Write ONE paragraph in English, maximum 100 words. This will be used as an image generation prompt.
Do NOT mention people. Focus on furniture, materials, colors, lighting, and spatial layout.
Start directly with the room description, no preamble.`,
            },
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `Style: ${baseStylePrompt}. ${customPrompt ? `Additional: ${customPrompt}` : ''} Describe the interior for ${roomLabel}.`,
                },
                { type: 'image_url', image_url: { url: image, detail: 'high' } },
              ],
            },
          ],
          max_tokens: 300,
          temperature: 0.5,
        }),
      });

      if (analyzeResponse.ok) {
        const analyzeData = await analyzeResponse.json();
        const aiPrompt = analyzeData.choices?.[0]?.message?.content;
        if (aiPrompt) {
          detailedPrompt = `${aiPrompt}. ${baseStylePrompt}`;
        }
      }
    }

    if (customPrompt) {
      detailedPrompt += `. ${customPrompt}`;
    }

    // Step 2: Send to Replicate ControlNet interior design model
    // Using adirik/interior-design which preserves room structure via ControlNet
    const replicateResponse = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${REPLICATE_API_TOKEN}`,
      },
      body: JSON.stringify({
        version: '76604baddc85b1b4616e1c6475eca080da339c8875bd4996705440484a6ebd65',
        input: {
          image,
          prompt: detailedPrompt,
          negative_prompt:
            'lowres, watermark, banner, logo, contactinfo, text, deformed, blurry, blur, out of focus, out of frame, surreal, ugly, beginner, amateur, distorted, draft, cartoon, anime, illustration, painting, drawing, people, person, human, face, hands',
          num_inference_steps: 30,
          guidance_scale: 9,
          prompt_strength: 0.65,
          seed: 0,
        },
      }),
    });

    if (!replicateResponse.ok) {
      const err = await replicateResponse.text();
      console.error('Replicate create error:', err);
      return NextResponse.json(
        { error: `Replicate API error: ${replicateResponse.status}` },
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
      prompt: detailedPrompt,
      engine: 'replicate-controlnet',
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    console.error('Generate-pro error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

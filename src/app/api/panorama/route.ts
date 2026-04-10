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
      japanese: 'Japanese Zen style (wabi-sabi, natural wood, tatami, shoji screens, earthy tones)',
      nordic: 'Scandinavian Nordic style (bright, white walls, light wood, clean lines, plants)',
      modern: 'Modern minimalist (clean lines, neutral palette, metal and glass, hidden storage)',
      chinese: 'Modern Chinese style (rosewood accents, ink paintings, screen dividers, dark wood)',
      industrial: 'Industrial loft (exposed brick, metal pipes, concrete, Edison bulbs, leather)',
      wabisabi: 'Wabi-sabi style (imperfect beauty, natural materials, earthy muted tones, ceramics)',
    };
    const styleEn = styleDescriptions[style] || styleDescriptions.modern;

    // Generate equirectangular panorama prompt
    const systemPrompt = `You are a professional interior designer and 3D visualization expert.
The user uploaded a floor plan. They want a 360° equirectangular panoramic rendering of the "${room || 'LDK'}" room.

Analyze the floor plan carefully:
- Find the room "${room || 'LDK'}" and read its dimensions
- Note window positions, door positions, wall layout
- Note what's on each wall (north/south/east/west relative to the plan)

Write a DETAILED English description for generating a 360° equirectangular panoramic interior photograph.
The description MUST specify what is visible in ALL directions from the center of the room:
- FRONT: what furniture/features face you
- BEHIND: what's behind the viewer
- LEFT WALL: windows? door? furniture?
- RIGHT WALL: features on this side
- CEILING: light fixtures, height
- FLOOR: material, rugs

CRITICAL requirements for the prompt:
1. Specify "360 degree equirectangular panoramic photograph" at the start
2. Room proportions must match the floor plan
3. Describe ALL four walls and what's on them
4. Include the design style specified
5. Must be photorealistic, professional interior photography quality
6. The image should be seamless when wrapped as a sphere

Output ONLY the English prompt paragraph, nothing else.`;

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
                text: `Style: ${styleEn}. Room: ${room || 'LDK'}. ${customPrompt ? `Extra: ${customPrompt}` : ''} Generate a 360° panorama prompt.`,
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
      return NextResponse.json({ error: `分析失败: ${analyzeResponse.status}` }, { status: 502 });
    }

    const analyzeData = await analyzeResponse.json();
    const imagePrompt = analyzeData.choices?.[0]?.message?.content ?? '';
    if (!imagePrompt) {
      return NextResponse.json({ error: '无法生成描述' }, { status: 500 });
    }

    // Generate panoramic image with DALL-E 3
    const dalleResponse = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: imagePrompt,
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
        return NextResponse.json({ error: `图片生成失败: ${errData.error?.message || dalleResponse.status}` }, { status: 502 });
      } catch {
        return NextResponse.json({ error: `图片生成失败: ${dalleResponse.status}` }, { status: 502 });
      }
    }

    const dalleData = await dalleResponse.json();
    const generatedUrl = dalleData.data?.[0]?.url;
    if (!generatedUrl) {
      return NextResponse.json({ error: '图片生成失败' }, { status: 500 });
    }

    // Step 3: Use GPT-4o to identify furniture hotspots in the generated image
    // We ask it to suggest product placements
    const hotspotsResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You are an interior design product specialist. Based on the room description below, list the main furniture and appliance items that would be in this room.

For each item, provide:
- name (Chinese)
- category (sofa/table/light/appliance/storage/decoration/curtain/rug)
- approximate position in a panoramic view as yaw (-180 to 180) and pitch (-90 to 90) degrees
  - yaw 0 = center front, -90 = left, 90 = right, 180/-180 = behind
  - pitch 0 = eye level, -30 = floor area, 30 = ceiling area

Return ONLY valid JSON array, no markdown:
[{"name":"沙发","category":"sofa","yaw":-30,"pitch":-10},...]

List 4-8 main items only.`,
          },
          { role: 'user', content: imagePrompt },
        ],
        max_tokens: 400,
        temperature: 0.3,
      }),
    });

    let hotspots: Array<{ name: string; category: string; yaw: number; pitch: number }> = [];
    if (hotspotsResponse.ok) {
      const hsData = await hotspotsResponse.json();
      const hsContent = hsData.choices?.[0]?.message?.content ?? '';
      try {
        const cleaned = hsContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        hotspots = JSON.parse(cleaned);
      } catch { /* ignore */ }
    }

    return NextResponse.json({
      imageUrl: generatedUrl,
      prompt: imagePrompt,
      hotspots,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

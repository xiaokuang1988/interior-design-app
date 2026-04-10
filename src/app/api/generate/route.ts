import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'OPENAI_API_KEY not configured' }, { status: 500 });
  }

  try {
    const { image, style, customPrompt } = await req.json();
    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    // Step 1: Use GPT-4o to analyze the room photo and create a detailed prompt
    const styleDescriptions: Record<string, string> = {
      japanese: '日式和风风格（侘寂美学、木质元素、榻榻米、障子门、自然色调、简约禅意）',
      nordic: '北欧风格（明亮通透、白色为主、原木家具、几何线条、绿植点缀、功能性设计）',
      modern: '现代简约风格（干净线条、中性色调、金属与玻璃材质、隐藏收纳、LED灯带）',
      chinese: '新中式风格（红木家具、水墨画装饰、屏风隔断、灯笼元素、深色木质地板）',
      industrial: '工业风格（裸露砖墙、金属管道、水泥地面、复古灯具、皮质沙发）',
      wabisabi: '侘寂风格（不完美之美、天然材质、素朴质感、泥土色调、手工陶器）',
    };

    const styleDesc = styleDescriptions[style] || styleDescriptions.modern;

    const analyzeResponse = await fetch('https://api.openai.com/v1/chat/completions', {
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
            content: `你是一个专业室内设计师。用户会上传一张房间照片和想要的装修风格。
请根据照片中房间的实际结构（窗户位置、房间形状、大小），用英文写一段详细的室内设计效果图描述。
描述要包括：房间视角、家具摆放、材质、颜色、灯光、装饰品等细节。
描述必须是一段连贯的英文文字，适合用作AI图片生成的prompt。不要包含任何中文。
要求写实风格(photorealistic)，像专业室内设计杂志的摄影照片。`,
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `请根据这张房间照片，生成一个${styleDesc}的装修效果图描述。${customPrompt ? `用户额外要求：${customPrompt}` : ''}`,
              },
              { type: 'image_url', image_url: { url: image, detail: 'high' } },
            ],
          },
        ],
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!analyzeResponse.ok) {
      const err = await analyzeResponse.text();
      console.error('GPT-4o analyze error:', err);
      return NextResponse.json({ error: `分析失败: ${analyzeResponse.status}` }, { status: 502 });
    }

    const analyzeData = await analyzeResponse.json();
    const imagePrompt = analyzeData.choices?.[0]?.message?.content ?? '';

    if (!imagePrompt) {
      return NextResponse.json({ error: '无法生成描述' }, { status: 500 });
    }

    // Step 2: Generate image with DALL-E 3
    const dalleResponse = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: `Professional interior design photograph, magazine quality: ${imagePrompt}`,
        n: 1,
        size: '1792x1024',
        quality: 'hd',
        response_format: 'url',
      }),
    });

    if (!dalleResponse.ok) {
      const err = await dalleResponse.text();
      console.error('DALL-E error:', err);
      // Try to parse error for better message
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
      return NextResponse.json({ error: '图片生成失败，未返回URL' }, { status: 500 });
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

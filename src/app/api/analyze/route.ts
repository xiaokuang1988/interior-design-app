import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'OPENAI_API_KEY not configured' }, { status: 500 });
  }

  try {
    const { image } = await req.json();
    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
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
            content: `你是一个专业的室内设计师和户型分析师。用户会上传户型图（平面图），请你：
1. 识别所有房间及其大致面积（如果图上有标注就用标注的数据）
2. 给每个房间一条具体的装修/布局建议
3. 给出整体户型评分（0-100）
4. 给出4-6条优化建议

请严格按以下JSON格式返回（不要包含markdown代码块标记）：
{
  "rooms": [{"name": "房间名", "area": 面积数字, "suggestion": "具体建议"}],
  "score": 评分数字,
  "tips": ["建议1", "建议2", ...]
}`,
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: '请分析这张户型图' },
              { type: 'image_url', image_url: { url: image, detail: 'high' } },
            ],
          },
        ],
        max_tokens: 1500,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('OpenAI error:', err);
      return NextResponse.json({ error: `OpenAI API error: ${response.status}` }, { status: 502 });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content ?? '';

    // Try to parse JSON from response
    try {
      const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleaned);
      return NextResponse.json(parsed);
    } catch {
      // If not valid JSON, return raw text
      return NextResponse.json({ raw: content });
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

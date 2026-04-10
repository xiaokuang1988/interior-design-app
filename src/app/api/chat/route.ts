import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'OPENAI_API_KEY not configured' }, { status: 500 });
  }

  try {
    const { message, imageUrl, history } = await req.json();
    if (!message) {
      return NextResponse.json({ error: 'No message provided' }, { status: 400 });
    }

    // Build messages array
    const messages: Array<{ role: string; content: string | Array<{ type: string; text?: string; image_url?: { url: string; detail: string } }> }> = [
      {
        role: 'system',
        content: `你是一个专业的室内装修AI助手，精通中日两国的装修风格和材料。
你可以：
- 分析户型图并给出装修建议
- 推荐装修风格和配色方案
- 解答材料选择、预算分配等问题
- 根据上传的房间照片给出改造建议

回答要专业但易懂，适当使用emoji让对话更友好。如果用户上传了图片，请仔细分析图片内容。`,
      },
    ];

    // Add recent history (last 6 messages)
    if (history && Array.isArray(history)) {
      const recent = history.slice(-6);
      for (const h of recent) {
        messages.push({ role: h.role, content: h.content });
      }
    }

    // Build user message content
    if (imageUrl) {
      messages.push({
        role: 'user',
        content: [
          { type: 'text', text: message },
          { type: 'image_url', image_url: { url: imageUrl, detail: 'high' } },
        ],
      });
    } else {
      messages.push({ role: 'user', content: message });
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages,
        max_tokens: 1000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('OpenAI error:', err);
      return NextResponse.json({ error: `OpenAI API error: ${response.status}` }, { status: 502 });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content ?? '抱歉，我暂时无法回答。';

    return NextResponse.json({ content });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 120;

const DECOR8_API_KEY = process.env.DECOR8_API_KEY;
const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;

// Map our style IDs to Decor8 design_style values
const styleMap: Record<string, string> = {
  japanese: 'japandi',
  nordic: 'scandinavian',
  modern: 'modern',
  chinese: 'asian_zen',
  industrial: 'industrial',
  wabisabi: 'wabi_sabi',
};

// Map room names to Decor8 room_type values
function mapRoomType(room: string): string {
  const r = (room || '').toLowerCase();
  if (r.includes('ldk') || r.includes('リビング') || r.includes('living')) return 'livingroom';
  if (r.includes('キッチン') || r.includes('kitchen') || r.includes('台所')) return 'kitchen';
  if (r.includes('ダイニング') || r.includes('dining')) return 'diningroom';
  if (r.includes('洋室') || r.includes('寝室') || r.includes('bedroom') || r.includes('主寝')) return 'bedroom';
  if (r.includes('浴室') || r.includes('bath') || r.includes('風呂')) return 'bathroom';
  if (r.includes('子供') || r.includes('kids')) return 'kidsroom';
  if (r.includes('書斎') || r.includes('office') || r.includes('仕事')) return 'office';
  if (r.includes('玄関') || r.includes('foyer') || r.includes('entrance')) return 'foyer';
  if (r.includes('バルコニー') || r.includes('balcony')) return 'balcony';
  if (r.includes('和室')) return 'familyroom';
  if (r === '__overview__') return 'openplan';
  return 'livingroom'; // default
}

// Upload base64 image to Replicate file API to get a public URL
async function uploadToPublicUrl(base64Data: string): Promise<string> {
  if (!REPLICATE_API_TOKEN) {
    throw new Error('REPLICATE_API_TOKEN needed for image upload');
  }

  const match = base64Data.match(/^data:(image\/\w+);base64,(.+)$/);
  if (!match) throw new Error('Invalid base64 image');
  const mimeType = match[1];
  const buffer = Buffer.from(match[2], 'base64');
  const ext = mimeType === 'image/png' ? 'png' : 'jpg';

  const blob = new Blob([buffer], { type: mimeType });
  const formData = new FormData();
  formData.append('content', blob, `upload.${ext}`);

  const res = await fetch('https://api.replicate.com/v1/files', {
    method: 'POST',
    headers: { Authorization: `Bearer ${REPLICATE_API_TOKEN}` },
    body: formData,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Upload failed (${res.status}): ${err}`);
  }

  const data = await res.json();
  return data.urls?.get || data.url;
}

export async function POST(req: NextRequest) {
  if (!DECOR8_API_KEY) {
    return NextResponse.json({ error: 'DECOR8_API_KEY not configured' }, { status: 500 });
  }

  try {
    const { image, style, room } = await req.json();
    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    // Step 1: Upload image to get a public URL
    let imageUrl: string;
    try {
      imageUrl = await uploadToPublicUrl(image);
    } catch (uploadErr: unknown) {
      const msg = uploadErr instanceof Error ? uploadErr.message : 'Upload failed';
      return NextResponse.json({ error: `图片上传失败: ${msg}` }, { status: 502 });
    }

    const designStyle = styleMap[style] || 'modern';
    const roomType = mapRoomType(room);

    // Step 2: Call Decor8 sketch_to_3d_render API
    const decor8Response = await fetch('https://api.decor8.ai/sketch_to_3d_render', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DECOR8_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input_image_url: imageUrl,
        room_type: roomType,
        design_style: designStyle,
        num_images: 1,
        scale_factor: 2,
      }),
    });

    if (!decor8Response.ok) {
      const err = await decor8Response.text();
      console.error('Decor8 error:', err);
      return NextResponse.json(
        { error: `Decor8 API error (${decor8Response.status}): ${err}` },
        { status: 502 }
      );
    }

    const decor8Data = await decor8Response.json();
    const outputUrl = decor8Data?.info?.url || decor8Data?.info?.[0]?.url;

    if (!outputUrl) {
      console.error('Decor8 response:', JSON.stringify(decor8Data));
      return NextResponse.json({ error: '生成失败，未返回图片' }, { status: 500 });
    }

    return NextResponse.json({
      imageUrl: outputUrl,
      prompt: `${roomType} / ${designStyle}`,
      engine: 'decor8-sketch-to-3d',
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    console.error('Generate-pro error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { extractReadingFromImage } from '@/lib/openrouter';
import { assertPasscode } from '@/lib/passcode';
import { resizeAndEncodeImage } from '@/lib/image';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    assertPasscode(req);

    const formData = await req.formData();
    const image = formData.get('image');
    if (!(image instanceof File)) {
      return NextResponse.json({ error: 'Missing image file' }, { status: 400 });
    }

    if (!image.type.startsWith('image/')) {
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 });
    }

    const bytes = Buffer.from(await image.arrayBuffer());
    
    // Resize and encode image as base64
    const imageBase64 = await resizeAndEncodeImage(bytes, image.type);
    
    const base64 = bytes.toString('base64');
    const { result, raw } = await extractReadingFromImage({
      mimeType: image.type,
      base64,
    });

    return NextResponse.json({ 
      ...result, 
      raw,
      image_base64: imageBase64,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown extract error';
    const status = message === 'Invalid passcode' ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

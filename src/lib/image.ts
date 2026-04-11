import sharp from 'sharp';

/**
 * Resize an image and convert to Base64 string
 * @param buffer Image buffer
 * @param mimeType MIME type of image
 * @param maxWidth Maximum width (default 800)
 * @param maxHeight Maximum height (default 800)
 * @param quality JPEG quality (default 80)
 * @returns Base64 encoded string
 */
export async function resizeAndEncodeImage(
  buffer: Buffer,
  mimeType: string,
  maxWidth: number = 1200,
  maxHeight: number = 1600,
  quality: number = 85
): Promise<string> {
  let image = sharp(buffer);

  // Resize while maintaining aspect ratio
  image = image.resize(maxWidth, maxHeight, {
    fit: 'inside',
    withoutEnlargement: true,
  });

  // Convert to appropriate format
  let processed: Buffer;
  if (mimeType === 'image/png') {
    processed = await image.png({ quality }).toBuffer();
  } else if (mimeType === 'image/webp') {
    processed = await image.webp({ quality }).toBuffer();
  } else {
    // Default to JPEG
    processed = await image.jpeg({ quality }).toBuffer();
  }

  return processed.toString('base64');
}

export function determineTargetMimeType(inputMimeType: string): string {
  if (inputMimeType === 'image/png') return 'image/png';
  if (inputMimeType === 'image/webp') return 'image/webp';
  return 'image/jpeg';
}

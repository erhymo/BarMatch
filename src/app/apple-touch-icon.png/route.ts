import fs from 'node:fs';
import path from 'node:path';

export const runtime = 'nodejs';

let cachedLogoPng: Buffer | null = null;

async function getLogoPng(): Promise<Buffer> {
  if (cachedLogoPng) return cachedLogoPng;

  const svgPath = path.join(process.cwd(), 'public', 'where2watch-logo.svg');
  const svgContent = await fs.promises.readFile(svgPath, 'utf8');

  const match = svgContent.match(/href="data:image\/png;base64,([^"']+)"/);
  if (!match) {
    throw new Error('Embedded PNG logo not found in where2watch-logo.svg');
  }

  cachedLogoPng = Buffer.from(match[1], 'base64');
  return cachedLogoPng;
}

export async function GET() {
  try {
	    const png = await getLogoPng();
	    // Convert Node Buffer to an ArrayBuffer that Response accepts as body
	    const body = png.buffer.slice(png.byteOffset, png.byteOffset + png.byteLength) as ArrayBuffer;

	    return new Response(body, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Failed to load apple-touch-icon PNG from SVG:', error);

    return new Response('Apple touch icon not available', {
      status: 500,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
      },
    });
  }
}

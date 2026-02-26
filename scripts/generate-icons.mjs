/**
 * Generate PWA icons from the existing where2watch logo SVG.
 *
 * The source SVG (3000x3000) has an embedded PNG with the logo centered
 * on a dark navy background. We crop to make the logo larger, then
 * resize to all required PWA icon sizes.
 */

import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'fs';

const SOURCE = 'Where2Watch_highres_with_background (1).svg';

async function generate() {
  // 1. Render the full 3000x3000 SVG to a raster buffer
  const svgBuf = readFileSync(SOURCE);
  const full = sharp(svgBuf, { density: 72 });
  const meta = await full.metadata();
  console.log(`Source: ${meta.width}x${meta.height}`);

  // 2. Crop: centre on the actual logo content (which is NOT at the image centre).
  //    We use sharp's trim() to detect the logo bounding box, then crop a square
  //    centred on the logo's centre point.
  const w = meta.width || 3000;
  const h = meta.height || 3000;

  const trimResult = await sharp(svgBuf, { density: 72 })
    .trim({ threshold: 15 })
    .toBuffer({ resolveWithObject: true });

  const logoW = trimResult.info.width;
  const logoH = trimResult.info.height;
  const logoLeft = -trimResult.info.trimOffsetLeft;
  const logoTop = -trimResult.info.trimOffsetTop;
  const logoCenterX = Math.round(logoLeft + logoW / 2);
  const logoCenterY = Math.round(logoTop + logoH / 2);
  console.log(`Logo bounds: ${logoW}x${logoH} at (${logoLeft},${logoTop}), center=(${logoCenterX},${logoCenterY})`);

  // Square crop size: largest logo dimension + 30% padding
  const maxDim = Math.max(logoW, logoH);
  const cropSize = Math.round(maxDim * 1.35);

  // Centre the crop on the logo centre, clamped to image bounds
  let cropLeft = Math.max(0, logoCenterX - Math.round(cropSize / 2));
  let cropTop = Math.max(0, logoCenterY - Math.round(cropSize / 2));
  if (cropLeft + cropSize > w) cropLeft = w - cropSize;
  if (cropTop + cropSize > h) cropTop = h - cropSize;

  const cropped = await sharp(svgBuf, { density: 72 })
    .extract({ left: cropLeft, top: cropTop, width: cropSize, height: cropSize })
    .png()
    .toBuffer();

  console.log(`Cropped to ${cropSize}x${cropSize} from (${cropLeft},${cropTop})`);

  // 3. Generate all icon sizes from the cropped image
  const sizes = [
    { name: 'public/icons/icon-192.png', size: 192 },
    { name: 'public/icons/icon-512.png', size: 512 },
    { name: 'public/apple-touch-icon.png', size: 180 },
    { name: 'public/favicon-32x32.png', size: 32 },
  ];

  for (const { name, size } of sizes) {
    const buf = await sharp(cropped).resize(size, size).png().toBuffer();
    writeFileSync(name, buf);
    console.log(`✅ ${name} (${size}x${size})`);
  }

  // 4. Maskable icon: needs extra padding (safe zone = inner 80%)
  //    We take the cropped logo and place it on a larger canvas with bg color
  const maskableSize = 512;
  const innerSize = Math.round(maskableSize * 0.75); // logo fills 75% of icon
  const offset = Math.round((maskableSize - innerSize) / 2);

  const resizedLogo = await sharp(cropped).resize(innerSize, innerSize).png().toBuffer();

  // Create background with the app's theme color
  const maskable = await sharp({
    create: { width: maskableSize, height: maskableSize, channels: 4, background: { r: 10, g: 22, b: 40, alpha: 1 } }
  })
    .composite([{ input: resizedLogo, left: offset, top: offset }])
    .png()
    .toBuffer();

  writeFileSync('public/icons/icon-512-maskable.png', maskable);
  console.log(`✅ public/icons/icon-512-maskable.png (${maskableSize}x${maskableSize} maskable)`);

  console.log('\nDone!');
}

generate().catch(console.error);


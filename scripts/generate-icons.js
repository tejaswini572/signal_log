/**
 * generate-icons.js
 * Generates PNG icons for the SignalLog PWA manifest.
 * Uses only Node.js built-in modules (zlib, fs, path, url) — zero npm dependencies.
 *
 * Outputs:
 *   public/icons/icon-192.png  (192×192)
 *   public/icons/icon-512.png  (512×512)
 *   public/icons/icon-maskable-192.png
 *   public/icons/icon-maskable-512.png
 */

import zlib from 'node:zlib';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* ---- CRC-32 (required by PNG format) -------------------------------- */
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/* ---- PNG chunk helper ------------------------------------------------ */
function chunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii');
  const len = Buffer.allocUnsafe(4);
  len.writeUInt32BE(data.length, 0);
  const crcVal = Buffer.allocUnsafe(4);
  crcVal.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])), 0);
  return Buffer.concat([len, typeBytes, data, crcVal]);
}

/* ---- Custom icon PNG generator with a shield / signal motif ---------- */
function createIconPNG(size) {
  const PNG_SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // IHDR: width, height, bit-depth=8, colour-type=6 (RGBA), compression=0, filter=0, interlace=0
  const ihdr = Buffer.allocUnsafe(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const rowSize = 1 + size * 4;
  const raw = Buffer.alloc(size * rowSize);

  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.45;

  for (let y = 0; y < size; y++) {
    const base = y * rowSize;
    raw[base] = 0; // filter: None

    for (let x = 0; x < size; x++) {
      const px = base + 1 + x * 4;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Background: Dark sleek circular badge #0d1117 with border #30363d
      if (dist <= radius) {
        if (dist > radius - (size * 0.03)) {
          // Border: cyan/blue accent #388bfd
          raw[px]     = 56;   // R
          raw[px + 1] = 139;  // G
          raw[px + 2] = 253;  // B
          raw[px + 3] = 255;  // A
        } else {
          // Inner background: #0d1117 (dark charcoal)
          // Draw signal radar / pulse rings or shield
          const relDist = dist / radius;
          const isRing1 = Math.abs(relDist - 0.35) < 0.05;
          const isRing2 = Math.abs(relDist - 0.65) < 0.05;
          const isCenterDot = relDist < 0.12;

          if (isCenterDot) {
            // Bright blue center dot #58a6ff
            raw[px]     = 88;
            raw[px + 1] = 166;
            raw[px + 2] = 255;
            raw[px + 3] = 255;
          } else if (isRing1 || isRing2) {
            // Signal pulses
            raw[px]     = 56;
            raw[px + 1] = 139;
            raw[px + 2] = 253;
            raw[px + 3] = 255;
          } else {
            raw[px]     = 13;
            raw[px + 1] = 17;
            raw[px + 2] = 23;
            raw[px + 3] = 255;
          }
        }
      } else {
        // Transparent outside badge
        raw[px]     = 0;
        raw[px + 1] = 0;
        raw[px + 2] = 0;
        raw[px + 3] = 0;
      }
    }
  }

  const idat = zlib.deflateSync(raw, { level: 9 });

  return Buffer.concat([
    PNG_SIG,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const outDir = path.resolve(__dirname, '..', 'public', 'icons');
fs.mkdirSync(outDir, { recursive: true });

for (const size of [192, 512]) {
  const png = createIconPNG(size);
  const file = path.join(outDir, `icon-${size}.png`);
  fs.writeFileSync(file, png);
  console.log(`✓  ${file}  (${png.length} bytes)`);

  const maskableFile = path.join(outDir, `icon-maskable-${size}.png`);
  fs.writeFileSync(maskableFile, png);
  console.log(`✓  ${maskableFile}  (${png.length} bytes)`);
}

console.log('All PWA icons generated successfully.');

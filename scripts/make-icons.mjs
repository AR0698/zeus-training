/**
 * Generates the PWA raster icons from the same geometry as `public/icon.svg`.
 *
 * Written by hand with zlib rather than pulling in an image toolchain: the
 * shape is nine straight edges and a rounded rectangle, and a dependency-free
 * generator means `npm ci && npm run build` works on any machine, in CI
 * included, with nothing to install and nothing to keep up to date.
 */

import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "public");

const BACKGROUND = [0x0a, 0x0a, 0x09];
const MARK = [0xd8, 0xff, 0x3e];

/** The Z, in the 512 × 512 design space shared with icon.svg. */
const Z_POLYGON = [
  [150, 146],
  [366, 146],
  [366, 196],
  [232, 316],
  [366, 316],
  [366, 366],
  [150, 366],
  [150, 316],
  [284, 196],
  [150, 196],
];

const SUPERSAMPLE = 3;

function insidePolygon(points, x, y) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [xi, yi] = points[i];
    const [xj, yj] = points[j];
    const straddles = yi > y !== yj > y;
    if (straddles && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function insideRoundedRect(x, y, size, radius) {
  if (x < 0 || y < 0 || x > size || y > size) return false;
  const cx = Math.min(Math.max(x, radius), size - radius);
  const cy = Math.min(Math.max(y, radius), size - radius);
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy <= radius * radius;
}

/** Renders one icon into a raw RGBA buffer, antialiased by supersampling. */
function render(size, { maskable }) {
  const scale = 512 / size;
  const radius = maskable ? 0 : size * 0.219; // matches rx=112 at 512
  // A maskable icon must survive a circular crop: shrink the mark to the
  // 80 % safe zone instead of letting the platform slice the Z in half.
  const markScale = maskable ? 0.72 : 1;
  const markOffset = ((1 - markScale) * 512) / 2;

  const pixels = Buffer.alloc(size * size * 4);

  for (let py = 0; py < size; py += 1) {
    for (let px = 0; px < size; px += 1) {
      let bgHits = 0;
      let markHits = 0;

      for (let sy = 0; sy < SUPERSAMPLE; sy += 1) {
        for (let sx = 0; sx < SUPERSAMPLE; sx += 1) {
          const x = px + (sx + 0.5) / SUPERSAMPLE;
          const y = py + (sy + 0.5) / SUPERSAMPLE;
          if (!insideRoundedRect(x, y, size, radius)) continue;
          bgHits += 1;
          const dx = (x * scale - markOffset) / markScale;
          const dy = (y * scale - markOffset) / markScale;
          if (insidePolygon(Z_POLYGON, dx, dy)) markHits += 1;
        }
      }

      const samples = SUPERSAMPLE * SUPERSAMPLE;
      const alpha = Math.round((bgHits / samples) * 255);
      const markRatio = bgHits === 0 ? 0 : markHits / bgHits;
      const offset = (py * size + px) * 4;
      for (let channel = 0; channel < 3; channel += 1) {
        pixels[offset + channel] = Math.round(
          BACKGROUND[channel] * (1 - markRatio) + MARK[channel] * markRatio,
        );
      }
      pixels[offset + 3] = alpha;
    }
  }

  return pixels;
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function encodePng(pixels, size) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // bit depth
  header[9] = 6; // RGBA
  header[10] = 0; // deflate
  header[11] = 0; // adaptive filtering
  header[12] = 0; // no interlace

  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let row = 0; row < size; row += 1) {
    raw[row * (stride + 1)] = 0; // filter type: none
    pixels.copy(raw, row * (stride + 1) + 1, row * stride, (row + 1) * stride);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const targets = [
  { file: "icon-192.png", size: 192, maskable: false },
  { file: "icon-512.png", size: 512, maskable: false },
  { file: "icon-maskable-512.png", size: 512, maskable: true },
  { file: "apple-touch-icon.png", size: 180, maskable: true },
];

mkdirSync(OUT_DIR, { recursive: true });
for (const target of targets) {
  const pixels = render(target.size, { maskable: target.maskable });
  writeFileSync(join(OUT_DIR, target.file), encodePng(pixels, target.size));
  console.log(`icons: ${target.file} (${target.size}px)`);
}

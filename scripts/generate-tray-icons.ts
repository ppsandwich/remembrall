import fs from "fs";
import path from "path";
import { deflateSync } from "zlib";

const assetsDir = path.join(__dirname, "../apps/desktop/assets");
const extIconsDir = path.join(__dirname, "../apps/extension/icons");

if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}
if (!fs.existsSync(extIconsDir)) {
  fs.mkdirSync(extIconsDir, { recursive: true });
}

const crcTable: number[] = [];
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let j = 0; j < 8; j++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[i] = c;
}

function crc32(buf: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function writeUint32BE(buf: Buffer, value: number, offset: number): void {
  buf[offset] = (value >>> 24) & 0xff;
  buf[offset + 1] = (value >>> 16) & 0xff;
  buf[offset + 2] = (value >>> 8) & 0xff;
  buf[offset + 3] = value & 0xff;
}

function createPng(width: number, height: number, rgbaData: Buffer): Buffer {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdrData = Buffer.alloc(13);
  writeUint32BE(ihdrData, width, 0);
  writeUint32BE(ihdrData, height, 4);
  ihdrData[8] = 8;
  ihdrData[9] = 6;
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;

  const ihdrTypeAndData = Buffer.concat([Buffer.from("IHDR"), ihdrData]);
  const ihdr = Buffer.alloc(4 + 4 + 13 + 4);
  writeUint32BE(ihdr, 13, 0);
  ihdr.write("IHDR", 4);
  ihdrData.copy(ihdr, 8);
  writeUint32BE(ihdr, crc32(ihdrTypeAndData), 21);

  const rawRowSize = 1 + width * 4;
  const rawData = Buffer.alloc(height * rawRowSize);
  for (let y = 0; y < height; y++) {
    rawData[y * rawRowSize] = 0;
    rgbaData.copy(rawData, y * rawRowSize + 1, y * width * 4, (y + 1) * width * 4);
  }

  const compressed = deflateSync(rawData);
  const idatTypeAndData = Buffer.concat([Buffer.from("IDAT"), compressed]);
  const idat = Buffer.alloc(4 + 4 + compressed.length + 4);
  writeUint32BE(idat, compressed.length, 0);
  idat.write("IDAT", 4);
  compressed.copy(idat, 8);
  writeUint32BE(idat, crc32(idatTypeAndData), 8 + compressed.length);

  const iend = Buffer.alloc(12);
  writeUint32BE(iend, 0, 0);
  iend.write("IEND", 4);
  writeUint32BE(iend, crc32(Buffer.from("IEND")), 8);

  return Buffer.concat([signature, ihdr, idat, iend]);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function dist(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2);
}

function generateVolleyballIcon(size: number, isTemplate: boolean = false): Buffer {
  const data = Buffer.alloc(size * size * 4);
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 1;
  const lineWidth = Math.max(1, size / 16);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const d = dist(x, y, cx, cy);

      if (d <= radius) {
        if (isTemplate) {
          data[idx] = 0;
          data[idx + 1] = 0;
          data[idx + 2] = 0;
          data[idx + 3] = 255;
        } else {
          // Gold gradient: top #D4AF37 -> middle #B8860B -> bottom #996515
          const t = y / size;
          let r: number, g: number, b: number;
          if (t < 0.5) {
            const lt = t * 2;
            r = lerp(212, 184, lt);
            g = lerp(175, 134, lt);
            b = lerp(55, 11, lt);
          } else {
            const lt = (t - 0.5) * 2;
            r = lerp(184, 153, lt);
            g = lerp(134, 101, lt);
            b = lerp(11, 21, lt);
          }

          // Volleyball lines: 3 curved lines meeting at top and bottom
          // Normalize coordinates to [-1, 1]
          const nx = (x - cx) / radius;
          const ny = (y - cy) / radius;

          // Line 1: vertical center line (slightly curved)
          const line1 = Math.abs(nx - Math.sin(ny * Math.PI) * 0.15);

          // Line 2: left curve
          const line2 = Math.abs(nx - (-0.5 + Math.sin(ny * Math.PI + 0.5) * 0.4));

          // Line 3: right curve
          const line3 = Math.abs(nx - (0.5 - Math.sin(ny * Math.PI - 0.5) * 0.4));

          const isLine = line1 < lineWidth / radius ||
                         line2 < lineWidth / radius ||
                         line3 < lineWidth / radius;

          if (isLine) {
            // Darker gold for lines
            data[idx] = Math.round(r * 0.6);
            data[idx + 1] = Math.round(g * 0.6);
            data[idx + 2] = Math.round(b * 0.6);
            data[idx + 3] = 255;
          } else {
            data[idx] = Math.round(r);
            data[idx + 1] = Math.round(g);
            data[idx + 2] = Math.round(b);
            data[idx + 3] = 255;
          }
        }
      } else {
        data[idx] = 0;
        data[idx + 1] = 0;
        data[idx + 2] = 0;
        data[idx + 3] = 0;
      }
    }
  }

  return data;
}

console.log("Generating icons...");

// Desktop tray icons (32px)
const traySize = 32;
for (const [name, isTemplate] of [["tray-icon.png", false], ["tray-iconTemplate.png", true]]) {
  const data = generateVolleyballIcon(traySize, isTemplate);
  const png = createPng(traySize, traySize, data);
  fs.writeFileSync(path.join(assetsDir, name), png);
  console.log(`Created ${name}`);
}

// Chrome extension icons
for (const size of [16, 32, 48, 128]) {
  const data = generateVolleyballIcon(size, false);
  const png = createPng(size, size, data);
  fs.writeFileSync(path.join(extIconsDir, `icon-${size}.png`), png);
  console.log(`Created icon-${size}.png`);
}

console.log("\nDone! Icons saved to:", assetsDir, "and", extIconsDir);

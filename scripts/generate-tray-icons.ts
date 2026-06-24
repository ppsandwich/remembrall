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

// Distance from point to a circular arc defined by center, radius, and angle range
function distToArc(px: number, py: number, cx: number, cy: number, r: number, startAngle: number, endAngle: number): number {
  const dx = px - cx;
  const dy = py - cy;
  const d = Math.sqrt(dx * dx + dy * dy);
  let angle = Math.atan2(dy, dx);
  
  // Normalize angles
  while (angle < startAngle) angle += Math.PI * 2;
  while (angle > endAngle) angle -= Math.PI * 2;
  
  if (angle >= startAngle && angle <= endAngle) {
    return Math.abs(d - r);
  }
  
  // Check endpoints
  const ex1 = cx + r * Math.cos(startAngle);
  const ey1 = cy + r * Math.sin(startAngle);
  const ex2 = cx + r * Math.cos(endAngle);
  const ey2 = cy + r * Math.sin(endAngle);
  
  return Math.min(dist(px, py, ex1, ey1), dist(px, py, ex2, ey2));
}

// Lucide volleyball icon: circle + 3 curved lines
// The icon is drawn at 24x24 viewBox, we scale to our size
function generateVolleyballIcon(size: number, isTemplate: boolean = false): Buffer {
  const data = Buffer.alloc(size * size * 4);
  const s = size / 24; // scale factor
  const lineWidth = Math.max(1.5 * s, 1);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      
      // Scale to 24x24 coordinate space
      const px = x / s;
      const py = y / s;
      
      // Circle: center (12,12), radius 10 (from Lucide)
      const circleDist = dist(px, py, 12, 12);
      const onCircle = Math.abs(circleDist - 10) < lineWidth;
      
      // Line 1: path "M11.1 7.1a16.55 16.55 0 0 1 10.9 4" (top right curve)
      // Approximate as arc from ~(11.1,7.1) curving to ~(22,11.1)
      // Simplified: curve from top going right
      const line1Dist = distToArc(px, py, 16, 14, 9, -1.8, -0.2);
      
      // Line 2: path "M5.9 16.9a16.55 16.55 0 0 1-2.8-7.5" (bottom left curve)
      // Approximate as arc
      const line2Dist = distToArc(px, py, 8, 10, 8, 2.5, 3.8);
      
      // Line 3: path "M18.4 12.4a16.55 16.55 0 0 1 2.7 7.5" (right to bottom)
      const line3Dist = distToArc(px, py, 14, 14, 9, -0.2, 1.2);
      
      // Line 4: path "M4.2 10.2a16.55 16.55 0 0 1 6.9-3.1" (left to top)
      const line4Dist = distToArc(px, py, 10, 12, 8, -2.5, -1.0);
      
      const isStroke = onCircle || line1Dist < lineWidth || line2Dist < lineWidth || line3Dist < lineWidth || line4Dist < lineWidth;
      
      // Check if point is inside circle for fill
      const insideCircle = circleDist <= 10;
      
      if (isStroke) {
        if (isTemplate) {
          data[idx] = 0;
          data[idx + 1] = 0;
          data[idx + 2] = 0;
          data[idx + 3] = 255;
        } else {
          // Gold gradient stroke
          const t = py / 24;
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
          data[idx] = Math.round(r);
          data[idx + 1] = Math.round(g);
          data[idx + 2] = Math.round(b);
          data[idx + 3] = 255;
        }
      } else if (insideCircle) {
        // Fill inside the circle with a slightly darker shade
        if (isTemplate) {
          data[idx] = 0;
          data[idx + 1] = 0;
          data[idx + 2] = 0;
          data[idx + 3] = 255;
        } else {
          const t = py / 24;
          let r: number, g: number, b: number;
          if (t < 0.5) {
            const lt = t * 2;
            r = lerp(190, 165, lt);
            g = lerp(155, 120, lt);
            b = lerp(45, 10, lt);
          } else {
            const lt = (t - 0.5) * 2;
            r = lerp(165, 140, lt);
            g = lerp(120, 90, lt);
            b = lerp(10, 18, lt);
          }
          data[idx] = Math.round(r);
          data[idx + 1] = Math.round(g);
          data[idx + 2] = Math.round(b);
          data[idx + 3] = 255;
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

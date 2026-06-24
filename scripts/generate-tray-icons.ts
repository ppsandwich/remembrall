/**
 * Generate tray icons for the Remembrall desktop app.
 *
 * Run this script to create placeholder tray icons:
 *   npx tsx scripts/generate-tray-icons.ts
 *
 * For production, replace these with proper designed icons.
 */

import fs from "fs";
import path from "path";
import { deflateSync } from "zlib";

const ICON_SIZE = 32;
const assetsDir = path.join(__dirname, "../apps/desktop/assets");

// Ensure assets directory exists
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

// CRC32 lookup table
const crcTable: number[] = [];
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let j = 0; j < 8; j++) {
    if (c & 1) {
      c = 0xedb88320 ^ (c >>> 1);
    } else {
      c = c >>> 1;
    }
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

// Create a minimal valid PNG
function createMinimalPng(width: number, height: number, rgbaData: Buffer): Buffer {
  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  writeUint32BE(ihdrData, width, 0);
  writeUint32BE(ihdrData, height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 6; // color type (RGBA)
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace

  const ihdrTypeAndData = Buffer.concat([Buffer.from("IHDR"), ihdrData]);
  const ihdrCrc = crc32(ihdrTypeAndData);
  const ihdr = Buffer.alloc(4 + 4 + 13 + 4);
  writeUint32BE(ihdr, 13, 0); // length
  ihdr.write("IHDR", 4);
  ihdrData.copy(ihdr, 8);
  writeUint32BE(ihdr, ihdrCrc, 21);

  // IDAT chunk
  // Add filter bytes (0 = None) before each row
  const rawRowSize = 1 + width * 4;
  const rawData = Buffer.alloc(height * rawRowSize);
  for (let y = 0; y < height; y++) {
    rawData[y * rawRowSize] = 0; // filter type None
    rgbaData.copy(rawData, y * rawRowSize + 1, y * width * 4, (y + 1) * width * 4);
  }

  const compressed = deflateSync(rawData);
  const idatTypeAndData = Buffer.concat([Buffer.from("IDAT"), compressed]);
  const idatCrc = crc32(idatTypeAndData);
  const idat = Buffer.alloc(4 + 4 + compressed.length + 4);
  writeUint32BE(idat, compressed.length, 0);
  idat.write("IDAT", 4);
  compressed.copy(idat, 8);
  writeUint32BE(idat, idatCrc, 8 + compressed.length);

  // IEND chunk
  const iendCrc = crc32(Buffer.from("IEND"));
  const iend = Buffer.alloc(12);
  writeUint32BE(iend, 0, 0); // length
  iend.write("IEND", 4);
  writeUint32BE(iend, iendCrc, 8);

  return Buffer.concat([signature, ihdr, idat, iend]);
}

// Generate icon data
function generateIconData(size: number, isTemplate: boolean = false): Buffer {
  const data = Buffer.alloc(size * size * 4);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;

      // Create a circle
      const cx = size / 2;
      const cy = size / 2;
      const r = size / 2 - 2;
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);

      if (dist <= r) {
        if (isTemplate) {
          // Template icon: black with full alpha (macOS will tint it)
          data[idx] = 0;
          data[idx + 1] = 0;
          data[idx + 2] = 0;
          data[idx + 3] = 255;
        } else {
          // Color icon: gold (#D4AF37)
          data[idx] = 212;
          data[idx + 1] = 175;
          data[idx + 2] = 55;
          data[idx + 3] = 255;
        }
      } else {
        // Transparent background
        data[idx] = 0;
        data[idx + 1] = 0;
        data[idx + 2] = 0;
        data[idx + 3] = 0;
      }
    }
  }

  return data;
}

// Generate icons
console.log("Generating tray icons...");

const iconData = generateIconData(ICON_SIZE, false);
const templateIconData = generateIconData(ICON_SIZE, true);

const iconPng = createMinimalPng(ICON_SIZE, ICON_SIZE, iconData);
const templateIconPng = createMinimalPng(ICON_SIZE, ICON_SIZE, templateIconData);

fs.writeFileSync(path.join(assetsDir, "tray-icon.png"), iconPng);
console.log("Created tray-icon.png");

fs.writeFileSync(path.join(assetsDir, "tray-iconTemplate.png"), templateIconPng);
console.log("Created tray-iconTemplate.png");

// Generate Chrome extension icons
const extIconsDir = path.join(__dirname, "../apps/extension/icons");
if (!fs.existsSync(extIconsDir)) {
  fs.mkdirSync(extIconsDir, { recursive: true });
}

for (const size of [16, 32, 48, 128]) {
  const data = generateIconData(size, false);
  const png = createMinimalPng(size, size, data);
  fs.writeFileSync(path.join(extIconsDir, `icon-${size}.png`), png);
  console.log(`Created icon-${size}.png`);
}

console.log("\nDone! Icons saved to:", assetsDir, "and", extIconsDir);
console.log("For production, replace these with proper designed icons.");

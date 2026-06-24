import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const extDir = path.join(__dirname, "../apps/extension");
const outDir = path.join(__dirname, "../apps/extension/dist");

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const zipPath = path.join(outDir, "remembrall-extension.zip");

// Remove existing zip if it exists
if (fs.existsSync(zipPath)) {
  fs.unlinkSync(zipPath);
}

// Create zip with extension files
execSync(`zip -r "${zipPath}" manifest.json background.js icons/`, {
  cwd: extDir,
  stdio: "inherit",
});

console.log(`\nExtension packaged: ${zipPath}`);
console.log("Load it in Chrome via chrome://extensions → Load unpacked (select apps/extension/)");

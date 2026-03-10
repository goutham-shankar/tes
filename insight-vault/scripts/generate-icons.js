/**
 * scripts/generate-icons.js
 *
 * Generates PWA icons (192×192 and 512×512) for InsightVault.
 * Run ONCE before building: node scripts/generate-icons.js
 *
 * Requires: npm install --save-dev canvas
 * (canvas is a native module — it is dev-only and not bundled into the app)
 */
const { createCanvas } = require("canvas");
const fs = require("fs");
const path = require("path");

const SIZES = [192, 512];
const OUT_DIR = path.join(__dirname, "..", "public", "icons");

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

for (const size of SIZES) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");

  // Background
  const grad = ctx.createLinearGradient(0, 0, size, size);
  grad.addColorStop(0, "#1e2a8a");
  grad.addColorStop(1, "#0d1117");
  ctx.fillStyle = grad;
  ctx.roundRect(0, 0, size, size, size * 0.22);
  ctx.fill();

  // Icon — open book shape
  const cx = size / 2;
  const cy = size / 2;
  const s = size * 0.38;

  ctx.strokeStyle = "#6082fb";
  ctx.lineWidth = size * 0.062;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // Left page
  ctx.beginPath();
  ctx.moveTo(cx, cy - s * 0.1);
  ctx.lineTo(cx, cy + s * 0.7);
  ctx.lineTo(cx - s, cy + s * 0.5);
  ctx.lineTo(cx - s, cy - s * 0.4);
  ctx.closePath();
  ctx.stroke();

  // Right page
  ctx.beginPath();
  ctx.moveTo(cx, cy - s * 0.1);
  ctx.lineTo(cx, cy + s * 0.7);
  ctx.lineTo(cx + s, cy + s * 0.5);
  ctx.lineTo(cx + s, cy - s * 0.4);
  ctx.closePath();
  ctx.stroke();

  // Sparkle dot
  ctx.fillStyle = "#6082fb";
  ctx.beginPath();
  ctx.arc(cx + s * 0.55, cy - s * 0.6, size * 0.045, 0, Math.PI * 2);
  ctx.fill();

  const buffer = canvas.toBuffer("image/png");
  const outPath = path.join(OUT_DIR, `icon-${size}.png`);
  fs.writeFileSync(outPath, buffer);
  console.log(`✓ Generated ${outPath}`);
}

// Generate the iOS app icon — the "Pulse" tempo dial.
//
// Renders a 1024x1024 PNG from a hand-built SVG using the app's own colors and
// bundled fonts, so the icon matches the in-app tempo dial (see www/app.js /
// www/style.css). No network or native build: @resvg/resvg-js ships a prebuilt
// binary, and wawoff2 inflates our bundled woff2 fonts to TTF in-memory.
//
//   node tools/make-icon.mjs   (or: npm run icon)

import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { Resvg } from "@resvg/resvg-js";
import { decompress } from "wawoff2";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const FONT_DIR = join(ROOT, "www/assets/fonts");
const OUT_PNG = join(ROOT, "ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png");
const OUT_SVG = join(ROOT, "tools/icon.svg");

// ---- Brand tokens (mirrors :root in www/style.css) ----
const C = {
  paper: "#ECEAE3",
  ink: "#1C1B18",
  ink3: "#8E8B82",
  track: "rgba(28,27,24,0.20)", // --line-2
  accent: "#E6483B",
  accentDark: "#C5372C",
};

// ---- Canvas / dial geometry (same arc math as www/app.js, scaled up) ----
const SIZE = 1024;
const CX = SIZE / 2;
const CY = SIZE / 2;
const R = 340;            // dial radius (~13.5% margin to outer extent)
const A0 = -150;          // sweep start (bottom-left)
const A1 = 150;           // sweep end   (bottom-right); 300° with a gap at the bottom
const PROG_END = 60;      // knob angle: upper-right, a pleasing partial fill

function polar(angleDeg, r = R) {
  const t = (angleDeg * Math.PI) / 180;
  return [CX + r * Math.sin(t), CY - r * Math.cos(t)]; // 0° = top, clockwise
}
function arcPath(fromA, toA) {
  const [x0, y0] = polar(fromA);
  const [x1, y1] = polar(toA);
  const large = toA - fromA > 180 ? 1 : 0;
  return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${R} ${R} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
}

const [kx, ky] = polar(PROG_END); // knob position

// ---- Wordmark layout ----
const WORD = "PULSE";
const WORD_SIZE = 150;
const WORD_LS = -3;       // tight tracking, like the big BPM number
const WORD_Y = CY + 30;   // baseline; sits optically a touch above center
// The red knob is the single accent; the wordmark stays pure ink.

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
  <rect width="${SIZE}" height="${SIZE}" fill="${C.paper}"/>

  <!-- dial track (300° hairline) -->
  <path d="${arcPath(A0, A1)}" fill="none" stroke="${C.track}" stroke-width="14" stroke-linecap="round"/>
  <!-- progress arc (ink) -->
  <path d="${arcPath(A0, PROG_END)}" fill="none" stroke="${C.ink}" stroke-width="22" stroke-linecap="round"/>

  <!-- knob: soft shadow + red disc with cream ring -->
  <circle cx="${kx.toFixed(2)}" cy="${(ky + 7).toFixed(2)}" r="34" fill="rgba(120,40,30,0.28)"/>
  <circle cx="${kx.toFixed(2)}" cy="${ky.toFixed(2)}" r="32" fill="${C.accent}" stroke="${C.paper}" stroke-width="11"/>

  <!-- wordmark -->
  <text x="${CX}" y="${WORD_Y}" text-anchor="middle"
        font-family="Space Grotesk" font-weight="700" font-size="${WORD_SIZE}"
        letter-spacing="${WORD_LS}" fill="${C.ink}">${WORD}</text>

  <!-- BPM caption -->
  <text x="${CX}" y="${CY + 150}" text-anchor="middle"
        font-family="Space Mono" font-weight="700" font-size="44"
        letter-spacing="10" fill="${C.ink3}">BPM</text>
</svg>`;

async function ttf(file) {
  return Buffer.from(await decompress(await readFile(join(FONT_DIR, file))));
}

const fontBuffers = await Promise.all([
  ttf("SpaceGrotesk-700.woff2"),
  ttf("SpaceMono-700.woff2"),
]);

const resvg = new Resvg(svg, {
  fitTo: { mode: "width", value: SIZE },
  background: C.paper, // flatten so the PNG is fully opaque
  font: { fontBuffers, loadSystemFonts: false, defaultFontFamily: "Space Grotesk" },
});

const png = resvg.render().asPng();
await writeFile(OUT_PNG, png);
await writeFile(OUT_SVG, svg);
console.log(`Wrote ${OUT_PNG} (${png.length} bytes) and ${OUT_SVG}`);

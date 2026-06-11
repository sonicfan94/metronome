// Generate the iOS launch screen — the "Pulse" tempo dial centered on cream.
//
// Reuses the icon artwork (see tools/make-icon.mjs) so the splash matches the app
// icon and in-app dial, scaled and centered on a 2732x2732 cream canvas. Writes all
// three entries of Splash.imageset (1x/2x/3x), which the asset catalog expects.
//
//   node tools/make-splash.mjs   (or: npm run splash)

import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { Resvg } from "@resvg/resvg-js";
import { decompress } from "wawoff2";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const FONT_DIR = join(ROOT, "www/assets/fonts");
const SPLASH_DIR = join(ROOT, "ios/App/App/Assets.xcassets/Splash.imageset");
const OUT_FILES = ["splash-2732x2732.png", "splash-2732x2732-1.png", "splash-2732x2732-2.png"];

// ---- Brand tokens (mirrors :root in www/style.css) ----
const C = {
  paper: "#ECEAE3",
  ink: "#1C1B18",
  ink3: "#8E8B82",
  track: "rgba(28,27,24,0.20)",
  accent: "#E6483B",
};

// ---- Canvas ----
const SIZE = 2732;
const CX = SIZE / 2;
const CY = SIZE / 2;

// ---- Dial geometry (same arc math as the icon, scaled for the larger canvas) ----
const R = 560;            // dial radius
const A0 = -150;          // sweep start (bottom-left)
const A1 = 150;           // sweep end   (bottom-right); 300° with a gap at the bottom
const PROG_END = 60;      // knob angle

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

const [kx, ky] = polar(PROG_END);

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
  <rect width="${SIZE}" height="${SIZE}" fill="${C.paper}"/>

  <!-- dial track (300° hairline) -->
  <path d="${arcPath(A0, A1)}" fill="none" stroke="${C.track}" stroke-width="23" stroke-linecap="round"/>
  <!-- progress arc (ink) -->
  <path d="${arcPath(A0, PROG_END)}" fill="none" stroke="${C.ink}" stroke-width="36" stroke-linecap="round"/>

  <!-- knob: soft shadow + red disc with cream ring -->
  <circle cx="${kx.toFixed(2)}" cy="${(ky + 12).toFixed(2)}" r="56" fill="rgba(120,40,30,0.28)"/>
  <circle cx="${kx.toFixed(2)}" cy="${ky.toFixed(2)}" r="53" fill="${C.accent}" stroke="${C.paper}" stroke-width="18"/>

  <!-- wordmark -->
  <text x="${CX}" y="${CY + 50}" text-anchor="middle"
        font-family="Space Grotesk" font-weight="700" font-size="248"
        letter-spacing="-5" fill="${C.ink}">PULSE</text>

  <!-- BPM caption -->
  <text x="${CX}" y="${CY + 248}" text-anchor="middle"
        font-family="Space Mono" font-weight="700" font-size="72"
        letter-spacing="16" fill="${C.ink3}">BPM</text>
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
for (const f of OUT_FILES) await writeFile(join(SPLASH_DIR, f), png);
console.log(`Wrote ${OUT_FILES.length} splash PNGs to ${SPLASH_DIR} (${png.length} bytes each)`);

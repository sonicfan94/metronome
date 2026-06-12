// Generate the iOS launch screen — the "Pulse" tempo knob centered on cream.
//
// Reuses the shared knob artwork (tools/dial.mjs) so the splash matches the app
// icon, scaled and centered on a 2732x2732 cream canvas with the wordmark
// beneath. Writes all three entries of Splash.imageset (1x/2x/3x), which the
// asset catalog expects.
//
//   node tools/make-splash.mjs   (or: npm run splash)

import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { Resvg } from "@resvg/resvg-js";
import { decompress } from "wawoff2";
import { ART_SIZE, C, knobDefs, knobGroup } from "./dial.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const FONT_DIR = join(ROOT, "www/assets/fonts");
const SPLASH_DIR = join(ROOT, "ios/App/App/Assets.xcassets/Splash.imageset");
const OUT_FILES = ["splash-2732x2732.png", "splash-2732x2732-1.png", "splash-2732x2732-2.png"];

const INK3 = "#8E8B82";

// ---- Canvas / placement ----
const SIZE = 2732;
const CX = SIZE / 2;
const SCALE = 1.3;                       // knob well ≈ 1120px across, like the old dial
const KNOB_CY = CX - 130;                // knob sits a touch above center
const TX = CX - (ART_SIZE / 2) * SCALE;
const TY = KNOB_CY - (ART_SIZE / 2) * SCALE;
const WELL_BOTTOM = KNOB_CY + 432 * SCALE;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
  <defs>
    ${knobDefs()}
  </defs>

  <rect width="${SIZE}" height="${SIZE}" fill="url(#paper)"/>

  <g transform="translate(${TX} ${TY}) scale(${SCALE})">
    ${knobGroup()}
  </g>

  <!-- wordmark beneath the knob -->
  <text x="${CX}" y="${WELL_BOTTOM + 240}" text-anchor="middle"
        font-family="Space Grotesk" font-weight="700" font-size="200"
        letter-spacing="-4" fill="${C.ink}">PULSE</text>

  <!-- BPM caption -->
  <text x="${CX}" y="${WELL_BOTTOM + 390}" text-anchor="middle"
        font-family="Space Mono" font-weight="700" font-size="60"
        letter-spacing="14" fill="${INK3}">BPM</text>
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

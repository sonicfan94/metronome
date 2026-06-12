// Generate the iOS app icon — the "Pulse" machined tempo knob.
//
// Renders a 1024x1024 PNG from the shared knob artwork (tools/dial.mjs) using
// @resvg/resvg-js. The artwork is text-free, so no fonts are needed. The launch
// screen (make-splash.mjs) reuses the same artwork so the two stay in sync.
//
//   node tools/make-icon.mjs   (or: npm run icon)

import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { Resvg } from "@resvg/resvg-js";
import { ART_SIZE, C, knobDefs, knobGroup } from "./dial.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_PNG = join(ROOT, "ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png");
const OUT_SVG = join(ROOT, "tools/icon.svg");

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${ART_SIZE}" height="${ART_SIZE}" viewBox="0 0 ${ART_SIZE} ${ART_SIZE}">
  <defs>
    ${knobDefs()}
  </defs>

  <rect width="${ART_SIZE}" height="${ART_SIZE}" fill="url(#paper)"/>

  ${knobGroup()}
</svg>`;

const resvg = new Resvg(svg, {
  fitTo: { mode: "width", value: ART_SIZE },
  background: C.paper, // flatten so the PNG is fully opaque
  font: { loadSystemFonts: false },
});

const png = resvg.render().asPng();
await writeFile(OUT_PNG, png);
await writeFile(OUT_SVG, svg);
console.log(`Wrote ${OUT_PNG} (${png.length} bytes) and ${OUT_SVG}`);

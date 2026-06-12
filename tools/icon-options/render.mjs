// Render every option-*.svg in this folder to PNG (1024 full + 120 small
// preview, since an icon lives or dies at home-screen size), then write a
// contact-sheet.html for side-by-side comparison.
//
//   node tools/icon-options/render.mjs

import { readFile, writeFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { Resvg } from "@resvg/resvg-js";
import { decompress } from "wawoff2";

const HERE = dirname(fileURLToPath(import.meta.url));
const FONT_DIR = join(HERE, "../../www/assets/fonts");

async function ttf(file) {
  return Buffer.from(await decompress(await readFile(join(FONT_DIR, file))));
}

const fontBuffers = await Promise.all([
  ttf("SpaceGrotesk-500.woff2"),
  ttf("SpaceGrotesk-700.woff2"),
  ttf("SpaceMono-400.woff2"),
  ttf("SpaceMono-700.woff2"),
]);

const svgs = (await readdir(HERE)).filter((f) => f.startsWith("option-") && f.endsWith(".svg")).sort();

for (const file of svgs) {
  const svg = await readFile(join(HERE, file), "utf8");
  for (const size of [1024, 120]) {
    const resvg = new Resvg(svg, {
      fitTo: { mode: "width", value: size },
      background: "#ECEAE3",
      font: { fontBuffers, loadSystemFonts: false, defaultFontFamily: "Space Grotesk" },
    });
    const out = file.replace(".svg", size === 1024 ? ".png" : `-${size}.png`);
    await writeFile(join(HERE, out), resvg.render().asPng());
    console.log(`wrote ${out}`);
  }
}

const cells = svgs
  .map((f) => {
    const base = f.replace(".svg", "");
    return `<figure>
      <img class="big" src="${base}.png" alt="${base}">
      <div class="row"><img class="small" src="${base}-120.png"><img class="tiny" src="${base}-120.png"></div>
      <figcaption>${base}</figcaption>
    </figure>`;
  })
  .join("\n");

await writeFile(
  join(HERE, "contact-sheet.html"),
  `<!doctype html><meta charset="utf-8"><title>Pulse icon options</title>
<style>
  body{background:#444;font-family:-apple-system,sans-serif;color:#eee;display:flex;flex-wrap:wrap;gap:40px;padding:40px;justify-content:center}
  figure{margin:0;text-align:center}
  .big{width:300px;height:300px;border-radius:67px;display:block;box-shadow:0 10px 30px rgba(0,0,0,.4)}
  .row{display:flex;gap:16px;align-items:flex-end;justify-content:center;margin-top:16px}
  .small{width:120px;height:120px;border-radius:27px}
  .tiny{width:60px;height:60px;border-radius:13px}
  figcaption{margin-top:10px;font-size:14px;letter-spacing:1px}
</style>${cells}`
);
console.log("wrote contact-sheet.html");

// Renders an SVG file to a PNG at an exact size (used to build the home-screen icons).
// Usage: node tools/render-svg.mjs in.svg out.png width height [background|transparent]
import { chromium } from "playwright"; import fs from "node:fs";
const [svg, out, w, h, bg] = process.argv.slice(2);
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: +w, height: +h } });
await p.setContent(`<html><body style="margin:0;background:${bg && bg !== "transparent" ? bg : "transparent"}">${fs.readFileSync(svg, "utf8").replace("<svg ", `<svg width="${w}" height="${h}" style="display:block" `)}</body></html>`);
await p.screenshot({ path: out, omitBackground: !bg || bg === "transparent" }); await b.close();

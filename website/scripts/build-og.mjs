// Builds the social/OG banner from the same source of truth as the app icon:
// assets/logo.svg (hand-crafted flat vector).
//
//   node scripts/build-og.mjs
//
// Output:
//   website/public/og.png   1200x630 banner used by Open Graph / Twitter cards
//
// The banner is pure vector (no font dependency): the logo mark plus the
// wordmark drawn as paths, so it renders identically everywhere.
import { writeFile, mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";

const here = fileURLToPath(new URL(".", import.meta.url));
const repo = resolve(here, "..", "..");
const pub = join(repo, "website", "public");

const WIDTH = 1200;
const HEIGHT = 630;

// The mark from assets/logo.svg, inlined as vector paths so the banner needs
// no external file and no fonts.
const MARK = `
  <rect x="80" y="175" width="280" height="280" rx="66" fill="#16181D"/>
  <rect x="80" y="175" width="280" height="280" rx="66" fill="none" stroke="#2A2E38" stroke-width="2.4"/>
  <polyline points="163,252 236,315 163,378" fill="none" stroke="#5EEAD4" stroke-width="29" stroke-linecap="round" stroke-linejoin="round"/>
  <line x1="259" y1="378" x2="296" y2="378" stroke="#5EEAD4" stroke-width="29" stroke-linecap="round"/>
`;

// The wordmark is real text (system fonts are loaded below), so it stays
// crisp and readable instead of being hand-drawn paths.
const WORDMARK = `<text x="420" y="380" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="170" font-weight="700" fill="#FFFFFF" letter-spacing="-4">meero</text>`;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <rect width="${WIDTH}" height="${HEIGHT}" fill="#08090B"/>
  <rect x="40" y="40" width="${WIDTH - 80}" height="${HEIGHT - 80}" rx="28" fill="none" stroke="#1E222A" stroke-width="2"/>
  ${MARK}
  ${WORDMARK}
  <rect x="420" y="430" width="420" height="6" rx="3" fill="#5EEAD4"/>
  <text x="420" y="500" font-family="Consolas, Menlo, monospace" font-size="28" fill="#7C8595">plain English in, reviewed commands out</text>
</svg>`;

const resvg = new Resvg(svg, {
  fitTo: { mode: "width", value: WIDTH },
  background: "#08090B",
  font: { loadSystemFonts: true, defaultFontFamily: "monospace" },
});
const png = resvg.render().asPng();

await mkdir(pub, { recursive: true });
await writeFile(join(pub, "og.png"), png);
console.log(`wrote website/public/og.png (${WIDTH}x${HEIGHT}, ${png.length} bytes)`);

// Builds every app/website icon from the single source of truth:
// assets/logo.svg (hand-crafted flat vector).
//
//   node scripts/build-icons.mjs
//
// Outputs:
//   assets/meero.png            1024px app icon (deb / macOS pkg branding)
//   assets/meero.ico            multi-size Windows icon (exe + NSIS installer)
//   assets/icons/*.png          16/32/48/64/128/256/512/1024
//   website/public/favicon.ico  browser-tab icon
//   website/public/icon.png     512px PWA / touch icon
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, "..", "..");
const svgSrc = join(repo, "assets", "logo.svg");

const APP_SIZES = [16, 32, 48, 64, 128, 256, 512, 1024];

function renderPng(svg, size) {
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: size },
    background: "transparent",
  });
  return resvg.render().asPng();
}

/** PNG-compressed ICO entries (legal since Vista) — same scheme as make-ico.ps1 */
function buildIco(entries) {
  const total = 6 + 16 * entries.length;
  const bufs = [];
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(entries.length, 4);
  bufs.push(header);
  let offset = total;
  for (const { size, png } of entries) {
    const dir = Buffer.alloc(16);
    const dim = size >= 256 ? 0 : size; // 0 means 256
    dir.writeUInt8(dim, 0); // width
    dir.writeUInt8(dim, 1); // height
    dir.writeUInt8(0, 2); // palette colors
    dir.writeUInt8(0, 3); // reserved
    dir.writeUInt16LE(1, 4); // planes
    dir.writeUInt16LE(32, 6); // bpp
    dir.writeUInt32LE(png.length, 8);
    dir.writeUInt32LE(offset, 12);
    bufs.push(dir);
    offset += png.length;
  }
  for (const { png } of entries) bufs.push(Buffer.from(png));
  return Buffer.concat(bufs);
}

const svg = await readFile(svgSrc, "utf8");
const pngs = new Map();
for (const size of APP_SIZES) pngs.set(size, renderPng(svg, size));

const iconsDir = join(repo, "assets", "icons");
await mkdir(iconsDir, { recursive: true });
for (const [size, png] of pngs) await writeFile(join(iconsDir, `${size}.png`), png);

// app branding assets
await writeFile(join(repo, "assets", "meero.png"), pngs.get(1024));
const icoEntries = [16, 32, 48, 64, 128, 256].map((size) => ({
  size,
  png: pngs.get(size),
}));
const ico = buildIco(icoEntries);
await writeFile(join(repo, "assets", "meero.ico"), ico);

// website assets
const pub = join(repo, "website", "public");
await mkdir(pub, { recursive: true });
await writeFile(join(pub, "favicon.ico"), ico);
await writeFile(join(pub, "icon.png"), pngs.get(512));
await writeFile(join(pub, "apple-touch-icon.png"), renderPng(svg, 180));
await writeFile(join(pub, "logo.svg"), svg);

console.log(`wrote assets/meero.png, assets/meero.ico (${ico.length} bytes), assets/icons/*, website/public/{favicon.ico,icon.png,apple-touch-icon.png,logo.svg}`);

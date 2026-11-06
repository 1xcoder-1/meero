// CI-only (Windows runner): swap the embedded Bun icon + version metadata on a
// bun-compiled exe before it is zipped / fed to NSIS.
// Usage: bun scripts/patch-icon.mjs <exe> <ico> <version>
import { rcedit } from "rcedit";
import { resolve } from "path";

const [exe, icon, version] = process.argv.slice(2);
if (!exe || !icon || !version) {
  console.error("usage: bun scripts/patch-icon.mjs <exe> <ico> <version>");
  process.exit(2);
}

// rcedit requires absolute paths for the icon (and is safer with them for the exe too)
await rcedit(resolve(exe), {
  icon: resolve(icon),
  "file-version": version,
  "product-version": version,
  "version-string": {
    ProductName: "meero",
    FileDescription: "meero - natural language to shell commands",
    LegalCopyright: "Copyright (c) 2026 1xcoder",
    OriginalFilename: "meero.exe",
  },
});

console.log(`patched ${exe}: icon=${icon} version=${version}`);

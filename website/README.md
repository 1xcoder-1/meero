# meero website

The landing page and documentation site for meero, the CLI that turns plain
English into reviewed shell commands.

Next.js 16 (App Router, Turbopack), React 19, Tailwind CSS 4.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
```

## Build it

```bash
npm run build      # static export -> out/ (ready to host anywhere)
npm run lint       # eslint (app, components, lib, scripts)
```

`next.config.ts` sets `output: "export"`, so the build writes plain static
files into `out/`: `out/index.html`, `out/docs/*/index.html`, `out/og.png`,
`out/sitemap.xml`, `out/robots.txt`. Drop that folder on any static host
(Netlify, GitHub Pages, Cloudflare Pages, plain nginx) - no Node server needed.

To preview the built site locally:

```bash
npx serve out
```

## Layout

```
app/            routes: / (landing) and /docs/* (documentation)
  sitemap.ts    generated from the route list below
  robots.ts
components/     nav, footer, install box, code block, terminal mock, docs sidebar
lib/
  docs.ts       docs navigation + prev/next pager
  packs.ts      the 60 command packs (mirrors core/cli/builtin.ts in the CLI repo)
  site.ts       site URL, name and description - the single source of truth
scripts/
  build-icons.mjs   regenerates every app/website icon from assets/logo.svg
  build-og.mjs      regenerates the 1200x630 social banner
```

## Regenerating assets

The icons and the Open Graph banner are generated from the hand-crafted vector
at `../assets/logo.svg`:

```bash
npm run build:icons
npm run build:og
```

## Content rules

- Pack names, aliases and descriptions live in `lib/packs.ts` and mirror
  `core/cli/builtin.ts` in the CLI. Change both when a pack changes.
- The install commands in `components/install-box.tsx` and in the README must
  stay in sync - they download the right asset for the host architecture.
- Every docs page needs its own `title` and `description` in `metadata`.

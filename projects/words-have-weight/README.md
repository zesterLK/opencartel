# Words have weight

A one-screen typography playground. Type a word, choose a behaviour, and reach in to move the letters. The default heavy word rests on a thin line that bends beneath it.

## Run locally

Use Node.js 22.18 or newer and npm.

```sh
npm ci
npm run dev
```

Open `http://127.0.0.1:5174`. The dev server uses a strict port so it does not silently open a different one. No account, API key, external font service or server database is required.

```sh
npm run typecheck
npm test
npm run build
npm run preview
```

The build is written to `dist/`. Its default asset base is `./`, suitable for a standalone static folder. To build for a known route:

```sh
npm run build -- --base=/words-have-weight/
```

`OPEN_CARTEL_BASE` can also set the Vite base. A custom base does not itself deploy the project. Standalone builds keep their own source download at any base. The OpenCartel catalog's dev/build tooling explicitly sets `VITE_OPENCARTEL_COMPOSED=1` to enable its return link and shared source-archive endpoint; leave this unset when running the project independently.

## Play

- **heavy:** lift a letter and release its weight into the line.
- **stretch:** pull sideways to stretch the glyphs and their neighbours.
- **balance:** move the load sideways to tip the supporting line.
- **whisper:** move close to the letters or touch them to reveal a quiet ripple.
- **melt:** pull down to deform the lower outlines, then let them reform.
- **bounce:** tap or lift a letter to inject a spring impulse.

While the input is empty, each mode presents its matching word. A custom word updates while typing and stays in place when switching behaviours. The input accepts up to 16 grapheme clusters, so a combined emoji is counted as one character. Empty, control-character and overlength input leaves the last valid word visible with an explanation. Reset returns to the opening heavy word.

Tab to the canvas and use arrow keys to move the middle letter. Shift increases the distance. Space releases the letter or adds an impulse; Escape releases it. The controls and information dialog also work with the keyboard. Reduced-motion mode preserves direct movement and semantic shapes while removing spring oscillation. A browser-text fallback keeps unsupported scripts, emoji and font-load failures readable with simpler whole-word motion.

## Use it with your agent

Give your agent this complete folder and [INTEGRATE.md](INTEGRATE.md), then specify the destination and whether you want the full page, an embed or one behaviour. The guide contains an implementation map, fidelity requirements, integration checks and a ready-to-copy brief. Run an unchanged copy first; the guide alone is not a replacement for the source. The same guide can be copied or downloaded directly in Help.

## Reuse the implementation

`src/geometry.ts` contains bounded spring stepping, contact-curve interpolation, input validation and letter-order constraints. `src/main.ts` loads the font once, caches outlines and maps pointer/keyboard interaction to the six behaviours. `src/style.css` and `index.html` own the small interface; `src/ui.css` and the cursor files keep its controls self-contained.

The renderer uses SVG paths from opentype.js. Each glyph is positioned using its ink bounds, so descenders rest against the contact line. The physics is a small spring model; this is expressive typography, not a general collision or soft-body simulation. Melt is a bounded deformation of Bézier control points. Complex-script shaping and emoji are intentionally delegated to browser text rather than split into incorrect glyphs.

`npm run source` creates `public/words-have-weight-source.zip`, including source, tests, setup files, fonts, licenses and `INTEGRATE.md`. It also creates `public/integrate.md` for the direct guide download. `predev` and `prebuild` run it automatically. Download source is available beside Help in the header. Generated files are rebuilt from their canonical source.

Each ZIP contains a deterministic `SOURCE-MANIFEST.json` with the SHA-256 and byte count of its source files. After extracting and running `npm ci`, use `node scripts/source-archive.mjs --verify` before editing to check that snapshot. The generated manifest is present in a download, not required in a repository copy. Dependencies and build output are intentionally omitted; `npm ci` and `npm run build` recreate them. A previously downloaded ZIP stays at its captured revision.

## Checks and limits

Verified locally on 18 October 2026: TypeScript checking, production build and nine geometry tests passed. Those tests cover spring settling/coupling, heavy-curve anchors, contact interpolation, ink-width separation, Unicode validation, bounded frame catch-up and comparable simulation at 60/120/144 Hz.

Twelve Chrome runtime scenario groups also passed: all six behaviours, custom text/reset, invalid input, Hindi/emoji fallback, real mouse drags, keyboard controls, native dialog focus, reduced-motion changes, responsive sizes from 320 × 568 to 1440 × 900, emulated touch/cancellation, and deliberately failed font requests. Heavy, held balance and held melt were visually reviewed. These local checks do not establish Safari/Firefox compatibility, physical-device touch support or public deployment. The catalog metadata's `ready` status means locally complete; the public demo URL remains unset.

Original code is MIT licensed. The bundled Archivo Black and Chakra Petch fonts are separately licensed under the SIL Open Font License. See [ATTRIBUTION.md](ATTRIBUTION.md) and [LICENSE](LICENSE).

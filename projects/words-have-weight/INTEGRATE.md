# Integrate Words Have Weight

This is the source of the OpenCartel typography playground: six behaviours driven by real font outlines, pointer input and a bounded spring simulation. Use the included implementation as the starting point. This guide is also available to copy or download from the running project's Help dialog.

## Establish the original first

Use Node.js 22.18 or newer and npm. Work in this project's folder, with `VITE_OPENCARTEL_COMPOSED` unset:

```sh
npm ci
node scripts/source-archive.mjs --verify
npm run dev
```

Open `http://127.0.0.1:5174/`. The verification command applies to a downloaded ZIP containing `SOURCE-MANIFEST.json`; a repository copy has no generated manifest and can skip it. It checks the original source bytes before edits. Keep an unchanged reference copy beside your integration work.

```sh
npm run typecheck
npm test
npm run build
npm run preview
```

Stop the development server before using preview on the same port. `dist/` is the standalone static output. No account, API key, external font service or other OpenCartel folder is required.

## Choose the integration scope

| Scope | Approach | Preserve |
| --- | --- | --- |
| Complete experience | Keep this project intact as a static page or route. Build for its actual asset base. | Existing HTML, styles, source and fonts. |
| Isolated embed | Serve the built page and embed it in an iframe with a meaningful title and sufficient height. | Full interaction and internal layout; test focus entry/exit and small screens. |
| Component in an existing app | Adapt the existing controller into a mount/dispose function scoped to one container. | Renderer, geometry, font metrics, accessibility and event semantics. |
| One named effect | Keep the relevant mode and its dependencies, then deliberately remove unrelated controls. | That mode's actual geometry and interaction, not an approximate replacement. |

The project does not export a React/Vue component or a ready-made mount API. `src/main.ts` currently initializes one page on import, queries document-level IDs, and installs listeners and a `ResizeObserver`. Importing it directly into a repeatedly mounted component will not provide proper cleanup. Refactor that boundary first; keep the simulation and renderer intact.

## Source map

| File | Responsibility |
| --- | --- |
| `index.html` | Stage SVG, required IDs, input, six mode controls, reset, header and Help dialog. |
| `src/main.ts` | Loads/parses the font, caches glyph outlines, sizes the stage, renders SVG, handles input/drag/keyboard, selects modes and schedules animation. |
| `src/geometry.ts` | `MODES`, `SPRINGS`, bounded stepping, contact curves, order constraints, grapheme validation and frame subdivision. |
| `src/style.css` | Experience composition, canvas, form, responsive controls and Help styling. |
| `src/ui.css` | Raised controls and the static pressed title surface. |
| `src/cursor.js`, `src/cursor.css` | Optional fine-pointer cursor, native text/touch fallback and modal handling. `mountCursor()` returns cleanup. |
| `src/motion.js`, `src/motion.css` | Reduced-motion-aware page fades and native-dialog transitions. `mountPageMotion()` returns cleanup; `openDialog()` and `closeDialog()` animate native dialogs. |
| `public/fonts/` | Archivo Black outline font, Chakra Petch interface font and both OFL notices. |
| `tests/geometry.test.ts` | Simulation and input invariants; run with `npm test`. |
| `scripts/source-archive.mjs` | Creates the standalone source ZIP, direct guide copy and source manifest; also verifies a downloaded manifest. |

Keep any additional imported helpers beside their source; inspect the actual import graph before extracting files. `package.json` and `package-lock.json` define the exact independent install. Runtime font parsing uses `opentype.js`; do not omit it when embedding.

## Preserve the signature behaviour

- **Font and geometry:** `prepareWord()` derives ink bounds from Archivo Black. The renderer uses those bounds and glyph advances for scale, contact and spacing. Replacing the font changes the actual geometry, not just appearance.
- **Physics:** retain `SPRINGS`, `stepNodes()`, `frameSteps()`, `curveY()`, `contactPath()` and `keepLetterOrder()` unless changing the effect deliberately. Preserve bounded elapsed time, pointer capture/release, letter ordering and velocity handling.
- **Modes:** heavy bends the support line; stretch deforms glyphs sideways; balance tips the supporting line; whisper responds to proximity/touch; melt deforms lower outlines; bounce injects spring impulses. These are distinct behaviours, not six presets of one CSS animation.
- **Input:** retain grapheme-aware validation, composition events and browser-text fallback for complex scripts, emoji and unavailable fonts. The supported limit is 16 grapheme clusters. Invalid input keeps the last valid word.
- **Access:** keep keyboard stage controls, visible keyboard focus, mode `aria-pressed` state, useful labels/live announcements, native dialog focus handling and reduced-motion behaviour.
- **Layout:** preserve responsive stage sizing, pointer-coordinate conversion and enough visible space around the word. A cramped container can change the experience even when the equations are identical.

`src/main.ts` owns its SVG node references and frame loop. In an embedded component, scope selectors to its root and give multiple instances unique IDs. Mount only after the DOM exists; do not execute browser APIs during server rendering. On teardown, cancel animation frames, release captures, disconnect the resize observer, remove input/document/media-query listeners and dispose the cursor and any page-level helpers. Do not install a second global cursor over the destination app's existing one.

For a component inside a host router, omit the page-wide `mountPageMotion()` and body fade styles, or dispose them before handing navigation back to that router. They intercept same-origin page links and are intended for this standalone page. Keep native modal focus/escape behaviour when adapting `openDialog()` and `closeDialog()`; do not replace the dialog with an inaccessible visual overlay.

## Assets, routes and styling

The default Vite base is `./`. For a dedicated subdirectory:

```sh
npm run build -- --base=/experiments/words-have-weight/
```

Asset URLs must follow the chosen base, including the font fetch and download links. `OPEN_CARTEL_BASE` can supply the base instead. Leave `VITE_OPENCARTEL_COMPOSED` unset outside the collection; that flag specifically enables OpenCartel's return link and shared ZIP endpoint.

When embedding into another framework, retain its package manager and add the needed runtime dependencies there. Keep the original project as your reference; do not replace the destination app's package file or lockfile wholesale. Scope global selectors from the CSS and make modal/cursor ownership explicit. Use the existing DOM structure as a contract while adapting the shell.

All fonts are local. Keep `LICENSE`, `ATTRIBUTION.md`, `public/fonts/OFL.txt` and `public/fonts/ChakraPetch-OFL.txt` with redistributed source/assets. Original code is MIT licensed; bundled fonts retain their separate OFL terms. Changing branding does not remove these notices.

## Verify the adapted result

1. Run type checking, the geometry tests and the production build.
2. Compare the default heavy scene with the original: font shape, word scale, ink contact, line sag and spacing.
3. Exercise all retained modes, real drag/release, custom words, mode switching and Reset. Check keyboard arrows/Shift/Space/Escape, tab order and Help focus return.
4. Check a phone-width view and desktop, including a short viewport. Verify no clipped controls or horizontal overflow.
5. Enable reduced motion; try Hindi/emoji and a failed font request. Confirm meaningful fallback rather than missing text.
6. Load the production route directly and reload it. Verify fonts, scripts, source/guide downloads and links under its final base path.
7. If embedding, mount/unmount more than once and check that listeners, cursor elements and animation loops do not accumulate.

The spring model is expressive typography, not a general collision or soft-body engine. Browser text deliberately uses simpler whole-word motion. Record intentional differences and any browsers/devices you did not verify.

## Copy this to your agent

```text
Integrate the attached Words Have Weight source into [repository/page].
Scope: [complete page / iframe / embedded component / named mode].
Requested changes: [list only intentional changes].

Read README.md, INTEGRATE.md, ATTRIBUTION.md and LICENSE. Run the original
unchanged with its lockfile, and inspect its six behaviours in the browser.
Use that working version as the fidelity reference.

Reuse src/geometry.ts and the existing SVG/font renderer in src/main.ts.
Preserve Archivo Black metrics, spring values, letter constraints, drag and
keyboard handling, input validation, fallbacks and reduced motion. Do not
replace the effect with CSS keyframes or a newly approximated simulation.

Inspect the destination before editing. Preserve unrelated files, package
conventions and license notices. If embedding, scope DOM/CSS, use a client
mount/dispose boundary, and clean up listeners, observers, cursors and frames.
Keep asset URLs valid at the intended base path.

Run the documented checks and compare original versus integrated desktop,
mobile, pointer, keyboard and reduced-motion states. Report deliberate
changes, files changed, checks performed and remaining limitations.
```

# Integrate Paper Shredder

Paper Shredder is a standalone Three.js page controller. Run the original and inspect ready, half-fed, released and settled states before changing it. There is no packaged React component or public mount API.

## Run the reference

Use Node.js 22.18+ and npm:

```sh
npm ci
npm run dev
npm run typecheck
npm test
npm run build
```

Keep `package-lock.json`. Serve the app with Vite or a static HTTP server; loading `index.html` directly from a file URL does not run the modules.

## Source map

| File | Responsibility |
| --- | --- |
| `index.html` | Masthead, machine target, speed/view controls, bin meter, file picker, waiting queue, note, Help and Guide dialogs. |
| `src/main.ts` | Scene loading, camera transitions, queue/lifecycle coordination, file intake, controls, errors and cleanup. |
| `src/document-source.ts` | Local PDF/image/text decoding, honest unsupported-format covers, lazy page canvases and source disposal. |
| `src/office-interactions.ts` | Named camera poses, projected accessible hotspots, six fictional notes, drawer, lamp, monitor and clock. |
| `src/paper.ts` | A4 dimensions, feed conservation, phase timing, arc-length hanging curves, bounded fixed-step Verlet solver. No renderer dependency. |
| `src/paper-renderer.ts` | Example or supplied CanvasTexture, clipped input sheet, eighteen UV-sliced ribbons, and fixed-size `BinArchive` instance pool. |
| `src/style.css` | Page layout, responsive framing, machine focus ring and modal styling. |
| `src/ui.css`, `src/cursor.*`, `src/motion.*`, `src/markdown-panel.*` | Deliberate standalone copies of the OpenCartel collection controls and document panels. |
| `public/office.glb` | Original illustrated room geometry, materials and named machine anchors. |
| `public/poster.webp` | Original runtime still used behind loading and recovery messages. |
| `public/fonts/` | Chakra Petch Regular and its full OFL license. |
| `scripts/source-archive.mjs` | Standalone source archive and manifest verification. |
| `tests/paper.test.ts` | Conservation, release boundaries, length, containment and phase/time checks. |
| `tests/document-source.test.ts` | Text pagination, Unicode preservation, covers, cancellation, invalid input and canvas/bitmap ownership checks. |
| `package.json`, `package-lock.json` | Project-local pinned runtime dependencies and reproducible dependency resolutions, including PDF.js assets. |
| `public/licenses/THIRD-PARTY-NOTICES.txt` | Three.js, interface font, PDF.js and the bundled PDF font/CMap/decoder licenses. |

`INTEGRATE.md` is canonical. `npm run source` generates the `public/integrate.md` served by Guide; do not edit that duplicate.

## Model contract

The runtime uses glTF metres and Y-up. Positive Z faces the viewer. The model contains these exact object names:

- `Shredder`: the machine's parent, moved only for subtle motor vibration.
- `ShredButton`: the pressable mesh; runtime keeps its original transform and applies a brief downward travel.
- `PaperInlet`: world point at the top feed slot.
- `StripOutlet`: world point at the underside of the enclosed head, directly below the inlet.
- `BinLanding`: the lowest paper-contact point in the bin (`BinFloor` is an accepted alternative).
- `BinWindow`: lightly tinted front pane. Transparent materials do not write depth or cast shadows.

Anchors are read from the GLB, not assumed from camera coordinates. Head transport length is the inlet/outlet Y difference. Paper width is 0.210 m and length 0.297 m, split into eighteen ribbons. If replacing the machine, preserve slot clearance, front-pane clearance, bin bounds and accessible button projection. No primitive machine fallback is supplied; a missing or incompatible GLB produces a recoverable loading error.

The office controls additionally look up `DeskLamp`, `LampDiffuser`, `DeskDrawer`, `Monitor`, `MonitorScreen`, `ClockSecond`, and `PinnedNote1` through `PinnedNote6`. Missing optional objects omit their corresponding control or animation. Preserve these names when replacing furnishings. The monitor is a generated local canvas texture and does not connect to mail or other services.

## Local document contract

`createDocumentSource(file, signal?)` returns a source with `displayName`, `totalPages`, `kind`, `renderPage(index, signal?)` and `dispose()`. Page indexes are zero-based. Render sequentially; each result contains a fresh `{ canvas, label }` with an opaque 768 × 1086 A4 canvas. Pass that canvas as the fourth argument to `new PaperPage(anchors, pageNumber, layer, canvas)`. The incoming page and its ribbons sample this same texture. Returned canvases belong to the caller and remain valid after the source is disposed.

| Input | Rendering behavior |
| --- | --- |
| PDF | PDF.js 6.4.299 reads local bytes and obtains individual pages lazily. Portrait or landscape content is fitted to A4 without cropping. Locked and invalid PDFs report an error; no password prompt is provided. |
| PNG/JPEG/WebP/GIF | Browser `createImageBitmap` decodes the local Blob, including only the first frame of animated images. The image is fitted to A4 without cropping. |
| UTF-8 `.txt`/`.md`/`.csv` | Literal text is wrapped by measured graphemes and paginated. Blank lines are retained; tabs become four spaces. Invalid UTF-8 and binary content report errors. |
| Other formats | One clearly labelled cover sheet with filename and size. No claim is made to render its contents. |

The picker label “Upload file” does not describe a network upload: source bytes remain in browser memory and the original is never changed or deleted. There is no persistence or server document endpoint. PDF.js and its official worker are project dependencies; Vite emits the worker, Adobe CMaps, standard fonts, and JPEG2000/JBIG2 decoders under the build's asset base. A bundled-resource whitelist supplies those assets. No document-provided URL, external font endpoint or CDN is used, and no PDF viewer scripting or XFA layer is instantiated. Preserve this local-only behavior when adapting the UI.

PDF pages have no arbitrary page-count limit and are not pre-rendered into an array of canvases. Each queued PDF still keeps its parser/source data until consumed or cleared, text keeps its paginated strings, and an image source keeps one normalized canvas. This bounds page-rendering work rather than guaranteeing constant total memory for unlimited queued files. Dispose sources after their last page, when clearing the waiting queue, and on teardown; dispose the corresponding `PaperPage` textures separately.

## Motion and state

The lifecycle is ready → pressing → feeding → settling → complete. A waiting queue stores example-sheet counts or document sources with the next page index. **+ Sheet**, **+ 5**, and local files can be added during a run. In normal motion mode, the next queued page enters a short loading-sheet stage and starts automatically. Clearing the waiting queue releases its sources while preserving the current sheet. The first selected file replaces the untouched introductory example so its contents appear immediately.

Speed choices are 0.5×, 1×, 2× and 3×. They scale transport, loading and physics time; the solver still uses fixed steps. The bin count records completed sheets. Its fill meter clamps at a 28-sheet visual estimate and does not gate the queue. Empty bin clears completed material when idle or records a request to clear it after the current sheet finishes.

After completion, six recent pages retain their actual textures and ribbon geometry; one additional active page may be present during the next cycle. Older pages are disposed and represented by `BinArchive`, a fixed allocation of 360 simple ribbon instances. Archive height is capped at 0.22 m. This is a compressed illustrative pile, not stored document content or a replay of older simulations. There is no three-page loading cap.

The incoming sheet consumes its lower edge at the selected feed speed. Stock inside the guarded head is included in the budget, so no strips emerge before the leading edge reaches the outlet. Both input and output use the same page texture and material coordinates. Hanging strip centre-lines have the emerged length; only fully released ribbons switch to a 120 Hz constrained Verlet solver. The solver includes varied release drift, intrinsic curl, bin-floor/wall contacts, and approximate non-neighbour point contacts within each ribbon. It does not model full ribbon-surface collision, contact between separate strips, or calibrated paper material properties.

Tab visibility, explicit pause and open dialogs suspend paper motion. Long frames are capped rather than fast-forwarding. Rendering sleeps between changes; the clock wakes it once per second while the visible tab permits ordinary motion. `prefers-reduced-motion` disables parallax/vibration and camera easing, changes room controls directly, and uses two deliberate static machine-button stages, solving the final pile without showing intermediate motion. Queued pages wait for deliberate activation in this mode.

## Exploring the office

The **Look around** selector uses named `room`, `desk`, `notes`, `drawer` and `window` poses, with separate narrow-screen positions. These are authored camera views rather than free orbit controls. Starting a shred selects `room`. Projected native buttons make the scene hotspots reachable by keyboard and touch: lamp toggles warm/moonlit lighting, monitor toggles a fictional message, drawer opens/closes, and pinned notes open a readable dialog. Keep native focus, labels and reduced-motion behavior when changing the overlays or camera framing.

## Supported reuse scopes

1. **Whole standalone page:** copy the complete project, install independently, keep the guide and licenses. This is the smallest integration change.
2. **A route in a static site:** build with the destination base and serve its directory index. Do not rewrite unknown assets to the app. `VITE_OPENCARTEL_COMPOSED=1` is optional collection navigation, not a requirement for arbitrary subpaths.
3. **An embedded scene:** extract an explicit mount function first. Replace document-global selectors with a container, scope all dialogs/styles, let the host router own navigation, and return cleanup. Do not import `main.ts` into a component and assume unmounting will be safe.

For a framework wrapper, mount exactly one renderer and one animation loop. Keep user state out of a per-frame render cycle. Dispose meshes, geometries, materials, textures, archive instances, document sources/workers, office hotspot buttons/timer, observers, abort controllers, source panels, pointer helpers and event listeners on unmount. The current page has teardown paths for HMR disposal and non-persisted page exit. Keep native focus and button semantics when replacing its HTML.

## Deliberate customization points

- Change the example print design in `pageTexture()`; retain the supplied-canvas path and one texture per page for correct UV continuity.
- Tune named camera poses in `src/office-interactions.ts` and lighting in `main.ts` after replacing room assets. Check the entire machine, top page and bin on both landscape and portrait screens.
- Tune feed timing and solver constants in `paper.ts`. Keep conservation tests and valid model clearance.
- Change page furniture and materials in the GLB while preserving anchors and attribution.
- Customize toolbar copy/layout without removing physical-button keyboard access, local-file disclosure, queue controls, deferred emptying, retry or reduced-motion behavior.

Audio, free-orbit controls, persistence and export of simulated paper are not present. A server upload or document service would change the current privacy contract and requires an explicit redesign of that behavior and its disclosure.

## Verification after integration

The local implementation was checked on 20 October 2026 with 17 automated tests, typechecking, production bundling, desktop and narrow browser views, actual local-file previews and a 34-sheet queue. Rendered stills received independent visual review. Repeat the following checks in the destination; local desktop verification does not establish actual mobile-device or Safari support.

Compare ready, half-cut and settled frames and full-speed playback. Test machine raycast and keyboard activation; every speed; pause/resume; stock and multi-file queue order; adding during a run; clearing waiting pages; emptying during a cycle; continued shredding beyond 28 sheets; and the transition from recent pages to the archive pool. Check each named view, hotspot, note dialog, lamp, drawer and monitor on desktop and touch layouts, plus reduced motion, hidden-tab resume, graphics/context recovery and failed model loading/retry.

Use multi-page PDFs, portrait/landscape images, animated images, long Unicode text, unsupported files, malformed input and locked PDFs. Confirm that input imagery remains continuous from the incoming sheet to its strips, error feedback is readable, cancelling/clearing releases resources, and selected file contents produce no outgoing network request. Inspect PDF worker/font/CMap/decoder loading under standalone and composed asset bases. Test Guide/copy/notices, source download, direct route loading, reload and real 404s. Inspect CPU/GPU and memory behavior on actual target devices; desktop build success does not prove mobile hardware performance.

After extracting a download, run `npm ci`, `node scripts/source-archive.mjs --verify` and `npm run build`. The sorted SHA-256 manifest describes all included source files except itself. It excludes generated guide/ZIP output and installed dependencies.

## Copyable agent brief

```text
Integrate Paper Shredder into [DESTINATION] with scope [WHOLE PAGE / STATIC ROUTE / EMBEDDED SCENE].
First run this original project unchanged and inspect ready, halfway-fed and settled states.
Preserve the illustrated room, physical amber button, A4 conservation, shared texture slices,
local-only document previews, honest cover-sheet fallback, queue/speed/bin controls,
bounded recent-page/archive rendering, office hotspots, keyboard/touch access,
reduced-motion steps and recoverable loading errors.
Use the actual source map and model anchor names in INTEGRATE.md. Explain any framework
lifecycle adaptation before changing it. Keep all bundled licenses and asset attribution.
Verify the destination route, asset base, cleanup and interactions against the original.
Do not add server uploads, external document services, audio or persistence without a separate request.
```

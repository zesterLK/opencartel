# Paper Shredder

A small interactive office after hours. Feed example sheets or local documents through a charcoal shredder and watch their printed contents become eighteen ribbons. Look around the room, read the pinned notes, open the drawer, wake the monitor, or turn off the desk lamp.

## Run

Requires Node.js **22.18 or later** and npm. Each project installs independently.

```sh
npm ci
npm run dev
```

Open the localhost URL printed by Vite (default port 5175). There are no environment variables or external services to configure.

```sh
npm run typecheck
npm test
npm run build
npm run preview
```

The standalone build uses a relative asset base. To compose this page at a subdirectory:

```sh
VITE_OPENCARTEL_COMPOSED=1 npm run build -- --base=/paper-shredder/
```

That flag adds a Home link to `/` and uses the collection download route. Without it, the page is independent and downloads its own source ZIP. A different asset base alone does not enable collection navigation.

## Interaction

- Click or tap the amber machine button. Keyboard users can Tab to it, then press Enter or Space.
- Add example paper with **+ Sheet** or **+ 5**, or choose local files with **Upload file**. More sheets can join the waiting queue during a run; queued pages advance automatically in normal motion mode.
- Choose **0.5×, 1×, 2× or 3×** speed. Pause and Resume stop or continue the cycle. Queue shows the remaining pages; clearing it leaves the current sheet in place.
- Finished paper stays in the bin. The fill indicator reaches full at an illustrative 28-sheet estimate and does not prevent further shredding. Empty bin clears it immediately when idle or after the current sheet finishes.
- Use **Look around** for the shredder, desk and lamp, pinned notes, top drawer, or moonlit window. Keyboard-accessible + markers operate the lamp, monitor, drawer and notes. Starting a shred returns the view to the machine.
- Reduced motion uses two static, button-controlled stages: halfway through and settled. Each queued sheet waits for activation; views and room controls change directly without camera easing, parallax or vibration.
- Paper motion pauses while the tab is hidden or a dialog is open. A loading or graphics failure provides a retry action.

## Local files

The file dialog is a browser file picker. Selected file data is never uploaded, saved by the app, modified or deleted. The animation only shreds an in-memory visual copy. Reloading clears the queue and bin; this is not secure document destruction.

| Selected file | Paper preview |
| --- | --- |
| Unlocked PDF | Actual PDF pages, rendered one at a time with the bundled PDF.js worker. |
| PNG, JPEG, WebP or GIF | One image fitted to A4; animated images use their first frame. |
| UTF-8 `.txt`, `.md` or `.csv` | Readable, paginated plain text. Markdown and CSV syntax remain literal text. |
| Other formats | A labelled cover sheet with filename and size; the contents are not rendered. |

Password-protected or unreadable supported files report an error. File previews use opaque 768 × 1086 A4 canvases. PDF/image proportions are preserved rather than cropped. PDF assets, fonts and decoders are served from the same built project; no document service or external font/CDN endpoint is used. Queued documents still consume browser memory, so practical capacity depends on the device and selected files.

## Implementation and reuse

The page uses Three.js, a Blender-authored GLB, PDF.js and project-local TypeScript. Paper length is accounted for above, inside and below the cutting head; output UVs sample the same artwork as the incoming sheet. Released ribbons use a bounded Verlet solver. Six recently completed sheets retain their textures and ribbon geometry; older sheets are replaced by a fixed pool of up to 360 representative ribbon instances. The pool does not retain archived document imagery. This is an illustrative simulation with approximate contact, not full ribbon-to-ribbon collision or calibrated paper physics. See [INTEGRATE.md](INTEGRATE.md) for source entry points, model anchors and a copyable integration brief.

The room requires WebGL 2 and a current browser with the document-decoding APIs used by the project. It uses named camera views with small mouse parallax; there are no free-orbit controls. Narrow screens have separate camera positions and crop some perimeter furnishing. Rendering stops between changes, with a once-per-second wake for the clock when ordinary motion is enabled. There is no audio, account system or saved-document store.

## Source snapshot

`npm run source` generates `public/integrate.md` from the canonical guide and a standalone ZIP. The same preparation runs before dev and build. The ZIP includes source, required assets, lockfile, documentation, licenses and a sorted SHA-256 `SOURCE-MANIFEST.json`; it excludes dependencies, built output and generated archives. After extracting and installing:

```sh
node scripts/source-archive.mjs --verify
npm run build
```

The manifest identifies source bytes, not a signature or a release. Local verification on 20 October 2026 covered 17 automated tests, typechecking, production bundling, desktop and 390 × 844 browser layouts, reduced-motion steps, actual PDF/image/text/cover previews, a locked-PDF error, and a 34-sheet run beyond the fill estimate. An independent visual review inspected the rendered office and dialogs. Actual iOS/Android hardware and Safari were not tested; the browser checks do not establish performance on those devices. No public deployment is included.

## License

Original code and original room artwork are MIT licensed; keep the included [LICENSE](LICENSE). Chakra Petch and PDF.js's bundled resources have their own licenses. Keep the full third-party notices and see [ATTRIBUTION.md](ATTRIBUTION.md) for authors, sources and redistribution details.

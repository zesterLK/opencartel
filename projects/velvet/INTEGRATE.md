# Integrate Velvet

Velvet is a standalone, full-screen JavaScript/WebGL material experiment. It renders burgundy short-pile fabric whose nap can be brushed and relit. Run this original before adapting it so you can compare appearance and interaction against a working baseline.

## Run the original

Use Node.js 22.18 or later and npm. From the extracted project folder:

```sh
npm ci
node scripts/source-archive.mjs --verify
npm test
npm run dev
```

The manifest verification command applies to downloaded archives that contain `SOURCE-MANIFEST.json`; a repository checkout does not contain this generated snapshot. Vite prints the development address, using localhost port 5176 by default. `npm run build` builds `dist/` and `npm run preview` serves that result locally. Do not open `dist/index.html` directly as a file.

There is no backend or required environment variable. `vite.config.js` defaults to a portable `./` asset base. A custom base can be passed with `npm run build -- --base=/your-path/`. `VITE_OPENCARTEL_COMPOSED=1` is used only by the collection build to show Home and use `/downloads/velvet.zip`; a different base does not itself imply collection mode.

WebGL2 and hardware acceleration are required for the interactive material. The application shell catches startup failure and leaves Help, Guide, source download and retry available.

## Implementation map

- `index.html`: accessible canvas, peripheral controls, Light disclosure, Help and Guide dialogs, fallback and live status region.
- `src/main.js`: application setup, renderer controls, source and guide paths, dialogs, fallback/retry and development cleanup.
- `src/velvet.js`: Three.js renderer, procedural material/shaders, input handling, responsive drawing, light and smoothing controls, resource disposal.
- `src/nap-field.js`: the CPU-side signed direction field updated by strokes and sampled by the material. The renderer instantiates a 640 × 640 field and uploads it as an RGBA byte texture.
- `src/style.css`: full-screen composition, burgundy control treatment, responsive layout, visible focus and reduced-motion styling.
- `src/ui.css`, `cursor.js/css`, `motion.js/css`, `markdown-panel.js/css`: project-owned copies of the collection interface helpers. They do not import from the catalog.
- `public/fonts/`: Chakra Petch and its SIL Open Font License.
- `public/licenses/THIRD-PARTY-NOTICES.txt`: full runtime notices displayed through Help.
- `scripts/source-archive.mjs`: prepares the standalone ZIP, served guide and deterministic SHA-256 source manifest; `--verify` checks a downloaded snapshot.
- `tests/`: direction-field checks.

`INTEGRATE.md` is canonical. The source script generates `public/integrate.md` from it; do not edit the generated copy. The shaders and fabric texture are code, not external image or Blender assets.

## Choose the scope

### Use the whole experience

Keep this project independent, build it, and serve its `dist/` directory. Preserve the source archive, attribution, font notice, keyboard support, dialogs and fallback. If placing the page in an iframe, provide a descriptive iframe title and sufficient room for its controls.

### Embed only the material

The renderer exports:

```js
const velvet = mountVelvet(canvas, { onStatus: message => announce(message) });
velvet.setLight(135);
velvet.setBrushSize(72);
velvet.smooth();
// When unmounting:
velvet.destroy();
```

`mountVelvet` is exported by `src/velvet.js`. Keep `src/nap-field.js`, Three.js and the renderer's shader code together. The canvas must have a measurable CSS size, a focus target and useful accessible instructions. `onStatus` is for meaningful accessible updates, not pointer coordinates or every animation frame. The returned `metrics()` method supplies renderer diagnostics. Its `cpuSubmitP95Ms` measures CPU time around render submission, not completed GPU time or frames per second; it is not a device-independent performance guarantee.

A framework adapter must mount after the canvas exists and destroy on unmount, including route changes or repeated development mounts. Scope page styles to the host container instead of copying the global fixed-position layout unchanged. Let the host own navigation and omit `mountPageMotion()` when it has its own router. Keep native page scrolling outside the drawing surface; the canvas owns direct brush gestures.

### Extract the brush field

Inspect `src/nap-field.js` and its tests. Preserve continuous stroke interpolation, signed direction handling, reverse strokes, edge behavior, reset and any field-to-texture conversion. Stroke target directions have unit length, but stored vectors are deliberately not normalized during blending: opposing strokes pass through upright pile rather than snapping through 180 degrees. Adapting the direction-field representation requires corresponding changes in the shader; the map is not a conventional colour painting buffer.

## Preserve the material

The initial curved gesture is authored into the field once at mount. It is static, and Smooth removes it without returning it. The renderer draws on demand after a brush, light change, resize, focus indication or graphics recovery; it does not run an idle animation loop. Rendering is capped at a device-pixel ratio of 1.65 and approximately 3 million drawing-buffer pixels. These caps bound work but do not prove a frame rate on every GPU.

Keep the short, dense pile, dark burgundy base, fine surface grain and broad directional sheen. A stroke should look like fibres laid in a new direction. Changing the light should reinterpret the same stroke, rather than recolour a painted mark. Opposing strokes should respond differently and crossed strokes should remain part of one continuous surface.

Deliberate customization points are the material palette, light direction, brush size and input-to-field mapping. Start with one change at a time. Enlarging the fibres, adding deep troughs or displacing the surface into fabric folds changes this experiment's visual identity. Rendering resolution and field size affect texture stability and performance; measure the intended device before increasing them.

## Verify the integration

Compare the unchanged original and your integration at the same viewport and light angle:

1. Initial surface fills the viewport with no blank bars, stretched texture or clipped controls.
2. Slow and fast pointer strokes are continuous; opposite and crossed strokes produce coherent directional sheen.
3. Marks remain after release and when the light changes. Smooth restores one consistent direction.
4. Pointer cancellation, leaving the surface, resizing, focus changes and opening dialogs do not leave an active brush stuck.
5. Touch drag works; controls are reachable on narrow screens. Test on a real phone before claiming phone performance.
6. Keyboard focus is visible. Arrows move, Space toggles brushing, Shift moves further and Escape stops. Light and Smooth also work with the keyboard.
7. Reduced-motion settings remove interface transitions. No autonomous camera or fabric animation starts.
8. WebGL failure is understandable and the guide/source remain usable. Exercise retry and graphics-context recovery as implemented.
9. Test direct route loading, reloads, all asset paths and real 404s under the intended base path. Test standalone source after extraction.
10. Run `npm test` and `npm run build`. Report runtime environments and any material or behavioral differences.

The experiment is stylized directional shading, not a physical cloth solver. State lives in memory and resets on reload. No persistence, export-image or backend API is provided.

## Copy to your agent

```text
Integrate the supplied Velvet source into [DESTINATION].
Scope: [whole experience / embedded material / brush field].
Intentional changes: [LIST OR NONE].

Read README.md, INTEGRATE.md, ATTRIBUTION.md and LICENSE. Install and run
this original independently first. Inspect index.html, src/main.js,
src/velvet.js, src/nap-field.js and src/style.css before editing.
Preserve the burgundy short-pile material, persistent directional brush
marks, light response, Smooth, pointer/touch/keyboard behavior and cleanup.
Keep unrelated destination work intact. Adapt only the lifecycle, layout
and asset-base boundaries necessary for the selected scope. Do not copy
catalog navigation into a host that owns routing. Retain font and runtime
license notices. Verify against the unchanged original and report actual
browser, responsive, accessibility, fallback, build and source-package
checks, plus any deliberate or unresolved differences.
```

This guide describes the source; it does not supply it by itself. Give your agent the complete downloaded folder as well.

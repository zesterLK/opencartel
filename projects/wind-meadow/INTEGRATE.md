# Integrate Wind Meadow

## Run the original first

Use Node 22.18+ and `npm ci`, then `npm run dev`. Build with `npm run build`. This is a standalone Vite page, not a framework component.

## Source map

- `src/meadow.js` and `src/shaders.js`: procedural instanced grass, selected CC0 modeled tufts, lighting, canopy shadow and wind renderer; owns Three.js resources and drawing loop.
- `src/main.js`: mounting, effects, loading/failure/retry, pause, visibility and reduced-motion lifecycle.
- `src/style.css`: experiment-specific layout and colours.
- `src/ui.css`, cursor, motion and Markdown panel helpers: project-owned OpenCartel controls.
- `index.html`: accessible HTML controls, dialogs and canvas.
- `public/fonts`: Chakra Petch and its OFL notice. `public/textures` contains a small CC0 photographic blade albedo and its exact provenance. `public/models/grass-medium-01` contains the bundled CC0 glTF, binary, original texture maps and provenance.
- `scripts/source-archive.mjs`: deterministic source ZIP plus SHA-256 manifest.

## Integration boundary

Call async `mountMeadow(canvas, {onProgress, onStatus})` once. Its return value exposes `setOptions`, `setPaused`, `gust`, `resetEffects`, `stats` and `destroy`. Use `destroy()` before unmounting or replacing the canvas. Keep controls outside the canvas and preserve reduced-motion/visibility handling from main.js. Do not mount a second render loop around it.

`setOptions` accepts wind (0–2), speed (0.25–2), light (golden/daylight/dusk), flowers (boolean), quality (auto/high/low). The camera is deliberately fixed. Retain anchored roots and recovery when changing the blade shaders. Preserve the matched opacity cutoff in both foliage and shadow passes; the source glTF does not include the separate opacity texture by itself. Test paused and moving frames; lowering density changes the look.

## Fidelity and performance

Keep the layered grass, dark roots and grazing light. Avoid a flat backdrop or replacing the grass with texture distortion. Rendering is resolution-bounded; adaptive quality and the Light control are deliberate. Measure your target hardware with sustained gusts and portrait layout. Viewport emulation is not a physical-phone GPU test.

## Accessibility and failure

Native effects controls and Send gust provide keyboard alternatives. Pause freezes animation. Reduced motion starts still, hidden pages stop, and a graphics failure retains Help/Guide/source and Retry. Preserve these when embedding.

## Download verification

The ZIP is self-contained. After extracting, run `npm ci`, `node scripts/source-archive.mjs --verify` and `npm run build`. The manifest hashes the source snapshot. A composed build adds Home and catalog source links using VITE_OPENCARTEL_COMPOSED=1. Standalone builds use relative URLs.

## Agent brief

Integrate Wind Meadow into [destination] with [scope]. Run the original first. Preserve rooted curved grass, continuous gust recovery, performance caps, pause/reduced-motion and accessible controls. Adapt the mounting lifecycle to the destination; do not import unrelated projects or silently add external assets. Compare desktop, portrait, pause, failure and sustained interaction against the original before delivery.

Pointer drag uses `src/interaction.js` to accumulate stroke forces into a fixed 128 × 128 world-space grid. A time-stepped damped spring controls the visible displacement, independently of input-event frequency. Both foliage vertex programs and their shadow passes sample the same linearly filtered RGBA16F field; keep its world bounds and texel-centre mapping matched. Retain pointer capture, separate gesture boundaries, cancellation and release/recovery; hover alone must not create a trail.

# Jitter Clock

A clock with outline digits drawn as continuous animated strands. Count is the default single-digit study; Time shows the local 24-hour clock. Built with Canvas 2D and cached vector contours, without a runtime font parser or WebGL.

## Run

Requires Node.js 22.12+ and npm.

```sh
npm ci
npm run dev
npm test
npm run build
npm run preview
```

At 1×, each count lasts two seconds. The thin continuous paths coil along the actual glyph boundary, outward into whitespace and counters; no clipping mask cuts the strands.

Use Pause/Play, Reset and the speed button (0.5×, 1×, 2×). Space pauses and R resets when focus is outside controls. Time follows the system clock and disables count-speed control. Reduced motion preserves clean contours. Hidden tabs stop rendering. There are no network calls after local assets load.

## Reuse

`src/clock.js` exports `mountClock(canvas)`, returning `draw(seconds)`, `setPaused(boolean)`, `setMode('count'|'time')`, `setSpeed(number)`, `reset()` and `destroy()`. For deterministic capture, pause then call `draw(seconds)` in Count mode. `?preview=1` hides page chrome. The renderer currently sizes to the viewport; adapt its resize function for an embedded component. See [INTEGRATE.md](INTEGRATE.md).

Each count begins with a clean outline. The strand expands into loose folds on the first pass through 1–0 and longer, overlapping loops on the second. The deformation is deterministic, so replaying the same time produces the same drawing. A field derived from the glyph outline keeps the folds in the surrounding space and inside the digit’s holes. During interactive playback, a local Web Worker prepares the visible digits and the next count. The canvas interpolates the prepared positions on each frame. Reduced motion displays the outlines directly.

Archivo Black supplies the base contours. The curved 1 and closed 4 are drawn separately in the contour generator. Run `npm run contours` to rebuild the cached geometry. The font parser is a development dependency. Both bundled fonts retain their OFL notices.

## Source

The Source button provides an independent project ZIP. In an extracted ZIP, `node scripts/source-archive.mjs --verify` verifies its SHA-256 snapshot after installation. Original code is MIT. See [ATTRIBUTION.md](ATTRIBUTION.md).

## Limits

This is a visual reconstruction, not the original creator's implementation. The clock reflects the device clock, not a network time source. Canvas labels expose the current value but do not announce every second. Reduced-motion presentation is static apart from digit changes; a manual pause freezes the displayed time as well as the line.

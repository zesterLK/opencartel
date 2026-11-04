# Jitter Clock

A clean outline digit loosens into looping ink, then starts again with the next number. Count is the default single-digit study; Time shows the local 24-hour clock. Built with Canvas 2D and cached vector contours, without a runtime font parser or WebGL.

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

Contour preprocessing resamples by arc length, smooths the boundary, and fixes the outward normal orientation once per closed contour. Curvature peaks anchor complete coil turns: each loop sequence returns to the outline at the join, leaving short shoulders and caps animated without tiny crowded curls. Coil phase stays monotonic, and radius changes smoothly near each join. Each glyph and contour has a deterministic seed for unequal spacing, radius, aspect, tilt and occasional compound bends. These fields are cached; animation does not reseed noise each frame. A short periodic curve filter rounds hairpin tips while subtracting its clean-outline displacement to avoid a jump at the start. The live renderer reuses typed buffers for both filtering passes.

The ten glyph contours are precomputed from the bundled Archivo Black font. `npm run contours` rebuilds them using opentype.js; that parser is a development dependency only. Anybody supplies interface typography. Both fonts retain their OFL notices.

## Source

The Source button provides an independent project ZIP. In an extracted ZIP, `node scripts/source-archive.mjs --verify` verifies its SHA-256 snapshot after installation. Original code is MIT. See [ATTRIBUTION.md](ATTRIBUTION.md).

## Limits

This is a visual reconstruction, not the original creator's implementation. The clock reflects the device clock, not a network time source. Canvas labels expose the current value but do not announce every second. Reduced-motion presentation is static apart from digit changes; a manual pause freezes the displayed time as well as the line.

# Integrate Jitter Clock

## Run the reference first

Use Node.js 22.12+ and npm. Run `npm ci`, `npm run dev`, `npm test`, and `npm run build`. View Count and Time, pause, reset, and resize before adapting the experience.

## Source map

- `src/clock.js`: Canvas renderer, coherent coil deformation, visibility, resizing and reduced-motion handling.
- `src/clock-math.js`: count cycle, local-time formatting and disturbance envelope.
- `src/contours.json`: cached evenly sampled Archivo Black digit outlines.
- `scripts/build-contours.mjs`: reproducible outline extraction from the unchanged bundled font.
- `src/main.js`: controls, Help/Guide, optional catalog links, lifecycle cleanup.
- `src/style.css`: viewport composition and responsive page controls.
- `public/brand.css`, `public/fonts`: interface type and complete font license notices.

## Reuse contract

Import `mountClock` and pass a canvas. An optional second argument `{caption:false}` removes the small art caption for clean recordings. `?preview=1&t=0.5` hides page controls and freezes Count at a deterministic elapsed time for review. It returns `draw(seconds)`, `setPaused(value)`, `setMode(value)`, `setSpeed(value)`, `reset()` and `destroy()`. Call destroy on unmount. Pause before using draw for deterministic Count snapshots. Count uses elapsed animation seconds; Time uses the system date. The current renderer owns viewport dimensions; for a contained integration replace its resize function with a ResizeObserver scoped to the parent. No framework is required.

## Preserve the identity

Keep a sparse near-black stage, one centered digit by default, thin pale strokes, central guide lines and coherent looping deformation. The line starts clean and coils over each second. Do not replace the loops with independent random per-frame points: that produces flicker and changes the character. Theme, amplitude, coil count and digit size are explicit constants in the renderer. Preserve keyboard controls, visibility suspension and reduced-motion handling.

## Agent brief

> Integrate Jitter Clock into [DESTINATION] as [FULL PAGE / EMBEDDED CANVAS]. Run the unchanged project first. Preserve the count-to-coils rhythm and thin-line composition. Adapt sizing and lifecycle only as needed; keep font attribution and license files. Check mobile layout, Count/Time, pause/reset, reduced motion, hidden-tab suspension and independent build. Report the actual states tested.

## Verification and ownership

The original implementation is MIT; the font files and derived glyph geometry remain under their included OFL notices. No source reference video, screenshot, or third-party demo code is redistributed. The visual reference is credited in ATTRIBUTION.md. Do not treat this standalone page as an authenticated clock service or a production framework component without adapting its lifecycle and sizing.

# Integrate Slow Drawing Machine

## Run the original first

Use Node 22.18+, `npm ci`, `npm run dev`, `npm test` and `npm run build`. This is an independent Vite page with Canvas 2D and SVG export, without a rendering framework dependency.

## Source map

- `src/kinematics.js`: canonical path equations, presets, fixed-step constants, two-link inverse kinematics and SVG serialization.
- `src/machine.js`: persistent strokes, incremental ink canvas, separate mechanism canvas, rendering and lifecycle.
- `src/main.js`: native controls, pause/reduced motion, dialogs and download.
- `src/style.css`: full-screen canvas with project-specific surface and layout.
- Other `src/` interface helpers are project-owned copies, not imports from the catalog.
- `public/fonts`: Chakra Petch and its OFL notice. All mechanism artwork is original procedural Canvas drawing.

## Reuse boundary

`mountMachine(inkCanvas, mechanismCanvas, {onStatus,onFinish})` returns `setPaused`, `setSpeed`, `setSettings`, `setColor`, `setVisible`, `clear`, `svg`, and `destroy`. Call destroy before unmount/replacement. Do not add another animation loop. Keep the two canvases identical in size and transform. The ink renderer appends only new segments; the mechanism is repainted separately.

Change pattern equations in kinematics.js, retaining the tested reach envelope of BOTH chains. Never stretch the bars or switch elbow branches to hide an unreachable position. The mechanism follows a parametric path; it is not a physical pendulum simulator.

## Fidelity

The whole viewport is a near-white canvas. Do not add an inset paper rectangle, sheet shadow or tabletop. Preserve fine cobalt ink, dark metal rails, brass pivots and one visible nib at the active path endpoint. Use the same stored samples for Canvas and SVG. A parameter change starts a separate stroke, never a connector across the canvas.

## Resize, accessibility and performance

Stored points use the canvas dimensions at drawing start. Resize applies a uniform fit and replays existing ink without stretching it; Clear captures the new canvas dimensions. The rig recalculates its layout around that fitted pen. Fixed-step path sampling decouples geometry from refresh rate. Speed scales simulation time. Hidden tabs pause without catch-up, reduced motion begins paused, and native controls support keyboard input. The 24,000 point cap stops the drawing coherently rather than discarding history. Pixel ratio and total resolution are capped.

## SVG and source downloads

SVG exports exact recorded subpaths and colours, with a transparent background and no mechanism. Source ZIP contains this guide, dependencies/lockfile and source. After extraction run `npm ci`, `node scripts/source-archive.mjs --verify`, `npm test` and `npm run build`. Composed site navigation is explicitly enabled by VITE_OPENCARTEL_COMPOSED=1; standalone assets use a relative base.

## Agent brief

Integrate Slow Drawing Machine into [destination] with [scope]. Run the original first. Preserve a full-screen canvas, one coherent pen endpoint, both fixed-length arm chains, incremental ink, explicit stroke breaks, pause/reduced-motion/hidden-page behaviour and exact SVG export. Adapt lifecycle to the destination; keep source independent. Verify path extrema, portrait and desktop, resize, repeated reset and downloaded SVG against the displayed drawing.

## Pen placement and pace

The default pace is 0.25×; `setSpeed` accepts 0.25–10. `beginMove()`, `moveTo(x, y)` and `endMove(cancel)` lift and place the pen using canvas-relative screen coordinates. A successful placement starts a separate ink stroke and preserves the current pause state. Resizing preserves existing ink geometry and line width. Keep the accessible pen handle, pointer capture/cancel behavior, and keyboard instructions when adapting the interface.

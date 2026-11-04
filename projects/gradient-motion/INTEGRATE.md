# Integrate Gradient Motion

## Run the original first

Use Node.js 22.18+; run `npm ci`, `npm run dev`, `npm test` and `npm run build -- --base=./`. Compare the full sequence and individual phase views before changing its geometry or palette.

## Source map

- `src/gradient.js`: deterministic WebGL renderer, GLSL fragment shader and `phaseTime()` mapping. A single fullscreen triangle pair; no runtime library, sampled textures or external assets.
- `src/main.js`: requestAnimationFrame lifecycle, phase/speed/pause controls, reduced-motion and visibility handling, dialogs and downloads.
- `src/style.css`: full-screen composition and responsive controls.
- `src/ui.css`, cursor, motion and Markdown-panel helpers: project-local OpenCartel interface copies.
- `public/brand.css`, `public/fonts`: Anybody typography and OFL notice.
- `scripts/source-archive.mjs`: source archive and served guide preparation.

## Reusable renderer

```js
import {createGradientRenderer} from './src/gradient.js';
const renderer = createGradientRenderer(canvas);
renderer.draw(3, {phase: 'sequence'});
// Draw with an application-owned elapsed clock. Clean up on unmount:
renderer.destroy();
```

Supported phases: `sequence`, `membrane`, `ember`, `field`, `orbit`. Time is seconds. `draw` does not schedule frames, install UI, or alter page styles. The parent controls when it runs. CSS must give the canvas an explicit rendered width and height. Use `{pixelRatio: 1}` at creation for lower GPU cost. Destroy before replacing its canvas. Context restoration rebuilds GPU objects; a failed initial context produces a page-level explanatory fallback.

## Fidelity and customization

The defining traits are a black field, a blue/white lower membrane, dark upper cavity, thin hot rim, soft light bloom and the star → diamond → irregular disk → ember → full colour field → orbit sequence. Keep these together. The elapsed loop is 30 seconds; values in the shader are deliberately named around those phases. Alter `shape()` for silhouette, `membrane()` for inner light and perimeter bloom, `field()` for the screen wash and `orbit()` for arc traces. The source promotional text is omitted. This is a coded visual interpretation, not pixel-identical copied video.

## Accessibility and lifecycle

The artwork is decorative. Keep an accessible description and retain keyboard-native controls in an integration. Respect prefers-reduced-motion before starting your own frame loop; pause on hidden tabs, expose a pause action and avoid starting a second frame loop. `destroy()` releases buffers, shaders, program and canvas listeners. The page cancels its RAF and other event listeners on Vite disposal.

## Verification

Check the source sequence at 0, 3, 9, 14, 18, 24 and 28 seconds. Test the small viewport and a wide one, paused resize, phase changes, reduced motion, context failure and cleanup. Run `npm test` and build. Source archives include `SOURCE-MANIFEST.json`; `node scripts/source-archive.mjs --verify` validates its file hashes after extraction.

## Agent brief

Integrate Gradient Motion into [destination] as [full-screen experience / decorative canvas]. Run the original unchanged first. Preserve the reference sequence and luminous silhouette unless a different direction is requested. Import `createGradientRenderer`, own one elapsed clock, respect motion preferences and dispose the renderer on unmount. Keep styles scoped to the destination. Document deliberate departures and verify actual rendered states; a successful build is not a visual check.

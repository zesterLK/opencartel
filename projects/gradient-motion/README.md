# Gradient Motion

A procedural light study: a blue-white membrane shifts from a star to a soft diamond and organic disk, heats into an ember, washes across the screen, then becomes a luminous orbit. The 30-second sequence is calculated in GLSL; no video, images or texture downloads are used for the artwork.

## Run

Requires Node.js 22.18+ and npm.

```sh
npm ci
npm run dev
npm test
npm run build -- --base=./
```

Select a phase, switch between 0.5×, 1× and 2×, pause or restart. Reduced motion starts paused; hidden tabs suspend progression. WebGL is required. This is an original coded interpretation of a motion reference, not a frame-identical reconstruction or redistribution of the reference video. The promotional typography in that reference is intentionally absent.

## Reuse

Import `createGradientRenderer` from `src/gradient.js`, give it an HTML canvas sized with CSS, and call `draw(seconds, {phase: 'sequence'})`. `destroy()` releases its GPU objects. The module does not create controls or run an animation loop. See [INTEGRATE.md](INTEGRATE.md) for lifecycle and customization guidance. `?preview=1` hides the page chrome for clean captures.

## Source

`npm run source` generates a standalone ZIP in `public/`. Extract, run `npm ci`, then `node scripts/source-archive.mjs --verify` to check its manifest. Built source downloads include the shader, page controls, font license and documentation. MIT license; inspiration and font provenance are in [ATTRIBUTION.md](ATTRIBUTION.md).

## Limits

One WebGL fragment pass, with pixel ratio capped at 1.5. No measured cross-device performance claim. Approximate light and shape curves are authored from visual observation; reference timing and key shapes guide the implementation. Canvas is decorative; every control remains native keyboard and touch operable.

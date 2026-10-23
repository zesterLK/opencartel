# Wind Meadow

A full-screen field of procedural curved grass and textured natural grass tufts. Drag through it to part the grass outward on both sides of your stroke, or send a travelling gust; change wind strength, speed, sunlight and flowers.

## Run

Node 22.18 or newer. From this directory:

```sh
npm ci
npm run dev
npm run build
```

Open the URL printed by Vite. The app is standalone. The source button downloads this complete project; no runtime network services or accounts are needed.

## Controls

Effects changes wind strength and speed, sunlight, flowers and quality. Pause freezes motion; Send gust supplies a keyboard-accessible alternative to pointer interaction. Reduced motion begins paused. Adaptive detail caps resolution and adjusts cost; Light is available for slower hardware.

## Source

The editable scene is Three.js geometry and shaders in `src/meadow.js` and `src/shaders.js`. The selected CC0 tuft models and their texture maps are included in `public/models/grass-medium-01/`; no asset account or external download is required. `src/main.js` owns the page lifecycle and controls. See INTEGRATE.md for reuse.

The wind and illumination are visual approximations, not a scientific vegetation simulation. WebGL2 with hardware acceleration is required; real phone thermal performance and non-Chromium browser coverage must be verified on your target devices.

Original code is MIT. The blade texture and tuft assets are CC0 material from Poly Haven’s Grass Medium 01. Font, texture and dependency attribution is in ATTRIBUTION.md.

Press and drag feed a persistent 128 × 128 world-space bend field. A damped spring eases grass away from the stroke and gradually recovers after release, without restarting the bend on each input event. Procedural blades, textured tufts and their shadows sample the same field. Hover does not create gusts. For clean local preview recordings, append `?capture` on the development server; the recorder is excluded from production.

Validation: interaction tests, composed and extracted-source builds, and local Chromium visual/functional checks pass. Sustained browser frame pacing was not measured for this release; mobile viewport checks do not establish physical-phone performance.

# Velvet

A full-screen burgundy velvet surface. Brush it in either direction to leave marks in the nap, turn the light to change their sheen, and smooth it to start again.

The surface is a procedural WebGL material with an editable direction field. There are no external texture images, models, network services, accounts or uploads. It is a stylized material experiment rather than a physical cloth simulation.

## Run independently

Use Node.js 22.18 or later and npm. Install this folder independently; it does not import the OpenCartel catalog or another project.

```sh
npm ci
npm run dev
```

Open the localhost address printed by Vite (port 5176 by default).

```sh
npm test
npm run build
npm run preview
```

The default build uses a portable `./` asset base. To host it below a path, build with `npm run build -- --base=/your-path/`. Serve `dist/` over HTTP; opening its HTML directly as a local file is not supported. No environment variables or backend are required. WebGL2 and hardware acceleration are required for the interactive material; Help, Guide and source download remain available if it cannot start.

## Controls

- Drag a pointer or finger to brush. Marks remain in the current tab until smoothing or reloading.
- **Light** opens a native range control for the light direction.
- **Smooth** lays the nap in a single direction.
- Tab to the surface. Arrows move the brush, Space toggles brushing, Shift moves further, and Escape stops brushing.

A static first stroke demonstrates the material on arrival. Smooth removes it completely. The fabric has no automatic camera movement or idle animation loop: the renderer draws when its input or view changes. Reduced-motion preferences suppress interface transitions. Touch uses native controls and a direct drag on the surface.

## Reuse

Start with [INTEGRATE.md](INTEGRATE.md). It maps the renderer, direction field, application shell, controls and cleanup, with a brief you can hand to an agent. [ATTRIBUTION.md](ATTRIBUTION.md) records dependencies and bundled font rights. Original code is MIT licensed; keep [LICENSE](LICENSE) with redistributed copies.

The app's **Guide** displays the canonical integration document. **Download source** includes the implementation, shaders, dependencies, font notices, tests and this guide. The fabric is authored in code, so there is no separate Blender scene or baked texture file.

## Source archive

`npm run source` prepares the independent ZIP and served guide. It also runs before development and builds. OpenCartel collection mode uses its root archive endpoint; standalone mode uses the locally generated archive. Both include the same source files and a deterministic `SOURCE-MANIFEST.json`.

After extracting a downloaded archive, verify its source bytes before editing:

```sh
npm ci
node scripts/source-archive.mjs --verify
npm test
npm run build
```

Generated ZIPs, dependencies, build output and the served duplicate of `INTEGRATE.md` are excluded from the source snapshot.

## Verification

Checked locally on 22 October 2026 in desktop Chromium and Brave, including 320px and 390px layouts, emulated touch, keyboard brushing, light changes, smoothing, reduced motion, graphics-context loss/restoration, startup-failure retry, guide and source routes. The standalone archive was installed, tested and built outside the repository using Node.js 24.19.0. Physical-phone performance, Safari, Firefox and screen-reader behavior have not been verified.

## Limits

Brush state is kept in a 640 × 640 direction field in memory rather than saved to disk. The drawing buffer is capped at a device-pixel ratio of 1.65 and approximately 3 million pixels. The material is a flat, view-facing surface with stylized directional shading, not a model of individual physical fibres or cloth deformation. Browser support and rendering speed depend on the graphics driver and device; a desktop browser viewport is not a physical-phone performance test.

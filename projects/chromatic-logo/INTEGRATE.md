# Integrate Chromatic Logo

Run `npm ci` and `npm run dev` with Node 22.18+. `npm run build` creates portable static output. The project is independent of the catalog.

## Reusable component

Import `mountChromaticLogo` from `src/chromatic-logo.js` and provide a square canvas with CSS dimensions. Pass `logoUrl`, a same-origin transparent image URL. The supplied SVG is a demo logo; replace it with a transparent logo you have permission to use. The renderer uses its alpha, preserving the silhouette and painting it black. Other logo proportions require adjusting the `mask` mapping in the shader.

```js
const effect = await mountChromaticLogo(canvas, {logoUrl, speed:1});
effect.replay();
effect.setSpeed(.5);
effect.seek(.4); // deterministic static state, stops playback
// on removal:
effect.destroy();
```

A smooth superelliptic glass surface grows from a sphere into a softened square. Its height gradients, including two local meniscus bulges, produce continuous normals; separate wavelength rays refract the actual logo texture. The same surface slope controls opposed dark studio reflections and narrow white caustics. Local violet/cyan glints gather at the moving light/dark reflection boundaries; a small damped recoil settles the lens after expansion. The logo silhouette is preserved and returns as thickness and reflection fade. This is a single-pass analytic optical approximation, not a multi-bounce physical simulation or a video texture.

At 1×, playback runs at half the internal study clock: a growing orb appears around 0.3 seconds and stays round through 0.6; it unfolds into the accepted square lens by 0.8. Mark magnification recovers by 1.56 seconds, while the thinner meniscus continues relaxing through 2.08; fade ends at 2.64 and RAF stops after settling at 3 seconds. The early orb has a transient normal-driven white Fresnel reflection. The unfolding uses quintic smootherstep with zero velocity and acceleration at either end. `seek(seconds)` and the preview `time` parameter use the internal study clock, independently of playback speed. Device pixel ratio is capped at 2. ResizeObserver maintains sharpness. Hidden tabs do not advance the effect. Reduced motion shows the final state; explicit Replay plays once. Keyboard users can activate native replay/speed controls. No automatic infinite animation.

`src/main.js` owns demo chrome, guide/help dialogs, cursor and source download. Do not import it into your app. Component cleanup releases its GPU resources and listeners. Demo fallback displays the mark on unsupported WebGL. Pass `onUnavailable(error)` to handle graphics context loss. The demo switches to its static logo; reload or remount to restore rendering. The component never navigates or reloads its host.

## Adaptation checklist

Keep the actual logo's silhouette, neutral backdrop, compact composition and brief motion. Change timing and refraction in the shader deliberately. No brand assets from the reference creator are included. Test replay, reduced motion, visibility changes, mobile layout and fallback on your destination. There is no upload service or analytics.

## Agent brief

Integrate this component in [destination] at [scope]. Run unchanged first. Preserve logo shape and accessibility. Supply a transparent authorized logo, own the loading/fallback state, and destroy on unmount. Do not copy global chrome into the host. Verify motion and settled state before changing the shader.

## Preview capture

`?preview=1` hides demo chrome. Add `&time=0.4` to seek a deterministic frame after initialization. The reusable renderer exposes `seek(seconds)` separately from the app controller.

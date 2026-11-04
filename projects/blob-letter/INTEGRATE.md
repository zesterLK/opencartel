# Blob Letter integration guide

## Run unchanged

Use Node 22.18 or newer. Run `npm ci`, then `npm run dev`. Run `npm run build` for portable static output.

## Reuse

Import `mountBlobLetter` from `src/blob-letter.js` and call it with a sized, positioned host element. Keep the accompanying source modules. Call `destroy()` when unmounting. The component does not require the demo header.

```js
import {mountBlobLetter} from './src/blob-letter.js';
const instance = mountBlobLetter(document.querySelector('.surface'), {
  onInvert: dark => document.body.classList.toggle('dark', dark),
});
// On unmount:
instance.destroy();
```

## API and limits

The component exposes `setDark(boolean)`, `invert()`, `reset()` and `destroy()`. The `onInvert(dark)` callback receives the new theme only after the ink has covered the host, so the surrounding interface can switch without a flash. `invert()` and Enter/Space run the cover automatically. Scrolling down grows the ink progressively; scrolling back reverses an unfinished cover. Wheel input is normalized across pixel, line and page units. A short cooldown absorbs wheel inertia between cycles. `reset()` cancels an unfinished transition and restores the letter without changing the current theme.

The demo host fills the viewport, with header and footer above its canvas. In an embedded use, the ink covers only the sized host: make it viewport-sized for the full-page version. Its shape is an analytic rounded Z, not an arbitrary font renderer. WebGL is required for distortion; a static Z remains on unsupported browsers. Reduced motion switches theme immediately without the spreading animation. The fixed fluid grid and transition loop sleep after settling.

## Verification and customization

Check mounting, resizing, teardown, touch and keyboard before adapting. Preserve reduced-motion behavior. Customize host size and theme first. Keep the reference shape and motion unchanged until the baseline runs. No backend or network request is required by the component.

## Agent handoff

Integrate Blob Letter into [destination] at [scope]. Run the original first; preserve rendering and lifecycle. Keep the demo shell separate. Verify desktop, mobile, keyboard and reduced motion.

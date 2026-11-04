# Integrate Scratch Reveal

## Run the original

Use Node 22.18 or newer. Run `npm ci`, `npm run dev`, `npm test`, and `npm run build`. Vite builds with relative asset URLs for standalone hosting; the collection can supply a route base.

## Source map

- `src/scratch.js`: dependency-free Canvas 2D foil renderer, pointer capture, normalized stroke history, coverage and lifecycle.
- `src/style.css`: demo card and foil overlay positioning; the canvas must cover a sized container and use `touch-action: none`.
- `src/main.js`: demo controls, help, guide, cursor and source-download wiring.
- `index.html`: semantic shell, fictional code and accessible reveal alternative.
- `scripts/source-archive.mjs`: source ZIP and manifest; `node scripts/source-archive.mjs --verify` verifies an extracted source snapshot.

## Component API

```js
import { mountScratch } from './src/scratch.js';
const effect = mountScratch(container, {
  brushSize: 27,
  threshold: 0.57,
  onReveal: () => showAccessibleResult(),
  onProgress: ratio => updateProgress(ratio),
});
effect.reveal();
effect.reset();
effect.setBrush(32);
effect.destroy(); // on framework unmount
```

The container must have explicit dimensions and contain a canvas positioned over the revealed content. `onReveal` fires once per reveal cycle; `onProgress` receives a 0–1 fraction. `revealed` is a read-only property. All listeners and ResizeObserver are released on destroy. Resize replays normalized strokes, retaining marks. Device pixel density is capped at 2. No animation loop runs while idle.

## Accessible behavior

Canvas is decorative. Supply a real Reveal button and readable result region, preserve keyboard focus when swapping controls, and offer copy as an optional enhancement. This demo announces completion and provides a copy-failure fallback. Touch scratching is restricted to the panel so the rest of the page can scroll. Reduced motion disables the completion fade. The fictional code is present in the DOM: do not treat the coating as a security barrier.

## Customization and fidelity

Change the underlying DOM content, coral color, card value, foil gradient, brush width and threshold. Preserve the source's small landscape card, large denomination, restrained label hierarchy and narrow metallic panel. Do not replace it with a full-screen particle effect. Foil and brush grain are procedurally drawn; no external image or shader is needed. The stamp leaves irregular edges, thin abrasion grooves and small foil remnants. Normalized strokes and seeds replay the same marks on resize; repeated passes clear the remaining grain. The page shell is optional: importing the component does not import the collection cursor or navigation.

## Agent brief

Integrate Scratch Reveal into [destination] at [scope]. Run the original before adapting. Preserve its pointer/touch scratch continuity, accessible reveal, completion behavior and resize persistence. Keep payment/backend behavior separate. Verify keyboard, touch, reduced motion, reset and unmount cleanup. Attribute the visual reference and preserve the included font license if copying the shell.

## Limits

Coverage is conservatively estimated on a 100×24 sampling grid using the dense centre of the textured brush. This is cosmetic reveal UI, not financial infrastructure. Physical-device and screen-reader behavior require testing in the destination application.

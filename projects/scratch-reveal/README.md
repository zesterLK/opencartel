# Scratch Reveal

A tactile coral gift card with a scratchable silver foil panel. Drag to clear the foil, or use Reveal instead. The demo code is fictional; nothing is purchased or stored.

## Run

Node 22.18 or newer. Run `npm ci`, then `npm run dev`. `npm run build` produces a portable static build. `npm test` checks stroke coverage and reset behavior.

## Reuse

Import `mountScratch` from `src/scratch.js`, provide a sized container containing the content and a canvas overlay, and call `destroy()` when unmounting. See `INTEGRATE.md` for the complete contract. This component has no runtime dependencies. The visual coating is not encryption or access control.

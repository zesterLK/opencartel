# Pocket Cards

A selectable stack of membership cards, tucked inside a translucent blue pocket. Click or tap a card to lift it, inspect it, and tuck it away. Keyboard navigation and reduced motion are supported.

## Run

Node 22.18 or newer. `npm ci`, then `npm run dev`. `npm run build` creates a portable static build. `npm test` checks keyboard routing and component lifecycle. `npm run source` creates the standalone source ZIP with a SHA-256 manifest.

## Reuse

Import `mountPocketCards` from `src/pocket-cards.js` and `src/pocket-cards.css`. Call the mount function with an empty container and optional `cards` and `onSelect` settings. Call `destroy()` before unmounting. Full examples and lifecycle boundaries are in [INTEGRATE.md](INTEGRATE.md).

The component uses DOM/CSS rather than a WebGL scene. The wallet is decorative: it neither processes payments nor stores credentials. Source artwork is original; the interaction reference is credited in ATTRIBUTION.md.

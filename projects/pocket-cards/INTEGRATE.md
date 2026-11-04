# Integrate Pocket Cards

## Run the original

Use Node 22.18 or newer, run `npm ci`, then `npm run dev`. Run `npm run build` for static output. Open the complete demo before moving the component into another application.

## Source map

- `src/pocket-cards.js`: exported mount function, card data, selection, keyboard routing and cleanup.
- `src/pocket-cards.css`: wallet geometry, authored SVG pocket, surface lighting and movement.
- `src/main.js`: standalone page shell, Help/Guide dialogs and downloads.
- `src/style.css`: demo backdrop and layout.
- `src/ui.css`, cursor/motion/Markdown panel files: independent copies of the OpenCartel page chrome. They are not required by the wallet component.

## Minimal integration

```js
import { mountPocketCards } from './pocket-cards.js';
import './pocket-cards.css';
const wallet = mountPocketCards(container, {
  cards: [
    { title: 'Studio', brand: 'Your brand', description: 'A space to make.',
      label: 'MEMBERSHIP', number: '001', color: '#243a60' },
    { title: 'Library', description: 'A collection worth keeping.', color: '#507c69' }
  ],
  onSelect(card, index) { console.log(card, index); }
});
wallet.select(0);
wallet.reset();
// On route change / framework unmount:
wallet.destroy();
```

`cards` accepts one to five entries; strings are inserted as text. CSS color values are assigned through CSS custom properties. `select(index)` accepts a valid index or null; invalid values throw. `selectedIndex` is read-only and reflects the presented card. Selection requests are sequenced: lift in the original layer, move to front at the crest, then settle. Returning reverses that sequence. Rapid requests retain the latest destination and finish travel without teleporting; `onSelect` runs when a state settles. Selection is local, and there is no network or persistence. `destroy()` cancels in-flight animations and removes only the owned DOM and listeners. Call it from a React effect cleanup or equivalent framework lifecycle. Mount once per container; do not mount over unrelated content.

## Customization and fidelity

Change card content, color, brand and short labels. Keep titles short enough for exposed card headers. The wallet silhouette, translucent dipping lip, resting overlap and lifted state define the reference direction. Do not replace those with generic flat tabs. Cards are native buttons; avoid nesting links or forms in them. Host applications can react to `onSelect` with a separate detail view.

## Accessibility

Tab reaches every card. Enter/Space selects or returns it; arrows move focus with wraparound, Home/End jump to the extremes, Escape returns the selected card. Selection uses aria-pressed, and a status message announces the detail. Touch uses the same click semantics. Reduced-motion disables movement transitions. No drag gesture is required. The decorative pocket never intercepts pointer input.

## Verify after integration

Verify at 320px and desktop widths, reduced motion, keyboard selection/return, repeated switching during travel, multiple instances, unmount/remount and no unrelated host styling overrides. This is a CSS representation of a wallet, not simulated physical plastic. No payment or authentication functionality is provided.

## Agent handoff

Adapt the Pocket Cards component into [destination] using [scope]. First run the unmodified project. Keep the pocket silhouette and selectable overlapping cards, preserve touch/keyboard/reduced-motion behavior, and connect onSelect to the host's real data. Do not copy the demo's global page chrome unless requested. Test cleanup and multiple instances. Preserve ATTRIBUTION.md and LICENSE.

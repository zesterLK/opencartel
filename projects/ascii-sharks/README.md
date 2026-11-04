# ASCII Sharks

Reusable standalone interaction extracted from the creator’s portfolio.



Use Node 22.18 or newer. Run `npm ci`, then `npm run dev`. Run `npm run build` for portable static output.

## Reuse

Import `mountSharks` from `src/sharks.js` and call it with a sized, positioned host element. Keep the accompanying source modules. Call `destroy()` when unmounting. The component does not require the demo header.

```js
import {mountSharks} from './src/sharks.js';
const instance = mountSharks(document.querySelector('.surface'));
// On unmount:
instance.destroy();
```

## API and limits

Both components expose `setDark(boolean)` and `destroy()`. Sharks additionally expose setPaused(boolean) and splash(). The species option accepts engine shark specifications. Canvas text is not individually accessible; provide a descriptive label. Engine pointer listeners are window-scoped and bounded to the canvas.

## Verification and customization

Check mounting, resizing, teardown, touch and keyboard before adapting. Preserve reduced-motion behavior. Customize host size and theme first. Keep the reference shape and motion unchanged until the baseline runs. No backend or network request is required by the component.


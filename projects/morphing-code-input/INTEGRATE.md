# Integrate Morphing Code Input

## Run the original

Node.js 22.18+, `npm ci`, `npm run dev`. `npm run build` produces a portable static application. `npm test` verifies normalization. Open the demo and check Accept and Try again, paste, autofill, keyboard selection and reduced motion.

## Component boundary

`src/code-input.js` exports `mountCodeInput(host, options)`. Import `src/code-input.css`; these two files are the reusable component. No dependency or global listener is needed. The host must be an empty DOM element with room for the input and status. The component uses Arial/system sans-serif, independently of the demo font.

```js
import { mountCodeInput } from './code-input.js';
import './code-input.css';
const control = mountCodeInput(element, {
  length: 6,
  label: 'Invitation code',
  onComplete: async (code) => validateCode(code),
});
// control.open(), control.reset(), control.value, control.state
// When unmounting:
control.destroy();
```

`length` accepts integers 4–8. `onComplete` returns a truthy value for acceptance, falsy for retry; rejected promises produce a recoverable error. Reset/destroy invalidate pending completions. Cancel your own network work in the host if required; this component ignores stale results but does not abort external requests. Code values are ASCII digits. No backend or authentication is included.

## Appearance and behavior

The ivory pill expands to digit cells and contracts to a checkmark on success. `--cell-size` and `--ink` are scoped styling controls. A native single input backs the visual cells, so paste, selection, backspace and one-time-code autofill keep browser behavior. Escape returns to the closed pill. Status messages use a polite live region. CSS honors reduced motion. With invalid entry the full code is selected for replacement.

`src/main.js` is the demo controller and should not be imported into a host application. It owns the simulated response, collection navigation, dialogs, source link and cursor. Guide/notice helpers and collection styles are project-local copies. The font and its OFL notice live in public/fonts. `scripts/source-archive.mjs` makes standalone ZIPs and a SHA-256 manifest; it also prepares the served guide.

## Agent handoff

Integrate the component into [destination] at [scope]. First run this project unchanged. Preserve native input, accessible label/status, error recovery, Escape, reduced motion and cleanup. Replace simulated completion with the host's validation function. Keep authentication and secrets outside the visual component. Verify desktop/mobile paste, selection, pending reset and unmount before changing the presentation.

## Verification limits

Automated normalization tests and build are local checks, not physical-device, screen-reader or authentication audits. Full visual review is tracked separately by the project maintainer.

# Morphing Code Input

A tactile pill that opens into a six-digit input. Native text entry supports paste, autofill, selection and backspace; asynchronous completion drives pending, accepted and retry states.

## Run

Requires Node.js 22.18 or newer. Run `npm ci`, then `npm run dev`. Build with `npm run build`; test with `npm test`. The downloaded source is independent of the OpenCartel catalog.

## Reuse

Import `mountCodeInput` from `src/code-input.js` and `src/code-input.css`. See INTEGRATE.md. This is an interface, not authentication. Provide your own validation backend and do not embed production secrets.

## Credits

Interaction reference: sucodee's code input study, discovered on Designeer. Original implementation; no source assets copied from that study. MIT code, bundled font under OFL. See ATTRIBUTION.md.

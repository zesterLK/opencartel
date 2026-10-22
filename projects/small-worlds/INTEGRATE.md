# Integrate Small Worlds

## Start with the original

Use Node.js 22.18 or later. Run `npm ci` and `npm run dev`, or `npm run build` followed by `npm run preview`. The project is a standalone Vite page, not a framework component.

## Entry points

`index.html` contains controls and dialogs. `src/main.js` owns input, animation lifecycle, image loading and accessibility. `src/renderer.js` composites paintings recursively; `src/journey.js` contains transform mathematics. `src/plates.js` defines portal rectangles and child crop coordinates. `public/art/` holds three original production PNG paintings: the wide studio, its portrait adaptation and the city. They remain separate from the editable portal composition. No native 3D or Illustrator source is required.

Change portal coordinates together with their corresponding artwork. A child crop is uniformly fitted and clipped, never distorted to fill a differently proportioned opening. Reversing uses the same geometry. The intro starts at depth zero, showing the full studio. Later studio arrivals use the interior crop, with earlier window framing retained. `portraitDefinitions` selects adapted art when the viewport aspect is below 0.8. The renderer retains four ancestors and bounded descendants; it rebases coordinates at every integer depth. Preserve this invariant when adapting the renderer.

## Reuse

Keep the standalone page in an iframe, or adapt its lifecycle into your host framework. Dispose animation frames, input listeners, image work and UI helpers on unmount. Let your host router own navigation if embedding; omit page-level transition helpers. No component API or upload editor is provided.

## Accessibility

Wheel, touch drag and pinch, keyboard and visible buttons navigate. Automatic travel is opt-in and disabled when reduced motion is requested. Help and Guide use native dialogs. Artwork loading failures expose Retry.

## Agent brief

Adapt Small Worlds into [destination] for [scope]. Run the unchanged original first. Preserve the recursive scene relationships, authored artwork and reversible transforms. Scope global listeners to the mounted experience and retain cleanup. Verify paused seams, forward/reverse loops, touch, keyboard, reduced motion, narrow screens and source asset paths against the original. Preserve attribution.

## Packaging

`npm run source` prepares a self-contained ZIP and served guide. The ZIP includes the source paintings and a SHA-256 manifest. After extracting and installing dependencies, run `node scripts/source-archive.mjs --verify`.

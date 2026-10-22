# Small Worlds

There is always something inside. Travel through a painted artist’s window, into a postcard city, and through its window back into the studio. The same nested artwork appears in both directions, without a scene dissolve.

## Run

Use Node.js 22.18 or later. Run `npm ci`, then `npm run dev`. `npm run build` creates the standalone site; `npm run preview` serves it locally.

## Explore

Scroll down or drag upward to travel inward; reverse to retrace the route. Pinch or use the visible +/− controls on touch screens. With the artwork focused, Up/Down or +/− move, Space toggles Play, Home resets, and Escape pauses. Play is opt-in. Reduced motion disables automatic travel and removes easing. Travel outward stops at the initial window view.

The first view shows the whole studio window. Repeated studio arrivals are framed by the city window, keeping its real occlusion. Portrait screens use an adapted painting of the same room. Resizing preserves journey depth while reframing the artwork.

## Source and reuse

The download includes three original production PNG paintings, editable portal coordinates and crop definitions in `src/plates.js`, the recursive Canvas 2D renderer, input controller, controls and licensed font. No Blender or Illustrator scene was used. Artwork is composited at runtime; it is not a prerecorded zoom video. See INTEGRATE.md and ATTRIBUTION.md.

The renderer keeps bounded neighbouring layers and caps canvas backing storage at four million pixels. It draws while moving or resizing and rests when idle. Artwork downloads once per page load; no analytics, backend or runtime generation.

## Checks and limits

`npm test` checks transform continuity, reversal, wrap and introduction geometry. `node scripts/source-archive.mjs --verify` verifies an extracted source manifest after installing dependencies.

Local Chromium checks cover desktop and emulated portrait layouts, join renders, wheel, keyboard, native mouse dragging, synthetic touch-pointer drag/pinch, Play/Pause, reduced motion, artwork failure/Retry and guide loading. Native touchscreen delivery, physical phone performance, Safari, Firefox and screen-reader output are not independently tested. Painted images soften under extreme magnification before the next layer takes over.

[Explore Small Worlds](https://opencartel.tech/small-worlds/). Published and verified on 22 October 2026.

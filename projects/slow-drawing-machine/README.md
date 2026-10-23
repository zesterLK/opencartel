# Slow Drawing Machine

A patient articulated mechanism draws looping ink lines across the whole screen. The page itself is the canvas. Choose Orbit, Bloom or Weave, tune the rhythm, change the ink, pause and save the actual drawing as SVG.

## Run

Node 22.18 or newer. From this directory:

```sh
npm ci
npm run dev
npm test
npm run build
```

Vite prints the local URL. No accounts, API keys, external runtime services or uploaded data. The source download includes this standalone project.

## Controls

Pattern starts a fresh drawing. Tune changes frequencies, damping, speed, ink and mechanism visibility. Rhythm and ink changes begin separate strokes; speed only changes pace (0.25× by default, up to 10×). Drag the pen to place it anywhere on the visible canvas; it lifts without drawing a connecting line. Tab to the pen and use Enter to lift/place, arrow keys to move, Shift for larger steps, and Escape to cancel. Pause stops the machine, Clear restarts, and Save SVG downloads the drawn lines. Drawings stay in the current tab until saved.

The motion follows harmonograph-inspired equations. Two inverse-kinematic chains follow the same pen; it is not a physically simulated pendulum. Drawings stop at 24,000 sampled points to bound memory and export size. Reduced motion begins paused and hidden tabs sleep. Resizing uniformly fits the existing drawing; Clear starts a new canvas at the current dimensions.

See INTEGRATE.md for source ownership, reuse and lifecycle. Original code is MIT; Chakra Petch is OFL 1.1.

For clean local preview recordings, run the development server and append `?capture` to the URL. The recorder captures only the canvas layers; it is excluded from the production build.

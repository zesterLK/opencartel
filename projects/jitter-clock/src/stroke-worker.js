// Prepare each strand off the animation thread. Transfer only the positions
// needed for playback, so the renderer never copies a full simulation per frame.
import {prepareGlyph, createCoilBuffer, coilContour} from './coil-geometry.js';

const prepared = new Map();
self.onmessage = ({data: {key, digit, cycle, slot, glyph}}) => {
  if (!prepared.has(digit)) prepared.set(digit, prepareGlyph(glyph).prepared);
  const stages = prepared.get(digit).map((contour, index) => {
    const buffer = createCoilBuffer(contour);
    coilContour(contour, index, cycle * 10 + 0.5, 1, slot, buffer);
    return buffer.stages;
  });
  self.postMessage({key, stages}, stages.flatMap(sequence => sequence.map(frame => frame.buffer)));
};

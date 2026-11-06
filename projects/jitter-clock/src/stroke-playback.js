import {sampleCoilStages} from './coil-geometry.js';

const keyFor = (digit, time, slot) => digit + '/' + Math.floor(time / 10) + '/' + slot;

// Keep only the frames for the visible count and its successor. Pausing,
// resetting or switching displays can leave an old worker reply in flight.
export function createStrokePlayback(worker, glyphs, redraw, onFailure) {
  const cache = new Map();
  const sentGlyphs = new Set();
  let signature = '';
  worker.onmessage = ({data: {key, stages}}) => {
    if (!cache.has(key)) return;
    cache.set(key, stages.map(sequence => {
      const xy = new Float64Array(sequence[0].length);
      const points = Array.from({length: xy.length / 2}, (_, i) => xy.subarray(i * 2, i * 2 + 2));
      return {stages: sequence, xy, points};
    }));
    redraw();
  };
  worker.onerror = onFailure;
  worker.onmessageerror = onFailure;
  return {
    schedule(digits, time, nextDigits, nextTime) {
      const currentCycle = Math.floor(time / 10), nextCycle = Math.floor(nextTime / 10);
      const nextSignature = digits + '/' + currentCycle + '/' + nextDigits + '/' + nextCycle;
      if (nextSignature === signature) return;
      signature = nextSignature;
      const wanted = new Set();
      for (const [text, cycle] of [[digits, currentCycle], [nextDigits, nextCycle]]) {
        for (let slot = 0; slot < text.length; slot++) {
          const digit = text[slot], key = keyFor(digit, cycle * 10, slot);
          wanted.add(key);
          if (cache.has(key)) continue;
          cache.set(key, null);
          const glyph = sentGlyphs.has(digit) ? undefined : glyphs[digit];
          worker.postMessage({key, digit, slot, cycle, glyph});
          sentGlyphs.add(digit);
        }
      }
      for (const key of cache.keys()) if (!wanted.has(key)) cache.delete(key);
    },
    contours(digit, time, slot, amount) {
      const paths = cache.get(keyFor(digit, time, slot));
      if (!paths) return null;
      for (const path of paths) sampleCoilStages(path.stages, path.xy, time, amount);
      return paths;
    },
    destroy() { worker.terminate(); cache.clear(); }
  };
}

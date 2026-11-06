import test from 'node:test';
import assert from 'node:assert/strict';
import {createStrokePlayback} from '../src/stroke-playback.js';

test('repeated digits receive independent strands and late replies after a display change are ignored', () => {
  const requests = [];
  const worker = {postMessage: request => requests.push(request), terminate() {}};
  const glyphs = {'1': {}, '2': {}, '9': {}, '0': {}};
  const playback = createStrokePlayback(worker, glyphs, () => {}, assert.fail);
  playback.schedule('11', 3.5, '12', 4);
  playback.schedule('11', 3.7, '12', 4);
  assert.deepEqual(requests.map(r => r.key), ['1/0/0', '1/0/1', '2/0/1']);

  assert.equal(requests[0].glyph, glyphs['1']);
  assert.equal(requests[1].glyph, undefined);

  const sendPositions = (key, x) => worker.onmessage({
    data: {key, stages: [[new Float32Array([0, 0]), new Float32Array([x, 0])]]}
  });
  sendPositions('1/0/0', 1);
  sendPositions('1/0/1', 2);
  const xAt = slot => playback.contours('1', 3.5, slot, 1)[0].points[0][0];
  assert.equal(xAt(1), 2 * xAt(0));

  playback.schedule('9', 18.5, '0', 19);
  sendPositions('2/0/1', 2);
  assert.equal(playback.contours('2', 4, 1, 1), null);
  playback.destroy();
});

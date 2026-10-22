import test from 'node:test';
import assert from 'node:assert/strict';
import { advanceAxis, nearestAngle } from './compass-motion.js';

test('a wall contact preserves travelled distance and reverses direction', () => {
  assert.deepEqual(advanceAxis(98, 10, .5, 0, 100), { position: 97, velocity: -10, bounced: true });
  assert.deepEqual(advanceAxis(2, -10, .5, 0, 100), { position: 3, velocity: 10, bounced: true });
});
test('small viewports and multiple contacts remain within bounds', () => {
  assert.equal(advanceAxis(0, 20, 1, 4, 4).position, 4);
  const result = advanceAxis(5, 20, 2, 0, 10);
  assert.deepEqual(result, { position: 5, velocity: 20, bounced: true });
});
test('needle takes the short path across north, including accumulated spins', () => {
  assert.equal(nearestAngle(359, 1), 361);
  assert.equal(nearestAngle(1, 359), -1);
  assert.equal(nearestAngle(1079, 1), 1081);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { NapField } from '../src/nap-field.js';

const center = (field, x = 0.5, y = 0.5) => {
  const i = Math.floor(y * field.height) * field.width + Math.floor(x * field.width);
  return Array.from(field.vectors.slice(i * 2, i * 2 + 2));
};

test('reverse stroke changes signed lay, crossing overwrites locally, reset is deterministic', () => {
  const field = new NapField(80, 80);
  const baseline = field.pixels.slice();
  field.brush({ x: 0.2, y: 0.5 }, { x: 0.8, y: 0.5 }, 50, 800, 800);
  assert.deepEqual(center(field), [1, 0]);
  field.brush({ x: 0.8, y: 0.5 }, { x: 0.2, y: 0.5 }, 50, 800, 800);
  assert.deepEqual(center(field), [-1, 0]);
  field.brush({ x: 0.5, y: 0.8 }, { x: 0.5, y: 0.2 }, 50, 800, 800);
  assert.deepEqual(center(field), [0, 1]);
  assert.deepEqual(center(field, 0.3, 0.5), [-1, 0]);
  field.reset();
  assert.deepEqual(field.pixels, baseline);
});

test('fast continuous strokes have no gaps, untouched field stays intact', () => {
  const field = new NapField(100, 100);
  const untouched = center(field, 0.5, 0.2);
  field.brush({ x: 0.01, y: 0.5 }, { x: 0.99, y: 0.5 }, 30, 1000, 1000);
  for (let x = 0.1; x < 0.95; x += 0.1) assert.deepEqual(center(field, x), [1, 0]);
  assert.deepEqual(center(field, 0.5, 0.2), untouched);
});

test('zero-length and edge strokes remain finite and vector magnitudes bounded', () => {
  const field = new NapField(40, 40);
  const revision = field.revision;
  assert.equal(field.brush({ x: 0, y: 0 }, { x: 0, y: 0 }, 40, 400, 400), false);
  assert.equal(field.revision, revision);
  for (let i = 0; i < 20; i++) field.brush({ x: 0, y: i / 20 }, { x: 1, y: 1 - i / 20 }, 50, 800, 400, 0.6);
  for (let i = 0; i < field.vectors.length; i += 2) {
    assert.ok(Number.isFinite(field.vectors[i]));
    assert.ok(Math.hypot(field.vectors[i], field.vectors[i + 1]) <= 1.000001);
  }
});

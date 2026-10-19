import test from 'node:test';
import assert from 'node:assert/strict';
import { MODES, SPRINGS, contactPath, createNodes, curveY, frameSteps, graphemes, keepLetterOrder, stepNodes, validateWord } from '../src/geometry.ts';

test('all behaviours settle bounded displacement and release velocity without nonfinite state', () => {
  for (const mode of MODES) {
    const nodes = createNodes(7);
    nodes[3] = { x: 160, y: -180, vx: 280, vy: -400 };
    const targets = nodes.map(() => ({ x: 0, y: 0 }));
    for (let step = 0; step < 2400; step++) stepNodes(nodes, targets, SPRINGS[mode], 1 / 120);
    for (const node of nodes) {
      assert.ok(Number.isFinite(node.x + node.y + node.vx + node.vy), mode);
      assert.ok(Math.abs(node.x) + Math.abs(node.y) < .05, `${mode} must settle`);
    }
  }
});

test('a held letter stays under the pointer and transfers displacement to neighbours', () => {
  const nodes = createNodes(5);
  const targets = nodes.map(() => ({ x: 0, y: 0 }));
  targets[2] = { x: 80, y: -90 };
  for (let i = 0; i < 60; i++) stepNodes(nodes, targets, SPRINGS.heavy, 1 / 120, 2);
  assert.equal(nodes[2].x, 80);
  assert.equal(nodes[2].y, -90);
  assert.ok(nodes[1].y < -5 && nodes[3].y < -5);
});

test('heavy curve has a deep smooth centre and fixed unloaded ends', () => {
  const y = (x: number) => curveY(x, 'heavy', 1400, 700, 240, 1160);
  assert.ok(Math.abs(y(240) - 399) < .0001);
  assert.ok(Math.abs(y(1160) - 399) < .0001);
  assert.ok(y(700) - y(240) > 100);
  assert.ok(Math.abs(y(500) - y(900)) < .0001);
});

test('contact path passes through every requested letter contact', () => {
  const points = [{ x: 0, y: 100 }, { x: 100, y: 150 }, { x: 200, y: 110 }];
  const d = contactPath(points);
  assert.match(d, /100\.00 150\.00/);
  assert.ok(d.endsWith('200.00 110.00'));
  assert.equal(contactPath([]), '');
});

test('letter order remains stable even when dragged across neighbouring letters', () => {
  const result = keepLetterOrder([80, 200, 20, 500], 30, 50, 300);
  assert.ok(result[0] >= 50 && result[3] <= 300);
  for (let i = 1; i < result.length; i++) assert.ok(result[i] - result[i - 1] >= 30);
});

test('wide letter ink reserves enough room when a centre glyph is dragged into neighbours', () => {
  const result = keepLetterOrder([100, 250, 390, 320, 420], [95, 110, 105, 90], 40, 680);
  for (let i = 1; i < result.length; i++) assert.ok(result[i] - result[i - 1] >= [95, 110, 105, 90][i - 1] - .0001);
  assert.ok(result[0] >= 40 && result[4] <= 680);
});

test('input handles composed Unicode and rejects empty, controls and excessive graphemes', () => {
  assert.equal(graphemes('👨‍👩‍👧‍👦').length, 1);
  assert.equal(validateWord('cafe\u0301').value, 'café');
  assert.equal(validateWord('  ').valid, false);
  assert.equal(validateWord('a'.repeat(17)).valid, false);
  assert.equal(validateWord('a'.repeat(16)).valid, true);
  assert.equal(validateWord('hi\nthere').valid, false);
});

test('background-tab elapsed time cannot trigger unbounded simulation catch-up', () => {
  assert.equal(frameSteps(30), 6);
  assert.ok(frameSteps(1 / 60) <= 2);
  assert.equal(frameSteps(-1), 1);
});

test('equal elapsed time gives comparable spring state at 60, 120 and 144 Hz', () => {
  const results = [60, 120, 144].map(hz => {
    const nodes = createNodes(5);
    nodes[2].y = -120;
    const targets = nodes.map(() => ({ x: 0, y: 0 }));
    for (let frame = 0; frame < hz; frame++) {
      const elapsed = 1 / hz;
      const count = frameSteps(elapsed);
      for (let step = 0; step < count; step++) stepNodes(nodes, targets, SPRINGS.heavy, elapsed / count);
    }
    return nodes[2].y;
  });
  assert.ok(Math.max(...results) - Math.min(...results) < .4, `Refresh-rate drift: ${results.join(', ')}`);
});

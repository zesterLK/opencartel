import test from 'node:test';
import assert from 'node:assert/strict';
import { PAGE_LENGTH, PAGE_WIDTH, PRESS_DURATION, FEED_SPEED, SETTLE_DURATION, paperBudget, hangingStrip, releaseStrip, stepStrip, phaseAt, frameDelta } from '../src/paper.ts';

test('input, enclosed transport and emerged paper conserve the original A4 length', () => {
  for (const gap of [.06, .083, .13, .14, .2]) for (let step = -20; step < 800; step++) {
    const b = paperBudget(step / 1000, gap);
    assert.ok(Math.abs(b.above + b.inside + b.below - PAGE_LENGTH) < 1e-12);
    assert.ok(b.above >= 0 && b.inside >= -1e-12 && b.below >= 0);
    assert.ok(b.inside <= gap + 1e-12);
    if (step / 1000 <= gap) assert.equal(b.below, 0, 'no output before leading edge crosses head');
  }
});

test('the page clears the inlet before its trailing edge exits the head', () => {
  const b = paperBudget(PAGE_LENGTH, .13);
  assert.equal(b.above, 0);
  assert.ok(Math.abs(b.inside - .13) < 1e-12);
  assert.ok(Math.abs(paperBudget(PAGE_LENGTH + .13, .13).below - PAGE_LENGTH) < 1e-12);
});

test('hanging ribbons use actual emitted arc length, not an oversized cascade', () => {
  for (const length of [.001, .08, PAGE_LENGTH]) for (let strip = 0; strip < 18; strip++) {
    const p = hangingStrip({ x: 0, y: .79, z: .5 }, strip, length, 1.2);
    const arc = p.slice(1).reduce((sum, b, i) => sum + Math.hypot(b.x - p[i].x, b.y - p[i].y, b.z - p[i].z), 0);
    assert.ok(Math.abs(arc - length) < 1e-10);
    assert.ok(p.every(v => v.y <= .79));
  }
});

test('released paper falls and remains contained without nonfinite state', () => {
  const bounds = { left: -.19, right: .19, back: .4, front: .6, floor: .136 };
  const nodes = releaseStrip(hangingStrip({ x: 0, y: .79, z: .5 }, 8, PAGE_LENGTH, 2), 8);
  for (let step = 0; step < 420; step++) stepStrip(nodes, 1 / 120, bounds);
  assert.ok(nodes.every(n => [n.x, n.y, n.z].every(Number.isFinite)));
  assert.ok(nodes.every(n => n.y >= bounds.floor && n.x >= bounds.left && n.x <= bounds.right && n.z >= bounds.back && n.z <= bounds.front));
  assert.ok(Math.max(...nodes.map(n => n.y)) < .25, 'strip settles into lower bin');
  const arc = nodes.slice(1).reduce((sum, b, i) => sum + Math.hypot(b.x - nodes[i].x, b.y - nodes[i].y, b.z - nodes[i].z), 0);
  assert.ok(Math.abs(arc - PAGE_LENGTH) < PAGE_LENGTH * .06, 'solver preserves ribbon length within six percent');
});

test('release preserves every position and hanging stock stays aligned with its slot', () => {
  for (let strip = 0; strip < 18; strip++) {
    const hanging = hangingStrip({ x: 0, y: .842, z: .61 }, strip, PAGE_LENGTH, 3.8);
    const released = releaseStrip(hanging, strip);
    hanging.forEach((p, i) => {
      assert.deepEqual({ x: released[i].x, y: released[i].y, z: released[i].z }, p, 'release must not teleport material');
      assert.ok(Math.abs(p.x) < PAGE_WIDTH / 2 + .012, 'hanging paper must not splay outside its feed width');
      assert.ok(Math.abs(p.z - .61) < .04, 'hanging paper must remain inside the forward outlet clearance');
    });
  }
});

test('a whole released page settles with distributed footprint, small curls and conserved ribbon lengths', () => {
  const bounds = { left: -.19, right: .19, back: .45, front: .69, floor: .146 };
  const strips = Array.from({ length: 18 }, (_, strip) => releaseStrip(hangingStrip({ x: 0, y: .842, z: .61 }, strip, PAGE_LENGTH, 3.8), strip));
  for (let frame = 0; frame < SETTLE_DURATION * 120; frame++) for (const nodes of strips) stepStrip(nodes, 1 / 120, bounds);
  const all = strips.flat();
  const span = (axis: 'x' | 'y' | 'z') => Math.max(...all.map(p => p[axis])) - Math.min(...all.map(p => p[axis]));
  assert.ok(span('x') > .26 && span('z') > .13, 'the page should cover a meaningful area of the bin, not collapse onto one point');
  assert.ok(span('y') > .004 && span('y') < .10, 'paper keeps small bends without inflating into an artificial heap');
  for (const nodes of strips) {
    assert.ok(nodes.every(n => [n.x, n.y, n.z].every(Number.isFinite)));
    assert.ok(nodes.every(n => n.x >= bounds.left && n.x <= bounds.right && n.z >= bounds.back && n.z <= bounds.front && n.y >= bounds.floor));
    const arc = nodes.slice(1).reduce((sum, b, i) => sum + Math.hypot(b.x - nodes[i].x, b.y - nodes[i].y, b.z - nodes[i].z), 0);
    assert.ok(Math.abs(arc - PAGE_LENGTH) < PAGE_LENGTH * .01, 'every ribbon retains its A4 length to within one percent');
  }
});

test('the cycle has finite press, feed and settle phases', () => {
  const end = PRESS_DURATION + (PAGE_LENGTH + .13) / FEED_SPEED;
  assert.equal(phaseAt(0, .13), 'pressing');
  assert.equal(phaseAt(PRESS_DURATION, .13), 'feeding');
  assert.equal(phaseAt(end, .13), 'settling');
  assert.equal(phaseAt(end + SETTLE_DURATION, .13), 'complete');
});

test('hidden or first frames never advance, long foreground frames are bounded', () => {
  assert.equal(frameDelta(0, 9000), 0);
  assert.equal(frameDelta(1000, 9000, true), 0);
  assert.equal(frameDelta(1000, 9000), 1 / 30);
  assert.equal(frameDelta(1000, 1010), .01);
  assert.equal(frameDelta(2000, 1000), 0);
});

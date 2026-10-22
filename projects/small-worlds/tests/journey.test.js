import test from 'node:test';
import assert from 'node:assert/strict';
import { ancestorTransform, cameraForDepth, childTransform, compose, coverView, inverse, mod, point, validatePlates } from '../src/journey.js';
const plates = [
  { width: 1586, height: 992, portal: { x: 612, y: 237, width: 207, height: 308 } },
  { width: 1024, height: 1536, portal: { x: 342, y: 638, width: 232, height: 324 }, childView: { x: 400, y: 0, width: 550, height: 760 } },
];
const close = (a, b, tolerance = 1e-7) => assert.ok(Math.abs(a - b) <= tolerance, `${a} differs from ${b}`);
function sameTransform(a, b, tolerance = 1e-7) { for (const key of ['scale', 'x', 'y']) close(a[key], b[key], tolerance); }

test('child crop covers the portal uniformly and keeps its center', () => {
  for (let i = 0; i < plates.length; i++) {
    const parent = plates[i], child = plates[(i + 1) % plates.length];
    const crop = parent.childView || { x: 0, y: 0, width: child.width, height: child.height };
    const t = childTransform(parent, child);
    const c = point(t, crop.x + crop.width / 2, crop.y + crop.height / 2);
    close(c.x, parent.portal.x + parent.portal.width / 2);
    close(c.y, parent.portal.y + parent.portal.height / 2);
    assert.ok(crop.width * t.scale >= parent.portal.width - 1e-8);
    assert.ok(crop.height * t.scale >= parent.portal.height - 1e-8);
    sameTransform(compose(t, inverse(t)), { scale: 1, x: 0, y: 0 });
  }
});

test('both joins preserve child screen positions forward and backward at desktop and phone sizes', () => {
  for (const [w, h] of [[1440, 900], [390, 844], [320, 568]]) {
    for (let join = -4; join <= 4; join++) {
      const before = cameraForDepth(plates, join - 1e-9, w, h);
      const after = cameraForDepth(plates, join, w, h);
      const link = childTransform(plates[before.index], plates[after.index]);
      const childBefore = compose(before.transform, link);
      sameTransform(childBefore, after.transform, 0.0001);
      for (const [x, y] of [[0, 0], [300, 500], [1000, 1000]]) {
        const a = point(childBefore, x, y), b = point(after.transform, x, y);
        close(a.x, b.x, 0.0001); close(a.y, b.y, 0.0001);
      }
    }
  }
});

test('negative traversal and many full cycles retain the exact same frame', () => {
  for (const depth of [-1.75, -.2, 0, .3, 1.99]) {
    const expected = cameraForDepth(plates, depth, 1280, 720);
    for (const cycles of [-1000, -5, 5, 1000]) {
      const actual = cameraForDepth(plates, depth + cycles * 2, 1280, 720);
      assert.equal(actual.index, expected.index);
      sameTransform(actual.transform, expected.transform, 1e-7);
    }
  }
  assert.equal(mod(-1, 2), 1);
});

test('ancestor chain composed down to current plate is identity', () => {
  for (let current = 0; current < plates.length; current++) {
    for (let count = 1; count <= 5; count++) {
      let t = ancestorTransform(plates, current, count);
      for (let i = current - count; i < current; i++) {
        const index = mod(i, plates.length);
        t = compose(t, childTransform(plates[index], plates[(index + 1) % plates.length]));
      }
      sameTransform(t, { scale: 1, x: 0, y: 0 }, 1e-7);
    }
  }
});

test('canonical views cover the viewport and invalid geometry is rejected', () => {
  validatePlates(plates);
  const t = coverView(plates[0], 390, 844);
  assert.ok(plates[0].width * t.scale >= 390);
  assert.ok(plates[0].height * t.scale >= 844);
  assert.throws(() => validatePlates([]));
  assert.throws(() => validatePlates([{ ...plates[0], portal: { x: -1, y: 0, width: 5, height: 5 } }]));
  assert.throws(() => cameraForDepth(plates, Infinity, 100, 100));
});


test('bounded introduction starts with full master and meets the recursive route without a jump', () => {
  const framed = [{ ...plates[0], view: { x: 400, y: 0, width: 550, height: 760 } }, plates[1]];
  const initial = cameraForDepth(framed, 0, 1280, 720, { intro: true });
  sameTransform(initial.transform, coverView(plates[0], 1280, 720));
  sameTransform(cameraForDepth(framed, -10, 1280, 720, { intro: true }).transform, initial.transform);
  for (const join of [1, 2, 3, 4, 5]) {
    const a = cameraForDepth(framed, join - 1e-9, 1280, 720, { intro: true });
    const b = cameraForDepth(framed, join, 1280, 720, { intro: true });
    sameTransform(compose(a.transform, childTransform(framed[a.index], framed[b.index])), b.transform, .0001);
  }
  sameTransform(cameraForDepth(framed, 2, 1280, 720, { intro: true }).transform, coverView(framed[0], 1280, 720));
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareGlyph, coilContour, createCoilBuffer, insideGlyph} from '../src/coil-geometry.js';
import {envelope} from '../src/clock-math.js';

const source = JSON.parse(readFileSync(new URL('../src/contours.json', import.meta.url)));
const glyphs = Object.fromEntries(Object.entries(source).map(([key, glyph]) => [key, prepareGlyph(glyph)]));
const distance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const length = path => path.reduce((sum, p, i) => sum + distance(p, path[(i + 1) % path.length]), 0);
const pathAt = (contour, time, buffer) => coilContour(contour, 0, time, envelope(time % 1), 0, buffer);

test('all digits start exactly on the outline and do not rewind before the next beat', () => {
  for (const [digit, glyph] of Object.entries(glyphs)) {
    const time = (Number(digit) + 9) % 10;
    for (const c of glyph.prepared) {
      const buffer = createCoilBuffer(c);
      const clean = pathAt(c, time, buffer);
      for (let i = 0; i < c.length; i++) assert.deepEqual([...clean[i]], [c[i].x, c[i].y]);
      const mid = length(pathAt(c, time + .5, buffer));
      const late = length(pathAt(c, time + .995, buffer));
      assert.ok(late > mid * .95, `digit ${digit} contracted before its beat ended`);
    }
  }
});

test('the first lap opens quickly and the second develops broader, longer folds', () => {
  for (const digit of ['1', '4', '6', '8']) {
    const time = Number(digit) - 1, c = glyphs[digit].prepared[0];
    const buffer = createCoilBuffer(c);
    const measure = t => {
      const path = pathAt(c, t, buffer), ys = path.map(p => p[1]);
      return {length:length(path), height:Math.max(...ys) - Math.min(...ys)};
    };
    const early = measure(time + .15), first = measure(time + .5), second = measure(time + 10.5);
    assert.ok(early.length > c.perimeter * 1.6, `digit ${digit} stays flat during opening`);
    assert.ok(second.length > first.length * 1.45, `digit ${digit} repeats first lap density`);
    assert.ok(second.height > first.height + .08, `digit ${digit} repeats first lap envelope`);
  }
});

test('the expanded line continues moving smoothly without long isolated needle tips', () => {
  for (const [digit, glyph] of Object.entries(glyphs)) {
    const time = (Number(digit) + 9) % 10;
    for (const c of glyph.prepared) {
      const buffer = createCoilBuffer(c);
      for (const lap of [0, 10]) {
        const mid = pathAt(c, lap + time + .5, buffer).map(p => [...p]);
        const late = pathAt(c, lap + time + .8, buffer);
        assert.ok(late.some((p, i) => distance(p, mid[i]) > .001), 'held completely still');
        for (let i = 0; i < late.length; i++) {
          const a = late.at(i-1), b = late[i], d = late[(i+1) % late.length];
          // A sharp turn is appropriate on contact. A single isolated vertex cannot
          // leap away and return along a pair of long, overlapping line segments.
          assert.ok(Math.min(distance(a,b), distance(b,d)) < .025 || distance(a,d) > .02,
            `isolated point on digit ${digit}`);
        }
        const last = late.map(p => [...p]);
        const next = pathAt(c, lap + time + .801, buffer);
        assert.ok(next.every((p, i) => distance(p,last[i]) < .0005), 'mature phase jumped');
      }
    }
  }
});

test('the mesh spans the openings of the closed 4, 6 and 8', () => {
  for (const digit of ['4', '6', '8']) {
    for (const c of glyphs[digit].prepared.slice(1)) {
      const buffer = createCoilBuffer(c), path = pathAt(c, Number(digit) + 9.5, buffer);
      const xs=c.map(p => p.x), ys=c.map(p => p.y);
      const left=Math.min(...xs), top=Math.min(...ys);
      const width=Math.max(...xs)-left, height=Math.max(...ys)-top;
      const bins=new Set();
      for (const p of path) {
        if (insideGlyph(source[digit].contours, ...p)) continue;
        const x=Math.floor(5*(p[0]-left)/width), y=Math.floor(5*(p[1]-top)/height);
        bins.add(x+5*y);
      }
      assert.ok(bins.size>=12, `digit ${digit} has a collapsed counter mesh`);
    }
  }
});

test('seeking across laps and slots is repeatable and preserves the output buffer', () => {
  const c = glyphs['6'].prepared[0], buffer = createCoilBuffer(c);
  const first = pathAt(c, 15.5, buffer).map(p => [...p]);
  coilContour(c, 0, 5.6, 1, 4, buffer);
  const repeat = pathAt(c, 15.5, buffer);
  assert.equal(repeat, buffer.points);
  for (let i = 0; i < repeat.length; i++) assert.deepEqual([...repeat[i]], first[i]);
});

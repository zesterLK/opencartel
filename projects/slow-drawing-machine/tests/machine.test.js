import test from 'node:test';
import assert from 'node:assert/strict';
import {mountMachine} from '../src/machine.js';
import {penAt, PRESETS} from '../src/kinematics.js';

// This is a deterministic state/ink harness, not a browser or timing benchmark.
function canvasContext() {
  let path = [];
  return {
    strokes: [],
    clearRect() { this.strokes = []; },
    beginPath() { path = []; },
    moveTo(x, y) { path.push({command: 'M', x, y}); },
    lineTo(x, y) { path.push({command: 'L', x, y}); },
    stroke() {
      this.strokes.push({color: this.strokeStyle, width: this.lineWidth, points: path.map(p => ({...p}))});
    },
    createLinearGradient() { return {addColorStop() {}}; },
    createRadialGradient() { return {addColorStop() {}}; },
    save() {}, restore() {}, translate() {}, rotate() {}, setTransform() {},
    roundRect() {}, fill() {}, arc() {}, fillRect() {}, closePath() {},
  };
}

function harness(t, width = 1280, height = 720) {
  let now = 0, nextFrame = 0, resizeCallback;
  const queue = new Map(), listeners = new Map();
  const viewport = {width, height}, inkContext = canvasContext(), rigContext = canvasContext();
  const globals = {
    innerWidth: width, innerHeight: height, devicePixelRatio: 1,
    performance: {now: () => now},
    requestAnimationFrame(callback) { const id = ++nextFrame; queue.set(id, callback); return id; },
    cancelAnimationFrame(id) { queue.delete(id); },
    document: {
      hidden: false,
      addEventListener(type, callback) { listeners.set(type, callback); },
      removeEventListener(type) { listeners.delete(type); },
    },
    ResizeObserver: class {
      constructor(callback) { resizeCallback = callback; }
      observe() {}
      disconnect() {}
    },
  };
  const originals = new Map(Object.keys(globals).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  for (const [key, value] of Object.entries(globals)) Object.defineProperty(globalThis, key, {configurable: true, writable: true, value});
  const canvas = context => ({getContext: () => context, getBoundingClientRect: () => ({...viewport})});
  const machine = mountMachine(canvas(inkContext), canvas(rigContext));
  t.after(() => {
    machine.destroy();
    for (const [key, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  });
  return {
    machine, ink: inkContext,
    get pendingFrames() { return queue.size; },
    frames(count = 1, milliseconds = 20) {
      for (let i = 0; i < count; i++) {
        now += milliseconds;
        const callbacks = [...queue.values()];
        queue.clear();
        callbacks.forEach(callback => callback(now));
      }
    },
    resize(nextWidth, nextHeight) { Object.assign(viewport, {width: nextWidth, height: nextHeight}); resizeCallback(); },
  };
}

function svgPaths(svg) {
  return [...svg.matchAll(/<path d="([^"]*)"[^>]*stroke="([^"]*)"[^>]*stroke-width="([^"]*)"/g)].map(([, d, color, width]) => ({
    color, width: Number(width),
    points: [...d.matchAll(/([ML])(-?[\d.]+) (-?[\d.]+)/g)].map(([, command, x, y]) => ({command, x: Number(x), y: Number(y)})),
  }));
}

function nearPoint(actual, expected, tolerance = .001) {
  assert.ok(Math.hypot(actual.x - expected.x, actual.y - expected.y) <= tolerance,
    `Expected (${expected.x}, ${expected.y}), received (${actual.x}, ${actual.y})`);
}

test('moving the pen records a separate SVG stroke and never inks the relocation', t => {
  const h = harness(t);
  h.frames(20);
  const beforeSVG = h.machine.svg(), beforeInk = h.ink.strokes.length;
  const originalPath = svgPaths(beforeSVG)[0], drop = {x: 170, y: 610};
  assert.equal(h.machine.beginMove(), true);
  h.machine.moveTo(drop.x, drop.y);
  h.frames(10);
  assert.equal(h.pendingFrames, 0);
  assert.equal(h.machine.svg(), beforeSVG);
  assert.equal(h.ink.strokes.length, beforeInk);
  h.machine.endMove();
  h.frames(3);
  const paths = svgPaths(h.machine.svg());
  assert.equal(paths.length, 2);
  assert.deepEqual(paths[0], originalPath);
  nearPoint(paths[1].points[0], drop);
  nearPoint(h.ink.strokes[beforeInk].points[0], drop);
  nearPoint(paths[1].points.at(-1), h.machine.penPosition());
});

test('a drop after resize reaches the new canvas and preserves old ink geometry and width', t => {
  const h = harness(t);
  h.frames(20);
  h.machine.setPaused(true);
  h.resize(390, 844);
  const oldInk = structuredClone(h.ink.strokes[0]);
  const drop = {x: 195, y: 650};
  assert.equal(h.machine.beginMove(), true);
  h.machine.moveTo(drop.x, drop.y);
  nearPoint(h.machine.penPosition(), drop);
  h.machine.endMove();
  assert.equal(h.pendingFrames, 0);
  nearPoint(h.machine.penPosition(), drop);
  const svg = h.machine.svg(), oldPath = svgPaths(svg)[0];
  assert.match(svg, /viewBox="0 0 390 844"/);
  assert.equal(oldPath.points.length, oldInk.points.length);
  oldPath.points.forEach((point, i) => nearPoint(point, oldInk.points[i]));
  assert.ok(Math.abs(oldPath.width - oldInk.width) < 1e-8);
  assert.ok(Math.abs(h.ink.strokes[0].width - oldInk.width) < 1e-8);
  h.machine.setPaused(false);
  h.frames(3);
  const placed = svgPaths(h.machine.svg())[1];
  nearPoint(placed.points[0], drop);
  assert.equal(placed.width, .65);
});

test('colour changes during a lifted transition start at its destination in live ink and SVG', t => {
  const h = harness(t);
  h.frames(30);
  h.machine.setSettings({fx: 3});
  h.frames(5);
  const inTransit = h.machine.penPosition();
  const destination = penAt(0, {...PRESETS.bloom, fx: 3}, 1280, 720);
  assert.ok(Math.hypot(inTransit.x - destination.x, inTransit.y - destination.y) > 1);
  h.machine.setColor('#a24232');
  h.frames(30);
  const redPath = svgPaths(h.machine.svg()).find(path => path.color === '#a24232');
  assert.ok(redPath?.points.length > 1);
  nearPoint(redPath.points[0], destination);
  nearPoint(h.ink.strokes.find(stroke => stroke.color === '#a24232').points[0], destination);
  h.resize(1280, 720);
  const replayed = h.ink.strokes.find(stroke => stroke.color === '#a24232');
  assert.equal(replayed.points.length, redPath.points.length);
  replayed.points.forEach((point, i) => nearPoint(point, redPath.points[i]));
});

test('paused cancellation restores the pen without ink and a paused drop waits for release', t => {
  const h = harness(t);
  h.frames(20);
  h.machine.setPaused(true);
  const beforeSVG = h.machine.svg(), beforePen = h.machine.penPosition();
  h.machine.beginMove();
  h.machine.moveTo(200, 600);
  h.machine.endMove(true);
  nearPoint(h.machine.penPosition(), beforePen);
  assert.equal(h.machine.svg(), beforeSVG);
  assert.equal(h.pendingFrames, 0);
  h.machine.beginMove();
  h.machine.moveTo(220, 580);
  h.machine.endMove();
  h.frames(10);
  nearPoint(h.machine.penPosition(), {x: 220, y: 580});
  assert.equal(h.machine.svg(), beforeSVG);
  assert.equal(h.pendingFrames, 0);
  h.machine.setPaused(false);
  h.frames(3);
  const paths = svgPaths(h.machine.svg());
  assert.equal(paths.length, 2);
  nearPoint(paths[1].points[0], {x: 220, y: 580});
});

test('cancelled drag during transit restores that transition without adding relocation ink', t => {
  const h = harness(t);
  h.frames(30);
  h.machine.setSettings({fx: 3});
  h.frames(5);
  const beforeSVG = h.machine.svg(), beforePen = h.machine.penPosition(), beforeInk = h.ink.strokes.length;
  h.machine.beginMove();
  h.machine.moveTo(130, 620);
  h.frames(20);
  h.machine.endMove(true);
  nearPoint(h.machine.penPosition(), beforePen);
  assert.equal(h.machine.svg(), beforeSVG);
  assert.equal(h.ink.strokes.length, beforeInk);
  assert.equal(h.pendingFrames, 1);
  h.frames(30);
  const paths = svgPaths(h.machine.svg());
  assert.equal(paths.length, 2);
  nearPoint(paths[1].points[0], penAt(0, {...PRESETS.bloom, fx: 3}, 1280, 720));
  nearPoint(h.ink.strokes[beforeInk].points[0], paths[1].points[0]);
});

test('the mounted machine starts at quarter speed and clamps to a tenfold maximum', t => {
  const h = harness(t);
  h.frames(1, 50);
  assert.equal(svgPaths(h.machine.svg())[0].points.length, 2);
  h.machine.setSpeed(10);
  h.frames(1, 50);
  assert.equal(svgPaths(h.machine.svg())[0].points.length, 62);
  h.machine.setSpeed(100);
  h.frames(1, 50);
  assert.equal(svgPaths(h.machine.svg())[0].points.length, 122);
});

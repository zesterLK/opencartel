import opentype from 'opentype.js';
import type { Font, PathCommand } from 'opentype.js';
import './style.css';
import './ui.css';
import './cursor.css';
import { mountCursor } from './cursor.js';
import './motion.css';
import { mountPageMotion, openDialog, closeDialog } from './motion.js';
import { MODES, SPRINGS, clamp, contactPath, createNodes, curveY, frameSteps, keepLetterOrder, stepNodes, validateWord } from './geometry.ts';
import type { Mode, Point, SpringNode } from './geometry.ts';

const disposeCursor = mountCursor();
const disposeMotion = mountPageMotion();
import.meta.hot?.dispose(disposeMotion);
import.meta.hot?.dispose(disposeCursor);

const $ = <T extends Element>(selector: string) => document.querySelector<T>(selector)!;
const svgNS = 'http://www.w3.org/2000/svg';
const stage = $<SVGSVGElement>('#stage');
const glyphLayer = $<SVGGElement>('#glyphs');
const baseline = $<SVGPathElement>('#baseline');
const ghost = $<SVGPathElement>('#ghost-line');
const fallbackWord = $<SVGTextElement>('#fallback-word');
const input = $<HTMLInputElement>('#word-input');
const message = $<HTMLSpanElement>('#word-message');
const help = $<HTMLParagraphElement>('#stage-help');
const loading = $<HTMLParagraphElement>('#loading');
const dialog = $<HTMLDialogElement>('#info-dialog');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const helpText: Record<Mode, string> = {
  heavy: 'Lift a letter.', stretch: 'Pull sideways.', balance: 'Move the weight.' ,
  whisper: 'Move closer.', melt: 'Pull down.', bounce: 'Lift and release.',
};

type Glyph = { cx: number; width: number; height: number; commands: PathCommand[]; d: string; group: SVGGElement; ink: SVGPathElement; hit: SVGRectElement };
type Drag = { index: number; id: number | null; origin: Point; initial: Point; target: Point; last: Point; time: number; velocity: Point };
let font: Font | null = null;
let glyphs: Glyph[] = [];
let nodes: SpringNode[] = [];
let mode: Mode = 'heavy';
let word = 'heavy';
let width = 1400;
let height = 700;
let advance = 2800;
let inkHeight = 760;
let scale = 1;
let left = 0;
let right = 1400;
let drag: Drag | null = null;
let hover: Point | null = null;
let frame = 0;
let previousTime = 0;
let fallback = false;
let composing = false;
let fallbackNode: SpringNode = createNodes(1)[0];
let currentContacts: Point[] = [];
let introDone = false;

function announce(text: string): void { $('#announcement').textContent = text; }

function svgElement<K extends keyof SVGElementTagNameMap>(tag: K): SVGElementTagNameMap[K] {
  return document.createElementNS(svgNS, tag);
}

function setMessage(text: string, error = false): void {
  message.textContent = text;
  message.classList.toggle('is-error', error);
  input.setAttribute('aria-invalid', String(error));
}

function commandsToPath(commands: PathCommand[], warp = 0, glyphHeight = 1, seed = 0): string {
  let previous = { x: 0, y: 0 };
  const p = (x: number, y: number) => {
    const depth = clamp(1 + y / Math.max(1, glyphHeight), 0, 1);
    const drip = warp * depth ** 2.2 * (.66 + .34 * Math.sin(x / 39 + seed));
    return `${x.toFixed(2)} ${(y + drip).toFixed(2)}`;
  };
  return commands.map(c => {
    if (c.type === 'Z') return 'Z';
    if (c.type === 'M' || c.type === 'L') {
      const from = previous;
      previous = { x: c.x, y: c.y };
      if (c.type === 'L' && warp > 0) {
        const steps = Math.max(1, Math.ceil(Math.hypot(c.x - from.x, c.y - from.y) / 22));
        return Array.from({ length: steps }, (_, i) => `L${p(from.x + (c.x - from.x) * (i + 1) / steps, from.y + (c.y - from.y) * (i + 1) / steps)}`).join('');
      }
      return `${c.type}${p(c.x, c.y)}`;
    }
    previous = { x: c.x, y: c.y };
    if (c.type === 'Q') return `Q${p(c.x1, c.y1)} ${p(c.x, c.y)}`;
    return `C${p(c.x1, c.y1)} ${p(c.x2, c.y2)} ${p(c.x, c.y)}`;
  }).join('');
}

function prepareWord(): void {
  release(false);
  glyphLayer.replaceChildren();
  glyphs = [];
  fallback = !font || !/^[\p{Script=Latin}\p{Number}\p{Punctuation}\p{Separator}\p{Mark}]+$/u.test(word) || [...word].some(c => c !== ' ' && !font!.hasChar(c));
  if (!fallback && font) {
    advance = font.getAdvanceWidth(word, 1000, { kerning: true });
    for (const path of font.getPaths(word, 0, 0, 1000, { kerning: true })) {
      if (!path.commands.length) continue;
      const box = path.getBoundingBox();
      const cx = (box.x1 + box.x2) / 2;
      const bottom = box.y2;
      const commands = path.commands.map(command => {
        const c = { ...command } as PathCommand & Record<string, number | string>;
        for (const key of ['x', 'x1', 'x2']) if (typeof c[key] === 'number') c[key] = (c[key] as number) - cx;
        for (const key of ['y', 'y1', 'y2']) if (typeof c[key] === 'number') c[key] = (c[key] as number) - bottom;
        return c;
      });
      const group = svgElement('g');
      const ink = svgElement('path');
      const hit = svgElement('rect');
      ink.classList.add('glyph-ink');
      hit.classList.add('glyph-hit');
      const d = commandsToPath(commands);
      ink.setAttribute('d', d);
      group.append(ink, hit);
      glyphLayer.append(group);
      glyphs.push({ cx, width: box.x2 - box.x1, height: box.y2 - box.y1, commands, d, group, ink, hit });
    }
    inkHeight = Math.max(1, ...glyphs.map(g => g.height));
    if (!glyphs.length) fallback = true;
  }
  nodes = createNodes(glyphs.length);
  fallbackNode = createNodes(1)[0];
  fallbackWord.textContent = word;
  fallbackWord.toggleAttribute('hidden', !fallback);
  glyphLayer.toggleAttribute('hidden', fallback);
  if (fallback) setMessage(font ? 'Simpler motion for these characters.' : 'Font unavailable · simpler motion.');
  else if (!message.classList.contains('is-error')) setMessage('');
  $('#scene-title').textContent = `${word} — ${mode} behaviour`;
  stage.setAttribute('aria-label', `${word}. ${mode} behaviour. Interactive word playground.`);
  resize();
}

function resize(): void {
  const rect = stage.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  if (drag) release(false);
  width = rect.width;
  height = rect.height;
  stage.setAttribute('viewBox', `0 0 ${width} ${height}`);
  const availableWidth = width * (width < 650 ? .87 : .65);
  scale = Math.min(availableWidth / Math.max(advance, 1), height * .54 / inkHeight);
  const wordWidth = advance * scale;
  left = Math.max(width * .035, (width - wordWidth) / 2 - Math.min(width * .08, 100));
  right = Math.min(width * .965, (width + wordWidth) / 2 + Math.min(width * .08, 100));
  for (const glyph of glyphs) {
    const pad = Math.max(14 / scale, 15);
    glyph.hit.setAttribute('x', String(-glyph.width / 2 - pad));
    glyph.hit.setAttribute('y', String(-glyph.height - pad));
    glyph.hit.setAttribute('width', String(glyph.width + pad * 2));
    glyph.hit.setAttribute('height', String(glyph.height + pad * 2));
  }
  ghost.setAttribute('d', `M${width * .025} ${height * .57}H${width * .975}`);
  if (fallback) {
    const maxSize = Math.min(height * .5, width * .5);
    fallbackWord.setAttribute('font-size', String(maxSize));
    const measured = fallbackWord.getComputedTextLength();
    fallbackWord.setAttribute('font-size', String(Math.min(maxSize, width * .75 * maxSize / Math.max(1, measured))));
  }
  wake();
}

function homeX(glyph: Glyph): number { return (width - advance * scale) / 2 + glyph.cx * scale; }

function targetFor(i: number): Point {
  if (drag?.index === i) return drag.target;
  if (mode === 'balance' && drag) return { x: drag.target.x, y: drag.target.y * .2 };
  if (mode === 'whisper' && hover && glyphs[i]) {
    const gx = homeX(glyphs[i]);
    const gy = curveY(gx, mode, width, height, left, right) - glyphs[i].height * scale * .4;
    const distance = Math.hypot(hover.x - gx, (hover.y - gy) * .5);
    const proximity = Math.exp(-((distance / Math.max(70, width * .12)) ** 2));
    return { x: Math.sign(gx - hover.x) * proximity * 11, y: -proximity * Math.min(22, height * .06) };
  }
  return { x: 0, y: 0 };
}

function tick(now: number): void {
  frame = 0;
  if (document.hidden) { previousTime = 0; return; }
  const elapsed = previousTime ? (now - previousTime) / 1000 : 1 / 60;
  previousTime = now;
  const activeNodes = fallback ? [fallbackNode] : nodes;
  const before = activeNodes.map(node => ({ x: node.x, y: node.y }));
  const targets = activeNodes.map((_, i) => fallback ? (drag?.target || { x: 0, y: 0 }) : targetFor(i));
  if (reducedMotion.matches) activeNodes.forEach((node, i) => Object.assign(node, { ...targets[i], vx: 0, vy: 0 }));
  else {
    const steps = frameSteps(elapsed);
    const dt = clamp(elapsed, 0, .05) / steps;
    for (let s = 0; s < steps; s++) stepNodes(activeNodes, targets, SPRINGS[mode], dt, drag?.index ?? -1);
  }
  render();
  const moving = activeNodes.some((node, i) => Math.abs(node.vx) + Math.abs(node.vy) > .08 || Math.abs(node.x - before[i].x) + Math.abs(node.y - before[i].y) > .002);
  if (!reducedMotion.matches && (moving || drag)) frame = requestAnimationFrame(tick);
  else previousTime = 0;
}

function wake(): void {
  if (!frame && !document.hidden) frame = requestAnimationFrame(tick);
}

function render(): void {
  const padding = width * .025;
  const y = height * .57;
  const tilt = mode === 'balance' ? clamp(nodes.reduce((sum, node) => sum + node.x, 0) / Math.max(1, nodes.length) / Math.max(45, width * .06), -.95, .95) * .29 : 0;
  const fulcrum = $('#fulcrum');
  fulcrum.toggleAttribute('hidden', mode !== 'balance');
  const fulcrumY = curveY(width / 2, 'balance', width, height, left, right) + 4;
  fulcrum.setAttribute('d', `M${width / 2} ${fulcrumY}l-5 7h10Z`);
  if (fallback) {
    const cx = width / 2 + fallbackNode.x;
    const cy = curveY(cx, mode, width, height, left, right) + fallbackNode.y;
    const angle = mode === 'balance' ? clamp(fallbackNode.x / 5, -18, 18) : 0;
    const stretch = mode === 'stretch' ? 1 + Math.abs(fallbackNode.x) / Math.max(140, width * .4) : 1;
    fallbackWord.setAttribute('transform', `translate(${cx} ${cy}) rotate(${angle}) scale(${stretch} 1)`);
    baseline.setAttribute('d', contactPath([{ x: padding, y }, { x: left, y }, { x: cx, y: cy + 2 }, { x: right, y }, { x: width - padding, y }]));
    currentContacts = [{ x: cx, y: cy }];
    return;
  }
  const balanceShift = nodes.reduce((sum, node) => sum + node.x, 0) / Math.max(1, nodes.length);
  const inkWidths = glyphs.map((g, i) => g.width * scale * (mode === 'stretch' ? 1 + Math.min(.48, Math.abs(nodes[i].x) / Math.max(90, width * .1)) : 1));
  const gaps = inkWidths.slice(1).map((value, i) => (value + inkWidths[i]) * .43);
  const positions = keepLetterOrder(glyphs.map((g, i) => homeX(g) + (mode === 'balance' ? balanceShift : nodes[i].x)), gaps, left + 8, right - 8);
  currentContacts = glyphs.map((g, i) => ({ x: positions[i], y: curveY(positions[i], mode, width, height, left, right, tilt) + nodes[i].y * (mode === 'melt' ? .18 : mode === 'balance' ? .12 : 1) }));
  const contacts: Point[] = [{ x: padding, y }, { x: left, y }, ...currentContacts, { x: right, y }, { x: width - padding, y }];
  baseline.setAttribute('d', contactPath(contacts));
  ghost.style.opacity = mode === 'heavy' ? '.48' : '.19';
  glyphs.forEach((g, i) => {
    const point = currentContacts[i];
    const before = contacts[i + 1];
    const after = contacts[i + 3];
    const tangent = Math.atan2(after.y - before.y, after.x - before.x);
    const angle = clamp(tangent * 180 / Math.PI, -25, 25) * (mode === 'stretch' ? .23 : .8);
    let sx = 1;
    let sy = 1;
    let opacity = 1;
    let warp = 0;
    if (mode === 'stretch') {
      sx = 1 + Math.min(.48, Math.abs(nodes[i].x) / Math.max(90, width * .1));
      sy = 1 / Math.sqrt(sx);
    } else if (mode === 'whisper') {
      const proximity = Math.min(1, Math.abs(nodes[i].y) / 17);
      opacity = .52 + proximity * .48;
      sx = sy = .96 + proximity * .04;
    } else if (mode === 'melt') {
      warp = Math.max(0, nodes[i].y) / scale * .9;
      sy = 1 - Math.min(.24, Math.max(0, nodes[i].y) / Math.max(80, height));
    } else if (mode === 'bounce') {
      const squash = clamp(nodes[i].vy / 2200, -.1, .12);
      sx = 1 + squash;
      sy = 1 - squash;
    }
    g.group.setAttribute('transform', `translate(${point.x.toFixed(2)} ${point.y.toFixed(2)}) rotate(${angle.toFixed(3)}) scale(${(scale * sx).toFixed(6)} ${(scale * sy).toFixed(6)})`);
    g.ink.setAttribute('opacity', opacity.toFixed(3));
    g.ink.setAttribute('d', warp > .05 ? commandsToPath(g.commands, warp, g.height, i * 1.7) : g.d);
  });
}

function toPoint(event: PointerEvent): Point {
  const matrix = stage.getScreenCTM();
  if (!matrix) return { x: 0, y: 0 };
  const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
  return { x: point.x, y: point.y };
}

function nearest(point: Point): number {
  if (fallback) return 0;
  let index = -1;
  let distance = Infinity;
  glyphs.forEach((glyph, i) => {
    const contact = currentContacts[i] || { x: homeX(glyph), y: height * .6 };
    const dx = point.x - contact.x;
    const dy = point.y - (contact.y - glyph.height * scale / 2);
    const d = Math.hypot(dx, dy * .45);
    if (d < distance) { distance = d; index = i; }
  });
  return index;
}

function boundedTarget(x: number, y: number): Point {
  const limit = Math.min(190, width * .2);
  return {
    x: clamp(x, -limit, limit),
    y: mode === 'melt' ? clamp(y, -35, Math.min(115, height * .3)) : clamp(y, -Math.min(210, height * .42), Math.min(80, height * .2)),
  };
}

function begin(index: number, point: Point, id: number | null): Drag | null {
  if (index < 0) return null;
  const node = fallback ? fallbackNode : nodes[index];
  drag = { index, id, origin: point, initial: { x: node.x, y: node.y }, target: { x: node.x, y: node.y }, last: point, time: performance.now(), velocity: { x: 0, y: 0 } };
  stage.classList.add('is-dragging');
  help.style.opacity = '.25';
  wake();
  return drag;
}

function release(impulse = true): void {
  if (!drag) return;
  const held = drag;
  const node = fallback ? fallbackNode : nodes[held.index];
  drag = null;
  if (node) {
    node.vx = reducedMotion.matches || !impulse ? 0 : clamp(held.velocity.x * .45, -280, 280);
    node.vy = reducedMotion.matches || !impulse ? 0 : clamp(held.velocity.y * .45, -400, 400);
    if (mode === 'bounce' && impulse && !reducedMotion.matches) node.vy = Math.min(-280, node.vy);
    if (reducedMotion.matches) { node.x = 0; node.y = 0; }
  }
  if (held.id !== null && stage.hasPointerCapture(held.id)) stage.releasePointerCapture(held.id);
  stage.classList.remove('is-dragging');
  help.style.opacity = '1';
  wake();
}

stage.addEventListener('pointerdown', event => {
  if (!event.isPrimary || event.button !== 0 || drag) return;
  const point = toPoint(event);
  begin(nearest(point), point, event.pointerId);
  if (drag) stage.setPointerCapture(event.pointerId);
});
stage.addEventListener('pointermove', event => {
  const point = toPoint(event);
  hover = point;
  if (drag?.id === event.pointerId) {
    const now = performance.now();
    const dt = Math.max(.008, (now - drag.time) / 1000);
    drag.velocity = { x: (point.x - drag.last.x) / dt, y: (point.y - drag.last.y) / dt };
    drag.last = point;
    drag.time = now;
    drag.target = boundedTarget(drag.initial.x + point.x - drag.origin.x, drag.initial.y + point.y - drag.origin.y);
    wake();
  } else if (mode === 'whisper') wake();
});
stage.addEventListener('pointerup', event => { if (drag?.id === event.pointerId) release(); });
stage.addEventListener('pointercancel', () => { hover = null; release(false); });
stage.addEventListener('lostpointercapture', () => release(false));
stage.addEventListener('pointerleave', () => { if (!drag) { hover = null; wake(); } });
stage.addEventListener('keydown', event => {
  if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' ', 'Escape'].includes(event.key)) return;
  event.preventDefault();
  if (event.key === 'Escape') { release(false); return; }
  if (event.key === ' ') {
    if (drag) release();
    else {
      const i = Math.floor(nodes.length / 2);
      const node = fallback ? fallbackNode : nodes[i];
      if (node) {
        if (reducedMotion.matches) {
          const hold = begin(fallback ? 0 : i, { x: width / 2, y: height / 2 }, null);
          if (hold) hold.target = boundedTarget(node.x, node.y - 22);
          wake();
        } else { node.vy = mode === 'melt' ? 230 : -340; wake(); }
      }
    }
    return;
  }
  if (!drag) begin(fallback ? 0 : Math.floor(glyphs.length / 2), { x: width / 2, y: height / 2 }, null);
  if (!drag) return;
  const distance = event.shiftKey ? 36 : 14;
  drag.target = boundedTarget(drag.target.x + (event.key === 'ArrowRight' ? distance : event.key === 'ArrowLeft' ? -distance : 0), drag.target.y + (event.key === 'ArrowDown' ? distance : event.key === 'ArrowUp' ? -distance : 0));
  wake();
});
stage.addEventListener('blur', () => { if (drag?.id === null) release(false); });

function selectMode(next: Mode, announceChange = true): void {
  release(false);
  mode = next;
  if (!input.value.trim()) {
    word = next;
    setMessage('');
    prepareWord();
  }
  hover = null;
  nodes.forEach(node => Object.assign(node, { x: 0, y: 0, vx: 0, vy: 0 }));
  Object.assign(fallbackNode, { x: 0, y: 0, vx: 0, vy: 0 });
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-mode]')) button.setAttribute('aria-pressed', String(button.dataset.mode === mode));
  help.textContent = `${helpText[mode]}${stage.matches(':focus-visible') ? ' Arrow keys to move; Space to release.' : ''}`;
  stage.setAttribute('aria-label', `${word}. ${mode} behaviour. Interactive word playground.`);
  $('#scene-title').textContent = `${word} — ${mode} behaviour`;
  if (mode === 'bounce' && !reducedMotion.matches) nodes.forEach((node, i) => { node.vy = -170 - i * 22; });
  if (mode === 'balance' && !reducedMotion.matches) nodes.forEach(node => { node.x = 26; });
  if (announceChange) announce(`${mode}. ${helpText[mode]}`);
  wake();
}

document.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach(button => button.addEventListener('click', () => {
  const next = button.dataset.mode as Mode;
  if (MODES.includes(next)) selectMode(next);
}));

function applyWord(announceChange = false): void {
  const result = validateWord(input.value);
  if (!result.valid) { setMessage(result.message, true); return; }
  setMessage('');
  if (word !== result.value) { word = result.value; prepareWord(); }
  if (announceChange) announce(`${word}. ${mode} behaviour.`);
}

input.addEventListener('compositionstart', () => { composing = true; });
input.addEventListener('compositionend', () => { composing = false; applyWord(); });
input.addEventListener('input', () => { if (!composing) applyWord(); });
$('#word-form').addEventListener('submit', event => { event.preventDefault(); if (!composing) applyWord(true); });
$('#reset-button').addEventListener('click', () => {
  word = 'heavy';
  input.value = '';
  setMessage('');
  prepareWord();
  selectMode('heavy', false);
  announce('Reset. heavy, with heavy behaviour.');
});

$('#info-button').addEventListener('click', () => { release(false); openDialog(dialog); });
$('#close-info').addEventListener('click', () => closeDialog(dialog));
dialog.addEventListener('cancel', event => { event.preventDefault(); closeDialog(dialog); });
dialog.addEventListener('close', () => $<HTMLButtonElement>('#info-button').focus());
dialog.addEventListener('click', event => { if (event.target === dialog) { const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) closeDialog(dialog); } });
const composed = import.meta.env.VITE_OPENCARTEL_COMPOSED === '1';
const guideLink = $<HTMLAnchorElement>('[data-agent-guide]');
guideLink.href = `${import.meta.env.BASE_URL}integrate.md`;
const copyGuide = $<HTMLButtonElement>('#copy-agent-guide');
copyGuide.addEventListener('click', async () => {
  const feedback = $<HTMLParagraphElement>('#guide-feedback');
  copyGuide.disabled = true;
  feedback.textContent = '';
  try {
    const response = await fetch(guideLink.href);
    if (!response.ok) throw new Error('Guide unavailable');
    const text = await response.text();
    if (!text.startsWith('# Integrate Words Have Weight')) throw new Error('Unexpected guide');
    await navigator.clipboard.writeText(text);
    feedback.textContent = 'Guide copied.';
  } catch {
    feedback.textContent = 'Could not copy. Use Download guide instead.';
  } finally { copyGuide.disabled = false; }
});
const sourceLink = $<HTMLAnchorElement>('#source-download');
sourceLink.href = composed ? '/downloads/words-have-weight.zip' : `${import.meta.env.BASE_URL}words-have-weight-source.zip`;
if (composed) { const origin = $<HTMLAnchorElement>('#origin-link'); origin.href = '/'; origin.hidden = false; }

function applyMotionPreference(): void {
  release(false);
  if (reducedMotion.matches) nodes.forEach(node => Object.assign(node, { x: 0, y: 0, vx: 0, vy: 0 }));
  $('#motion-note').toggleAttribute('hidden', !reducedMotion.matches);
  wake();
}
reducedMotion.addEventListener('change', applyMotionPreference);
document.addEventListener('visibilitychange', () => { previousTime = 0; if (document.hidden) { release(false); if (frame) cancelAnimationFrame(frame); frame = 0; } else wake(); });
new ResizeObserver(resize).observe(stage);
stage.addEventListener('focus', () => { help.textContent = `${helpText[mode]} Arrow keys to move; Space to release.`; });
stage.addEventListener('blur', () => { help.textContent = helpText[mode]; });

async function loadFont(): Promise<void> {
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}fonts/ArchivoBlack-Regular.ttf`, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error(`Font response ${response.status}`);
    font = opentype.parse(await response.arrayBuffer());
  } catch {
    font = null;
  }
  loading.hidden = true;
  prepareWord();
  applyMotionPreference();
  if (!introDone && font && !reducedMotion.matches) {
    introDone = true;
    nodes.forEach((node, i) => { node.y = -10 - Math.sin(i * .8) * 7; });
    wake();
  }
}

void loadFont();

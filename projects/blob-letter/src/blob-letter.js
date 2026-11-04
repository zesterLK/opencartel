import {createFluidField} from './fluid-field.js';
import {createInkRenderer} from './ink-renderer.js';
const GRID = 76;
const SCROLL_DISTANCE = 900;
export function wheelPixels(delta, mode = 0, pageHeight = 720) {
  return delta * (mode === 1 ? 16 : mode === 2 ? pageHeight : 1);
}
/** Pointer-reactive Z with the portfolio's scroll-driven ink-cover inversion. */
export function mountBlobLetter(host, {dark = false, onInvert = () => {}} = {}) {
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none';
  canvas.setAttribute('aria-hidden', 'true'); host.append(canvas);
  const abort = new AbortController(), {signal} = abort;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const oldTab = host.getAttribute('tabindex'); host.tabIndex = 0;
  let renderer, fallback, flow = createFluidField(GRID), raf = 0, last = 0;
  let dead = false, previous = null, overlay = null, coverRenderer = null;
  let phase = 'idle', target = 0, shown = 0, auto = false, started = 0, autoFrom = 0;
  let fadeStarted = 0, cooldownUntil = 0, coverDark = dark;
  function showFallback() {
    canvas.style.visibility = 'hidden';
    if (!fallback) {
      fallback = document.createElement('span'); fallback.textContent = 'Z'; fallback.setAttribute('aria-hidden', 'true');
      fallback.style.cssText = 'position:absolute;inset:0;display:grid;place-items:center;font:900 min(50vw,55vh) system-ui;pointer-events:none'; host.append(fallback);
    }
  }
  try { renderer = createInkRenderer(canvas); } catch { showFallback(); }
  function removeCover() {
    coverRenderer?.destroy(); coverRenderer = null; overlay?.remove(); overlay = null;
    canvas.style.opacity = '1'; phase = 'idle'; target = 0; shown = 0; auto = false; delete host.dataset.inverting;
  }
  function commitInvert() { dark = !dark; onInvert(dark); }
  function beginCover(automatic) {
    if (dead || phase === 'fading') return;
    if (reduced.matches || !renderer) { removeCover(); commitInvert(); cooldownUntil = performance.now() + 650; wake(); return; }
    if (phase === 'idle') {
      coverDark = dark; overlay = document.createElement('canvas'); overlay.setAttribute('aria-hidden', 'true');
      overlay.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none'; host.append(overlay);
      try { coverRenderer = createInkRenderer(overlay); } catch { removeCover(); commitInvert(); wake(); return; }
      canvas.style.opacity = '0'; phase = 'growing'; host.dataset.inverting = 'true';
    }
    if (automatic) { auto = true; autoFrom = shown; started = performance.now(); }
    wake();
  }
  function tick(t) {
    raf = 0; if (dead || document.hidden) return;
    const dt = Math.min(1.5, (t - last) / 16.67 || 1); last = t;
    const energy = reduced.matches ? 0 : flow.step(dt), width = canvas.width, height = canvas.height;
    const scale = Math.min(width, Math.max(height * .55, height - 160 * Math.min(devicePixelRatio || 1, 2))) * .58;
    const options = {width, height, scale, dark, time: t / 1000};
    renderer?.draw(flow.x, flow.y, GRID, options);
    let moving = false;
    if (phase === 'growing') {
      if (auto) target = autoFrom + (1 - autoFrom) * Math.min(1, (t - started) / 1100);
      shown += (target - shown) * (1 - Math.exp(-dt * .15));
      if (target === 1 && shown > .997) shown = 1;
      if (target === 0 && shown < .0001) shown = 0;
      coverRenderer?.draw(flow.x, flow.y, GRID, {...options, dark: coverDark, grow: shown * shown * Math.hypot(width, height) / scale, liquid: shown});
      if (shown === 1) {
        commitInvert(); phase = 'fading'; fadeStarted = t; canvas.style.opacity = '1';
        renderer?.draw(flow.x, flow.y, GRID, {...options, dark}); moving = true;
      } else if (shown === 0 && target === 0 && !auto) removeCover();
      else moving = auto || Math.abs(shown - target) > .0001;
    } else if (phase === 'fading') {
      const fade = Math.min(1, (t - fadeStarted) / 450); overlay.style.opacity = String(1 - fade);
      if (fade === 1) { removeCover(); cooldownUntil = t + 450; } else moving = true;
    }
    if (moving || energy > .2) wake();
  }
  function wake() { if (!dead && !raf && !document.hidden) raf = requestAnimationFrame(tick); }
  const observer = new ResizeObserver(() => {
    const b = host.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(b.width * dpr)); canvas.height = Math.max(1, Math.round(b.height * dpr)); wake();
  }); observer.observe(host);
  function impulse(x, y, dx, dy) {
    if (reduced.matches) return;
    flow.impulse(x, y, Math.max(-3, Math.min(3, dx)), Math.max(-3, Math.min(3, dy))); wake();
  }
  canvas.addEventListener('pointermove', e => {
    const b = canvas.getBoundingClientRect(), x = (e.clientX - b.left) / b.width * GRID, y = (e.clientY - b.top) / b.height * GRID;
    if (previous) impulse(x, y, x - previous[0], y - previous[1]); previous = [x, y];
  }, {signal});
  canvas.addEventListener('pointerleave', () => previous = null, {signal});
  canvas.addEventListener('pointerdown', e => { previous = null; canvas.setPointerCapture(e.pointerId); }, {signal});
  for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) canvas.addEventListener(event, () => previous = null, {signal});
  host.addEventListener('wheel', e => {
    e.preventDefault(); if (phase === 'fading' || performance.now() < cooldownUntil) return;
    const next = Math.max(0, Math.min(1, target + wheelPixels(e.deltaY, e.deltaMode, host.clientHeight) / SCROLL_DISTANCE));
    if (phase === 'idle' && next === 0) return;
    target = next; auto = false; beginCover(false);
  }, {passive: false, signal});
  host.addEventListener('keydown', e => {
    const v = {ArrowLeft: [-3, 0], ArrowRight: [3, 0], ArrowUp: [0, -3], ArrowDown: [0, 3]}[e.key];
    if (v) { e.preventDefault(); impulse(38, 38, ...v); }
    if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) { e.preventDefault(); beginCover(true); }
  }, {signal});
  canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); removeCover(); cancelAnimationFrame(raf); raf = 0; renderer = null; showFallback(); }, {signal});
  canvas.addEventListener('webglcontextrestored', () => {
    try { renderer = createInkRenderer(canvas); canvas.style.visibility = ''; fallback?.remove(); fallback = null; } catch { showFallback(); } wake();
  }, {signal});
  document.addEventListener('visibilitychange', () => { cancelAnimationFrame(raf); raf = 0; last = 0; wake(); }, {signal});
  reduced.addEventListener('change', () => { removeCover(); flow = createFluidField(GRID); wake(); }, {signal});
  wake();
  return {
    setDark(value) { dark = Boolean(value); wake(); },
    invert() { beginCover(true); },
    reset() { removeCover(); flow = createFluidField(GRID); previous = null; cooldownUntil = 0; wake(); },
    destroy() {
      dead = true; abort.abort(); observer.disconnect(); cancelAnimationFrame(raf); removeCover(); renderer?.destroy(); canvas.remove(); fallback?.remove();
      if (oldTab === null) host.removeAttribute('tabindex'); else host.setAttribute('tabindex', oldTab);
    },
  };
}

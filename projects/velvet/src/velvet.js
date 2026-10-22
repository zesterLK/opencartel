import * as THREE from 'three';
import { NapField } from './nap-field.js';

const vertexShader = /* glsl */`
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

const fragmentShader = /* glsl */`
precision highp float;
uniform sampler2D uNap;
uniform vec2 uSize;
uniform vec2 uLight;
uniform vec3 uBrush;
varying vec2 vUv;

vec2 hash22(vec2 p) {
  return fract(sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)))) * 43758.5453);
}
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash22(i).x, hash22(i + vec2(1,0)).x, f.x),
             mix(hash22(i + vec2(0,1)).x, hash22(i + 1.0).x, f.x), f.y);
}
vec2 napAt(vec2 uv) { return texture2D(uNap, vec2(uv.x, 1.0 - uv.y)).rg * 2.0 - 1.0; }

// Random anchored short fibres. Roots stay fixed as their tiny tips bend.
// There is no surface displacement or brush-height mask.
vec2 pile(vec2 p, float scale) {
  vec2 cell = floor(p / scale);
  float coverage = 0.0;
  float glint = 0.0;
  for (int y=-1; y<=1; y++) {
    for (int x=-1; x<=1; x++) {
      vec2 id = cell + vec2(float(x), float(y));
      vec2 seed = hash22(id + scale * 7.37);
      vec2 root = (id + seed) * scale;
      vec2 nap = napAt(root / uSize);
      vec2 randomDir = vec2(cos(seed.y * 6.283), sin(seed.y * 6.283));
      vec2 tip = (nap * 1.05 + randomDir * 0.36) * scale;
      vec2 q = p - root;
      float t = clamp(dot(q, tip) / max(dot(tip, tip), 0.001), -0.5, 0.5);
      vec2 bend = vec2(-tip.y, tip.x) * (sin((t + 0.5) * 3.14159) * (seed.x - 0.5) * 0.72);
      float d = length(q - tip * t - bend);
      float aa = max(max(fwidth(p).x, fwidth(p).y), 0.32);
      float fibre = 1.0 - smoothstep(scale * 0.075, scale * 0.075 + aa * 0.7, d);
      float facing = dot(normalize(tip + vec2(0.001)), uLight);
      coverage = max(coverage, fibre * (0.35 + 0.65 * seed.x));
      glint += fibre * (0.30 + 0.70 * (t + 0.5)) * (0.65 + facing * 0.35) * (0.5 + seed.y * 0.5);
    }
  }
  return vec2(coverage, min(glint, 1.6));
}

void main() {
  vec2 p = vUv * uSize;
  vec2 nap = napAt(vUv);
  float directional = dot(nap, uLight);
  directional += (noise(p * 0.035) - 0.5) * 0.32 + (noise(p * 0.10) - 0.5) * 0.10;
  float softLay = noise(p * 0.016) * 0.6 + noise(p * 0.047) * 0.4;
  float sheen = 0.07 + 0.93 * smoothstep(-1.0, 1.0, directional);
  vec2 lightOffset = vUv - (vec2(0.5) + uLight * 0.48);
  float lightFalloff = 0.48 + 0.88 * exp(-dot(lightOffset, lightOffset) * 1.6);
  vec2 fibre = pile(p, 3.35);
  vec2 underPile = pile(p + 31.73, 1.55);
  float grain = noise(p * 0.75);
  // Oxblood dye stays fixed. The nap modulates grazing light, never pigment.
  vec3 darkDye = vec3(0.030, 0.0009, 0.0020);
  vec3 diffuseDye = vec3(0.235, 0.006, 0.012);
  vec3 warmSheen = vec3(0.75, 0.14, 0.11);
  vec3 color = darkDye + diffuseDye * (0.19 + sheen * 1.35);
  color *= 0.55 + 0.40 * softLay + 0.16 * grain;
  color *= 0.46 + 0.54 * fibre.x;
  color += warmSheen * (0.08 + 0.80 * sheen) * (fibre.y * 0.70 + underPile.y * 0.36);
  color *= lightFalloff;
  float edge = smoothstep(0.15, 0.90, distance(vUv, vec2(0.5)));
  color *= 1.0 - edge * 0.16;
  // A quiet keyboard brush outline, never rendered for touch or idle mouse.
  float ring = abs(length(p - uBrush.xy) - uBrush.z);
  float ink = (1.0 - smoothstep(0.45, 1.3, ring)) * step(1.0, uBrush.z);
  color = mix(color, vec3(0.82, 0.59, 0.55), ink * 0.5);
  gl_FragColor = vec4(color, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export function mountVelvet(canvas, { onStatus = () => {} } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: false, antialias: false, powerPreference: 'low-power' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x26040b);
  const field = new NapField(640, 640);
  const texture = new THREE.DataTexture(field.pixels, field.width, field.height, THREE.RGBAFormat);
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  const uniforms = {
    uNap: { value: texture },
    uSize: { value: new THREE.Vector2(1, 1) },
    uLight: { value: new THREE.Vector2(-0.707, 0.707) },
    uBrush: { value: new THREE.Vector3(-1000, -1000, 0) },
  };
  const material = new THREE.ShaderMaterial({ vertexShader, fragmentShader, uniforms, depthTest: false, depthWrite: false });
  const geometry = new THREE.PlaneGeometry(2, 2);
  const scene = new THREE.Scene();
  scene.add(new THREE.Mesh(geometry, material));
  const camera = new THREE.Camera();
  let width = 1, height = 1, radius = 62, customRadius = null;
  let disposed = false, lost = false, frame = 0, pointer = null, last = null;
  let keyboard = false, brushing = false;
  let keyboardPoint = { x: 0.5, y: 0.5 };
  let renderCount = 0;
  const durations = [];
  const cleanups = [];
  const listen = (element, event, handler, options) => {
    element.addEventListener(event, handler, options);
    cleanups.push(() => element.removeEventListener(event, handler, options));
  };
  function draw() {
    frame = 0;
    if (disposed || lost || document.hidden) return;
    const start = performance.now();
    renderer.render(scene, camera);
    durations.push(performance.now() - start);
    if (durations.length > 240) durations.shift();
    renderCount++;
    canvas.dataset.frames = String(renderCount);
    canvas.dataset.revision = String(field.revision);
  }
  function invalidate() {
    if (!frame && !disposed && !lost) frame = requestAnimationFrame(draw);
  }
  function showKeyboardBrush() {
    uniforms.uBrush.value.set(keyboardPoint.x * width, (1 - keyboardPoint.y) * height, keyboard ? radius : 0);
  }
  function resize() {
    const rect = canvas.getBoundingClientRect();
    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);
    // Cap both DPR and total fragment workload; high-density monitors need not
    // shade every physical pixel to resolve this soft, very fine material.
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.65, Math.sqrt(3000000 / (width * height)));
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(width, height, false);
    uniforms.uSize.value.set(width, height);
    radius = customRadius ?? Math.max(34, Math.min(72, Math.min(width, height) * 0.085));
    showKeyboardBrush();
    invalidate();
  }
  function mark(from, to, strength = 1) {
    if (field.brush(from, to, radius, width, height, strength)) {
      texture.needsUpdate = true;
      invalidate();
    }
  }
  function position(event) {
    const rect = canvas.getBoundingClientRect();
    return { x: Math.max(0, Math.min(1, (event.clientX - rect.left) / width)), y: Math.max(0, Math.min(1, (event.clientY - rect.top) / height)) };
  }
  function stop() {
    if (pointer !== null && canvas.hasPointerCapture(pointer)) canvas.releasePointerCapture(pointer);
    pointer = null; last = null; brushing = false;
    canvas.dataset.brushing = 'false';
  }
  listen(canvas, 'pointerdown', (event) => {
    if (pointer !== null || !event.isPrimary || event.button !== 0 || lost) return;
    event.preventDefault();
    canvas.focus({ preventScroll: true });
    keyboard = false;
    canvas.dataset.input = 'pointer';
    showKeyboardBrush();
    pointer = event.pointerId;
    canvas.setPointerCapture(pointer);
    last = position(event);
    canvas.dataset.brushing = 'true';
    invalidate();
  });
  listen(canvas, 'pointermove', (event) => {
    if (event.pointerId !== pointer || !last) return;
    const samples = event.getCoalescedEvents?.() || [event];
    for (const sample of samples.length ? samples : [event]) {
      const next = position(sample);
      mark(last, next);
      last = next;
    }
  });
  listen(canvas, 'pointerup', (event) => {
    if (event.pointerId !== pointer) return;
    if (last) mark(last, position(event));
    stop();
  });
  listen(canvas, 'pointercancel', stop);
  listen(canvas, 'lostpointercapture', stop);
  listen(window, 'blur', stop);
  listen(canvas, 'blur', () => { stop(); keyboard = false; showKeyboardBrush(); invalidate(); });
  listen(canvas, 'keydown', (event) => {
    canvas.dataset.input = 'keyboard';
    const directions = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    if (event.code === 'Space') {
      event.preventDefault();
      if (event.repeat) return;
      keyboard = true; brushing = !brushing;
      canvas.dataset.brushing = String(brushing);
      onStatus(brushing ? 'Brush down. Use arrow keys to brush; Space lifts it.' : 'Brush lifted. Use arrow keys to move.');
    } else if (directions[event.key]) {
      event.preventDefault();
      keyboard = true;
      const [dx, dy] = directions[event.key];
      const step = event.shiftKey ? 48 : 18;
      const next = { x: Math.max(0, Math.min(1, keyboardPoint.x + dx * step / width)), y: Math.max(0, Math.min(1, keyboardPoint.y + dy * step / height)) };
      if (brushing) mark(keyboardPoint, next);
      keyboardPoint = next;
    } else if (event.key === 'Escape') {
      stop(); keyboard = false;
      onStatus('Brush lifted.');
    } else return;
    showKeyboardBrush();
    invalidate();
  });
  listen(document, 'visibilitychange', () => { if (document.hidden) stop(); else invalidate(); });
  listen(canvas, 'webglcontextlost', (event) => {
    event.preventDefault(); lost = true; stop();
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    canvas.dataset.context = 'lost';
    onStatus('The graphics connection paused. Restoring it will preserve your strokes.');
  });
  listen(canvas, 'webglcontextrestored', () => {
    lost = false; texture.needsUpdate = true; material.needsUpdate = true;
    canvas.dataset.context = 'ready';
    onStatus('Velvet is ready. Your strokes are preserved.');
    invalidate();
  });
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();
  // A small authored first gesture demonstrates the nap, with no idle animation.
  // Smooth removes it completely and never reintroduces it.
  let previous = { x: 0.87, y: 0.55 };
  for (let i = 1; i <= 110; i++) {
    const t = i / 110;
    const next = { x: 0.87 - t * 0.74, y: 0.55 + Math.sin(t * Math.PI * 2.0) * 0.18 };
    field.brush(previous, next, radius * (0.52 + 0.60 * Math.sin(t * Math.PI)), width, height);
    previous = next;
  }
  texture.needsUpdate = true;
  canvas.dataset.context = 'ready';
  invalidate();
  return {
    smooth() {
      stop(); field.reset(); texture.needsUpdate = true; invalidate();
      onStatus('Surface smoothed. Brush either way.');
    },
    setLight(degrees) {
      const value = Number(degrees);
      const angle = (Number.isFinite(value) ? value : 135) * Math.PI / 180;
      uniforms.uLight.value.set(Math.cos(angle), Math.sin(angle));
      invalidate();
    },
    setBrushSize(pixels) {
      if (!Number.isFinite(pixels)) return;
      customRadius = Math.max(10, Math.min(160, pixels));
      radius = customRadius; showKeyboardBrush(); invalidate();
    },
    metrics() {
      const sorted = [...durations].sort((a, b) => a - b);
      return { renderCount, revision: field.revision, width, height, drawingWidth: canvas.width, drawingHeight: canvas.height, drawCalls: renderer.info.render.calls, triangles: renderer.info.render.triangles, textures: renderer.info.memory.textures, cpuSubmitP95Ms: sorted[Math.floor(sorted.length * 0.95)] || 0 };
    },
    destroy() {
      disposed = true; stop(); observer.disconnect();
      if (frame) cancelAnimationFrame(frame);
      cleanups.forEach((cleanup) => cleanup());
      geometry.dispose(); material.dispose(); texture.dispose(); renderer.dispose();
    },
  };
}

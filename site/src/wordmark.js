// Preserve the shaped word at rest; animate independent letters in fixed slots.
const heading = document.querySelector('#site-title');
const button = heading.querySelector('.site-wordmark');
const measure = button.querySelector('.wordmark-measure');
const layer = button.querySelector('.wordmark-letters');
const status = document.querySelector('#title-status');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const effects = ['rotate', 'squeeze', 'wave', 'weight', 'colour', 'fade', 'rotate', 'weight', 'wave', 'squeeze'];
const letters = [...measure.textContent].map((character, index) => {
  const slot = document.createElement('span');
  slot.className = 'title-letter';
  slot.dataset.effect = effects[index];
  slot.textContent = character;
  layer.append(slot);
  return slot;
});

// Every pair keeps normal text readable as well as the large wordmark.
const palettes = [
  { name: 'white', canvas: '#ffffff', ink: '#111111' },
  { name: 'blue', canvas: '#2f88f0', ink: '#111725' },
  { name: 'red', canvas: '#ed3b36', ink: '#200c0b' },
  { name: 'forest', canvas: '#01423f', ink: '#e4f4d8' },
  { name: 'pink', canvas: '#efc1db', ink: '#302036' },
  { name: 'ink', canvas: '#23221f', ink: '#f2efe4' },
];
const defaultPalette = palettes.findIndex(theme => theme.name === 'forest');
let palette = defaultPalette;
let selected = 4;
let slots = [];
let width = 0;
let active = false;
let visible = true;
let animations = [];
let idleTimer;
let generation = 0;

function setPalette(index) {
  palette = index;
  const theme = palettes[index];
  const root = document.documentElement;
  root.style.setProperty('--canvas', theme.canvas);
  root.style.setProperty('--ink', theme.ink);
  root.style.setProperty('--muted', index ? theme.ink : '#555555');
  root.style.setProperty('--guide', index ? `color-mix(in srgb, ${theme.ink} 20%, ${theme.canvas})` : '#e7e7e7');
  root.dataset.palette = theme.name;
  document.querySelector('meta[name="theme-color"]').content = theme.canvas;
  status.textContent = `${theme.name[0].toUpperCase() + theme.name.slice(1)} page colour.`;
}

function select(index) {
  selected = index;
  letters.forEach((letter, position) => letter.classList.toggle('is-selected', position === index));
}

function cancelMotion() {
  generation++;
  animations.forEach(animation => animation.cancel());
  animations = [];
  active = false;
  delete button.dataset.playing;
  clearTimeout(idleTimer);
}

function fit(force = false) {
  const nextWidth = heading.clientWidth;
  // Hidden navigation/viewport transitions can briefly report zero width.
  // Never persist that transient measurement as a zero-size wordmark.
  if (nextWidth <= 0) return;
  if (parseFloat(getComputedStyle(heading).fontSize) <= 0) heading.style.removeProperty("font-size");
  if (!force && Math.abs(nextWidth - width) < .5 && Math.abs(measure.getBoundingClientRect().width - nextWidth) < .5) return;
  cancelMotion();
  // Re-measure after changing size: a variable-font instance can settle on the
  // next layout after a weight animation or a responsive breakpoint change.
  for (let pass = 0; pass < 3; pass++) {
    const measured = measure.getBoundingClientRect().width;
    if (!measured || Math.abs(measured - nextWidth) < .25) break;
    heading.style.fontSize = `${parseFloat(getComputedStyle(heading).fontSize) * nextWidth / measured}px`;
  }
  const bounds = measure.getBoundingClientRect();
  const range = document.createRange();
  slots = letters.map((letter, index) => {
    range.setStart(measure.firstChild, index);
    range.setEnd(measure.firstChild, index + 1);
    const rect = range.getBoundingClientRect();
    const left = rect.left - bounds.left;
    letter.style.left = `${left}px`;
    return { left, width: rect.width };
  });
  width = nextWidth;
  button.classList.add('is-ready');
  scheduleIdle();
}

function scheduleIdle(delay = 5000) {
  clearTimeout(idleTimer);
  if (active || !visible || document.hidden || reducedMotion.matches) return;
  idleTimer = setTimeout(() => {
    const letter = letters[Math.floor(Math.random() * letters.length)];
    const wiggle = letter.animate([
      { transform: 'rotate(0deg) skewX(0deg)' },
      { transform: 'rotate(5deg) skewX(2deg)', offset: .2 },
      { transform: 'rotate(-3deg) skewX(-1deg)', offset: .4 },
      { transform: 'rotate(3deg) skewX(1deg)', offset: .6 },
      { transform: 'rotate(-1deg)', offset: .8 },
      { transform: 'none' },
    ], { duration: 900, easing: 'ease-in-out' });
    animations = [wiggle];
    wiggle.finished.then(() => { animations = []; scheduleIdle(); }, () => {});
  }, delay);
}

function keyframes(effect, index) {
  if (effect === 'wave') return [{ transform: 'none' }, { transform: `translateY(-${Math.min(innerHeight * .05, 48)}px)` }, { transform: 'none' }];
  if (effect === 'rotate') {
    const rotation = (index % 2 ? -1 : 1) * (130 + Math.random() * 190);
    const bounds = letters[index].getBoundingClientRect();
    const frame = heading.getBoundingClientRect();
    const centerX = bounds.left + bounds.width / 2;
    const centerY = bounds.top + bounds.height / 2;
    // Keep rotating end letters inside the frame without moving their resting slots.
    return Array.from({ length: 61 }, (_, sample) => {
      const time = sample / 60;
      const phase = time < .4 ? time / .4 : time > .6 ? (1 - time) / .4 : 1;
      const progress = phase * phase * (3 - 2 * phase);
      const angle = rotation * progress;
      const radians = angle * Math.PI / 180;
      const scale = 1 - .35 * progress;
      const halfWidth = (Math.abs(bounds.width * scale * Math.cos(radians)) + Math.abs(bounds.height * Math.sin(radians))) / 2;
      const halfHeight = (Math.abs(bounds.width * scale * Math.sin(radians)) + Math.abs(bounds.height * Math.cos(radians))) / 2;
      const x = Math.max(frame.left + halfWidth - centerX, Math.min(0, frame.right - halfWidth - centerX));
      const y = frame.top >= 0 ? Math.max(0, halfHeight + 2 - centerY) : 0;
      return { offset: time, transform: `translate(${x}px, ${y}px) rotate(${angle}deg) scaleX(${scale})` };
    });
  }
  if (effect === 'squeeze') return [{ transform: 'none' }, { transform: 'scaleX(.1)' }, { transform: 'none' }];
  if (effect === 'weight') return [{ fontVariationSettings: '"wght" 700' }, { fontVariationSettings: '"wght" 400' }, { fontVariationSettings: '"wght" 700' }];
  return [{ opacity: 1 }, { opacity: .25 }, { opacity: 1 }];
}

async function play(index) {
  if (active) return;
  cancelMotion();
  select(index);
  const effect = effects[index];
  if (reducedMotion.matches) {
    if (effect === 'colour') setPalette((palette + 1) % palettes.length);
    else status.textContent = `${letters[index].textContent}: ${effect}. Animation is off for reduced motion.`;
    return;
  }
  active = true;
  button.dataset.playing = effect;
  const token = generation;
  if (effect === 'colour') {
    animations = [letters[index].animate([{ opacity: 1 }, { opacity: .3 }, { opacity: 1 }], { duration: 280, easing: 'ease-in-out' })];
  } else {
    const duration = { wave: 420, rotate: 1250, weight: 1500, fade: 1000, squeeze: 1000 }[effect];
    animations = letters.map((letter, position) => letter.animate(keyframes(effect, position), {
      duration, delay: Math.abs(position - index) * (effect === 'rotate' ? 25 : 50), easing: effect === 'rotate' ? 'linear' : 'cubic-bezier(.45,0,.25,1)',
    }));
    status.textContent = `${effect[0].toUpperCase() + effect.slice(1)}.`;
  }
  await Promise.allSettled(animations.map(animation => animation.finished));
  if (generation !== token) return;
  animations.forEach(animation => animation.cancel());
  if (effect === 'colour') setPalette((palette + 1) % palettes.length);
  animations = [];
  active = false;
  delete button.dataset.playing;
  scheduleIdle(12500);
}

function indexAt(clientX) {
  const x = clientX - button.getBoundingClientRect().left;
  return slots.reduce((nearest, slot, index) => Math.abs(x - slot.left - slot.width / 2) < Math.abs(x - slots[nearest].left - slots[nearest].width / 2) ? index : nearest, 0);
}

button.addEventListener('pointerdown', event => {
  if (event.button !== 0) return;
  button.classList.remove('is-keyboard');
  // Touch waits for click so a normal page swipe never activates a letter.
  if (event.pointerType !== 'touch') play(indexAt(event.clientX));
});
button.addEventListener('click', event => {
  if (event.detail === 0) play(selected);
  else if (event.pointerType === 'touch') play(indexAt(event.clientX));
});
button.addEventListener('focus', () => { if (button.matches(':focus-visible')) button.classList.add('is-keyboard'); });
button.addEventListener('blur', () => button.classList.remove('is-keyboard'));
button.addEventListener('keydown', event => {
  if (event.key === 'Escape') { cancelMotion(); setPalette(defaultPalette); scheduleIdle(); return; }
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
  event.preventDefault();
  button.classList.add('is-keyboard');
  select(event.key === 'Home' ? 0 : event.key === 'End' ? letters.length - 1 : (selected + (event.key === 'ArrowRight' ? 1 : -1) + letters.length) % letters.length);
  status.textContent = `${letters[selected].textContent}: ${effects[selected]}. Enter or Space to play.`;
});

let fitFrame;
const sizeObserver = new ResizeObserver(() => {
  cancelAnimationFrame(fitFrame);
  fitFrame = requestAnimationFrame(() => fit());
});
sizeObserver.observe(heading);
sizeObserver.observe(measure);
window.addEventListener('resize', () => fit(true));
document.fonts.ready.then(() => fit(true));
new IntersectionObserver(([entry]) => {
  visible = entry.isIntersecting;
  if (!visible) cancelMotion();
  else scheduleIdle();
}).observe(button);
document.addEventListener('visibilitychange', () => { cancelMotion(); scheduleIdle(); });
reducedMotion.addEventListener('change', () => { cancelMotion(); scheduleIdle(); });
select(selected);
fit(true);

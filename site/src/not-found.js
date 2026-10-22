import { advanceAxis, nearestAngle } from './compass-motion.js';

const home = document.querySelector('.floating-home');
const compass = document.querySelector('.compass');
const needle = document.querySelector('#needle');
const control = document.querySelector('.motion-control');
const speedControl = document.querySelector('.speed-control');
const speeds = [1, 2, 3, 4];
let speedIndex = 0;
const reduced = matchMedia('(prefers-reduced-motion: reduce)');

let x = 0, y = 0, vx = 58, vy = 43;
let angle = 38, angularVelocity = 0;
let bounds, centre, lastTime = 0, frame = 0, paused = false;
let hover = false, focused = false, pressed = false, nearCentre = false;
let lastReduced = reduced.matches;
let spinRemaining = 0, initialized = false, lastBounce = -Infinity, flashUntil = 0;

function measure() {
  const size = home.offsetWidth;
  const width = document.documentElement.clientWidth;
  const height = window.innerHeight;
  const area = document.querySelector('.motion-bounds').getBoundingClientRect();
  bounds = { left: area.left, top: area.top, right: Math.max(area.left, area.right - size), bottom: Math.max(area.top, area.bottom - size), size };
  const box = compass.getBoundingClientRect();
  centre = { x: box.left + box.width / 2, y: box.top + box.height / 2 };
  if (!initialized || reduced.matches) {
    x = reduced.matches ? (width - size) / 2 : width * .78;
    const controlsBox = document.querySelector('.motion-controls').getBoundingClientRect();
    y = reduced.matches ? controlsBox.top + (controlsBox.height - size) / 2 : height * .22;
    initialized = true;
  }
  x = Math.max(bounds.left, Math.min(bounds.right, x));
  y = Math.max(bounds.top, Math.min(bounds.bottom, y));
  draw();
  if (stopped()) pointDirectly();
}

function targetAngle() {
  return Math.atan2(x + bounds.size / 2 - centre.x, centre.y - y - bounds.size / 2) * 180 / Math.PI;
}
function pointDirectly() {
  angle = nearestAngle(angle, targetAngle());
  angularVelocity = 0;
  needle.setAttribute('transform', `rotate(${angle} 300 300)`);
}
function draw() { home.style.transform = `translate3d(${x}px,${y}px,0)`; }
function stopped() { return paused || hover || focused || pressed || reduced.matches; }
function animate(now) {
  frame = 0;
  if (lastReduced !== reduced.matches) { lastReduced = reduced.matches; measure(); syncMotion(); return; }
  const dt = Math.min((now - (lastTime || now)) / 1000, .035);
  lastTime = now;
  if (!stopped()) {
    const horizontal = advanceAxis(x, vx, dt * speeds[speedIndex], bounds.left, bounds.right);
    const vertical = advanceAxis(y, vy, dt * speeds[speedIndex], bounds.top, bounds.bottom);
    x = horizontal.position; vx = horizontal.velocity;
    y = vertical.position; vy = vertical.velocity;
    if (horizontal.bounced || vertical.bounced) {
      if ((horizontal.bounced && vertical.bounced) || now - lastBounce < 130) flashUntil = now + 650;
      lastBounce = now;
    }
    draw();
    const distance = Math.hypot(x + bounds.size / 2 - centre.x, y + bounds.size / 2 - centre.y);
    if (distance < 32 && !nearCentre) { spinRemaining = 360; nearCentre = true; }
    else if (distance > 52) nearCentre = false;
    if (spinRemaining > 0) {
      const step = Math.min(spinRemaining, dt * 470);
      angle += step; spinRemaining -= step; angularVelocity = 0;
    } else {
      // Damped tracking: follow the shortest arc even at the north wrap.
      const error = nearestAngle(angle, targetAngle()) - angle;
      angularVelocity += (error * 30 - angularVelocity * 8) * dt;
      angle += angularVelocity * dt;
    }
    needle.setAttribute('transform', `rotate(${angle} 300 300)`);
  }
  home.classList.toggle('corner', now < flashUntil);
  if (!document.hidden && !stopped()) frame = requestAnimationFrame(animate);
}
function resume() {
  if (!frame && !document.hidden && !stopped()) { lastTime = 0; frame = requestAnimationFrame(animate); }
}
function syncMotion() {
  if (stopped() && frame) { cancelAnimationFrame(frame); frame = 0; }
  if (stopped()) { spinRemaining = 0; home.classList.remove('corner'); pointDirectly(); }
  control.hidden = false;
  speedControl.hidden = false;
  control.disabled = reduced.matches;
  speedControl.disabled = reduced.matches;
  control.setAttribute('aria-pressed', String(paused));
  control.setAttribute('aria-label', paused ? 'Resume motion' : 'Pause motion');
  control.title = paused ? 'Resume motion' : 'Pause motion';
  resume();
}
home.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') { hover = true; syncMotion(); } });
home.addEventListener('pointerleave', () => { hover = false; syncMotion(); });
home.addEventListener('focus', () => { focused = true; syncMotion(); });
home.addEventListener('blur', () => { focused = false; syncMotion(); });
home.addEventListener('pointerdown', () => { pressed = true; syncMotion(); });
window.addEventListener('pointerup', () => { pressed = false; syncMotion(); });
window.addEventListener('pointercancel', () => { pressed = false; syncMotion(); });
control.addEventListener('click', () => { paused = !paused; syncMotion(); });
speedControl.addEventListener('click', () => {
  speedIndex = (speedIndex + 1) % speeds.length;
  speedControl.textContent = `${speeds[speedIndex]}×`;
  speedControl.setAttribute('aria-label', `Speed ${speeds[speedIndex]}×. Change to ${speeds[(speedIndex + 1) % speeds.length]}×`);
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { paused = !paused; syncMotion(); } });
document.addEventListener('visibilitychange', () => { if (document.hidden && frame) { cancelAnimationFrame(frame); frame = 0; } else resume(); });
window.addEventListener('resize', measure);
reduced.addEventListener('change', () => { lastReduced = reduced.matches; spinRemaining = 0; measure(); syncMotion(); });
measure();
syncMotion();

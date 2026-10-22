import './style.css';
import './ui.css';
import './cursor.css';
import './motion.css';
import './markdown-panel.css';
import { mountVelvet } from './velvet.js';
import { mountCursor } from './cursor.js';
import { mountPageMotion, openDialog, closeDialog } from './motion.js';
import { mountMarkdownPanel } from './markdown-panel.js';

const abort = new AbortController();
const { signal } = abort;
const $ = selector => document.querySelector(selector);
const announcement = $('#announcement');
const loading = $('#loading');
const fallback = $('#fallback');
const light = $('#light-angle');
const smooth = $('#smooth-button');
let surface;
let canvas = $('#velvet');
let announceTimer;

function announce(message) {
  if (typeof message !== 'string' || !message.trim()) return;
  clearTimeout(announceTimer);
  announcement.textContent = '';
  announceTimer = setTimeout(() => { announcement.textContent = message; }, 30);
}

function startSurface() {
  surface?.destroy();
  surface = null;
  loading.hidden = false;
  fallback.hidden = true;
  canvas.hidden = false;
  try {
    surface = mountVelvet(canvas, { onStatus: announce });
    surface.setLight(Number(light.value));
    light.disabled = false;
    smooth.disabled = false;
    canvas.hidden = false;
    announce('Velvet is ready. Brush either way.');
    canvas.addEventListener('webglcontextlost', () => {
      $('#fallback-title').textContent = 'The graphics connection paused.';
      $('#fallback-message').textContent = 'Your strokes will return when it reconnects. Try again restarts the surface.';
      fallback.hidden = false;
      light.disabled = true;
      smooth.disabled = true;
    }, { signal });
    canvas.addEventListener('webglcontextrestored', () => {
      fallback.hidden = true;
      light.disabled = false;
      smooth.disabled = false;
    }, { signal });
  } catch (error) {
    $('#fallback-title').textContent = 'The velvet needs WebGL.';
    $('#fallback-message').textContent = 'Your browser could not start the fabric. Try again, or use a browser with hardware acceleration enabled.';
    console.error('Velvet could not start:', error);
    canvas.hidden = true;
    fallback.hidden = false;
    light.disabled = true;
    smooth.disabled = true;
    announce('The velvet could not start. The Help and Guide controls, source download, and Try again button remain available.');
  } finally {
    loading.hidden = true;
  }
}

light.addEventListener('input', () => {
  const angle = Number(light.value);
  $('#light-value').value = `${angle}°`;
  light.setAttribute('aria-valuetext', `${angle} degrees`);
  surface?.setLight(angle);
}, { signal });
light.addEventListener('change', () => announce(`Light direction: ${light.value} degrees.`), { signal });
smooth.addEventListener('click', () => {
  surface?.smooth();
  announce('Velvet smoothed. Ready for another stroke.');
}, { signal });
$('#retry-button').addEventListener('click', () => {
  // A fresh canvas also permits recovery after a failed context allocation.
  const nextCanvas = canvas.cloneNode(false);
  canvas.replaceWith(nextCanvas);
  canvas = nextCanvas;
  startSurface();
  if (surface) canvas.focus({ preventScroll: true });
}, { signal });

const lightDisclosure = $('#light-controls');
document.addEventListener('pointerdown', event => {
  if (lightDisclosure.open && !lightDisclosure.contains(event.target)) lightDisclosure.open = false;
}, { signal });
lightDisclosure.addEventListener('keydown', event => {
  if (event.key !== 'Escape') return;
  event.preventDefault();
  lightDisclosure.open = false;
  lightDisclosure.querySelector('summary').focus();
}, { signal });

const guidePanel = mountMarkdownPanel($('#guide-panel'), {
  url: `${import.meta.env.BASE_URL}integrate.md`, filename: 'INTEGRATE.md',
  validate: text => text.startsWith('# Integrate Velvet'),
});
const noticesPanel = mountMarkdownPanel($('#notices-panel'), {
  url: `${import.meta.env.BASE_URL}licenses/THIRD-PARTY-NOTICES.txt`, filename: 'THIRD-PARTY-NOTICES.txt',
  validate: text => text.startsWith('Velvet — third-party runtime notices'),
});
function bindDialog(dialog, trigger, close, onOpen = () => {}) {
  trigger.addEventListener('click', () => {
    lightDisclosure.open = false;
    openDialog(dialog);
    onOpen();
  }, { signal });
  close.addEventListener('click', () => closeDialog(dialog), { signal });
  dialog.addEventListener('cancel', event => { event.preventDefault(); closeDialog(dialog); }, { signal });
  dialog.addEventListener('close', () => trigger.focus({ preventScroll: true }), { signal });
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) closeDialog(dialog);
  }, { signal });
}
bindDialog($('#info-dialog'), $('#info-button'), $('#close-info'));
bindDialog($('#guide-dialog'), $('#guide-button'), $('#close-guide'), () => { void guidePanel.load(); });
$('#third-party-notices').addEventListener('toggle', event => {
  if (event.target.open) void noticesPanel.load();
}, { signal });

const composed = import.meta.env.VITE_OPENCARTEL_COMPOSED === '1';
$('#source-download').href = composed ? '/downloads/velvet.zip' : `${import.meta.env.BASE_URL}velvet-source.zip`;
if (composed) {
  const home = $('#origin-link');
  home.href = '/';
  home.hidden = false;
}
const disposeCursor = mountCursor();
const disposeMotion = mountPageMotion();
startSurface();

function dispose() {
  abort.abort();
  clearTimeout(announceTimer);
  surface?.destroy();
  guidePanel.dispose();
  noticesPanel.dispose();
  disposeCursor();
  disposeMotion();
}
if (import.meta.hot) import.meta.hot.dispose(dispose);

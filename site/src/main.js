import './styles.css';
import './ui.css';
import './wordmark.js';
import './cursor.css';
import { mountCursor } from './cursor.js';
import './motion.css';
import { mountPageMotion, openDialog, closeDialog } from './motion.js';

const disposeCursor = mountCursor();
const disposeMotion = mountPageMotion();
import.meta.hot?.dispose(disposeMotion);
import.meta.hot?.dispose(disposeCursor);

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const dialog = document.querySelector('#license-dialog');
const licenseButton = document.querySelector('#license-button');
const projects = [...document.querySelectorAll('.project')];
const search = document.querySelector('#project-search');
const searchControl = document.querySelector('#search-control');
const searchToggle = document.querySelector('#search-toggle');
const filter = document.querySelector('#project-filter');
const resultStatus = document.querySelector('#collection-status');
const motion = document.querySelector('#preview-motion');
let paused = reducedMotion.matches;

function expandSearch(expanded) {
  searchControl.classList.toggle('is-expanded', expanded);
  searchToggle.setAttribute('aria-expanded', String(expanded));
  searchToggle.setAttribute('aria-label', expanded ? 'Close search' : 'Search projects');
  search.inert = !expanded;
  search.tabIndex = expanded ? 0 : -1;
  if (expanded) search.focus({ preventScroll: true });
}
searchToggle.addEventListener('click', () => {
  if (!searchControl.classList.contains('is-expanded')) return expandSearch(true);
  search.value = '';
  filterProjects();
  expandSearch(false);
  searchToggle.focus();
});
searchControl.addEventListener('focusout', () => {
  // An empty search folds away after focus moves elsewhere; a query stays visible.
  setTimeout(() => { if (!searchControl.contains(document.activeElement) && !search.value) expandSearch(false); }, 0);
});
search.addEventListener('keydown', event => {
  if (event.key !== 'Escape') return;
  event.preventDefault();
  search.value = '';
  filterProjects();
  expandSearch(false);
  searchToggle.focus();
});
function filterProjects() {
  const query = search.value.trim().toLowerCase();
  for (const project of projects) {
    project.hidden = !(filter.value === 'all' || project.dataset.category === filter.value) || !project.dataset.search.includes(query);
  }
  const matches = projects.filter(project => !project.hidden);
  document.querySelector('.empty-collection').hidden = matches.length > 0;
  resultStatus.textContent = `${matches.length} ${matches.length === 1 ? 'project' : 'projects'}`;
}
search.addEventListener('input', filterProjects);
filter.addEventListener('change', filterProjects);
filterProjects();

// Static previews need no playback controller. The collection control still owns videos.
const previews = projects.map(project => project.querySelector('video')).filter(Boolean).map(video => {
  const state = { video, visible: false, failed: false };
  const sync = () => {
    if (state.visible && !paused && !document.hidden && !state.failed) video.play().catch(() => { paused = true; syncPlayback(); });
    else video.pause();
  };
  const showPoster = () => { state.failed = true; video.pause(); };
  video.addEventListener('error', showPoster, { once: true });
  video.querySelectorAll('source').forEach(source => source.addEventListener('error', showPoster, { once: true }));
  new IntersectionObserver(([entry]) => { state.visible = entry.isIntersecting && entry.intersectionRatio >= .15; sync(); }, { threshold: .15 }).observe(video);
  return { ...state, sync };
});
function syncPlayback() {
  motion.setAttribute('aria-pressed', String(paused));
  motion.setAttribute('aria-label', paused ? 'Play previews' : 'Pause previews');
  motion.title = paused ? 'Play previews' : 'Pause previews';
  previews.forEach(preview => preview.sync());
}
motion.addEventListener('click', () => { paused = !paused; syncPlayback(); });
document.addEventListener('visibilitychange', syncPlayback);
reducedMotion.addEventListener('change', () => { paused = reducedMotion.matches; syncPlayback(); });
syncPlayback();

licenseButton.addEventListener('click', () => openDialog(dialog));
dialog.querySelector('[data-close]').addEventListener('click', () => closeDialog(dialog));
dialog.addEventListener('close', () => licenseButton.focus());
dialog.addEventListener('cancel', event => { event.preventDefault(); closeDialog(dialog); });
dialog.addEventListener('click', event => {
  if (event.target !== dialog) return;
  const bounds = dialog.getBoundingClientRect();
  if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) closeDialog(dialog);
});

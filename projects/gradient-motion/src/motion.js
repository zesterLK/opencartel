const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const dialogAnimations = new WeakMap();

export function openDialog(dialog) {
  dialogAnimations.get(dialog)?.cancel();
  dialogAnimations.delete(dialog);
  dialog.classList.remove('is-closing');
  if (!dialog.open) dialog.showModal();
  if (reducedMotion.matches) return;
  const animation = dialog.animate([
    { opacity: 0 },
    { opacity: 1 },
  ], { duration: 220, easing: 'cubic-bezier(.2,.75,.25,1)' });
  dialogAnimations.set(dialog, animation);
  animation.finished.then(() => {
    if (dialogAnimations.get(dialog) === animation) dialogAnimations.delete(dialog);
  }).catch(() => {});
}

export function closeDialog(dialog) {
  if (!dialog.open || dialog.classList.contains('is-closing')) return;
  dialogAnimations.get(dialog)?.cancel();
  if (reducedMotion.matches) { dialogAnimations.delete(dialog); dialog.close(); return; }
  dialog.classList.add('is-closing');
  const animation = dialog.animate([
    { opacity: 1 },
    { opacity: 0 },
  ], { duration: 150, easing: 'ease-in', fill: 'forwards' });
  dialogAnimations.set(dialog, animation);
  animation.finished.then(() => {
    if (dialogAnimations.get(dialog) !== animation) return;
    dialog.close();
    dialog.classList.remove('is-closing');
    animation.cancel();
    dialogAnimations.delete(dialog);
  }).catch(() => {});
}

/** A short same-origin page fade; native downloads, modified clicks and touch scrolling stay native. */
export function mountPageMotion() {
  const root = document.documentElement;
  const abort = new AbortController();
  let navigationTimer;
  let entering;
  let leaving = false;
  const restore = () => { clearTimeout(navigationTimer); leaving = false; root.classList.remove('oc-page-leaving'); };
  restore();
  if (!reducedMotion.matches) entering = document.body.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 220, easing: 'ease-out' });
  window.addEventListener('pageshow', restore, { signal: abort.signal });
  document.addEventListener('click', event => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || reducedMotion.matches) return;
    const link = event.target instanceof Element ? event.target.closest('a[href]') : null;
    if (!link || link.hasAttribute('download') || link.hasAttribute('data-no-transition') || (link.target && link.target !== '_self')) return;
    const url = new URL(link.href, location.href);
    if (!['http:', 'https:'].includes(url.protocol) || url.origin !== location.origin || (url.pathname === location.pathname && url.search === location.search)) return;
    event.preventDefault();
    if (leaving) return;
    leaving = true;
    root.classList.add('oc-page-leaving');
    navigationTimer = setTimeout(() => location.assign(url.href), 140);
  }, { signal: abort.signal });
  return () => { abort.abort(); entering?.cancel(); restore(); };
}

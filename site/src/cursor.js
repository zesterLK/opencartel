/** A precise mouse pointer with tactile hover/press states and native fallbacks. */
export function mountCursor() {
  const root = document.documentElement;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  const forcedColors = matchMedia('(forced-colors: active)');
  const abort = new AbortController();
  const cursor = document.createElement('div');
  cursor.className = 'oc-cursor';
  cursor.setAttribute('aria-hidden', 'true');
  cursor.innerHTML = '<span class="oc-cursor__ring"></span><span class="oc-cursor__point"></span>';
  document.body.append(cursor);

  const nativeTargets = 'input, textarea, select, [contenteditable]:not([contenteditable="false"]), iframe, button:disabled, [aria-disabled="true"], [data-cursor="native"], [data-cursor="none"]';
  const actions = 'a[href], button, summary, label[for], [role="button"], [role="link"], [role="tab"], [role="menuitem"], [role="checkbox"], [role="radio"], [role="switch"]';
  const draggableTargets = '#stage, [data-cursor="grab"], [data-draggable]';
  const listen = (target, type, handler, options = {}) => target.addEventListener(type, handler, { ...options, signal: abort.signal });
  let x = -1;
  let y = -1;
  let inside = false;
  let pressed = false;
  let grabbed = null;
  let frame = 0;
  let modal = null;
  let lastMode = '';

  function enabled() {
    return finePointer.matches && !forcedColors.matches && !document.hidden;
  }

  function hide() {
    root.classList.remove('oc-cursor-active');
    cursor.classList.remove('is-visible');
    cancelAnimationFrame(frame);
    frame = 0;
  }

  function reset() {
    inside = false;
    pressed = false;
    grabbed = null;
    hide();
  }

  function inTopLayer(element) {
    return element.matches('dialog:modal, [popover]:popover-open');
  }

  function syncPortal(preferred) {
    const overlays = [...document.querySelectorAll('dialog[open], [popover]')].filter(inTopLayer);
    modal = preferred instanceof Element && inTopLayer(preferred)
      ? preferred
      : overlays.includes(modal) ? modal : overlays.at(-1) || null;
    // A cursor inside the modal participates in its top layer; z-index alone does not.
    const host = modal || document.body;
    if (cursor.parentElement !== host) host.append(cursor);
    queue();
  }

  function modeFor(target) {
    if (target.closest(nativeTargets)) return null;
    if (modal && target === modal) {
      const bounds = modal.getBoundingClientRect();
      // Let the browser keep ownership of an actual dialog scrollbar.
      if (modal.scrollHeight > modal.clientHeight && x >= bounds.left + modal.clientWidth && x <= bounds.right) return null;
    }
    if (grabbed?.isConnected && pressed) return 'dragging';
    const draggable = target.closest(draggableTargets);
    if (draggable) return draggable.classList.contains('is-dragging') ? 'dragging' : 'grab';
    const action = target.closest(actions);
    if (action) return action.matches('[data-cursor="project"], .project-card, .project-link') ? 'project' : 'action';
    return 'rest';
  }

  function render() {
    frame = 0;
    if (!enabled() || !inside || x < 0 || y < 0 || x >= root.clientWidth || y >= innerHeight) return hide();
    const target = document.elementFromPoint(x, y);
    const mode = target && modeFor(target);
    if (!mode || getComputedStyle(cursor).position !== 'fixed') return hide();
    const state = `${mode}:${pressed}`;
    if (state !== lastMode) {
      lastMode = state;
      cursor.dataset.mode = mode;
      cursor.classList.toggle('is-pressed', pressed);
    }
    cursor.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    cursor.classList.add('is-visible');
    // Never hide the system pointer before a real coordinate and styled cursor exist.
    root.classList.add('oc-cursor-active');
  }

  function queue() {
    if (!enabled()) hide();
    else if (inside && !frame) frame = requestAnimationFrame(render);
  }

  function record(event) {
    if (event.pointerType !== 'mouse') {
      reset();
      return false;
    }
    inside = true;
    x = event.clientX;
    y = event.clientY;
    return true;
  }

  listen(document, 'pointermove', (event) => {
    // Recover if mouseup happened outside the browser or pointer capture was lost.
    if (!(event.buttons & 1)) { pressed = false; grabbed = null; }
    if (!record(event)) return;
    cancelAnimationFrame(frame);
    frame = 0;
    render();
  }, { passive: true });
  listen(document, 'pointerdown', (event) => {
    if (!record(event)) return;
    pressed = event.button === 0;
    grabbed = pressed && event.target instanceof Element ? event.target.closest(draggableTargets) : null;
    queue();
  }, { passive: true, capture: true });
  listen(document, 'pointerup', (event) => {
    pressed = false;
    grabbed = null;
    if (record(event)) queue();
  }, { passive: true, capture: true });
  listen(document, 'pointercancel', reset);
  listen(root, 'pointerleave', reset);
  listen(document, 'lostpointercapture', () => { pressed = false; grabbed = null; queue(); });
  listen(document, 'keydown', (event) => {
    if (!['Shift', 'Alt', 'Control', 'Meta'].includes(event.key)) reset();
  });
  listen(window, 'blur', reset);
  listen(document, 'visibilitychange', reset);
  listen(document, 'scroll', queue, { passive: true, capture: true });
  listen(window, 'resize', queue, { passive: true });
  listen(document, 'click', queue, { passive: true });
  listen(document, 'close', () => syncPortal(), { capture: true });
  listen(document, 'toggle', (event) => syncPortal(event.target), { capture: true });
  [finePointer, forcedColors].forEach((query) => listen(query, 'change', queue));

  const changes = new MutationObserver((records) => {
    const overlayChange = records.find((record) => record.type === 'attributes' && record.target.matches('dialog, [popover]'));
    if (overlayChange) syncPortal(overlayChange.target);
    else if (modal && !modal.isConnected) syncPortal();
    else if (records.some((record) => record.type === 'childList' && [...record.addedNodes].some((node) => node instanceof Element && (node.matches('dialog, [popover]') || node.querySelector('dialog, [popover]'))))) syncPortal();
    else if (records.some((record) => record.type !== 'childList' || [...record.addedNodes, ...record.removedNodes].some((node) => node !== cursor))) queue();
  });
  changes.observe(document.body, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['open', 'hidden', 'disabled', 'aria-disabled'],
  });
  syncPortal();

  return () => {
    reset();
    abort.abort();
    changes.disconnect();
    cursor.remove();
  };
}

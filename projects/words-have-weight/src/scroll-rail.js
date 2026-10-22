/** Add edge blur only while a control rail has content beyond that edge. */
export function mountScrollRails(root = document) {
  const cleanups = [...root.querySelectorAll('.oc-scroll-rail')].map(rail => {
    const shell = rail.closest('.oc-scroll-shell');
    if (!shell) return () => {};
    let disposed = false;
    const update = () => {
      if (disposed) return;
      shell.classList.toggle('has-before', rail.scrollLeft > 2);
      shell.classList.toggle('has-after', rail.scrollWidth - rail.clientWidth - rail.scrollLeft > 2);
    };
    const resize = new ResizeObserver(update);
    resize.observe(rail);
    const changes = new MutationObserver(update);
    changes.observe(rail, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['hidden'] });
    rail.addEventListener('scroll', update, { passive: true });
    document.fonts.ready.then(update);
    update();
    return () => {
      disposed = true;
      resize.disconnect(); changes.disconnect();
      rail.removeEventListener('scroll', update);
      shell.classList.remove('has-before', 'has-after');
    };
  });
  return () => cleanups.forEach(cleanup => cleanup());
}

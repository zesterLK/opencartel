/** A copyable source panel. Text is kept verbatim and never interpreted as HTML. */
export function mountMarkdownPanel(root, { url, filename, validate = () => true }) {
  const controller = new AbortController();
  let source = '';
  let pending = null;
  let loaded = false;
  let disposed = false;
  let resetTimer;

  root.classList.add('oc-markdown-panel');
  const header = document.createElement('div');
  header.className = 'oc-markdown-header';
  const name = document.createElement('span');
  name.className = 'oc-markdown-filename';
  name.textContent = filename;
  const copy = document.createElement('button');
  copy.type = 'button';
  copy.className = 'oc-button oc-markdown-copy';
  copy.textContent = 'Copy';
  copy.setAttribute('aria-label', `Copy ${filename}`);
  copy.dataset.cursorLabel = 'copy text';
  copy.disabled = true;
  header.append(name, copy);
  const content = document.createElement('pre');
  content.className = 'oc-markdown-content';
  content.dataset.cursor = 'native';
  content.tabIndex = 0;
  content.setAttribute('role', 'region');
  content.setAttribute('aria-label', `${filename} source`);
  const code = document.createElement('code');
  code.textContent = 'Loading…';
  content.append(code);
  const status = document.createElement('p');
  status.className = 'oc-markdown-status';
  status.setAttribute('role', 'status');
  const retry = document.createElement('button');
  retry.type = 'button';
  retry.className = 'oc-button oc-markdown-retry';
  retry.textContent = 'Try again';
  retry.hidden = true;
  root.replaceChildren(header, content, status, retry);

  async function load() {
    if (loaded || disposed) return;
    if (pending) return pending;
    root.setAttribute('aria-busy', 'true');
    retry.hidden = true;
    code.textContent = 'Loading…';
    status.textContent = '';
    pending = (async () => {
      try {
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) throw new Error('Unavailable');
        const text = await response.text();
        if (!text.trim() || !validate(text)) throw new Error('Unexpected content');
        if (disposed) return;
        source = text;
        code.textContent = source;
        loaded = true;
        copy.disabled = false;
      } catch {
        if (disposed) return;
        code.textContent = 'This document could not be loaded.';
        status.textContent = 'Check your connection and try again.';
        retry.hidden = false;
      } finally {
        if (!disposed) root.removeAttribute('aria-busy');
        pending = null;
      }
    })();
    return pending;
  }

  copy.addEventListener('click', async () => {
    if (!loaded) return;
    clearTimeout(resetTimer);
    try {
      await navigator.clipboard.writeText(source);
      if (disposed) return;
      copy.textContent = 'Copied';
      status.textContent = 'Copied to clipboard.';
      resetTimer = setTimeout(() => { copy.textContent = 'Copy'; status.textContent = ''; }, 2200);
    } catch {
      if (disposed) return;
      const range = document.createRange();
      range.selectNodeContents(code);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
      content.focus({ preventScroll: true });
      status.textContent = 'Text selected. Press ⌘C or Ctrl+C to copy, or use your device’s Copy command.';
    }
  }, { signal: controller.signal });
  retry.addEventListener('click', load, { signal: controller.signal });

  return {
    load,
    dispose() { disposed = true; controller.abort(); clearTimeout(resetTimer); },
  };
}

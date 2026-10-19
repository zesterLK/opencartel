import type { PDFDocumentLoadingTask, PDFDocumentProxy, RenderTask } from 'pdfjs-dist';

export const DOCUMENT_PAGE_WIDTH = 768;
export const DOCUMENT_PAGE_HEIGHT = 1086;
const MARGIN = 54;
const TEXT_LINE_HEIGHT = 24;
const TEXT_LINES_PER_PAGE = 38;
const PAGE_COLOR = '#fffdf6';

export type RenderedDocumentPage = { canvas: HTMLCanvasElement; label: string };
export type DocumentKind = 'pdf' | 'image' | 'text' | 'cover';

/** Each render returns a new canvas owned by the caller. dispose() never clears it. */
export interface DocumentSource {
  readonly displayName: string;
  readonly totalPages: number;
  readonly kind: DocumentKind;
  /** Zero-based index; render pages sequentially to keep memory bounded. */
  renderPage(index: number, signal?: AbortSignal): Promise<RenderedDocumentPage>;
  dispose(): void;
}

function abortError(): DOMException { return new DOMException('Document loading was cancelled.', 'AbortError'); }
function checkAbort(signal?: AbortSignal): void { if (signal?.aborted) throw abortError(); }

function abortable<T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return promise;
  if (signal.aborted) { void promise.catch(() => {}); return Promise.reject(abortError()); }
  return new Promise<T>((resolve, reject) => {
    const abort = () => reject(abortError());
    signal.addEventListener('abort', abort, { once: true });
    promise.then(resolve, reject).finally(() => signal.removeEventListener('abort', abort));
  });
}

function pageCanvas(): { canvas: HTMLCanvasElement; context: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas');
  canvas.width = DOCUMENT_PAGE_WIDTH;
  canvas.height = DOCUMENT_PAGE_HEIGHT;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('This browser could not create a document preview.');
  context.fillStyle = PAGE_COLOR;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.textBaseline = 'top';
  return { canvas, context };
}

function validatePage(index: number, total: number, disposed: boolean, signal?: AbortSignal): void {
  checkAbort(signal);
  if (disposed) throw new Error('This document has been released. Choose the file again.');
  if (!Number.isInteger(index) || index < 0 || index >= total) throw new RangeError('That page is not in this document.');
}

function pageLabel(name: string, index: number, total: number): string {
  return `${name} · page ${index + 1} of ${total}`;
}

function fitText(context: CanvasRenderingContext2D, text: string, width: number): string {
  if (context.measureText(text).width <= width) return text;
  const characters = Array.from(text);
  while (characters.length && context.measureText(`${characters.join('')}…`).width > width) characters.pop();
  return `${characters.join('')}…`;
}

function furniture(context: CanvasRenderingContext2D, name: string, footer: string): void {
  context.fillStyle = '#655d51';
  context.font = '14px system-ui, sans-serif';
  context.fillText(fitText(context, name, DOCUMENT_PAGE_WIDTH - MARGIN * 2), MARGIN, 30);
  context.fillText(footer, MARGIN, DOCUMENT_PAGE_HEIGHT - 42);
}

/** Wrap measured graphemes without losing non-ASCII characters or blank lines. */
async function paginateText(text: string, context: CanvasRenderingContext2D, signal?: AbortSignal): Promise<string[][]> {
  const pages: string[][] = [[]];
  const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
  const width = DOCUMENT_PAGE_WIDTH - MARGIN * 2;
  let processed = 0;
  const addLine = (line: string) => {
    if (pages[pages.length - 1].length === TEXT_LINES_PER_PAGE) pages.push([]);
    pages[pages.length - 1].push(line);
  };
  for (const rawLine of text.replace(/\r\n?/g, '\n').split('\n')) {
    let line = '';
    for (const { segment } of segmenter.segment(rawLine.replace(/\t/g, '    '))) {
      if (line && context.measureText(line + segment).width > width) { addLine(line); line = ''; }
      line += segment;
      processed += segment.length;
      if (processed >= 16384) {
        processed = 0;
        await new Promise<void>(resolve => setTimeout(resolve, 0));
        checkAbort(signal);
      }
    }
    addLine(line);
  }
  return pages;
}

async function textSource(file: File, signal?: AbortSignal): Promise<DocumentSource> {
  const buffer = await abortable(file.arrayBuffer(), signal);
  checkAbort(signal);
  let text: string;
  try { text = new TextDecoder('utf-8', { fatal: true }).decode(buffer); }
  catch { throw new Error('This text file is not valid UTF-8. Save a UTF-8 copy and choose it again.'); }
  if (text.includes('\0')) throw new Error('This file contains binary data. Choose a UTF-8 text file or a different file type.');
  const measuring = pageCanvas();
  measuring.context.font = '17px ui-monospace, monospace';
  let pages = await paginateText(text, measuring.context, signal);
  measuring.canvas.width = measuring.canvas.height = 0;
  const totalPages = pages.length;
  const displayName = file.name || 'Untitled text';
  let disposed = false;
  return {
    kind: 'text', displayName, totalPages,
    async renderPage(index, renderSignal) {
      validatePage(index, totalPages, disposed, renderSignal);
      const { canvas, context } = pageCanvas();
      furniture(context, displayName, `TEXT · ${index + 1} / ${totalPages}`);
      context.fillStyle = '#292923';
      context.font = '17px ui-monospace, monospace';
      pages[index].forEach((line, row) => context.fillText(line, MARGIN, 88 + row * TEXT_LINE_HEIGHT));
      return { canvas, label: pageLabel(displayName, index, totalPages) };
    },
    dispose() { disposed = true; pages = []; },
  };
}

async function imageSource(file: File, signal?: AbortSignal): Promise<DocumentSource> {
  if (typeof createImageBitmap !== 'function') throw new Error('This browser cannot create a local image preview. Try a current browser.');
  checkAbort(signal);
  let bitmap: ImageBitmap;
  // A Blob source is decoded to its first frame, including animated GIF/WebP.
  // No object URL, HTML image, external resource, or animation timer is involved.
  const decoding = createImageBitmap(file);
  try { bitmap = await abortable(decoding, signal); }
  catch (error) {
    void decoding.then(decoded => decoded.close(), () => {});
    if (signal?.aborted) throw abortError();
    throw new Error('This image could not be decoded. Try a valid PNG, JPEG, WebP or GIF file.', { cause: error });
  }
  let output: ReturnType<typeof pageCanvas>;
  try {
    checkAbort(signal);
    output = pageCanvas();
    const { canvas, context } = output;
    if (!bitmap.width || !bitmap.height) throw new Error('This image has no readable pixels.');
    const scale = Math.min((canvas.width - MARGIN * 2) / bitmap.width, (canvas.height - MARGIN * 2) / bitmap.height);
    const width = bitmap.width * scale, height = bitmap.height * scale;
    context.drawImage(bitmap, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height);
  } finally { bitmap.close(); }
  const { canvas } = output;
  const displayName = file.name || 'Untitled image';
  let disposed = false;
  return {
    kind: 'image', displayName, totalPages: 1,
    async renderPage(index, renderSignal) {
      validatePage(index, 1, disposed, renderSignal);
      const output = pageCanvas();
      output.context.drawImage(canvas, 0, 0);
      return { canvas: output.canvas, label: `${displayName} · image` };
    },
    dispose() { disposed = true; canvas.width = canvas.height = 0; },
  };
}

function coverSource(file: File): DocumentSource {
  const displayName = file.name || 'Untitled file';
  const size = file.size < 1024 ? `${file.size} bytes` : file.size < 1024 * 1024 ? `${(file.size / 1024).toFixed(1)} KB` : `${(file.size / (1024 * 1024)).toFixed(1)} MB`;
  let disposed = false;
  return {
    kind: 'cover', displayName, totalPages: 1,
    async renderPage(index, signal) {
      validatePage(index, 1, disposed, signal);
      const { canvas, context } = pageCanvas();
      furniture(context, displayName, 'COVER SHEET · ORIGINAL FILE UNCHANGED');
      context.fillStyle = '#393b37';
      context.font = 'bold 38px system-ui, sans-serif';
      context.fillText('FILE COVER SHEET', MARGIN, 210);
      context.font = '23px ui-monospace, monospace';
      const nameLines = await paginateText(displayName, context, signal);
      const lines = nameLines.flat();
      lines.slice(0, 5).forEach((line, row) => context.fillText(row === 4 && lines.length > 5 ? fitText(context, `${line}…`, canvas.width - MARGIN * 2) : line, MARGIN, 300 + row * 34));
      context.font = '20px system-ui, sans-serif';
      context.fillText(size, MARGIN, 510);
      context.fillText('This format is represented by its cover sheet.', MARGIN, 650);
      context.fillText('The contents have not been rendered.', MARGIN, 685);
      return { canvas, label: `${displayName} · cover sheet (contents not rendered)` };
    },
    dispose() { disposed = true; },
  };
}

async function pdfSource(file: File, signal?: AbortSignal): Promise<DocumentSource> {
  checkAbort(signal);
  // Vite emits the official worker and supporting assets under this project's
  // asset base. Only these package-owned URLs may be requested; file bytes go
  // directly to the parser as a Uint8Array, never to fetch or an upload endpoint.
  const [pdfjs, workerModule] = await abortable(Promise.all([
    import('pdfjs-dist'), import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
  ]), signal);
  const bundledAssets = import.meta.glob<string>([
    '../node_modules/pdfjs-dist/cmaps/*.bcmap',
    '../node_modules/pdfjs-dist/standard_fonts/*.{pfb,ttf}',
    '../node_modules/pdfjs-dist/wasm/{openjpeg,jbig2}.wasm',
  ], { eager: true, import: 'default', query: '?url&no-inline' });
  const resources = new Map(Object.entries(bundledAssets).map(([path, url]) => {
    const [folder, filename] = path.split('/').slice(-2);
    return [`${folder}/${filename}`, url];
  }));
  const resourceAbort = new AbortController();
  class LocalBinaryDataFactory {
    async fetch({ kind, filename }: { kind: string; filename: string }): Promise<Uint8Array> {
      const folder = { cMapUrl: 'cmaps', standardFontDataUrl: 'standard_fonts', wasmUrl: 'wasm' }[kind];
      const url = folder && resources.get(`${folder}/${filename}`);
      if (!url) throw new Error('The PDF requested an unavailable bundled resource.');
      const response = await fetch(url, { signal: resourceAbort.signal, credentials: 'omit' });
      if (!response.ok) throw new Error('A local PDF rendering resource could not be loaded.');
      return new Uint8Array(await response.arrayBuffer());
    }
  }
  pdfjs.GlobalWorkerOptions.workerSrc = workerModule.default;
  const data = new Uint8Array(await abortable(file.arrayBuffer(), signal));
  checkAbort(signal);
  // PDF.js 6 removed the old isEvalSupported flag and eval-based renderer.
  // This uses only canvas rendering: no viewer scripting, links, or XFA layer.
  const loadingTask: PDFDocumentLoadingTask = pdfjs.getDocument({
    data, enableXfa: false, useWorkerFetch: false, BinaryDataFactory: LocalBinaryDataFactory,
    useSystemFonts: true, stopAtErrors: true,
    canvasMaxAreaInBytes: DOCUMENT_PAGE_WIDTH * DOCUMENT_PAGE_HEIGHT * 4,
    disableAutoFetch: true, disableRange: true, disableStream: true,
  });
  let disposed = false;
  const renders = new Set<RenderTask>();
  const destroy = () => {
    if (disposed) return;
    disposed = true;
    resourceAbort.abort();
    for (const render of renders) render.cancel();
    void loadingTask.destroy().catch(() => {});
  };
  signal?.addEventListener('abort', destroy, { once: true });
  let pdf: PDFDocumentProxy;
  try {
    pdf = await abortable(loadingTask.promise, signal);
    checkAbort(signal);
  } catch (error) {
    destroy();
    if (signal?.aborted) throw abortError();
    if (error instanceof Error && error.name === 'PasswordException') throw new Error('This PDF is password protected. Choose an unlocked copy.');
    throw new Error('This PDF could not be opened. Choose a valid, unlocked PDF file.', { cause: error });
  } finally { signal?.removeEventListener('abort', destroy); }
  const totalPages = pdf.numPages;
  const displayName = file.name || 'Untitled PDF';
  let busy = false;
  return {
    kind: 'pdf', displayName, totalPages,
    async renderPage(index, renderSignal) {
      validatePage(index, totalPages, disposed, renderSignal);
      if (busy) throw new Error('Wait for the current page preview to finish.');
      busy = true;
      let page: Awaited<ReturnType<PDFDocumentProxy['getPage']>> | undefined;
      let render: RenderTask | undefined;
      let canvas: HTMLCanvasElement | undefined;
      const cancel = () => render?.cancel();
      renderSignal?.addEventListener('abort', cancel, { once: true });
      try {
        page = await pdf.getPage(index + 1);
        validatePage(index, totalPages, disposed, renderSignal);
        const original = page.getViewport({ scale: 1 });
        if (!Number.isFinite(original.width) || !Number.isFinite(original.height) || original.width <= 0 || original.height <= 0) throw new Error('This PDF page has invalid dimensions.');
        const scale = Math.min(DOCUMENT_PAGE_WIDTH / original.width, DOCUMENT_PAGE_HEIGHT / original.height);
        const viewport = page.getViewport({ scale });
        const output = pageCanvas();
        canvas = output.canvas;
        render = page.render({
          canvas, viewport, background: PAGE_COLOR,
          transform: [1, 0, 0, 1, (canvas.width - viewport.width) / 2, (canvas.height - viewport.height) / 2],
        });
        renders.add(render);
        await render.promise;
        validatePage(index, totalPages, disposed, renderSignal);
        return { canvas, label: pageLabel(displayName, index, totalPages) };
      } catch (error) {
        if (canvas) canvas.width = canvas.height = 0;
        if (renderSignal?.aborted || disposed) throw abortError();
        throw new Error(`Page ${index + 1} of this PDF could not be rendered. Try another PDF.`, { cause: error });
      } finally {
        renderSignal?.removeEventListener('abort', cancel);
        if (render) renders.delete(render);
        page?.cleanup();
        busy = false;
      }
    },
    dispose: destroy,
  };
}

/** Read a local File. Never persists, modifies, or transmits the selected file. */
export async function createDocumentSource(file: File, signal?: AbortSignal): Promise<DocumentSource> {
  checkAbort(signal);
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (extension === 'pdf' || file.type === 'application/pdf') return pdfSource(file, signal);
  if (['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(extension || '') || ['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(file.type)) return imageSource(file, signal);
  if (['txt', 'md', 'csv'].includes(extension || '') || ['text/plain', 'text/markdown', 'text/csv'].includes(file.type)) return textSource(file, signal);
  return coverSource(file);
}

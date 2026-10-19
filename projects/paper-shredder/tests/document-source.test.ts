import test, { type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { createDocumentSource, DOCUMENT_PAGE_HEIGHT, DOCUMENT_PAGE_WIDTH } from '../src/document-source.ts';

type TestCanvas = HTMLCanvasElement & { written: { text: string; y: number }[] };

// Geometry and pixel decoding are browser checks. This small canvas double
// exercises pagination, literal text, ownership, cancellation and bad inputs.
function installCanvas(t: TestContext): void {
  const oldDocument = globalThis.document;
  Object.defineProperty(globalThis, 'document', { configurable: true, value: {
    createElement(tag: string) {
      assert.equal(tag, 'canvas');
      const written: TestCanvas['written'] = [];
      return { width: 0, height: 0, written, getContext() { return {
        fillRect() {}, drawImage() {},
        measureText(text: string) { return { width: [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(text)].length * 10 }; },
        fillText(text: string, _x: number, y: number) { written.push({ text, y }); },
      }; } };
    },
  } });
  t.after(() => {
    if (oldDocument) Object.defineProperty(globalThis, 'document', { configurable: true, value: oldDocument });
    else Reflect.deleteProperty(globalThis, 'document');
  });
}

function bodyText(canvas: HTMLCanvasElement): string[] {
  return (canvas as TestCanvas).written.filter(({ y }) => y >= 88 && y < 1000).map(({ text }) => text);
}

test('UTF-8 text spans every page without a three-page limit or missing lines', async t => {
  installCanvas(t);
  const lines = Array.from({ length: 205 }, (_, index) => `Line ${index + 1}: café / नमस्ते / 🧡`);
  const source = await createDocumentSource(new File([lines.join('\r\n')], 'notes.md'));
  assert.equal(source.kind, 'text');
  assert.equal(source.totalPages, 6);
  const rendered: string[] = [];
  for (let index = 0; index < source.totalPages; index++) {
    const page = await source.renderPage(index);
    assert.equal(page.canvas.width, DOCUMENT_PAGE_WIDTH);
    assert.equal(page.canvas.height, DOCUMENT_PAGE_HEIGHT);
    assert.equal(page.label, `notes.md · page ${index + 1} of 6`);
    rendered.push(...bodyText(page.canvas));
  }
  assert.deepEqual(rendered, lines);
  source.dispose();
});

test('wrapping preserves grapheme clusters and blank lines, including literal markup', async t => {
  installCanvas(t);
  const cluster = '👨‍👩‍👧‍👦';
  const source = await createDocumentSource(new File([`${cluster.repeat(100)}\n\n<script>literal</script>`], 'hello.txt'));
  const page = await source.renderPage(0);
  assert.deepEqual(bodyText(page.canvas), [cluster.repeat(66), cluster.repeat(34), '', '<script>literal</script>']);
  source.dispose();
});

test('unsupported files become explicit metadata covers without reading their bytes', async t => {
  installCanvas(t);
  const file = new File(['opaque binary content'], 'slides.pptx');
  t.mock.method(file, 'arrayBuffer', () => { throw new Error('The cover must not inspect file content.'); });
  const source = await createDocumentSource(file);
  assert.equal(source.kind, 'cover');
  assert.equal(source.totalPages, 1);
  const page = await source.renderPage(0);
  const text = (page.canvas as TestCanvas).written.map(entry => entry.text).join('\n');
  assert.match(text, /FILE COVER SHEET/);
  assert.match(text, /slides\.pptx/);
  assert.match(text, /21 bytes/);
  assert.match(text, /contents have not been rendered/);
  assert.match(page.label, /cover sheet \(contents not rendered\)/);
});

test('disposing a source leaves already returned canvas intact and prevents reuse', async t => {
  installCanvas(t);
  const source = await createDocumentSource(new File(['hello'], 'hello.txt'));
  const page = await source.renderPage(0);
  source.dispose();
  source.dispose();
  assert.equal(page.canvas.width, DOCUMENT_PAGE_WIDTH);
  assert.deepEqual(bodyText(page.canvas), ['hello']);
  await assert.rejects(source.renderPage(0), /released/);
});

test('empty text is one printable sheet; invalid page indexes fail clearly', async t => {
  installCanvas(t);
  const source = await createDocumentSource(new File([], 'empty.txt'));
  assert.equal(source.totalPages, 1);
  assert.deepEqual(bodyText((await source.renderPage(0)).canvas), ['']);
  for (const index of [-1, 1, .5, NaN]) await assert.rejects(source.renderPage(index), RangeError);
  source.dispose();
});

test('invalid UTF-8 and binary text fail instead of silently replacing content', async t => {
  installCanvas(t);
  await assert.rejects(createDocumentSource(new File([new Uint8Array([0xc3, 0x28])], 'invalid.txt')), /not valid UTF-8/);
  await assert.rejects(createDocumentSource(new File(['hello\0binary'], 'binary.csv')), /binary data/);
});

test('cancelled creation and rendering fail with AbortError', async t => {
  installCanvas(t);
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(createDocumentSource(new File(['hello'], 'hello.txt'), controller.signal), { name: 'AbortError' });
  const source = await createDocumentSource(new File(['hello'], 'hello.txt'));
  await assert.rejects(source.renderPage(0, controller.signal), { name: 'AbortError' });
  source.dispose();
});

test('image decoding consumes the local Blob and releases bitmap while preserving rendered canvas', async t => {
  installCanvas(t);
  const file = new File(['fixture pixels'], 'image.gif', { type: 'image/gif' });
  let closes = 0;
  Object.defineProperty(globalThis, 'createImageBitmap', { configurable: true, value: async (input: Blob) => {
    assert.equal(input, file);
    return { width: 400, height: 200, close() { closes++; } };
  } });
  t.after(() => Reflect.deleteProperty(globalThis, 'createImageBitmap'));
  const source = await createDocumentSource(file);
  assert.equal(source.kind, 'image');
  assert.equal(source.totalPages, 1);
  assert.equal(closes, 1);
  const rendered = await source.renderPage(0);
  source.dispose();
  assert.equal(rendered.canvas.width, DOCUMENT_PAGE_WIDTH);
  assert.equal(rendered.canvas.height, DOCUMENT_PAGE_HEIGHT);
  await assert.rejects(source.renderPage(0), /released/);
});

test('cancelling a pending image decode closes its late bitmap', async t => {
  installCanvas(t);
  let resolveDecode!: (bitmap: object) => void;
  const decoding = new Promise(resolve => { resolveDecode = resolve; });
  Object.defineProperty(globalThis, 'createImageBitmap', { configurable: true, value: () => decoding });
  t.after(() => Reflect.deleteProperty(globalThis, 'createImageBitmap'));
  const controller = new AbortController();
  const source = createDocumentSource(new File(['fixture pixels'], 'image.png'), controller.signal);
  controller.abort();
  await assert.rejects(source, { name: 'AbortError' });
  let closes = 0;
  resolveDecode({ width: 40, height: 20, close() { closes++; } });
  await decoding;
  await Promise.resolve();
  assert.equal(closes, 1);
});

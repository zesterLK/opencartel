import { mountScrollRails } from './scroll-rail.js';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { PaperPage, BinArchive, type Anchors } from './paper-renderer.ts';
import { PAGE_LENGTH, PRESS_DURATION, FEED_SPEED, SETTLE_DURATION, clamp, frameDelta, phaseAt, type Phase } from './paper.ts';
import { createDocumentSource, type DocumentSource } from './document-source.ts';
import { OfficeInteractions, OFFICE_NOTES } from './office-interactions.ts';
import './style.css';
import './ui.css';
import './cursor.css';
import './motion.css';
import './markdown-panel.css';
import { mountCursor } from './cursor.js';
import { mountPageMotion, openDialog, closeDialog } from './motion.js';
import { mountMarkdownPanel } from './markdown-panel.js';

const $ = <T extends HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
const canvas = $<HTMLCanvasElement>('#scene');
const room = $('#room');
const buttonHit = $<HTMLButtonElement>('#shred-button');
const addButton = $<HTMLButtonElement>('#add-sheet');
const addFiveButton = $<HTMLButtonElement>('#add-five');
const emptyButton = $<HTMLButtonElement>('#empty-button');
const pauseButton = $<HTMLButtonElement>('#pause-button');
const overlay = $('#load-state');
const retryButton = $<HTMLButtonElement>('#retry-button');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
const events = new AbortController();
const { signal } = events;
const disposeCursor = mountCursor();
const disposeRails = mountScrollRails();
import.meta.hot?.dispose(disposeRails);
const disposeMotion = mountPageMotion();
let renderer: THREE.WebGLRenderer | null = null;
let scene: THREE.Scene | null = null;
const camera = new THREE.PerspectiveCamera(36, 1, .03, 40);
const cameraHome = new THREE.Vector3(1.1, 1.8, 4.6);
const cameraTarget = new THREE.Vector3(0, .82, -.15);
const parallax = new THREE.Vector2();
const parallaxTarget = new THREE.Vector2();
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const buttonCenter = new THREE.Vector3();
const projected = new THREE.Vector3();
let model: THREE.Group | null = null;
let machine: THREE.Object3D | null = null;
let machineHome = new THREE.Vector3();
let physicalButton: THREE.Object3D | null = null;
let buttonHome = new THREE.Vector3();
let anchors: Anchors | null = null;
let pages: PaperPage[] = [];
let archive: BinArchive | null = null;
let archivedCount = 0;
let office: OfficeInteractions | null = null;
const cameraAim = new THREE.Vector3(0, .82, -.15);
let officeMoving = false;
let speed = 1;
let emptyRequested = false;
let activeIsExample = true;
let activeLabel = 'One last sheet';
let pendingLoad = false;
let queueEpoch = 0;
let fileAbort: AbortController | null = null;
let fileEpoch = 0;
type QueueJob = { source: DocumentSource | null; next: number; total: number; label: string };
const waiting: QueueJob[] = [];
const queuedCount = () => waiting.reduce((n, job) => n + job.total - job.next, 0);
let active: PaperPage | null = null;
let pageNumber = 0;
let phase: Phase | 'loading-sheet' = 'ready';
let elapsed = 0;
let loadElapsed = 0;
let binCount = 0;
let ready = false;
let paused = false;
let reducedHalf = false;
let raf = 0;
let previous = 0;
let disposed = false;
let contextLost = false;
let generation = 0;
let loadAbort: AbortController | null = null;

const announce = (message: string) => { $('#announcement').textContent = message; };
const isAnimating = () => phase === 'pressing' || phase === 'feeding' || phase === 'settling' || phase === 'loading-sheet';
const dialogsOpen = () => !!document.querySelector('dialog[open]');

function syncControls(message?: string): void {
  const busy = isAnimating();
  buttonHit.disabled = !ready || pendingLoad || (phase !== 'ready' && !reducedHalf && !(phase === 'complete' && queuedCount() > 0));
  buttonHit.setAttribute('aria-label', phase === 'complete' && queuedCount() ? 'Load the next queued page' : reducedHalf ? 'Finish shredding the sheet' : reduced.matches ? 'Show the sheet halfway shredded' : 'Shred the sheet');
  buttonHit.dataset.cursorLabel = reducedHalf ? 'finish shredding' : 'shred it';
  addButton.disabled = !ready; addFiveButton.disabled = !ready;
  emptyButton.disabled = !ready || (binCount === 0 && !busy) || emptyRequested;
  emptyButton.textContent = emptyRequested ? 'Emptying after sheet…' : 'Empty bin';
  pauseButton.hidden = (!busy && queuedCount() === 0 && !paused) || reduced.matches;
  pauseButton.setAttribute('aria-pressed', String(paused));
  pauseButton.textContent = paused ? 'Resume' : 'Pause';
  $('#bin-count').textContent = `${binCount} ${binCount === 1 ? 'sheet' : 'sheets'}`;
  const fill = Math.min(1, binCount / 28);
  $<HTMLProgressElement>('#bin-fill').value = fill;
  $('#bin-percent').textContent = fill === 1 ? 'full' : `${Math.round(fill * 100)}%`;
  $('#queue-button').textContent = `Queue (${queuedCount()})`;
  $('#active-page').textContent = activeLabel;
  $('#status-dot').dataset.state = phase;
  let status = message;
  if (!status && ready) {
    if (paused) status = 'Paused. Take your time.';
    else if (pendingLoad) status = 'Preparing the next page locally…';
    else if (reducedHalf) status = 'Press the button again to finish.';
    else if (phase === 'ready') status = reduced.matches ? 'Press the amber button · reduced motion' : 'Press the amber button.';
    else if (phase === 'loading-sheet') status = 'Loading a fresh sheet…';
    else if (phase === 'pressing' || phase === 'feeding') status = 'A little less paperwork.';
    else if (phase === 'settling') status = 'Letting things settle…';
    else status = queuedCount() ? 'Next page is waiting.' : 'All done. Add another sheet or a local file.';
  }
  if (status) $('#scene-status').textContent = status;
  if ($<HTMLDialogElement>('#queue-dialog').open) drawQueue();
}

function startShred(): void {
  if (ready && phase === 'complete' && queuedCount()) { void loadNext(); return; }
  if (!ready || !active || (phase !== 'ready' && !reducedHalf)) return;
  paused = false;
  office?.setView('room');
  if (reduced.matches) {
    if (!reducedHalf) {
      elapsed = PRESS_DURATION + (PAGE_LENGTH + active.headLength) / FEED_SPEED / 2;
      phase = 'feeding'; reducedHalf = true;
      active.update((PAGE_LENGTH + active.headLength) / 2, 0, 0);
      announce('The sheet is halfway through. Press the machine button again to finish.');
    } else {
      active.finishImmediately();
      completeSheet();
    }
    syncControls(); render(); return;
  }
  elapsed = 0; reducedHalf = false; phase = 'pressing';
  announce('Shredding started.');
  syncControls(); wake();
}

function completeSheet(): void {
  phase = 'complete'; reducedHalf = false; paused = false;
  active?.settle(); binCount += 1;
  if (machine) machine.position.copy(machineHome);
  if (physicalButton) physicalButton.position.copy(buttonHome);
  while (pages.length > 6) {
    const old = pages.shift()!; old.dispose();
    const previousHeight = archive?.height ?? 0;
    archive?.setCount(++archivedCount);
    const lift = (archive?.height ?? 0) - previousHeight - .012;
    for (const page of pages) page.group.position.y += lift;
  }
  announce('Shredding complete.');
  if (emptyRequested) clearBin();
  syncControls();
  if (queuedCount() && !reduced.matches && !dialogsOpen()) void loadNext();
}

function drawQueue(): void {
  const list = $('#queue-list'); list.replaceChildren();
  if (!waiting.length) { const li = document.createElement('li'); li.textContent = 'Nothing waiting. Add a sheet or choose a file.'; list.append(li); }
  for (const job of waiting) {
    const li = document.createElement('li'); li.textContent = job.label;
    const detail = document.createElement('small'); detail.textContent = `${job.total - job.next} ${job.total - job.next === 1 ? 'page' : 'pages'} waiting`; li.append(detail); list.append(li);
  }
  $<HTMLButtonElement>('#clear-queue').disabled = waiting.length === 0;
}

function clearWaiting(): void {
  cancelFileReading();
  queueEpoch += 1;
  for (const job of waiting) job.source?.dispose();
  waiting.length = 0; syncControls(); announce('Waiting queue cleared. The current sheet stays in the machine.');
}

function queueExamples(count: number): void {
  waiting.push({ source: null, next: 0, total: count, label: count === 1 ? 'An example sheet' : `${count} example sheets` });
  announce(`${count} ${count === 1 ? 'sheet' : 'sheets'} added to the queue.`);
  syncControls();
  if (phase === 'complete' && !pendingLoad) void loadNext();
  else if (phase === 'ready' && !reduced.matches && !paused) startShred();
}

async function loadNext(): Promise<void> {
  if (!anchors || !scene || !ready || pendingLoad || isAnimating() || !waiting.length) return;
  pendingLoad = true; syncControls();
  let artwork: HTMLCanvasElement | undefined;
  let label = 'An example sheet'; let example = true;
  const loadGeneration = generation; const epoch = queueEpoch;
  const finishPreparation = () => {
    pendingLoad = false;
    if (emptyRequested && !isAnimating()) clearBin();
    syncControls();
  };
  while (waiting.length) {
    const job = waiting[0];
    try {
      if (job.source) { const page = await job.source.renderPage(job.next); artwork = page.canvas; label = page.label; example = false; }
      if (loadGeneration !== generation || disposed) return;
      if (epoch !== queueEpoch) { finishPreparation(); if (queuedCount()) void loadNext(); return; }
      job.next += 1;
      if (job.next === job.total) { waiting.shift(); job.source?.dispose(); }
      break;
    } catch (error) {
      if (loadGeneration !== generation || disposed) return;
      if (epoch !== queueEpoch) { finishPreparation(); if (queuedCount()) void loadNext(); return; }
      waiting.shift(); job.source?.dispose();
      announce(`Could not prepare ${job.label}: ${error instanceof Error ? error.message : 'unreadable file'}`);
      if (!waiting.length) { finishPreparation(); syncControls('That file could not be prepared. Try another file.'); return; }
    }
  }
  pageNumber += 1;
  const lifted: Anchors = { inlet: anchors.inlet.clone(), outlet: anchors.outlet.clone(), floor: anchors.floor.clone().add(new THREE.Vector3(0, archive?.height ?? 0, 0)) };
  active = new PaperPage(lifted, pageNumber, pages.length, artwork);
  pages.push(active); scene.add(active.group); activeLabel = label; activeIsExample = example;
  pendingLoad = false; phase = reduced.matches ? 'ready' : 'loading-sheet';
  elapsed = 0; loadElapsed = 0; reducedHalf = false;
  active.update(0, 0, 0, reduced.matches ? 0 : .18);
  announce(`${label} loaded.`); syncControls(); wake();
}

function clearBin(): void {
  const keepLoaded = phase === 'ready' && active;
  const canvas = keepLoaded ? active!.texture.image as HTMLCanvasElement : undefined;
  for (const page of pages) page.dispose();
  active = null; pages = []; binCount = 0; archivedCount = 0; archive?.setCount(0); emptyRequested = false;
  if (keepLoaded && anchors && scene) {
    active = new PaperPage(anchors, pageNumber, 0, canvas);
    pages.push(active); scene.add(active.group);
  }
  announce('Bin emptied.'); syncControls(); wake();
}

function emptyBin(): void {
  if (!ready) return;
  if (isAnimating() || pendingLoad) { emptyRequested = true; syncControls(); announce('The bin will empty after this sheet finishes.'); }
  else clearBin();
}

function cancelFileReading(): void {
  fileEpoch += 1;
  if (fileAbort) {
    fileAbort.abort(); fileAbort = null;
    $<HTMLInputElement>('#local-files').disabled = false;
    $<HTMLInputElement>('#local-files').value = '';
    $<HTMLButtonElement>('#queue-files').disabled = true;
    $('#file-status').textContent = 'File reading cancelled. Nothing was uploaded.';
  }
}

async function queueSelectedFiles(): Promise<void> {
  const files = [...($<HTMLInputElement>('#local-files').files ?? [])];
  if (!files.length) return;
  fileAbort?.abort(); const controller = new AbortController(); fileAbort = controller;
  const epoch = ++fileEpoch, sceneGeneration = generation;
  const stale = () => controller.signal.aborted || epoch !== fileEpoch || sceneGeneration !== generation || disposed;
  const control = $<HTMLButtonElement>('#queue-files'); control.disabled = true;
  $<HTMLInputElement>('#local-files').disabled = true;
  let added = 0; const errors: string[] = [];
  try {
    for (const file of files) {
      if (stale()) return;
      $('#file-status').textContent = `Reading ${file.name} locally…`;
      try {
        const source = await createDocumentSource(file, controller.signal);
        if (stale()) { source.dispose(); return; }
        waiting.push({ source, next: 0, total: source.totalPages, label: source.displayName }); added += source.totalPages;
      } catch (error) {
        if (stale()) return;
        errors.push(`${file.name}: ${error instanceof Error ? error.message : 'Could not read file.'}`);
      }
    }
    if (stale()) return;
    $('#file-status').textContent = errors.length ? errors.join(' ') : `${added} ${added === 1 ? 'page' : 'pages'} queued locally. Nothing was uploaded.`;
    if (added) {
      // Replace only the untouched introductory prop, making the first file immediate.
      if (phase === 'ready' && activeIsExample && binCount === 0 && pageNumber === 0) { active?.dispose(); active = null; pages = []; phase = 'complete'; }
      syncControls();
      if (!errors.length) closeDialog($<HTMLDialogElement>('#upload-dialog'));
      if (phase === 'complete') void loadNext();
      else if (phase === 'ready' && !reduced.matches && !paused) startShred();
    }
  } finally {
    if (epoch === fileEpoch && !disposed) {
      fileAbort = null; $<HTMLInputElement>('#local-files').disabled = false;
      $<HTMLInputElement>('#local-files').value = ''; control.disabled = true;
    }
  }
}

function resize(): void {
  const width = room.clientWidth, height = room.clientHeight;
  if (!width || !height) return;
  const topInset = $('.masthead').offsetHeight;
  const bottomInset = $('.controls').offsetHeight;
  const clearHeight = Math.max(height * .35, height - topInset - bottomInset);
  camera.aspect = width / height;
  if (camera.aspect < .8) {
    cameraHome.set(.65, 1.6, 3.85); cameraTarget.set(0, .75, .1); camera.fov = 35;
  } else {
    cameraHome.set(1.1, 1.8, 4.6); cameraTarget.set(-.12, .91, -.15); camera.fov = 29;
  }
  // Keep the machine framed between the overlays while rendering behind them.
  camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * height / clearHeight));
  camera.setViewOffset(width, height, 0, (bottomInset - topInset) / 2, width, height);
  camera.updateProjectionMatrix();
  renderer?.setPixelRatio(Math.min(devicePixelRatio, camera.aspect < .8 ? 1.5 : 2));
  renderer?.setSize(width, height, false);
  wake();
}

function updateCamera(): void {
  if (reduced.matches || !finePointer.matches) parallax.set(0, 0);
  else parallax.lerp(parallaxTarget, .06);
  const pose = office?.cameraPose(camera.aspect) ?? { position: cameraHome, target: cameraTarget };
  const position = pose.position.clone().add(new THREE.Vector3(parallax.x * .14, parallax.y * .055, 0));
  const factor = reduced.matches ? 1 : .075;
  camera.position.lerp(position, factor); cameraAim.lerp(pose.target, factor);
  camera.lookAt(cameraAim); camera.updateMatrixWorld();
}

function positionButton(): void {
  if (!physicalButton || !ready) return;
  new THREE.Box3().setFromObject(physicalButton).getCenter(buttonCenter);
  projected.copy(buttonCenter).project(camera);
  buttonHit.hidden = projected.z > 1 || projected.z < -1 || Math.abs(projected.x) > 1.2 || Math.abs(projected.y) > 1.2;
  buttonHit.style.left = `${(projected.x * .5 + .5) * room.clientWidth}px`;
  buttonHit.style.top = `${(-projected.y * .5 + .5) * room.clientHeight}px`;
}

function render(): void {
  if (!renderer || !scene || contextLost || disposed) return;
  updateCamera();
  renderer.render(scene, camera);
  positionButton(); office?.positionButtons();
}

function tick(now: number): void {
  raf = 0;
  if (document.hidden || contextLost || disposed) { previous = 0; return; }
  const dt = frameDelta(previous, now);
  officeMoving = office?.update(dt) ?? false;
  previous = now;
  const run = ready && active && isAnimating() && !paused && !dialogsOpen() && !reduced.matches;
  if (run && active) {
    if (phase === 'loading-sheet') {
      loadElapsed += dt * speed;
      const p = clamp(loadElapsed / .65, 0, 1);
      const smooth = p * p * (3 - 2 * p);
      active.update(0, 0, 0, .18 * (1 - smooth));
      if (p === 1) { phase = 'ready'; syncControls(); if (!paused) startShred(); }
    } else {
      elapsed += dt * speed;
      const next = phaseAt(elapsed, active.headLength);
      const distance = Math.max(0, elapsed - PRESS_DURATION) * FEED_SPEED;
      active.update(distance, elapsed, dt * speed);
      if (physicalButton) {
        const t = clamp(elapsed / PRESS_DURATION, 0, 1);
        const press = Math.sin(t * Math.PI);
        physicalButton.position.copy(buttonHome).add(new THREE.Vector3(0, -.008 * press, -.003 * press));
      }
      if (machine) {
        machine.position.copy(machineHome);
        if (next === 'feeding') machine.position.x += Math.sin(elapsed * 83) * .00055;
      }
      if (next !== phase) {
        if (next === 'complete') completeSheet();
        else { phase = next; syncControls(); }
      }
    }
  }
  render();
  const pose = office?.cameraPose(camera.aspect);
  const cameraMoving = !reduced.matches && (parallax.distanceTo(parallaxTarget) > .0008 || !!pose && (camera.position.distanceTo(pose.position.clone().add(new THREE.Vector3(parallax.x * .14, parallax.y * .055, 0))) > .001 || cameraAim.distanceTo(pose.target) > .001));
  if ((run && isAnimating()) || cameraMoving || officeMoving) wake();
  else previous = 0;
}

function wake(): void { if (!raf && !document.hidden && !disposed && !contextLost) raf = requestAnimationFrame(tick); }

function destroyScene(): void {
  cancelFileReading();
  queueEpoch += 1;
  office?.dispose(); office = null; archive?.dispose(); archive = null;
  for (const job of waiting) job.source?.dispose(); waiting.length = 0; pendingLoad = false;
  for (const page of pages) page.dispose();
  pages = []; active = null;
  if (scene) {
    const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>(), textures = new Set<THREE.Texture>();
    scene.traverse(object => {
      if (object instanceof THREE.Mesh) {
        geometries.add(object.geometry);
        for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material);
      }
    });
    for (const material of materials) for (const value of Object.values(material)) if (value instanceof THREE.Texture) textures.add(value);
    for (const texture of textures) texture.dispose();
    for (const material of materials) material.dispose();
    for (const geometry of geometries) geometry.dispose();
    scene.clear();
  }
  renderer?.dispose(); renderer = null;
  model = null; scene = null; physicalButton = null; machine = null;
}

function showFailure(message: string): void {
  ready = false;
  overlay.hidden = false; overlay.classList.add('is-error');
  $('#load-message').textContent = message;
  retryButton.hidden = false;
  buttonHit.hidden = true;
  syncControls('The office could not open.');
  announce(message);
}

async function openOffice(): Promise<void> {
  const attempt = ++generation;
  ready = false; contextLost = false;
  loadAbort?.abort(); loadAbort = new AbortController();
  overlay.hidden = false; overlay.classList.remove('is-error'); retryButton.hidden = true;
  $('#load-message').textContent = 'Opening the office…';
  buttonHit.hidden = true; syncControls('Opening the office…');
  destroyScene();
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'default' });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.13;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
  } catch {
    showFailure('This room needs WebGL 2. Enable graphics acceleration in your browser, then try again.'); return;
  }
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}office.glb`, { signal: AbortSignal.any([loadAbort.signal, AbortSignal.timeout(30000)]) });
    if (!response.ok) throw new Error(`Model request returned ${response.status}`);
    const buffer = await response.arrayBuffer();
    const gltf = await new GLTFLoader().parseAsync(buffer, '');
    if (disposed || attempt !== generation) return;
    model = gltf.scene;
    model.updateMatrixWorld(true);
    physicalButton = model.getObjectByName('ShredButton') ?? null;
    machine = model.getObjectByName('Shredder') ?? null;
    const inlet = model.getObjectByName('PaperInlet');
    const outlet = model.getObjectByName('StripOutlet');
    const floor = model.getObjectByName('BinLanding') ?? model.getObjectByName('BinFloor');
    if (!physicalButton || !machine || !inlet || !outlet || !floor) throw new Error('Room model is missing its interaction anchors.');
    buttonHome = physicalButton.position.clone(); machineHome = machine.position.clone();
    anchors = { inlet: inlet.getWorldPosition(new THREE.Vector3()), outlet: outlet.getWorldPosition(new THREE.Vector3()), floor: floor.getWorldPosition(new THREE.Vector3()) };
    scene = new THREE.Scene(); scene.background = new THREE.Color('#464653');
    scene.add(model);
    model.traverse(object => {
      if (!(object instanceof THREE.Mesh)) return;
      object.castShadow = true; object.receiveShadow = true;
      if (object.name.includes('DuskSky') && object.geometry.hasAttribute('color')) {
        object.material = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false });
        object.castShadow = false; object.receiveShadow = false;
      }
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
        if (material.transparent || object.name === 'BinWindow') {
          object.castShadow = false;
          material.depthWrite = false;
        }
      }
    });
    const ambient = new THREE.HemisphereLight('#9cb8f4', '#6e4737', .77);
    scene.add(ambient);
    const softFront = new THREE.DirectionalLight('#aab9ec', .35); softFront.position.set(.3, 2.3, 4); scene.add(softFront);
    const bounce = new THREE.PointLight('#ffbd70', 5, 3.2, 2); bounce.position.set(-1.52, 1.48, -.55); scene.add(bounce);
    const warm = new THREE.DirectionalLight('#ffb76e', .85);
    warm.position.set(-1.8, 2.8, 1.4); warm.castShadow = true;
    warm.shadow.mapSize.set(2048, 2048); warm.shadow.camera.left = -3.7; warm.shadow.camera.right = 3.7;
    warm.shadow.camera.top = 3.7; warm.shadow.camera.bottom = -3.7; warm.shadow.camera.near = .5; warm.shadow.camera.far = 12;
    warm.shadow.bias = -.00025; warm.shadow.normalBias = .004; warm.shadow.radius = 3;
    warm.target.position.set(0, .5, -.5); scene.add(warm, warm.target);
    const dusk = new THREE.DirectionalLight('#809dff', 1.85); dusk.position.set(2, 2.8, -2); scene.add(dusk);
    const lamp = new THREE.SpotLight('#ffb74f', 8, 3.4, Math.PI / 3.4, .85, 2); lamp.position.set(-1.69, 1.34, -.96); lamp.target.position.set(-1.25, .80, -.62); lamp.castShadow = true; lamp.shadow.mapSize.set(1024, 1024); lamp.shadow.bias = -.0001; lamp.shadow.normalBias = .002; scene.add(lamp, lamp.target);
    binCount = 0; archivedCount = 0; pageNumber = 0; elapsed = 0; phase = 'ready'; reducedHalf = false; paused = false; emptyRequested = false; activeLabel = 'One last sheet'; activeIsExample = true;
    archive = new BinArchive(anchors); scene.add(archive.group);
    office = new OfficeInteractions({ model, camera, room, lights: { ambient, warm, moon: dusk, lamp, bounce }, reduced, wake, announce, viewSelect: $<HTMLSelectElement>('#office-view'), onNote: index => { $('#note-title').textContent = OFFICE_NOTES[index][0]; $('#note-copy').textContent = OFFICE_NOTES[index][1]; openDialog($<HTMLDialogElement>('#note-dialog')); previous = 0; } });
    active = new PaperPage(anchors, 0, 0); pages = [active]; scene.add(active.group);
    resize(); camera.position.copy(cameraHome); cameraAim.copy(cameraTarget); office.update(0); updateCamera();
    await renderer!.compileAsync(scene, camera);
    if (disposed || attempt !== generation) return;
    ready = true; overlay.hidden = true; buttonHit.hidden = false;
    syncControls(); render(); announce('Office ready. Press the amber button on the shredder.');
  } catch (error) {
    if (disposed || attempt !== generation) return;
    console.error('Unable to load the office:', error);
    showFailure('The office could not load. Check your connection and try again.');
  }
}

buttonHit.addEventListener('click', startShred, { signal });
addButton.addEventListener('click', () => queueExamples(1), { signal });
addFiveButton.addEventListener('click', () => queueExamples(5), { signal });
$('#feed-speed').addEventListener('change', event => { speed = Number((event.currentTarget as HTMLSelectElement).value); announce(`Shredding speed ${speed} times.`); }, { signal });
$('#queue-files').addEventListener('click', () => { void queueSelectedFiles(); }, { signal });
$('#local-files').addEventListener('change', () => { const files = $<HTMLInputElement>('#local-files').files; $<HTMLButtonElement>('#queue-files').disabled = !files?.length; $('#file-status').textContent = files?.length ? `${files.length} ${files.length === 1 ? 'file' : 'files'} selected. These stay in your browser.` : 'Choose a local file.'; }, { signal });
$('#clear-queue').addEventListener('click', clearWaiting, { signal });
emptyButton.addEventListener('click', emptyBin, { signal });
pauseButton.addEventListener('click', () => {
  paused = !paused; previous = 0;
  // A paused arriving page rests in the inlet instead of hovering above it.
  if (paused && phase === 'loading-sheet') { active?.update(0, 0, 0); phase = 'ready'; }
  syncControls();
  if (!paused && phase === 'complete' && queuedCount()) void loadNext();
  else if (!paused && phase === 'ready') startShred();
  wake();
}, { signal });
retryButton.addEventListener('click', () => { if (contextLost) location.reload(); else void openOffice(); }, { signal });
canvas.addEventListener('click', event => {
  if (!ready || !physicalButton || dialogsOpen()) return;
  const rect = canvas.getBoundingClientRect();
  pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
  if (raycaster.intersectObject(physicalButton, true).length) startShred();
  else office?.clickObject(raycaster);
}, { signal });
room.addEventListener('pointermove', event => {
  if (!finePointer.matches || reduced.matches || event.pointerType !== 'mouse') return;
  const rect = room.getBoundingClientRect();
  parallaxTarget.set((event.clientX - rect.left) / rect.width * 2 - 1, -((event.clientY - rect.top) / rect.height * 2 - 1));
  wake();
}, { signal });
room.addEventListener('pointerleave', () => { parallaxTarget.set(0, 0); wake(); }, { signal });
canvas.addEventListener('webglcontextlost', event => {
  event.preventDefault(); contextLost = true; previous = 0;
  if (raf) cancelAnimationFrame(raf); raf = 0;
  showFailure('Graphics were interrupted. Reload the room to start fresh.');
  retryButton.textContent = 'Reload room';
}, { signal });
canvas.addEventListener('webglcontextrestored', () => { contextLost = false; void openOffice(); }, { signal });

function bindDialog(target: HTMLDialogElement, trigger: string, close: string, onOpen = () => {}): void {
  $(trigger).addEventListener('click', () => { openDialog(target); previous = 0; onOpen(); }, { signal });
  $(close).addEventListener('click', () => closeDialog(target), { signal });
  target.addEventListener('cancel', event => { event.preventDefault(); closeDialog(target); }, { signal });
  target.addEventListener('close', () => { $(trigger).focus(); previous = 0; if (phase === 'complete' && queuedCount() && !reduced.matches && !paused) void loadNext(); wake(); }, { signal });
  target.addEventListener('click', event => {
    if (event.target !== target) return;
    const r = target.getBoundingClientRect();
    if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) closeDialog(target);
  }, { signal });
}
const guidePanel = mountMarkdownPanel($('#guide-panel'), {
  url: `${import.meta.env.BASE_URL}integrate.md`, filename: 'INTEGRATE.md',
  validate: text => text.startsWith('# Integrate Paper Shredder'),
});
const noticesPanel = mountMarkdownPanel($('#notices-panel'), {
  url: `${import.meta.env.BASE_URL}licenses/THIRD-PARTY-NOTICES.txt`, filename: 'THIRD-PARTY-NOTICES.txt',
  validate: text => text.startsWith('Paper Shredder — third-party runtime notices'),
});
bindDialog($<HTMLDialogElement>('#upload-dialog'), '#upload-button', '#close-upload');
bindDialog($<HTMLDialogElement>('#queue-dialog'), '#queue-button', '#close-queue', drawQueue);
$('#close-note').addEventListener('click', () => closeDialog($<HTMLDialogElement>('#note-dialog')), { signal });
$<HTMLDialogElement>('#note-dialog').addEventListener('close', () => { previous = 0; if (phase === 'complete' && queuedCount() && !reduced.matches && !paused) void loadNext(); wake(); }, { signal });
bindDialog($<HTMLDialogElement>('#info-dialog'), '#info-button', '#close-info');
bindDialog($<HTMLDialogElement>('#guide-dialog'), '#guide-button', '#close-guide', () => { void guidePanel.load(); });
$('#third-party-notices').addEventListener('toggle', event => { if ((event.currentTarget as HTMLDetailsElement).open) void noticesPanel.load(); }, { signal });
const composed = import.meta.env.VITE_OPENCARTEL_COMPOSED === '1';
$<HTMLAnchorElement>('#source-download').href = composed ? '/downloads/paper-shredder.zip' : `${import.meta.env.BASE_URL}paper-shredder-source.zip`;
if (composed) { const origin = $<HTMLAnchorElement>('#origin-link'); origin.href = '/'; origin.hidden = false; }

reduced.addEventListener('change', () => {
  parallax.set(0, 0); parallaxTarget.set(0, 0); previous = 0;
  if (reduced.matches && isAnimating() && active) {
    if (phase === 'loading-sheet') { active.update(0, 0, 0); phase = 'ready'; }
    else { reducedHalf = true; paused = false; }
    if (machine) machine.position.copy(machineHome);
    if (physicalButton) physicalButton.position.copy(buttonHome);
  } else if (!reduced.matches) reducedHalf = false;
  syncControls(); wake();
}, { signal });
document.addEventListener('visibilitychange', () => {
  previous = 0;
  if (document.hidden) { if (raf) cancelAnimationFrame(raf); raf = 0; }
  else wake();
}, { signal });
const resizeObserver = new ResizeObserver(resize); resizeObserver.observe(room); resizeObserver.observe($('.masthead')); resizeObserver.observe($('.controls'));

function dispose(): void {
  if (disposed) return;
  disposed = true; generation += 1; events.abort(); loadAbort?.abort(); fileAbort?.abort();
  if (raf) cancelAnimationFrame(raf);
  resizeObserver.disconnect(); guidePanel.dispose(); noticesPanel.dispose();
  disposeRails(); disposeCursor(); disposeMotion(); destroyScene();
}
window.addEventListener('pagehide', event => { if (!event.persisted) dispose(); }, { signal });
window.addEventListener('pageshow', () => { previous = 0; wake(); }, { signal });
import.meta.hot?.dispose(dispose);
void openOffice();

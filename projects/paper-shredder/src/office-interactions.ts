import * as THREE from 'three';

export type OfficeView = 'room' | 'desk' | 'notes' | 'drawer' | 'window';
export type OfficeLights = { ambient: THREE.HemisphereLight; warm: THREE.DirectionalLight; moon: THREE.DirectionalLight; lamp: THREE.SpotLight; bounce: THREE.PointLight };
type Options = {
  model: THREE.Group; camera: THREE.Camera; room: HTMLElement; lights: OfficeLights;
  reduced: MediaQueryList; wake: () => void; announce: (text: string) => void;
  viewSelect: HTMLSelectElement; onNote: (index: number) => void;
};
const notes = [
  ['Before you leave', 'Water the plant. Save your work. Shred the evidence of a very long meeting.'],
  ['A useful reminder', 'Not every idea needs to become a project. Some can become very elegant paper ribbons.'],
  ['Friday, eventually', 'The coffee is cold. The moon is out. This can probably wait until tomorrow.'],
  ['Office rules', '1. Be kind.\n2. Label the cables.\n3. Never schedule a meeting about scheduling meetings.'],
  ['Tiny victories', 'One finished task counts. So does closing the laptop on time.'],
  ['To whoever is still here', 'There is a spare pencil in the top drawer. Please turn the lamp off before you go.'],
];
export const OFFICE_NOTES = notes;

export class OfficeInteractions {
  view: OfficeView = 'room';
  private lampOn = true;
  private lightAmount = 1;
  private drawerOpen = false;
  private drawerAmount = 0;
  private buzz = 0;
  private monitorOn = false;
  private clockSecond = -1;
  private readonly abort = new AbortController();
  private readonly buttons: { element: HTMLButtonElement; object: THREE.Object3D; kind: string; note?: number }[] = [];
  private readonly drawer?: THREE.Object3D;
  private readonly monitor?: THREE.Object3D;
  private readonly drawerHome = new THREE.Vector3();
  private readonly monitorHome = new THREE.Vector3();
  private readonly second?: THREE.Object3D;
  private readonly screen?: THREE.Mesh;
  private readonly diffuser?: THREE.Mesh;
  private readonly screenCanvas = document.createElement('canvas');
  private readonly screenTexture: THREE.CanvasTexture;
  private readonly screenMaterial: THREE.MeshStandardMaterial;
  private readonly tickTimer: number;
  private readonly pointer = new THREE.Vector3();
  private readonly bounds = new THREE.Box3();

  constructor(private o: Options) {
    this.drawer = o.model.getObjectByName('DeskDrawer');
    this.monitor = o.model.getObjectByName('Monitor');
    this.second = o.model.getObjectByName('ClockSecond');
    this.screen = o.model.getObjectByName('MonitorScreen') as THREE.Mesh | undefined;
    this.diffuser = o.model.getObjectByName('LampDiffuser') as THREE.Mesh | undefined;
    this.drawerHome.copy(this.drawer?.position ?? new THREE.Vector3());
    this.monitorHome.copy(this.monitor?.position ?? new THREE.Vector3());
    this.screenCanvas.width = 512; this.screenCanvas.height = 384;
    this.screenTexture = new THREE.CanvasTexture(this.screenCanvas);
    this.screenTexture.colorSpace = THREE.SRGBColorSpace; this.screenTexture.flipY = false;
    this.screenMaterial = new THREE.MeshStandardMaterial({ map: this.screenTexture, emissiveMap: this.screenTexture, emissive: '#ffffff', emissiveIntensity: .32, roughness: .65 });
    if (this.screen) this.screen.material = this.screenMaterial;
    this.drawScreen();
    const add = (name: string, label: string, kind: string, action: () => void, note?: number) => {
      const object = o.model.getObjectByName(name); if (!object) return;
      const element = document.createElement('button'); element.className = 'office-hotspot'; element.type = 'button';
      element.setAttribute('aria-label', label); element.dataset.cursorLabel = label.toLowerCase();
      element.innerHTML = '<span class="hotspot-mark" aria-hidden="true">+</span>';
      element.addEventListener('click', action, { signal: this.abort.signal });
      o.room.append(element); this.buttons.push({ element, object, kind, note });
    };
    add('DeskLamp', 'Turn off the desk lamp', 'lamp', () => {
      this.lampOn = !this.lampOn;
      const b = this.buttons.find(b => b.kind === 'lamp')!;
      const label = this.lampOn ? 'Turn off the desk lamp' : 'Turn on the desk lamp';
      b.element.setAttribute('aria-label', label); b.element.dataset.cursorLabel = label.toLowerCase();
      b.element.setAttribute('aria-pressed', String(!this.lampOn));
      o.announce(this.lampOn ? 'Desk lamp on. Back to the warm evening light.' : 'Desk lamp off. The room is lit by moonlight.'); o.wake();
    });
    add('Monitor', 'Wake the monitor', 'monitor', () => {
      this.monitorOn = !this.monitorOn;
      const control = this.buttons.find(b => b.kind === 'monitor')?.element;
      control?.setAttribute('aria-label', this.monitorOn ? 'Put the monitor to sleep' : 'Wake the monitor');
      if (control) control.dataset.cursorLabel = this.monitorOn ? 'put the monitor to sleep' : 'wake the monitor';
      this.buzz = o.reduced.matches ? 0 : .48; this.drawScreen();
      o.announce(this.monitorOn ? 'The monitor wakes: no new mail. Go home.' : 'Monitor asleep.'); o.wake();
    });
    add('DeskDrawer', 'Open the top drawer', 'drawer', () => {
      this.drawerOpen = !this.drawerOpen;
      const b = this.buttons.find(b => b.kind === 'drawer')!;
      b.element.setAttribute('aria-label', this.drawerOpen ? 'Close the top drawer' : 'Open the top drawer');
      b.element.setAttribute('aria-expanded', String(this.drawerOpen)); b.element.dataset.cursorLabel = this.drawerOpen ? 'close the top drawer' : 'open the top drawer';
      o.announce(this.drawerOpen ? 'Top drawer open. A spare pencil and a little unfinished paperwork.' : 'Top drawer closed.'); o.wake();
    });
    for (let i = 0; i < notes.length; i++) add(`PinnedNote${i + 1}`, `Read note: ${notes[i][0]}`, 'note', () => {
      if (this.view !== 'notes') this.setView('notes');
      o.onNote(i); o.wake();
    }, i);
    o.viewSelect.addEventListener('change', () => this.setView(o.viewSelect.value as OfficeView), { signal: this.abort.signal });
    this.tickTimer = window.setInterval(() => { if (!document.hidden && !o.reduced.matches) o.wake(); }, 1000);
  }

  setView(view: OfficeView): void {
    this.view = view; this.o.viewSelect.value = view;
    this.o.announce(view === 'room' ? 'Back at the shredder.' : `Looking at the ${view}.`); this.o.wake();
  }

  cameraPose(aspect: number): { position: THREE.Vector3; target: THREE.Vector3 } {
    const phone = aspect < .8;
    const poses: Record<OfficeView, number[][]> = {
      room: phone ? [[.65, 1.6, 3.85], [0, .75, .1]] : [[1.1, 1.8, 4.6], [-.12, .91, -.15]],
      desk: phone ? [[-1.18, 1.5, 1.3], [-1.40, 1.1, -.96]] : [[-.45, 1.62, 2.35], [-1.25, 1.0, -.88]],
      notes: phone ? [[-1.15, 1.85, .7], [-1.18, 1.83, -1.48]] : [[-.5, 1.86, 1.55], [-1.13, 1.78, -1.40]],
      drawer: phone ? [[-1.45, 1.5, 1.0], [-1.63, .60, -.45]] : [[-1.05, 1.7, 1.65], [-1.62, .57, -.4]],
      window: phone ? [[.55, 1.65, 1.7], [.83, 1.7, -1.48]] : [[1.8, 1.9, 2.85], [.65, 1.38, -.95]],
    };
    return { position: new THREE.Vector3(...poses[this.view][0] as [number, number, number]), target: new THREE.Vector3(...poses[this.view][1] as [number, number, number]) };
  }

  private drawScreen(): void {
    const c = this.screenCanvas.getContext('2d')!;
    c.fillStyle = this.monitorOn ? '#183b49' : '#20374d'; c.fillRect(0, 0, 512, 384);
    c.fillStyle = this.monitorOn ? '#b7dcc5' : '#44617a';
    if (this.monitorOn) {
      c.font = '24px monospace'; c.fillText('AFTER HOURS', 38, 62);
      c.font = 'bold 38px monospace'; c.fillText('NO NEW MAIL.', 38, 158);
      c.font = '24px monospace'; c.fillText('Go home. You did enough.', 38, 218);
      c.fillRect(38, 285, 16, 25);
    } else {
      c.fillStyle = '#496584'; c.beginPath(); c.moveTo(0, 0); c.lineTo(160, 0); c.lineTo(270, 384); c.lineTo(230, 384); c.fill();
    }
    c.fillStyle = '#07172524'; for (let y = 0; y < 384; y += 6) c.fillRect(0, y, 512, 1);
    this.screenTexture.needsUpdate = true;
  }

  update(dt: number): boolean {
    const reduced = this.o.reduced.matches;
    const ease = reduced ? 1 : 1 - Math.exp(-Math.min(dt || 1 / 60, .04) * 9);
    this.lightAmount += ((this.lampOn ? 1 : 0) - this.lightAmount) * ease;
    this.drawerAmount += ((this.drawerOpen ? 1 : 0) - this.drawerAmount) * ease;
    const l = this.o.lights;
    l.ambient.intensity = .40 + this.lightAmount * .55;
    l.warm.intensity = this.lightAmount * 1.3;
    l.lamp.intensity = this.lightAmount * 8;
    l.bounce.intensity = this.lightAmount * 5;
    l.moon.intensity = 1.65 + (1 - this.lightAmount) * .8;
    if (this.diffuser) {
      const m = this.diffuser.material as THREE.MeshStandardMaterial;
      m.emissiveIntensity = this.lightAmount * 2.4;
    }
    if (this.drawer) this.drawer.position.copy(this.drawerHome).add(new THREE.Vector3(0, 0, .24 * this.drawerAmount));
    if (this.monitor) {
      this.monitor.position.copy(this.monitorHome);
      if (this.buzz > 0 && !reduced) this.monitor.position.x += Math.sin(this.buzz * 75) * .002 * this.buzz / .48;
    }
    if (this.buzz > 0) { this.buzz = Math.max(0, this.buzz - dt); this.screenMaterial.emissiveIntensity = .32 + Math.sin(this.buzz * 26) * .08; }
    if (this.second && !reduced) {
      const seconds = new Date().getSeconds();
      if (seconds !== this.clockSecond) { this.clockSecond = seconds; this.second.rotation.z = -seconds * Math.PI / 30; }
    }
    return Math.abs(this.lightAmount - Number(this.lampOn)) > .001 || Math.abs(this.drawerAmount - Number(this.drawerOpen)) > .001 || this.buzz > 0;
  }

  clickObject(ray: THREE.Raycaster): boolean {
    const hit = ray.intersectObject(this.o.model, true)[0];
    if (!hit) return false;
    for (const b of this.buttons) {
      let node: THREE.Object3D | null = hit.object;
      while (node) { if (node === b.object) { b.element.click(); return true; } node = node.parent; }
    }
    return false;
  }

  positionButtons(): void {
    for (const b of this.buttons) {
      this.bounds.setFromObject(b.object).getCenter(this.pointer);
      if (b.kind === 'drawer') this.pointer.z += .16;
      this.pointer.project(this.o.camera);
      const notesOverview = b.kind === 'note' && this.view !== 'notes';
      b.element.hidden = (notesOverview && b.note !== 1) || this.pointer.z > 1 || this.pointer.z < -1 || Math.abs(this.pointer.x) > .94 || Math.abs(this.pointer.y) > .92;
      b.element.style.left = `${(this.pointer.x * .5 + .5) * this.o.room.clientWidth}px`;
      b.element.style.top = `${(-this.pointer.y * .5 + .5) * this.o.room.clientHeight}px`;
    }
  }

  dispose(): void {
    this.abort.abort(); window.clearInterval(this.tickTimer);
    this.buttons.forEach(b => b.element.remove());
    this.screenTexture.dispose(); this.screenMaterial.dispose();
  }
}

import * as THREE from 'three';
import { PAGE_LENGTH, PAGE_WIDTH, STRIP_COUNT, STRIP_WIDTH, SEGMENTS, hangingStrip, releaseStrip, stepStrip, paperBudget, type Node, type Point, type Bounds } from './paper.ts';

export type Anchors = { inlet: THREE.Vector3; outlet: THREE.Vector3; floor: THREE.Vector3 };
type Ribbon = { mesh: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>; nodes: Node[] | null; index: number };

function pageTexture(page: number, artworkCanvas?: HTMLCanvasElement): THREE.CanvasTexture {
  const canvas = artworkCanvas ?? document.createElement('canvas');
  if (!artworkCanvas) {
    canvas.width = 768; canvas.height = 1086;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#faf1d9'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = ['#c87535', '#a65340', '#c99a43'][page % 3];
    ctx.beginPath(); ctx.arc(198, 248, 90, Math.PI, 0); ctx.lineTo(288, 248); ctx.lineTo(108, 248); ctx.fill();
    ctx.fillStyle = '#394759';
    for (const y of [390, 570, 750, 930]) ctx.fillRect(108, y, 552, 44);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function ribbonGeometry(): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array((SEGMENTS + 1) * 6), 3).setUsage(THREE.DynamicDrawUsage));
  geometry.setAttribute('uv', new THREE.BufferAttribute(new Float32Array((SEGMENTS + 1) * 4), 2).setUsage(THREE.DynamicDrawUsage));
  const indices: number[] = [];
  for (let i = 0; i < SEGMENTS; i++) { const j = i * 2; indices.push(j, j + 1, j + 2, j + 1, j + 3, j + 2); }
  geometry.setIndex(indices);
  return geometry;
}

export class PaperPage {
  readonly group = new THREE.Group();
  readonly sheet: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
  readonly texture: THREE.CanvasTexture;
  private readonly material: THREE.MeshStandardMaterial;
  private readonly ribbons: Ribbon[];
  private released = false;
  private rest = false;
  private accumulator = 0;
  readonly headLength: number;
  readonly anchors: Anchors;
  readonly page: number;
  readonly layer: number;

  constructor(anchors: Anchors, page: number, layer: number, artworkCanvas?: HTMLCanvasElement) {
    this.anchors = anchors; this.page = page; this.layer = layer;
    this.headLength = anchors.inlet.y - anchors.outlet.y;
    this.texture = pageTexture(page, artworkCanvas);
    this.material = new THREE.MeshStandardMaterial({ map: this.texture, side: THREE.DoubleSide, roughness: .95, metalness: 0, emissive: '#fae5c3', emissiveIntensity: .07 });
    const geometry = new THREE.PlaneGeometry(PAGE_WIDTH, PAGE_LENGTH, 1, 10);
    (geometry.getAttribute('position') as THREE.BufferAttribute).setUsage(THREE.DynamicDrawUsage);
    (geometry.getAttribute('uv') as THREE.BufferAttribute).setUsage(THREE.DynamicDrawUsage);
    this.sheet = new THREE.Mesh(geometry, this.material);
    this.sheet.castShadow = true;
    this.sheet.frustumCulled = false;
    this.group.add(this.sheet);
    this.ribbons = Array.from({ length: STRIP_COUNT }, (_, index) => {
      const mesh = new THREE.Mesh(ribbonGeometry(), this.material);
      mesh.visible = false;
      mesh.frustumCulled = false;
      this.group.add(mesh);
      return { mesh, index, nodes: null };
    });
    this.update(0, 0, 0);
  }

  private bounds(index: number): Bounds {
    return { left: this.anchors.floor.x - .19, right: this.anchors.floor.x + .19,
      back: this.anchors.floor.z - .12, front: this.anchors.floor.z + .12,
      floor: this.anchors.floor.y + .006 + this.layer * .012 + (index % 5) * .0007 };
  }

  update(distance: number, time: number, delta: number, loadOffset = 0): void {
    const budget = paperBudget(distance, this.headLength);
    this.sheet.visible = budget.above > .00001;
    if (this.sheet.visible) {
      const positions = this.sheet.geometry.getAttribute('position');
      const uv = this.sheet.geometry.getAttribute('uv');
      for (let i = 0; i < positions.count; i++) {
        const topToBottom = Math.floor(i / 2) / 10;
        const height = budget.above * (1 - topToBottom);
        positions.setXYZ(i, this.anchors.inlet.x + (i % 2 ? 1 : -1) * PAGE_WIDTH / 2,
          this.anchors.inlet.y + height + loadOffset, this.anchors.inlet.z - .055 * height);
        uv.setXY(i, i % 2, 1 - topToBottom * budget.above / PAGE_LENGTH);
      }
      positions.needsUpdate = true; uv.needsUpdate = true;
      this.sheet.geometry.computeVertexNormals();
    }
    if (budget.below <= .00001) return;
    if (budget.below >= PAGE_LENGTH - 1e-7 && !this.released) {
      for (const ribbon of this.ribbons) ribbon.nodes = releaseStrip(hangingStrip(this.anchors.outlet, ribbon.index, PAGE_LENGTH, time), ribbon.index);
      this.released = true;
    }
    if (this.released && !this.rest) {
      // The caller scales both transport time and physics time (up to 3×).
      // Preserve a capped foreground frame's full scaled dt, with headroom.
      this.accumulator = Math.min(.25, this.accumulator + delta);
      while (this.accumulator >= 1 / 120) {
        for (const ribbon of this.ribbons) stepStrip(ribbon.nodes!, 1 / 120, this.bounds(ribbon.index));
        this.accumulator -= 1 / 120;
      }
    }
    for (const ribbon of this.ribbons) {
      const points = ribbon.nodes ?? hangingStrip(this.anchors.outlet, ribbon.index, budget.below, time);
      this.drawRibbon(ribbon, points, budget.below);
    }
  }

  /** Reduced motion uses deliberate static steps and solves the final pile offscreen. */
  finishImmediately(): void {
    this.update(PAGE_LENGTH + this.headLength, 0, 0);
    for (let i = 0; i < 420; i++) for (const ribbon of this.ribbons) stepStrip(ribbon.nodes!, 1 / 120, this.bounds(ribbon.index));
    this.settle();
    for (const ribbon of this.ribbons) this.drawRibbon(ribbon, ribbon.nodes!, PAGE_LENGTH);
  }

  settle(): void { this.rest = true; }

  private drawRibbon(ribbon: Ribbon, points: Point[], length: number): void {
    ribbon.mesh.visible = true;
    const position = ribbon.mesh.geometry.getAttribute('position');
    const uv = ribbon.mesh.geometry.getAttribute('uv');
    const halfWidth = STRIP_WIDTH / 2;
    for (let i = 0; i <= SEGMENTS; i++) {
      const p = points[i];
      const before = points[Math.max(0, i - 1)], after = points[Math.min(SEGMENTS, i + 1)];
      const tangent = new THREE.Vector3(after.x - before.x, after.y - before.y, after.z - before.z).normalize();
      const roll = this.released ? Math.sin(ribbon.index * 1.5 + i * .19) * .45 : Math.sin(ribbon.index * .7 + i * .2) * .12 * (i / SEGMENTS);
      const across = new THREE.Vector3(Math.cos(roll), 0, Math.sin(roll));
      across.addScaledVector(tangent, -across.dot(tangent)).normalize().multiplyScalar(halfWidth);
      position.setXYZ(i * 2, p.x - across.x, p.y - across.y, p.z - across.z);
      position.setXYZ(i * 2 + 1, p.x + across.x, p.y + across.y, p.z + across.z);
      // Top is the most recently emerged material; bottom is the page's original leading edge.
      const v = length / PAGE_LENGTH * (1 - i / SEGMENTS);
      uv.setXY(i * 2, ribbon.index / STRIP_COUNT, v);
      uv.setXY(i * 2 + 1, (ribbon.index + 1) / STRIP_COUNT, v);
    }
    position.needsUpdate = true; uv.needsUpdate = true;
    ribbon.mesh.geometry.computeVertexNormals();
  }

  dispose(): void {
    this.group.removeFromParent();
    this.sheet.geometry.dispose();
    for (const ribbon of this.ribbons) ribbon.mesh.geometry.dispose();
    this.material.dispose(); this.texture.dispose();
  }
}

/** A bounded visual summary of older sheets. This is an illustrative compressed
 * heap, not retained simulation or a reconstruction of the archived documents.
 * Recent sheets stay as actual PaperPages; this fixed allocation never grows.
 */
export class BinArchive {
  readonly group = new THREE.Group();
  private readonly geometry: THREE.BufferGeometry;
  private readonly material: THREE.MeshStandardMaterial;
  private readonly mesh: THREE.InstancedMesh;
  private readonly matrix = new THREE.Matrix4();
  private readonly position = new THREE.Vector3();
  private readonly rotation = new THREE.Quaternion();
  private readonly scale = new THREE.Vector3();
  private readonly up = new THREE.Vector3(0, 1, 0);
  private pileHeight = 0;
  private count = -1;
  private static readonly BUDGET = 360;

  constructor(anchors: Anchors) {
    this.group.name = 'CompactedPaperArchive';
    this.group.position.copy(anchors.floor);
    const positions: number[] = [], indices: number[] = [];
    const fold = [0, .003, .007, .002, .004, .008, .002, .005, .006, .002, 0];
    for (let i = 0; i < fold.length; i++) {
      const z = -.07 + i / (fold.length - 1) * .14;
      const x = Math.sin(i * .86) * .003;
      positions.push(x - STRIP_WIDTH / 2, fold[i], z, x + STRIP_WIDTH / 2, fold[i], z);
      if (i < fold.length - 1) { const v = i * 2; indices.push(v, v + 2, v + 1, v + 1, v + 2, v + 3); }
    }
    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    this.geometry.setIndex(indices);
    this.geometry.computeVertexNormals(); this.geometry.computeBoundingBox();
    this.material = new THREE.MeshStandardMaterial({ color: '#f1e4c9', side: THREE.DoubleSide, roughness: .95, metalness: 0, emissive: '#f1e4c9', emissiveIntensity: .06 });
    this.mesh = new THREE.InstancedMesh(this.geometry, this.material, BinArchive.BUDGET);
    this.mesh.name = 'CompactedPaperRibbons';
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.receiveShadow = true;
    this.mesh.castShadow = true;
    this.mesh.frustumCulled = false;
    const tint = new THREE.Color();
    for (let i = 0; i < BinArchive.BUDGET; i++) {
      const light = .89 + (Math.sin(i * 2.39996) + 1) * .055;
      tint.setRGB(light, light * .98, light * .94);
      this.mesh.setColorAt(i, tint);
    }
    this.group.add(this.mesh);
    this.setCount(0);
  }

  /** The top of the compacted heap, measured above the supplied bin floor. */
  get height(): number { return this.pileHeight; }

  setCount(value: number): void {
    const count = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
    if (count === this.count) return;
    this.count = count;
    this.pileHeight = Math.min(.22, count * .008);
    this.group.visible = count > 0;
    const instances = Math.min(BinArchive.BUDGET, count * STRIP_COUNT);
    this.mesh.count = instances;
    if (!instances) return;
    for (let i = 0; i < instances; i++) {
      const angle = i * 2.39996;
      const size = .76 + (Math.sin(i * 1.71) + 1) * .16;
      // Reserve rotated geometry extents: every vertex stays inside the bin.
      const extentX = Math.abs(Math.sin(angle)) * .07 * size + Math.abs(Math.cos(angle)) * .009;
      const extentZ = Math.abs(Math.cos(angle)) * .07 * size + Math.abs(Math.sin(angle)) * .009;
      const rx = ((i + .5) * .61803398875) % 1;
      const rz = ((i + .5) * .75487766625) % 1;
      const band = ((i + .5) * .56984029099) % 1;
      const foldHeight = Math.min(.008, this.pileHeight - .001);
      const base = .001 + Math.max(0, this.pileHeight - foldHeight - .001) * band;
      this.position.set((rx * 2 - 1) * (.187 - extentX), base, (rz * 2 - 1) * (.118 - extentZ));
      this.rotation.setFromAxisAngle(this.up, angle);
      this.scale.set(1, foldHeight / .008, size);
      this.matrix.compose(this.position, this.rotation, this.scale);
      this.mesh.setMatrixAt(i, this.matrix);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  dispose(): void {
    this.group.removeFromParent();
    this.mesh.dispose(); this.geometry.dispose(); this.material.dispose();
    this.group.clear();
  }
}

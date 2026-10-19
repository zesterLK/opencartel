/** Metres and seconds. The stock is A4, transported through an enclosed head. */
export const PAGE_WIDTH = .21;
export const PAGE_LENGTH = .297;
export const STRIP_COUNT = 18;
export const STRIP_WIDTH = PAGE_WIDTH / STRIP_COUNT;
export const SEGMENTS = 24;
export const FEED_SPEED = .105;
export const PRESS_DURATION = .22;
export const SETTLE_DURATION = 2.8;
export const CAPACITY = 3;

export type Point = { x: number; y: number; z: number };
export type Node = Point & { px: number; py: number; pz: number; curl: number; axisX: number; axisZ: number };
export type Bounds = { left: number; right: number; back: number; front: number; floor: number };
export type Phase = 'ready' | 'pressing' | 'feeding' | 'settling' | 'complete';
export const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** Coordinates are measured from the page's leading (bottom) edge. */
export function paperBudget(distance: number, headLength: number) {
  const fed = clamp(distance, 0, PAGE_LENGTH + headLength);
  const above = Math.max(0, PAGE_LENGTH - fed);
  const below = clamp(fed - headLength, 0, PAGE_LENGTH);
  return { above, inside: PAGE_LENGTH - above - below, below };
}

/** Ignore time spent hidden, and cap a long foreground frame to avoid simulation jumps. */
export function frameDelta(previous: number, now: number, hidden = false): number {
  return hidden || previous === 0 ? 0 : clamp((now - previous) / 1000, 0, 1 / 30);
}

export function phaseAt(elapsed: number, headLength: number): Phase {
  if (elapsed < PRESS_DURATION) return 'pressing';
  const feedEnd = PRESS_DURATION + (PAGE_LENGTH + headLength) / FEED_SPEED;
  if (elapsed < feedEnd) return 'feeding';
  if (elapsed < feedEnd + SETTLE_DURATION) return 'settling';
  return 'complete';
}

/** An arc-length parameterized hanging strip; every edge has exactly the requested length. */
export function hangingStrip(outlet: Point, strip: number, length: number, time: number): Point[] {
  const width = STRIP_WIDTH;
  const start = { x: outlet.x - PAGE_WIDTH / 2 + (strip + .5) * width, y: outlet.y, z: outlet.z };
  const points = [start];
  const segment = length / SEGMENTS;
  for (let i = 1; i <= SEGMENTS; i++) {
    const amount = i / SEGMENTS;
    const phase = strip * 1.37 + time * 2.2;
    const dx = Math.sin(phase + amount * 4) * .06 * amount;
    const dz = Math.sin(phase + amount * 5) * .25 * amount;
    const divisor = Math.hypot(dx, 1, dz);
    const prior = points[i - 1];
    points.push({ x: prior.x + segment * dx / divisor, y: prior.y - segment / divisor, z: prior.z + segment * dz / divisor });
  }
  return points;
}

export function releaseStrip(points: Point[], strip: number): Node[] {
  // The rollers leave modest, differing drift/rotation and a slight intrinsic curl.
  // These velocities apply only after the complete strip has left the guarded head.
  const direction = strip * 2.39996;
  const driftX = (strip / (STRIP_COUNT - 1) - .5) * .12 + Math.sin(direction) * .045;
  const driftZ = -.065 + Math.cos(direction) * .135;
  const angle = Math.sin(direction * .7) * .6;
  const curl = (strip % 2 ? 1 : -1) / (.058 + .035 * (.5 + .5 * Math.sin(direction)));
  return points.map((p, i) => ({
    ...p,
    px: p.x - (driftX + Math.cos(direction) * .11 * (i / SEGMENTS - .5)) / 120,
    py: p.y + FEED_SPEED / 120,
    pz: p.z - (driftZ + Math.sin(direction) * .14 * (i / SEGMENTS - .5)) / 120,
    curl, axisX: Math.cos(angle), axisZ: Math.sin(angle),
  }));
}

function constrain(a: Node, b: Node, target: number, strength: number): void {
  const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
  const length = Math.hypot(dx, dy, dz);
  if (length < 1e-9) return;
  const correction = (length - target) / length * .5 * strength;
  a.x += dx * correction; a.y += dy * correction; a.z += dz * correction;
  b.x -= dx * correction; b.y -= dy * correction; b.z -= dz * correction;
}

function bend(a: Node, b: Node, c: Node, edge: number): void {
  const tx = c.x - a.x, ty = c.y - a.y, tz = c.z - a.z;
  // A material-width axis gives a continuous bending plane even when the strip
  // turns from vertical into a floor curl. The sagitta is derived from its radius.
  let nx = ty * b.axisZ, ny = tz * b.axisX - tx * b.axisZ, nz = -ty * b.axisX;
  const normalLength = Math.hypot(nx, ny, nz);
  if (normalLength < 1e-8) return;
  const sagitta = edge * edge * b.curl * .5;
  nx *= sagitta / normalLength; ny *= sagitta / normalLength; nz *= sagitta / normalLength;
  const dx = ((a.x + c.x) * .5 + nx - b.x) * .32;
  const dy = ((a.y + c.y) * .5 + ny - b.y) * .32;
  const dz = ((a.z + c.z) * .5 + nz - b.z) * .32;
  b.x += dx; b.y += dy; b.z += dz;
  a.x -= dx * .5; a.y -= dy * .5; a.z -= dz * .5;
  c.x -= dx * .5; c.y -= dy * .5; c.z -= dz * .5;
}

/** Fixed-step Verlet ribbon with distance/bend constraints and bounded bin contacts.
 * This is an illustrative cloth solver, not a cutting or material engineering simulation.
 */
export function stepStrip(nodes: Node[], dt: number, bounds: Bounds): void {
  for (const n of nodes) {
    const floorContact = n.y <= bounds.floor + .0008;
    const damping = floorContact ? .82 : .994;
    const vx = (n.x - n.px) * damping;
    const vy = (n.y - n.py) * damping;
    const vz = (n.z - n.pz) * damping;
    n.px = n.x; n.py = n.y; n.pz = n.z;
    n.x += vx; n.y += vy - 4.2 * dt * dt; n.z += vz;
  }
  const edge = PAGE_LENGTH / (nodes.length - 1);
  for (let iteration = 0; iteration < 12; iteration++) {
    for (let i = 0; i < nodes.length - 1; i++) constrain(nodes[i], nodes[i + 1], edge, 1);
    for (let i = 1; i < nodes.length - 1; i++) bend(nodes[i - 1], nodes[i], nodes[i + 1], edge);
    // Small non-neighbour contacts prevent a strip from folding through itself.
    // This is local ribbon contact, not pairwise collision between every ribbon.
    if (iteration % 4 === 0) {
      for (let i = 0; i < nodes.length - 3; i++) for (let j = i + 3; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j];
        if ((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2 < .0045 ** 2) constrain(a, b, .0045, .8);
      }
    }
    for (const n of nodes) {
      n.x = clamp(n.x, bounds.left, bounds.right);
      n.y = Math.max(n.y, bounds.floor);
      n.z = clamp(n.z, bounds.back, bounds.front);
    }
  }
}

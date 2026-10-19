export type Mode = 'heavy' | 'stretch' | 'balance' | 'whisper' | 'melt' | 'bounce';
export type Point = { x: number; y: number };
export type SpringNode = { x: number; y: number; vx: number; vy: number };
export type SpringConfig = { stiffness: number; damping: number; coupling: number };

export const MODES: Mode[] = ['heavy', 'stretch', 'balance', 'whisper', 'melt', 'bounce'];
export const SPRINGS: Record<Mode, SpringConfig> = {
  heavy: { stiffness: 45, damping: 11, coupling: 17 },
  stretch: { stiffness: 105, damping: 10, coupling: 56 },
  balance: { stiffness: 34, damping: 8, coupling: 25 },
  whisper: { stiffness: 70, damping: 18, coupling: 8 },
  melt: { stiffness: 18, damping: 9, coupling: 11 },
  bounce: { stiffness: 155, damping: 5.5, coupling: 32 },
};

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function createNodes(count: number): SpringNode[] {
  return Array.from({ length: count }, () => ({ x: 0, y: 0, vx: 0, vy: 0 }));
}

/** Semi-implicit spring step. The caller supplies a bounded, fixed dt. */
export function stepNodes(nodes: SpringNode[], targets: Point[], config: SpringConfig, dt: number, held = -1): void {
  const previous = nodes.map(node => ({ ...node }));
  nodes.forEach((node, i) => {
    if (i === held) {
      node.x = targets[i].x;
      node.y = targets[i].y;
      return;
    }
    const p = previous[i];
    let neighbourX = 0;
    let neighbourY = 0;
    for (const j of [i - 1, i + 1]) {
      if (previous[j]) {
        neighbourX += previous[j].x - p.x;
        neighbourY += previous[j].y - p.y;
      }
    }
    const fx = config.stiffness * (targets[i].x - p.x) + config.coupling * neighbourX - config.damping * p.vx;
    const fy = config.stiffness * (targets[i].y - p.y) + config.coupling * neighbourY - config.damping * p.vy;
    node.vx += fx * dt;
    node.vy += fy * dt;
    node.x += node.vx * dt;
    node.y += node.vy * dt;
    if (!Number.isFinite(node.x + node.y + node.vx + node.vy)) Object.assign(node, { x: 0, y: 0, vx: 0, vy: 0 });
  });
}

export function curveY(x: number, mode: Mode, width: number, height: number, left: number, right: number, tilt = 0): number {
  const y = height * .57;
  const span = Math.max(1, right - left);
  const u = clamp((x - left) / span, 0, 1);
  const bell = Math.sin(Math.PI * u) ** 2;
  const sag = Math.min(height * .19, width * .09);
  const amount = { heavy: 1, stretch: .13, balance: .03, whisper: .05, melt: .08, bounce: .24 }[mode];
  return y + sag * amount * bell + (mode === 'balance' ? (x - width / 2) * tilt * bell : 0);
}

/** Smooth interpolation through every contact, without overshooting their y range. */
export function contactPath(points: Point[]): string {
  if (!points.length) return '';
  let d = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    const before = points[Math.max(0, i - 1)];
    const after = points[Math.min(points.length - 1, i + 2)];
    const dx = (b.x - a.x) / 3;
    const slopeA = (b.y - before.y) / Math.max(1, b.x - before.x);
    const slopeB = (after.y - a.y) / Math.max(1, after.x - a.x);
    const lo = Math.min(a.y, b.y);
    const hi = Math.max(a.y, b.y);
    d += ` C ${(a.x + dx).toFixed(2)} ${clamp(a.y + slopeA * dx, lo, hi).toFixed(2)} ${(b.x - dx).toFixed(2)} ${clamp(b.y - slopeB * dx, lo, hi).toFixed(2)} ${b.x.toFixed(2)} ${b.y.toFixed(2)}`;
  }
  return d;
}

export function keepLetterOrder(positions: number[], gap: number | number[], left: number, right: number): number[] {
  if (!positions.length) return [];
  const gaps = Array.from({ length: Math.max(0, positions.length - 1) }, (_, i) => typeof gap === 'number' ? gap : gap[i]);
  const factor = Math.min(1, (right - left) / Math.max(1, gaps.reduce((sum, value) => sum + value, 0)));
  const result = positions.map(x => clamp(x, left, right));
  for (let i = 1; i < result.length; i++) result[i] = Math.max(result[i], result[i - 1] + gaps[i - 1] * factor);
  if (result[result.length - 1] > right) result[result.length - 1] = right;
  for (let i = result.length - 2; i >= 0; i--) result[i] = Math.min(result[i], result[i + 1] - gaps[i] * factor);
  return result;
}

export function graphemes(text: string): string[] {
  return [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(text)].map(part => part.segment);
}

export function validateWord(text: string): { valid: boolean; value: string; message: string } {
  const value = text.normalize('NFC').trim();
  if (!value) return { valid: false, value, message: 'Give it a word first.' };
  if (graphemes(value).length > 16) return { valid: false, value, message: 'A little shorter — up to 16 characters.' };
  if (/[\u0000-\u001f\u007f]/u.test(value)) return { valid: false, value, message: 'Use a word or short phrase.' };
  return { valid: true, value, message: '' };
}

/** Bounds frame catch-up after tab suspension; excess elapsed time is discarded. */
export function frameSteps(elapsedSeconds: number): number {
  return Math.min(6, Math.max(1, Math.ceil(clamp(elapsedSeconds, 0, .05) / (1 / 120))));
}

/** Uniform affine transforms: child coordinates -> parent coordinates. */
export const mod = (value, length) => ((value % length) + length) % length;
export const identity = () => ({ scale: 1, x: 0, y: 0 });
export function compose(outer, inner) {
  return { scale: outer.scale * inner.scale, x: outer.x + outer.scale * inner.x, y: outer.y + outer.scale * inner.y };
}
export function inverse(transform) {
  return { scale: 1 / transform.scale, x: -transform.x / transform.scale, y: -transform.y / transform.scale };
}
export function point(transform, x, y) {
  return { x: transform.x + x * transform.scale, y: transform.y + y * transform.scale };
}
export const fullView = plate => ({ x: 0, y: 0, width: plate.width, height: plate.height });
export function validatePlates(plates) {
  if (!Array.isArray(plates) || !plates.length) throw new Error('At least one illustrated plate is required.');
  for (const plate of plates) {
    for (const key of ['width', 'height']) if (!(plate[key] > 0) || !Number.isFinite(plate[key])) throw new Error(`Invalid plate ${key}.`);
    for (const rect of [plate.portal, plate.childView, plate.view].filter(Boolean)) {
      if (![rect.x, rect.y, rect.width, rect.height].every(Number.isFinite) || rect.width <= 0 || rect.height <= 0) throw new Error('Invalid scene rectangle.');
    }
    if (!plate.portal) throw new Error('Each plate needs a portal.');
    const p = plate.portal;
    if (p.x < 0 || p.y < 0 || p.x + p.width > plate.width || p.y + p.height > plate.height) throw new Error('Portal must be inside its plate.');
  }
}
/** Cover a portal with the selected child region without ever stretching it. */
export function childTransform(parent, child) {
  const aperture = parent.portal;
  const crop = parent.childView || fullView(child);
  const scale = Math.max(aperture.width / crop.width, aperture.height / crop.height);
  return {
    scale,
    x: aperture.x + aperture.width / 2 - (crop.x + crop.width / 2) * scale,
    y: aperture.y + aperture.height / 2 - (crop.y + crop.height / 2) * scale,
  };
}
export function coverView(plate, width, height) {
  const view = plate.view || fullView(plate);
  const scale = Math.max(width / view.width, height / view.height);
  return { scale, x: width / 2 - (view.x + view.width / 2) * scale, y: height / 2 - (view.y + view.height / 2) * scale };
}
/** Current plate's coordinates -> viewport; identical transforms meet at joins. */
export function cameraForDepth(plates, depth, width, height, { intro = false } = {}) {
  if (!Number.isFinite(depth) || !(width > 0) || !(height > 0)) throw new Error('Invalid journey or viewport.');
  if (intro) depth = Math.max(0, depth);
  const wrapped = mod(depth, plates.length);
  const index = Math.floor(wrapped);
  const fraction = wrapped - index;
  const plate = plates[index];
  const child = plates[(index + 1) % plates.length];
  // The first arrival can show the whole master before entering the loop.
  const start = coverView(intro && depth < 1 ? { ...plate, view: fullView(plate) } : plate, width, height);
  const end = compose(coverView(child, width, height), inverse(childTransform(plate, child)));
  // Geometric scale keeps zoom velocity independent of the current magnification.
  const scale = start.scale * Math.pow(end.scale / start.scale, fraction);
  const startCenter = { x: (width / 2 - start.x) / start.scale, y: (height / 2 - start.y) / start.scale };
  const endCenter = { x: (width / 2 - end.x) / end.scale, y: (height / 2 - end.y) / end.scale };
  const centerX = startCenter.x + (endCenter.x - startCenter.x) * fraction;
  const centerY = startCenter.y + (endCenter.y - startCenter.y) * fraction;
  return { index, fraction, transform: { scale, x: width / 2 - centerX * scale, y: height / 2 - centerY * scale } };
}
/** Coordinates of an earlier ancestor -> current plate coordinates. */
export function ancestorTransform(plates, currentIndex, count) {
  let transform = identity();
  for (let step = 1; step <= count; step++) {
    const parentIndex = mod(currentIndex - step, plates.length);
    const link = childTransform(plates[parentIndex], plates[(parentIndex + 1) % plates.length]);
    transform = compose(transform, inverse(link));
  }
  return transform;
}

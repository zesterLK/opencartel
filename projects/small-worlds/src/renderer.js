import { ancestorTransform, cameraForDepth, childTransform, compose, mod, validatePlates } from './journey.js';

/**
 * Recursive canvas compositor. Source paintings remain intact; the next image is
 * drawn through a hard, editable portal. The same graph serves both directions.
 */
export function createRenderer(canvas, plates, { intro = false } = {}) {
  validatePlates(plates);
  const context = canvas.getContext('2d', { alpha: false });
  if (!context) throw new Error('Canvas rendering is not available.');
  let width = 1, height = 1, ratio = 1, destroyed = false;
  const ancestorCount = 4;
  const maxLayers = 32;
  let lastStats = { layers: 0, depth: 0 };

  function resize(nextWidth = canvas.clientWidth, nextHeight = canvas.clientHeight, nextRatio = globalThis.devicePixelRatio || 1) {
    if (destroyed) return;
    width = Math.max(1, nextWidth);
    height = Math.max(1, nextHeight);
    // Bound backing-store memory on large/high-density displays.
    ratio = Math.min(Math.max(1, nextRatio), 2, Math.sqrt(4_000_000 / (width * height)));
    canvas.width = Math.max(1, Math.round(width * ratio));
    canvas.height = Math.max(1, Math.round(height * ratio));
  }

  function render(depth) {
    if (destroyed) return lastStats;
    if (intro) depth = Math.max(0, depth);
    const camera = cameraForDepth(plates, depth, width, height, { intro });
    const ancestors = intro ? Math.min(ancestorCount, Math.floor(depth)) : ancestorCount;
    const firstIndex = mod(camera.index - ancestors, plates.length);
    const firstTransform = compose(camera.transform, ancestorTransform(plates, camera.index, ancestors));
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.fillStyle = '#152d3b';
    context.fillRect(0, 0, width, height);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    let layers = 0;
    function draw(index, transform, clip, level) {
      const plate = plates[index];
      if (!plate.image || level >= maxLayers) return;
      layers++;
      context.save();
      context.setTransform(ratio * transform.scale, 0, 0, ratio * transform.scale, ratio * transform.x, ratio * transform.y);
      context.drawImage(plate.image, 0, 0, plate.width, plate.height);
      const p = plate.portal;
      const screen = {
        left: transform.x + p.x * transform.scale,
        top: transform.y + p.y * transform.scale,
        right: transform.x + (p.x + p.width) * transform.scale,
        bottom: transform.y + (p.y + p.height) * transform.scale,
      };
      const nextClip = {
        left: Math.max(clip.left, screen.left), top: Math.max(clip.top, screen.top),
        right: Math.min(clip.right, screen.right), bottom: Math.min(clip.bottom, screen.bottom),
      };
      if (nextClip.right > nextClip.left && nextClip.bottom > nextClip.top && screen.right - screen.left > .25 && screen.bottom - screen.top > .25) {
        context.beginPath();
        if (p.points) {
          context.moveTo(...p.points[0]);
          for (const point of p.points.slice(1)) context.lineTo(...point);
          context.closePath();
        } else context.rect(p.x, p.y, p.width, p.height);
        context.clip();
        const next = (index + 1) % plates.length;
        draw(next, compose(transform, childTransform(plate, plates[next])), nextClip, level + 1);
      }
      context.restore();
    }
    draw(firstIndex, firstTransform, { left: 0, top: 0, right: width, bottom: height }, 0);
    lastStats = { layers, depth, index: camera.index, fraction: camera.fraction, width, height, pixelRatio: ratio };
    return lastStats;
  }

  resize();
  return { resize, render, get stats() { return { ...lastStats }; }, destroy() { destroyed = true; } };
}

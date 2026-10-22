// A persistent, signed direction field. A zero vector represents upright pile.
// Values are never normalized during blending: opposing strokes pass through
// upright fibres instead of snapping unpredictably through 180 degrees.
export class NapField {
  constructor(width = 512, height = 512) {
    this.width = width;
    this.height = height;
    this.vectors = new Float32Array(width * height * 2);
    this.pixels = new Uint8Array(width * height * 4);
    this.revision = 0;
    this.reset();
  }

  reset() {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const i = y * this.width + x;
        const angle = -0.95 + 0.055 * Math.sin(x * 0.027) * Math.cos(y * 0.021);
        this.vectors[i * 2] = Math.cos(angle) * 0.65;
        this.vectors[i * 2 + 1] = Math.sin(angle) * 0.65;
        this.writePixel(i);
      }
    }
    this.revision++;
  }

  writePixel(i) {
    this.pixels[i * 4] = Math.round((this.vectors[i * 2] * 0.5 + 0.5) * 255);
    this.pixels[i * 4 + 1] = Math.round((this.vectors[i * 2 + 1] * 0.5 + 0.5) * 255);
    this.pixels[i * 4 + 2] = 0;
    this.pixels[i * 4 + 3] = 255;
  }

  // Positions are normalized top-left coordinates; the footprint is circular
  // in CSS pixels, regardless of field resolution or viewport aspect ratio.
  brush(from, to, radius, viewportWidth, viewportHeight, strength = 1) {
    const dx = (to.x - from.x) * viewportWidth;
    const dy = (to.y - from.y) * viewportHeight;
    const length = Math.hypot(dx, dy);
    if (length < 0.01 || radius <= 0) return false;
    const directionX = dx / length;
    const directionY = -dy / length;
    const rx = radius / viewportWidth;
    const ry = radius / viewportHeight;
    const minX = Math.max(0, Math.floor((Math.min(from.x, to.x) - rx) * this.width));
    const maxX = Math.min(this.width - 1, Math.ceil((Math.max(from.x, to.x) + rx) * this.width));
    const minY = Math.max(0, Math.floor((Math.min(from.y, to.y) - ry) * this.height));
    const maxY = Math.min(this.height - 1, Math.ceil((Math.max(from.y, to.y) + ry) * this.height));
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const px = ((x + 0.5) / this.width - from.x) * viewportWidth;
        const py = ((y + 0.5) / this.height - from.y) * viewportHeight;
        const t = Math.max(0, Math.min(1, (px * dx + py * dy) / (length * length)));
        const edgeVariation = 1 + 0.035 * Math.sin(x * 0.31 + Math.sin(y * 0.27) * 2) + 0.018 * Math.cos(y * 0.47 - x * 0.15);
        const distance = Math.hypot(px - t * dx, py - t * dy) / (radius * edgeVariation);
        if (distance >= 1) continue;
        const falloff = 1 - Math.min(1, Math.max(0, (distance - 0.42) / 0.58));
        const weight = falloff * falloff * (3 - 2 * falloff) * Math.min(1, strength);
        const i = y * this.width + x;
        this.vectors[i * 2] += (directionX - this.vectors[i * 2]) * weight;
        this.vectors[i * 2 + 1] += (directionY - this.vectors[i * 2 + 1]) * weight;
        this.writePixel(i);
      }
    }
    this.revision++;
    return true;
  }
}

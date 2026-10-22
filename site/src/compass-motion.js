// Reflect overflow as well as velocity so bounce speed is frame-rate independent.
export function advanceAxis(position, velocity, dt, min, max) {
  if (max <= min) return { position: min, velocity, bounced: false };
  let next = position + velocity * dt;
  let bounced = false;
  while (next < min || next > max) {
    if (next > max) { next = 2 * max - next; velocity = -Math.abs(velocity); }
    else if (next < min) { next = 2 * min - next; velocity = Math.abs(velocity); }
    bounced = true;
  }
  return { position: next, velocity, bounced };
}

export function nearestAngle(current, target) {
  return current + ((target - current + 180) % 360 + 360) % 360 - 180;
}

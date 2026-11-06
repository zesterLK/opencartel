// Even-odd containment treats counters as outside the solid glyph.
export function insideGlyph(contours,x,y){
 let inside=false;
 for(const contour of contours)for(let i=0,j=contour.length-1;i<contour.length;j=i++){
  const a=contour[i],b=contour[j];
  if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;
 }
 return inside;
}
function periodic(values,index){return values[(index%values.length+values.length)%values.length];}
function random(seed,index){
 let h=(seed^Math.imul(index+1,0x9e3779b1))>>>0;
 h=Math.imul(h^(h>>>16),0x85ebca6b);h=Math.imul(h^(h>>>13),0xc2b2ae35);
 return ((h^(h>>>16))>>>0)/4294967296;
}
function contourSeed(glyph,raw,index){
 let seed=(Math.round(glyph.width*1000000)^Math.imul(index+1,0x45d9f3b))>>>0;
 for(let i=0;i<raw.length;i+=Math.max(1,Math.floor(raw.length/17))){seed=Math.imul(seed^Math.round(raw[i][0]*100000),16777619);seed=Math.imul(seed^Math.round(raw[i][1]*100000),16777619);}
 return seed>>>0;
}

// Arc length makes the density independent of how many nodes the font uses.
const TAU = Math.PI * 2;
const mix = (a, b, amount) => a + (b - a) * amount;

function sampleBoundary(raw) {
  const ends = [0];
  for (let i = 0; i < raw.length; i++) {
    const a = raw[i], b = raw[(i + 1) % raw.length];
    ends.push(ends[i] + Math.hypot(b[0] - a[0], b[1] - a[1]));
  }
  const perimeter = ends.at(-1);
  const count = Math.max(320, Math.ceil(perimeter / .0016));
  const step = perimeter / count;
  const points = [];
  let edge = 0;
  for (let i = 0; i < count; i++) {
    const distance = i * step;
    while (ends[edge + 1] < distance) edge++;
    const t = (distance - ends[edge]) / (ends[edge + 1] - ends[edge] || 1);
    const a = raw[edge], b = raw[(edge + 1) % raw.length];
    points.push([mix(a[0], b[0], t), mix(a[1], b[1], t)]);
  }
  return {points, step, perimeter};
}

function direction(points, i, width) {
  const a = periodic(points, i - width), b = periodic(points, i + width);
  const x = b[0] - a[0], y = b[1] - a[1];
  const length = Math.hypot(x, y) || 1;
  return [x / length, y / length];
}

// Store a signed distance close to the ink. Each growth step is shorter than
// this strip, so the solver only queries the field as a thread touches a wall.
function collisionField(boundaries) {
  const cell = .004, band = .04;
  const xs = boundaries.flatMap(c => c.points.map(p => p[0]));
  const ys = boundaries.flatMap(c => c.points.map(p => p[1]));
  const left = Math.min(...xs) - band, top = Math.min(...ys) - band;
  const width = Math.ceil((Math.max(...xs) + band - left) / cell) + 1;
  const height = Math.ceil((Math.max(...ys) + band - top) / cell) + 1;
  const distance = new Float32Array(width * height).fill(band);
  const crossings = Array.from({length:height}, () => []);
  for (const {points, step} of boundaries) {
    const stride = Math.max(1, Math.round(.004 / step));
    for (let i = 0; i < points.length; i += stride) {
      const a = points[i], b = points[Math.min(points.length, i + stride) % points.length];
      const dx = b[0] - a[0], dy = b[1] - a[1], sq = dx * dx + dy * dy;
      if (!sq) continue;
      const x0 = Math.max(0, Math.floor((Math.min(a[0], b[0]) - band - left) / cell));
      const x1 = Math.min(width - 1, Math.ceil((Math.max(a[0], b[0]) + band - left) / cell));
      const y0 = Math.max(0, Math.floor((Math.min(a[1], b[1]) - band - top) / cell));
      const y1 = Math.min(height - 1, Math.ceil((Math.max(a[1], b[1]) + band - top) / cell));
      for (let row = y0; row <= y1; row++) {
        const y = top + row * cell;
        if ((a[1] > y) !== (b[1] > y)) crossings[row].push(a[0] + (y - a[1]) * dx / dy);
        const oy = y - a[1];
        for (let col = x0; col <= x1; col++) {
          const ox = left + col * cell - a[0];
          const t = Math.max(0, Math.min(1, (ox * dx + oy * dy) / sq));
          const value = Math.sqrt((ox - t * dx) ** 2 + (oy - t * dy) ** 2);
          const at = row * width + col;
          if (value < distance[at]) distance[at] = value;
        }
      }
    }
  }
  // Use the even–odd fill rule irrespective of the font's contour winding.
  for (let row = 0; row < height; row++) {
    const cuts = crossings[row].sort((a,b) => a-b);
    for (let i = 0; i + 1 < cuts.length; i += 2) {
      const start = Math.ceil((cuts[i] - left) / cell), end = Math.ceil((cuts[i+1] - left) / cell);
      for (let col = start; col < end; col++) distance[row * width + col] *= -1;
    }
  }
  return {left, top, width, height, cell, distance};
}

export function prepareGlyph(glyph) {
  const boundaries = glyph.contours.map(sampleBoundary);
  const field = collisionField(boundaries);
  const prepared = boundaries.map(({points, perimeter, step}, index) => {
    const width = Math.max(3, Math.round(.025 / step));
    let votes = 0;
    for (let i = 0; i < points.length; i += Math.ceil(points.length / 64)) {
      const [tx, ty] = direction(points, i, width), [x, y] = points[i];
      votes += insideGlyph(glyph.contours, x - ty * .008, y + tx * .008) ? -1 : 1;
    }
    const sign = votes >= 0 ? 1 : -1;
    const contour = points.map(([x, y], i) => {
      const [tx, ty] = direction(points, i, width);
      return {x, y, nx: -ty * sign, ny: tx * sign};
    });
    contour.perimeter = perimeter;
    contour.narrow = glyph.width < .55;
    contour.shortBoundary = perimeter < 3.8 && index === 0;
    contour.counter = index > 0;
    contour.seed = contourSeed(glyph, glyph.contours[index], index);
    contour.field = field;
    return contour;
  });
  return {...glyph, prepared};
}

// A closed, smooth random curve. Two independent coordinates allow bends to
// turn either way, including broad sweeps, hooks and tight nested crossings.
function ribbonField(count, seed) {
  const phases = Array.from({length: 7}, (_, i) => TAU * random(seed, i));
  const rates = [.41, .71, 1, 1.38, 1.94, 2.43, 3.23].map(r => Math.max(1, Math.round(count * r)));
  const power = [.22, .24, .35, .25, .16, .12, .055];
  return s => {
    let result = 0;
    for (let i = 0; i < phases.length; i++) result += power[i] * Math.sin(TAU * s * rates[i] + phases[i]);
    return result;
  };
}

// Motion is integrated from the clean outline. Constraining each short step
// prevents a point jumping through solid ink or changing sides at a corner.
function contact(field, xy, index, dx, dy) {
  const x = xy[index] + dx, y = xy[index + 1] + dy;
  xy[index] = x; xy[index + 1] = y;
  const u = (x - field.left) / field.cell, v = (y - field.top) / field.cell;
  const col = Math.floor(u), row = Math.floor(v);
  if (col < 0 || row < 0 || col + 1 >= field.width || row + 1 >= field.height) return;
  const j = row * field.width + col, d = field.distance;
  const a = d[j], b = d[j+1], c = d[j+field.width], e = d[j+field.width+1];
  const fx = u-col, fy = v-row;
  const dist = mix(mix(a,b,fx), mix(c,e,fx), fy);
  const bearing = .0045;
  if (dist >= bearing) return;
  const gx = mix(b-a, e-c, fy), gy = mix(c-a, e-b, fx);
  const length = Math.sqrt(gx*gx + gy*gy);
  if (length < 1e-7) return;
  const correction = (bearing-dist)/length;
  xy[index] += correction*gx; xy[index+1] += correction*gy;
}

const STAGES = 10;
const STEPS_PER_STAGE = 4;

// A short, circular kernel rounds a point where neighbouring material has
// slid to opposite sides of a corner. Only the displacement is filtered,
// preserving the starting glyph, its holes, and each closed contour's seam.
function smoothDisplacement(contour, field, scratch) {
  const count = contour.length;
  const radius = Math.max(2, Math.round(.0042 * count / contour.perimeter));
  const width = 2 * radius + 1;
  let dx = 0, dy = 0;
  for (let k = -radius; k <= radius; k++) {
    const j = (k + count) % count;
    dx += field[2*j] - contour[j].x;
    dy += field[2*j+1] - contour[j].y;
  }
  for (let i = 0; i < count; i++) {
    scratch[2*i] = contour[i].x + dx / width;
    scratch[2*i+1] = contour[i].y + dy / width;
    const exit = (i-radius+count) % count, enter = (i+radius+1) % count;
    dx += field[2*enter] - contour[enter].x - field[2*exit] + contour[exit].x;
    dy += field[2*enter+1] - contour[enter].y - field[2*exit+1] + contour[exit].y;
  }
  field.set(scratch);
}

// Round folds by distance on the deformed wire. Pinched turns can occupy many
// original samples near a contact. A fixed sample-count filter misses those.
function roundTurns(curve, scratch, arc, radius) {
  const n = curve.length / 2;
  arc[0] = 0;
  for (let i = 0; i < n; i++) {
    const next = (i+1) % n;
    arc[i+1] = arc[i] + Math.sqrt((curve[2*next] - curve[2*i])**2 + (curve[2*next+1] - curve[2*i+1])**2);
  }
  const perimeter = arc[n];
  let lo = 0, hi = 0;
  while (arc[lo+1] < perimeter-radius) lo++;
  for (let i = 0; i < n; i++) {
    const left = (arc[i] - radius + perimeter) % perimeter;
    const right = (arc[i] + radius) % perimeter;
    if (left < arc[lo]) lo = 0;
    if (right < arc[hi]) hi = 0;
    while (lo+1 < n && arc[lo+1] < left) lo++;
    while (hi+1 < n && arc[hi+1] < right) hi++;
    const lf = (left-arc[lo])/(arc[lo+1]-arc[lo] || 1);
    const rf = (right-arc[hi])/(arc[hi+1]-arc[hi] || 1);
    for (let axis = 0; axis < 2; axis++) {
      const l = mix(curve[2*lo+axis], curve[2*((lo+1)%n)+axis], lf);
      const r = mix(curve[2*hi+axis], curve[2*((hi+1)%n)+axis], rf);
      scratch[2*i+axis] = (l + 2*curve[2*i+axis] + r) * .25;
    }
  }
  curve.set(scratch);
}

function prepareStroke(contour, cycle, offset, buffer) {
  const energetic = cycle % 2 === 1;
  const seed = contour.seed ^ Math.imul(cycle + 1, 0x45d9f3b) ^ Math.imul(offset + 1, 0x132db55);
  const spacing = contour.narrow ? .044 : contour.counter ? .043 : contour.shortBoundary ? .063 : .087;
  const density = contour.perimeter / spacing * (energetic && !contour.counter ? 1.32 : 1);
  const band = ribbonField(density * .17, seed);
  const jitter = ribbonField(density * .33, seed + 348);
  const largeX = ribbonField(density * .48, seed + 105), largeY = ribbonField(density * .53, seed + 268);
  const carrier = Math.round(density), slip = Math.round(density*.71);
  const bias = random(seed,44)*TAU, size = contour.length;
  const tension = energetic ? 1.90 : 1;
  const state = buffer.xy;
  for (let i = 0; i < size; i++) {
    const s = i / size, p = contour[i], j = i*2;
    const weave = band(s), fine = jitter(s);
    const angle = s*TAU*carrier + bias + fine*2.3 + weave*2.5;
    const twist = s*TAU*slip - bias + weave*3.1;
    // Two rotating forces interfere. Sometimes their turn adds up into a wide
    // sweep; sometimes it reverses into tight crossing folds.
    const slowX = largeX(s), slowY = largeY(s);
    let parallel = (.065+.025*weave)*Math.cos(angle) + .050*Math.cos(twist) + .12*slowX;
    let transverse = .072 + (.059-.028*weave)*Math.sin(angle) - .046*Math.sin(twist) + .104*slowY;
    if (!contour.counter) {
      // Adjacent folds share a principal direction. Broad arcs drift and lean
      // together while their smaller transverse turns stay distinct.
      const tilt = 1.45*weave + .65*fine + (contour.narrow ? .71 : .18);
      const major = (.115 + .075*weave) * Math.cos(angle + .35*Math.sin(twist));
      const minor = (.042 + .026*fine) * Math.sin(angle + .44*Math.cos(twist));
      const longitudinal = major*Math.cos(tilt) - minor*Math.sin(tilt);
      const lateral = major*Math.sin(tilt) + minor*Math.cos(tilt);
      parallel = .86*longitudinal + .14*parallel + .072*slowX;
      transverse = .080 + lateral + .084*slowY + .016*Math.sin(twist);
      if (contour.narrow) transverse *= 1.16;
    }
    const vx = p.ny * parallel + p.nx * transverse;
    const vy = -p.nx * parallel + p.ny * transverse;
    const wx = .043*largeX(s), wy = .043*largeY(s);
    buffer.stages[0][j] = state[j] = p.x;
    buffer.stages[0][j+1] = state[j+1] = p.y;
    // In the first part of the stroke the fine bends form; the broad current
    // takes them further around the glyph as the thread continues to grow.
    for (let stage = 1; stage <= STAGES; stage++) {
      const steps = STAGES * STEPS_PER_STAGE;
      for (let sub = 0; sub < STEPS_PER_STAGE; sub++) {
        const t = ((stage-1) * STEPS_PER_STAGE + sub + .5) / steps;
        contact(contour.field, state, j, tension * (vx + 2*t*wx) / steps, tension * (vy + 2*t*wy) / steps);
      }
      buffer.stages[stage][j] = state[j]; buffer.stages[stage][j+1] = state[j+1];
    }
  }
  const arc = new Float64Array(size + 1);
  for (let stage = 1; stage <= STAGES; stage++) {
    smoothDisplacement(contour, buffer.stages[stage], state);
    const radius = .016 * stage / STAGES;
    roundTurns(buffer.stages[stage], state, arc, radius);
    roundTurns(buffer.stages[stage], state, arc, radius);
    for (let j = 0; j < state.length; j += 2) contact(contour.field, buffer.stages[stage], j, 0, 0);
  }
  buffer.cycle = cycle;
  buffer.offset = offset;
}

export function createCoilBuffer(contour) {
  const size = contour.length, xy = new Float64Array(size*2);
  return {
    points: Array.from({length:size}, (_, i) => xy.subarray(i*2, i*2+2)), xy,
    stages:Array.from({length:STAGES+1}, () => new Float32Array(size*2)), cycle:-1, offset:-1
  };
}

// The same interpolation drives local seeking and playback of worker-built
// stages. Stage buffers carry interleaved x/y coordinates for one closed path.
export function sampleCoilStages(stages, xy, elapsed, amount) {
  const phase = elapsed % 1;
  const position = (stages.length - 1) * amount * (.92 + .08 * phase);
  const lower = Math.floor(position);
  const upper = Math.min(stages.length - 1, lower + 1);
  const blend = position - lower;
  const a = stages[lower], b = stages[upper];
  for (let i = 0; i < xy.length; i++) xy[i] = mix(a[i], b[i], blend);
  return xy;
}

export function coilContour(contour, contourIndex, elapsed, amount, offset = 0, buffer = createCoilBuffer(contour)) {
  if (amount === 0) {
    for (let i = 0; i < contour.length; i++) {
      buffer.xy[i*2] = contour[i].x;
      buffer.xy[i*2+1] = contour[i].y;
    }
    return buffer.points;
  }
  const cycle = Math.floor(elapsed/10);
  if (cycle !== buffer.cycle || offset !== buffer.offset) prepareStroke(contour, cycle, offset, buffer);
  sampleCoilStages(buffer.stages, buffer.xy, elapsed, amount);
  return buffer.points;
}

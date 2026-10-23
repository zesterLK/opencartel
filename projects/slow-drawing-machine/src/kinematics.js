export const STEP = 1 / 120;
export const DEFAULT_SPEED = .25;
export const MAX_SPEED = 10;
export const MAX_POINTS = 24000;
export function clockSteps(accumulator, elapsed, speed=1, remaining=MAX_POINTS) {
  const available=accumulator+elapsed*speed;
  const steps=Math.min(96,remaining,Math.floor((available+1e-12)/STEP));
  return {steps,remainder:Math.max(0,available-steps*STEP)};
}
export const PRESETS = {
  orbit: { fx:2, fy:2.01, phase:Math.PI/2, decay:.0015, secondary:.16 },
  bloom: { fx:2, fy:3.01, phase:Math.PI/2, decay:.002, secondary:.18 },
  weave: { fx:3.01, fy:4, phase:.8, decay:.001, secondary:.08 },
};
export function penAt(t, settings, width, height) {
  const {fx,fy,phase,decay,secondary}=settings;
  const envelope=Math.exp(-decay*t);
  const x=(Math.sin(fx*t+phase)*(1-secondary)+Math.sin(fx*.497*t+.4)*secondary)*envelope;
  const y=(Math.sin(fy*t)*(1-secondary)+Math.sin(fy*.503*t+1.7)*secondary)*envelope;
  return {x:width*(.5+x*.38),y:height*(.53+y*.32)};
}
// Relocation preserves the current phase and begins exactly at the dropped nib.
// A smooth bounded mapping keeps the continuing pattern inside the canvas.
export function penBounds(width,height) {
  return {left:12,right:Math.max(13,width-12),top:Math.min(54,height*.2),bottom:Math.max(55,height-12)};
}
export function clampPen(point,width,height) {
  const b=penBounds(width,height);
  return {x:Math.max(b.left,Math.min(b.right,point.x)),y:Math.max(b.top,Math.min(b.bottom,point.y))};
}
export function placedPenAt(t,settings,width,height,placement) {
  const p=penAt(t,settings,width,height);
  if(!placement)return p;
  const origin=penAt(placement.t,settings,width,height),b=penBounds(width,height);
  const bend=(anchor,delta,low,high)=>{
    // A small extension beyond the visible bounds keeps exact edge placements
    // finite while retaining a smooth derivative rather than bouncing/clamping.
    const span=high-low,pad=span*.005,l=low-pad,r=high+pad;
    const a=(anchor-l)/(r-l),logit=Math.log(a/(1-a));
    const value=l+(r-l)/(1+Math.exp(-(logit+delta*4/span)));
    return Math.max(low,Math.min(high,value));
  };
  return {x:bend(placement.x,p.x-origin.x,b.left,b.right),y:bend(placement.y,p.y-origin.y,b.top,b.bottom)};
}
// Two fixed-length links. The branch is chosen once per side and never flips.
export function solveArm(base, tip, l1, l2, branch) {
  const dx=tip.x-base.x,dy=tip.y-base.y,r=Math.hypot(dx,dy);
  if(r<=Math.abs(l1-l2)+1e-7 || r>=l1+l2-1e-7) throw new RangeError('Pen lies outside the mechanism envelope');
  const cosine=(l1*l1+r*r-l2*l2)/(2*l1*r);
  const theta=Math.atan2(dy,dx)+branch*Math.acos(Math.max(-1,Math.min(1,cosine)));
  return {x:base.x+Math.cos(theta)*l1,y:base.y+Math.sin(theta)*l1};
}
export function armsFor(pen,width,height) {
  const diagonal=Math.hypot(width,height),l1=diagonal*.57,l2=diagonal*.57;
  const bases=[{x:width*.08,y:-Math.max(48,height*.065)},{x:width*.92,y:-Math.max(48,height*.065)}];
  const tip={x:pen.x,y:pen.y-25};
  return {tip,l1,l2,chains:bases.map((base,i)=>({base,elbow:solveArm(base,tip,l1,l2,i===0?1:-1)}))};
}
export function toSVG(strokes,width,height) {
  const paths=strokes.filter(s=>s.points.length>1).map(s=>{
    const color=/^#[0-9a-f]{6}$/i.test(s.color)?s.color:'#345f9d';
    const path=s.points.map((p,i)=>`${i?'L':'M'}${p.x.toFixed(3)} ${p.y.toFixed(3)}`).join(' ');
    return `<path d="${path}" fill="none" stroke="${color}" stroke-width="${Number.isFinite(s.width)&&s.width>0?s.width:0.65}" stroke-linecap="round" stroke-linejoin="round"/>`;
  }).join('\n');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}"><title>Slow Drawing Machine</title>\n${paths}\n</svg>`;
}

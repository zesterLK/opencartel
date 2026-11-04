import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareGlyph,coilPoint,coilContour,coilPhase,pointPhase,createCoilBuffer} from '../src/coil-geometry.js';
import {envelope} from '../src/clock-math.js';
const glyphs=JSON.parse(readFileSync(new URL('../src/contours.json',import.meta.url)));
test('dense phase sweep has no normal flips or long spur segments',()=>{
 let longest=0,fastest=0;
 for(const digit of '0123456789'){
  const glyph=prepareGlyph(glyphs[digit]);
  for(let k=0;k<glyph.prepared.length;k++){
   const c=glyph.prepared[k];
   for(let i=0;i<c.length;i++){
    const p=c[i],q=c[(i+1)%c.length];
    assert.ok(p.nx*q.nx+p.ny*q.ny>.8,`${digit}: normal reversal at ${i}`);
   }
   for(const cycle of [0,10])for(let phase=.05;phase<1;phase+=.025){
    const elapsed=cycle+(Number(digit)+9)%10+phase;
    const path=coilContour(c,k,elapsed,envelope(phase)),nextPath=coilContour(c,k,elapsed+.001,envelope(phase+.001));
    for(let i=0;i<c.length;i++){
     const p=path[i],q=path[(i+1)%c.length],next=nextPath[i];
     longest=Math.max(longest,Math.hypot(p[0]-q[0],p[1]-q[1]));
     fastest=Math.max(fastest,Math.hypot(p[0]-next[0],p[1]-next[1]));
    }
   }
  }
 }
 // At the maximum 520px glyph size, a step cannot become a long triangular shard.
 assert.ok(longest<.008,`longest neighbouring step ${longest}`);
 assert.ok(fastest<.0003,`temporal jump ${fastest}`);
 console.log({longestSegment:longest,largestMillisecondMove:fastest});
});

test('all anchored spans retain forward coil phase throughout the animation',()=>{
 const counts=new Set(Object.values(glyphs).flatMap(glyph=>prepareGlyph(glyph).prepared.flatMap(contour=>contour.map(p=>p.coils))));
 for(const coils of counts)for(let time=0;time<20;time+=.25)for(let step=0;step<1024;step++){
  const a=coilPhase(step/1024,coils,time),b=coilPhase((step+1)/1024,coils,time);
  assert.ok(b>a,`phase reversal: coils ${coils}, time ${time}, step ${step}`);
 }
});

test('late-phase curls cover every contour without broad uncurled stretches',()=>{
 let longest=0;
 for(const [digit,raw] of Object.entries(glyphs)){
  const glyph=prepareGlyph(raw);
  for(const cycle of [0,10])for(const phase of [.65,.8,.95])for(let k=0;k<glyph.prepared.length;k++){
   const c=glyph.prepared[k],elapsed=cycle+(Number(digit)+9)%10+phase,turns=[],path=coilContour(c,k,elapsed,envelope(phase));
   for(let i=0;i<c.length;i++){
    const p=c[i],a=path[i],b=path[(i+1)%c.length];
    // A real curl travels back along the underlying outline, unlike mere vibration.
    const backwards=(b[0]-a[0])*p.tx+(b[1]-a[1])*p.ty;
    if(backwards<-.00001)turns.push(i);
   }
   assert.ok(turns.length,`${digit} contour ${k} has no visible curls`);
   for(let i=0;i<turns.length;i++){
    const gap=((turns[(i+1)%turns.length]-turns[i]+c.length)%c.length)/c.length*c[0].perimeter;
    longest=Math.max(longest,gap);
    assert.ok(gap<.15,`${digit} contour ${k} has an uncurled run of ${gap} glyph heights`);
   }
  }
 }
 console.log({longestLatePhaseUncurledRun:longest});
});


test('seeded density and time offsets preserve forward phase in the rendered paths',()=>{
 for(const [digit,raw] of Object.entries(glyphs))for(const contour of prepareGlyph(raw).prepared){
  for(let time=0;time<=20;time+=.5)for(const offset of [0,3,5])for(let i=0;i<contour.length-1;i++){
   const p=contour[i],q=contour[i+1];
   if(q.coilS<p.coilS)continue; // A new corner-anchored span begins at zero.
   assert.ok(pointPhase(q,time,offset)>pointPhase(p,time,offset),`${digit}: seeded phase reversed at ${i}/${time}/${offset}`);
  }
 }
});

test('organic paths are deterministic but do not repeat the mirrored loops of digit eight',()=>{
 const glyph=prepareGlyph(glyphs['8']),again=prepareGlyph(glyphs['8']);let error=0,energy=0;
 for(let k=0;k<glyph.prepared.length;k++){
  const c=glyph.prepared[k],path=coilContour(c,k,7.9,1),repeat=coilContour(again.prepared[k],k,7.9,1);
  for(let i=0;i<c.length;i+=43){
   const p=c[i],out=path[i];
   assert.deepEqual(out,repeat[i],'same seed/time changed');
   const mirrored=c.reduce((best,q)=>(q.x+p.x)**2+(q.y-p.y)**2<(best.x+p.x)**2+(best.y-p.y)**2?q:best,c[0]);
   const other=path[c.indexOf(mirrored)],dx=out[0]-p.x,dy=out[1]-p.y;
   error+=(dx+other[0]-mirrored.x)**2+(dy-other[1]+mirrored.y)**2;
   energy+=dx*dx+dy*dy;
  }
 }
 const mismatch=Math.sqrt(error/energy);
 assert.ok(mismatch>.75,`mirrored curls are too similar: ${mismatch}`);
 console.log({mirrorDisplacementMismatch:mismatch});
});


test('curl onset preserves the exact clean boundary without a smoothing snap',()=>{
 let jump=0;
 for(const glyph of Object.values(glyphs).map(prepareGlyph))for(let k=0;k<glyph.prepared.length;k++){
  const c=glyph.prepared[k],start=coilContour(c,k,0,0),next=coilContour(c,k,0,1e-10);
  for(let i=0;i<c.length;i++){
   assert.ok(Math.hypot(start[i][0]-c[i].x,start[i][1]-c[i].y)<1e-12);
   jump=Math.max(jump,Math.hypot(next[i][0]-start[i][0],next[i][1]-start[i][1]));
  }
 }
 assert.ok(jump<1e-8,`curl onset jump ${jump}`);
});

test('reused runtime buffers match independent rendered geometry',()=>{
 const c=prepareGlyph(glyphs['8']).prepared[0],buffer=createCoilBuffer(c),samePoints=buffer.points;
 for(const time of [0,.2,.9,7.9,19.6]){
  const amplitude=envelope(time%1),expected=coilContour(c,0,time,amplitude,5);
  const actual=coilContour(c,0,time,amplitude,5,buffer);
  assert.equal(actual,samePoints);
  for(let i=0;i<c.length;i+=17)assert.deepEqual(actual[i],expected[i]);
 }
});

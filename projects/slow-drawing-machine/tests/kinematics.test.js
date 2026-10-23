import test from 'node:test';import assert from 'node:assert/strict';
import {clockSteps,penAt,armsFor,solveArm,PRESETS,toSVG,STEP,MAX_POINTS,DEFAULT_SPEED,MAX_SPEED,placedPenAt,clampPen,penBounds} from '../src/kinematics.js';
test('all presets stay reachable and preserve both arm lengths on portrait and desktop',()=>{
 for(const[w,h]of[[320,568],[390,844],[1280,720],[1920,1080],[2000,600]])for(const preset of Object.values(PRESETS))for(let i=0;i<MAX_POINTS;i+=17){const p=penAt(i*STEP,preset,w,h),a=armsFor(p,w,h);assert.ok(p.x>0&&p.x<w&&p.y>0&&p.y<h);for(const c of a.chains){assert.ok(Math.abs(Math.hypot(c.elbow.x-c.base.x,c.elbow.y-c.base.y)-a.l1)<1e-7);assert.ok(Math.abs(Math.hypot(c.elbow.x-a.tip.x,c.elbow.y-a.tip.y)-a.l2)<1e-7);}}
});
test('out-of-reach positions fail rather than stretching or clamping the linkage',()=>{assert.throws(()=>solveArm({x:0,y:0},{x:10,y:0},2,2,1),RangeError);assert.throws(()=>solveArm({x:0,y:0},{x:0,y:0},2,2,1),RangeError);});
test('export keeps exact recorded strokes, colours and breaks without closing the curve',()=>{const svg=toSVG([{color:'#345f9d',points:[{x:1,y:2},{x:4.125,y:9.5}]},{color:'#a24232',points:[{x:10,y:20},{x:14,y:29}]}],390,844);assert.match(svg,/viewBox="0 0 390 844"/);assert.match(svg,/M1.000 2.000 L4.125 9.500/);assert.match(svg,/M10.000 20.000 L14.000 29.000/);assert.equal((svg.match(/<path/g)||[]).length,2);assert.ok(!svg.includes(' Z'));assert.match(svg,/stroke="#a24232"/);});
test('canonical samples are independent of frame rate when accumulated with a fixed step',()=>{function sample(hz){let accumulator=0,index=0;const out=[];for(let i=0;i<hz*6;i++){const batch=clockSteps(accumulator,1/hz);accumulator=batch.remainder;for(let j=0;j<batch.steps;j++){index++;out.push(penAt(index*STEP,PRESETS.bloom,1000,700));}}return out;}assert.deepEqual(sample(30),sample(60));assert.deepEqual(sample(60),sample(120));});
test('uniformly fitted drawings remain reachable after landscape and portrait resize',()=>{
 for(const[fromW,fromH,toW,toH]of[[1920,1080,390,844],[390,844,1920,1080],[2000,600,320,568]]){
  const scale=Math.min(toW/fromW,toH/fromH),ox=(toW-fromW*scale)/2,oy=(toH-fromH*scale)/2;
  for(const preset of Object.values(PRESETS))for(let i=0;i<MAX_POINTS;i+=31){const p=penAt(i*STEP,preset,fromW,fromH);assert.doesNotThrow(()=>armsFor({x:p.x*scale+ox,y:p.y*scale+oy},toW,toH));}
 }
});
test('sample cap never appends beyond remaining capacity, even at maximum speed',()=>{
 for(const remaining of [0,1,17,95,MAX_POINTS]){const b=clockSteps(.004,.05,MAX_SPEED,remaining);assert.ok(b.steps<=remaining);assert.ok(b.steps<=96);assert.ok(b.remainder>=0);}
});

test('quarter pace by default and tenfold pace retains every canonical sample',()=>{
 assert.equal(DEFAULT_SPEED,.25);assert.equal(MAX_SPEED,10);
 assert.equal(clockSteps(0,1/30,DEFAULT_SPEED).steps,1);
 assert.equal(clockSteps(0,.05,MAX_SPEED).steps,60);
});
test('relocated drawing starts exactly at the dropped pen and remains reachable across the canvas',()=>{
 for(const[w,h]of[[320,568],[390,844],[1280,800],[2000,600]]){
 const b=penBounds(w,h);
 for(const raw of [{x:0,y:0},{x:w,y:h},{x:0,y:h},{x:w,y:0},{x:w/2,y:h/2}]){
 const target=clampPen(raw,w,h),placement={...target,t:3.25};
 const start=placedPenAt(3.25,PRESETS.bloom,w,h,placement);
 assert.ok(Math.hypot(start.x-target.x,start.y-target.y)<1e-8);
 for(let t=3.25;t<200;t+=.31){const p=placedPenAt(t,PRESETS.bloom,w,h,placement);assert.ok(p.x>=b.left&&p.x<=b.right&&p.y>=b.top&&p.y<=b.bottom);assert.doesNotThrow(()=>armsFor(p,w,h));}
 }
 }
});

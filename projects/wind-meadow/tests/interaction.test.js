import test from 'node:test';
import assert from 'node:assert/strict';
import { BendField,BEND_FIELD_SIZE,BEND_FIELD_BOUNDS } from '../src/interaction.js';
const max=data=>data.reduce((m,v)=>Math.max(m,Math.abs(v)),0);
const run=(field,seconds,rate=60)=>{for(let i=0;i<Math.round(seconds*rate);i++)field.update(1/rate);};
function sample(field,x,z){
 const b=BEND_FIELD_BOUNDS,n=BEND_FIELD_SIZE;
 const col=Math.round((x-b.minX)/(b.maxX-b.minX)*(n-1)),row=Math.round((z-b.minZ)/(b.maxZ-b.minZ)*(n-1));
 return [field.data[(row*n+col)*4],field.data[(row*n+col)*4+1]];
}
test('press attacks gradually and release recovers without an initial jump',()=>{
 const f=new BendField();f.begin({x:0,z:0});assert.equal(max(f.data),0);
 assert.equal(f.update(1/60),true);const first=max(f.data);assert.ok(first>0&&first<.08);
 run(f,.4);const held=max(f.data);assert.ok(held>.4);
 const before=[...f.data];f.end();assert.deepEqual([...f.data],before);
 run(f,4);assert.ok(max(f.data)<held*.02);
});
test('stationary hold persists while hovering is inert',()=>{
 const f=new BendField();assert.equal(f.add({x:0,z:0}),false);assert.equal(f.update(1/60),false);
 f.begin({x:0,z:0});run(f,2);const a=max(f.data);run(f,2);assert.ok(Math.abs(max(f.data)-a)<.01);
});
test('stroke parts both sides and reversing it preserves outward separation',()=>{
 const f=new BendField();f.begin({x:-2,z:0});f.add({x:2,z:0});f.end();run(f,.15);
 assert.ok(sample(f,0,.4)[1]>.3);assert.ok(sample(f,0,-.4)[1]<-.3);
 f.begin({x:2,z:0});f.add({x:-2,z:0});f.end();run(f,.15);
 assert.ok(sample(f,0,.4)[1]>.3);assert.ok(sample(f,0,-.4)[1]<-.3);
});
test('repeated event bursts do not stack force or reset visible positions',()=>{
 const a=new BendField(),b=new BendField();
 for(const f of [a,b]){f.begin({x:-3,z:0});f.add({x:3,z:0});f.end();run(f,.15);}
 const before=[...b.data];
 for(let i=0;i<200;i++){b.begin({x:-3,z:0});b.add({x:3,z:0});b.end();}
 assert.deepEqual([...b.data],before);run(a,.15);run(b,.15);assert.ok(max(b.data)<2.1);
 assert.ok(max(b.data)<max(a.data)*1.35);
});
test('curved and long input has bounded storage and retains early path coverage',()=>{
 const f=new BendField();f.begin({x:-10,z:-5});
 for(let i=1;i<=300;i++)f.add({x:-10+i/15,z:-5+Math.sin(i/30)});
 f.end();assert.equal(f.data.length,128*128*4);run(f,.15);
 assert.ok(Math.hypot(...sample(f,-8,-4))>.05);
 assert.ok([...f.data].every(Number.isFinite));assert.ok(max(f.data)<2.1);
});
test('30, 60 and 120 Hz updates give equivalent responses',()=>{
 const fields=[30,60,120].map(rate=>{const f=new BendField();f.begin({x:0,z:0});run(f,.5,rate);f.end();run(f,.5,rate);return f;});
 for(const f of fields.slice(1)){let difference=0;for(let i=0;i<f.data.length;i++)difference=Math.max(difference,Math.abs(f.data[i]-fields[0].data[i]));assert.ok(difference<.0001);}
});
test('clear uploads zero once; invalid input and long frames remain safe',()=>{
 const f=new BendField();assert.equal(f.begin({x:NaN,z:0}),false);f.begin({x:0,z:0});f.update(10);
 assert.ok([...f.data].every(Number.isFinite));assert.equal(f.add({x:Infinity,z:0}),false);
 f.clear();assert.equal(max(f.data),0);assert.equal(f.update(1/60),true);assert.equal(f.update(1/60),false);
});

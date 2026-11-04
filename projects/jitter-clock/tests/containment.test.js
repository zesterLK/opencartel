import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareGlyph,coilContour,insideGlyph} from '../src/coil-geometry.js';
import {envelope} from '../src/clock-math.js';
const glyphs=JSON.parse(readFileSync(new URL('../src/contours.json',import.meta.url)));
test('all late-phase glyph coils remain outside the ink without masking',()=>{
 let minimum=1;
 for(const digit of '0123456789'){
  const glyph=prepareGlyph(glyphs[digit]);
  for(const cycle of [0,10])for(const phase of [.6,.85,.99]){
   const elapsed=cycle+(Number(digit)+9)%10+phase;
   let total=0,outside=0;
   for(let k=0;k<glyph.prepared.length;k++){
    const contour=coilContour(glyph.prepared[k],k,elapsed,envelope(phase));
    for(let i=0;i<contour.length;i+=5){
     const p=contour[i];
     const q=contour[(i+1)%contour.length];
     for(const t of [0,.25,.5,.75]){const x=p[0]+(q[0]-p[0])*t,y=p[1]+(q[1]-p[1])*t;outside+=!insideGlyph(glyph.contours,x,y);total++;}
    }
   }
   const ratio=outside/total;
   minimum=Math.min(minimum,ratio);
   assert.ok(ratio>=.95,`${digit}/${phase} containment ${ratio}`);
  }
 }
 console.log({minimumExteriorRatio:minimum});
});

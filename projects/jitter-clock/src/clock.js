import glyphs from './contours.json';
import {countAt,timeDigits,envelope} from './clock-math.js';
import {prepareGlyph,coilContour,createCoilBuffer} from './coil-geometry.js';
export function mountClock(canvas,{caption=true}={}){
 const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Canvas drawing is unavailable.');
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');let width=1,height=1,elapsed=0,last=0,frame=0,paused=false,speed=1,mode='count',dead=false,label='';
 ctx.lineJoin='round';ctx.lineCap='round';
 const prepared=Object.fromEntries(Object.entries(glyphs).map(([digit,g])=>{const prepared=prepareGlyph(g);return [digit,{...prepared,buffers:prepared.prepared.map(createCoilBuffer)}];}));
 let frozenDate=new Date();
 function resize(){width=innerWidth;height=innerHeight;const dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);canvas.style.width=width+'px';canvas.style.height=height+'px';ctx.setTransform(dpr,0,0,dpr,0,0);draw();}
 function draw(){
  ctx.fillStyle='#101010';ctx.fillRect(0,0,width,height);
  ctx.strokeStyle='#252525';ctx.lineWidth=.65;ctx.beginPath();ctx.moveTo(width/2,86);ctx.lineTo(width/2,height-78);ctx.moveTo(Math.max(24,(width-height)/2),height/2);ctx.lineTo(Math.min(width-24,(width+height)/2),height/2);ctx.stroke();
  const date=paused?frozenDate:new Date(),digits=mode==='time'?timeDigits(date):countAt(elapsed);const phase=mode==='time'?date.getMilliseconds()/1000:elapsed%1;
  const amp=reduced.matches?0:envelope(phase);const size=mode==='time'?Math.min(150,(width-64)/6.8,height*.32):Math.min(520,width*.6,height*.49);
  const spacing=size*.96,pairGap=mode==='time'?size*.4:0,total=spacing*(digits.length-1)+pairGap*2;ctx.strokeStyle='#deded8';ctx.lineWidth=mode==='time'?1:1.3;
  for(let d=0;d<digits.length;d++){
   const glyph=prepared[digits[d]],cx=width/2-total/2+d*spacing+Math.floor(d/2)*pairGap,cy=height/2;
   ctx.save();ctx.translate(cx,cy);ctx.scale(size,size);
   // Continuous geometry follows the actual boundary; no clipping can sever the line.
   ctx.lineWidth=(mode==='time'?1:1.3)/size;
   for(let k=0;k<glyph.prepared.length;k++){
    const contour=coilContour(glyph.prepared[k],k,elapsed,amp,d,glyph.buffers[k]);ctx.beginPath();
    for(let i=0;i<=contour.length;i++){
     const point=contour[i%contour.length];
     if(i===0)ctx.moveTo(point[0],point[1]);else ctx.lineTo(point[0],point[1]);
    }ctx.closePath();ctx.stroke();
   }
   ctx.restore();
  }
  if(mode==='time'){
   ctx.fillStyle='#deded8';
   for(const after of [1,3]){
    const x=width/2-total/2+(after+.5)*spacing+(after===1?.5:1.5)*pairGap;
    for(const y of [height/2-size*.17,height/2+size*.17]){ctx.beginPath();ctx.arc(x,y,Math.max(1.1,size*.012),0,Math.PI*2);ctx.fill();}
   }
  }
  ctx.fillStyle='#62625d';ctx.font='10px monospace';ctx.textAlign='left';if(caption)ctx.fillText(mode==='time'?'LOCAL TIME / '+digits.match(/../g).join(':'):'STUDY '+digits+' / CONTOUR IN MOTION',Math.max(24,(width-height)/2),height-92);
  const next=mode==='time'?'Local time '+digits.match(/../g).join(':'):'Count '+digits;if(next!==label){canvas.setAttribute('aria-label',next);label=next;}
 }
 function tick(now){frame=0;if(dead||document.hidden||paused)return;const dt=last?Math.min((now-last)/1000,.05):0;last=now;elapsed+=dt*speed*.5;draw();frame=requestAnimationFrame(tick);}
 function start(){last=0;if(!frame&&!paused&&!document.hidden&&!dead)frame=requestAnimationFrame(tick);}
 function visibility(){cancelAnimationFrame(frame);frame=0;start();}
 window.addEventListener('resize',resize);document.addEventListener('visibilitychange',visibility);reduced.addEventListener('change',draw);resize();start();
 return {draw(seconds){elapsed=Math.max(0,seconds);draw();},setPaused(value){paused=value;frozenDate=new Date();cancelAnimationFrame(frame);frame=0;if(paused)draw();else start();},setSpeed(value){speed=value;},setMode(value){mode=value;draw();},reset(){elapsed=0;frozenDate=new Date();draw();},destroy(){dead=true;cancelAnimationFrame(frame);window.removeEventListener('resize',resize);document.removeEventListener('visibilitychange',visibility);reduced.removeEventListener('change',draw);}};
}

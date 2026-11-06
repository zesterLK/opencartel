import {createStrokePlayback} from './stroke-playback.js';
import glyphs from './contours.json';
import {countAt,timeDigits,envelope} from './clock-math.js';
import {prepareGlyph,coilContour,createCoilBuffer} from './coil-geometry.js';
export function mountClock(canvas,{worker=null}={}){
 const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Canvas drawing is unavailable.');
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');let width=1,height=1,elapsed=0,last=0,frame=0,paused=false,speed=1,mode='count',dead=false,label='';
 ctx.lineJoin='round';ctx.lineCap='round';
 const prepared = new Map();
 let playback = worker && createStrokePlayback(worker, glyphs, () => {
  if (!dead && paused) draw();
 }, () => {
  playback?.destroy();
  playback = null;
  if (!dead) draw();
 });
 function syncContours(digit) {
  if (!prepared.has(digit)) prepared.set(digit, prepareGlyph(glyphs[digit]).prepared);
  return prepared.get(digit);
 }
 // Each visible position owns its deformation cache, even when several digits match.
 const slots = Array(6);
 function buffersFor(slot, contours) {
  if (slots[slot]?.contours !== contours) {
   slots[slot] = {contours, buffers: contours.map(createCoilBuffer)};
  }
  return slots[slot].buffers;
 }
 let frozenDate=new Date();
 function resize(){width=innerWidth;height=innerHeight;const dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);canvas.style.width=width+'px';canvas.style.height=height+'px';ctx.setTransform(dpr,0,0,dpr,0,0);ctx.lineJoin='round';ctx.lineCap='round';draw();}
 function draw(){
  ctx.fillStyle='#101010';ctx.fillRect(0,0,width,height);
  ctx.strokeStyle='#252525';ctx.lineWidth=.65;ctx.beginPath();ctx.moveTo(width/2,86);ctx.lineTo(width/2,height-78);ctx.moveTo(Math.max(24,(width-height)/2),height/2);ctx.lineTo(Math.min(width-24,(width+height)/2),height/2);ctx.stroke();
  const isTime = mode === 'time';
  const date = paused ? frozenDate : new Date();
  const digits = isTime ? timeDigits(date) : countAt(elapsed);
  // Time-mode seeds and digit transitions must share a clock, including after Pause.
  const motionTime = isTime ? date.getSeconds() + date.getMilliseconds() / 1000 : elapsed;
  const amp = reduced.matches ? 0 : envelope(motionTime % 1);
  const size = isTime ? Math.min(150, (width - 28) / 11.6, height * .32)
                      : Math.min(520, width * .51, height * .42);
  const spacing = size * 1.75, pairGap = isTime ? size * .45 : 0;
  const total = spacing * (digits.length - 1) + pairGap * 2;
  ctx.strokeStyle='#deded8';ctx.lineWidth=isTime ? 1 : 1.3;
  if (playback && !reduced.matches) {
   const nextDate = isTime ? new Date(date.getTime() + 1000) : null;
   const nextTime = isTime ? nextDate.getSeconds() : Math.floor(elapsed) + 1;
   playback.schedule(digits, motionTime, isTime ? timeDigits(nextDate) : countAt(nextTime), nextTime);
  }
  for(let d=0;d<digits.length;d++){
   const digit = digits[d];
   const paths = playback && amp > 0 ? playback.contours(digit, motionTime, d, amp) : null;
   const contours = playback || !amp ? glyphs[digit].contours : syncContours(digit);
   const buffers = playback || !amp ? null : buffersFor(d, contours);
   const cx=width/2-total/2+d*spacing+Math.floor(d/2)*pairGap,cy=height/2;
   ctx.save();ctx.translate(cx,cy);ctx.scale(size,size);
   // Continuous geometry follows the actual boundary; no clipping can sever the line.
   ctx.lineWidth=(mode==='time'?1:1.3)/size;
   for(let k=0;k<contours.length;k++){
    const contour = paths ? paths[k].points : buffers
      ? coilContour(contours[k], k, motionTime, amp, d, buffers[k]) : contours[k];
    ctx.beginPath();
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
  const next=mode==='time'?'Local time '+digits.match(/../g).join(':'):'Count '+digits;if(next!==label){canvas.setAttribute('aria-label',next);label=next;}
 }
 function tick(now){frame=0;if(dead||document.hidden||paused)return;const dt=last?Math.min((now-last)/1000,.05):0;last=now;elapsed+=dt*speed*.5;draw();frame=requestAnimationFrame(tick);}
 function start(){last=0;if(!frame&&!paused&&!document.hidden&&!dead)frame=requestAnimationFrame(tick);}
 function visibility(){cancelAnimationFrame(frame);frame=0;start();}
 window.addEventListener('resize',resize);document.addEventListener('visibilitychange',visibility);reduced.addEventListener('change',draw);resize();start();
 return {draw(seconds){
   elapsed = Math.max(0,seconds);
   const live = playback;
   playback = null;
   try { draw(); } finally { playback = live; }
  },setPaused(value){paused=value;frozenDate=new Date();cancelAnimationFrame(frame);frame=0;if(paused)draw();else start();},setSpeed(value){speed=value;},setMode(value){mode=value;draw();},reset(){elapsed=0;frozenDate=new Date();draw();},destroy(){dead=true;playback?.destroy();cancelAnimationFrame(frame);window.removeEventListener('resize',resize);document.removeEventListener('visibilitychange',visibility);reduced.removeEventListener('change',draw);}};
}

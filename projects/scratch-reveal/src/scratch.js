/** Normalized segment coverage grid; independent of device pixel density. */
export class Coverage {
  constructor(columns=100,rows=24){this.columns=columns;this.rows=rows;this.cells=new Uint8Array(columns*rows);this.count=0;}
  clear(){this.cells.fill(0);this.count=0;}
  stroke(a,b,radius,width,height){
    const dx=b.x-a.x,dy=b.y-a.y,den=dx*dx+dy*dy;
    for(let y=0;y<this.rows;y++)for(let x=0;x<this.columns;x++){
      const i=y*this.columns+x;if(this.cells[i])continue;
      const px=(x+.5)/this.columns*width,py=(y+.5)/this.rows*height;
      const t=den?Math.max(0,Math.min(1,((px-a.x)*dx+(py-a.y)*dy)/den)):0;
      if(Math.hypot(px-a.x-t*dx,py-a.y-t*dy)<=radius){this.cells[i]=1;this.count++;}
    }
    return this.count/this.cells.length;
  }
}
/** Mount on a container containing a canvas and the content beneath it. */
export function mountScratch(container,{threshold=.57,brushSize=27,onReveal=()=>{},onProgress=()=>{}}={}){
  const canvas=container.querySelector('canvas'); if(!canvas)throw new Error('Scratch requires a canvas.');
  const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Canvas 2D is unavailable.');
  const abort=new AbortController(),{signal}=abort,coverage=new Coverage();
  let width=1,height=1,revealed=false,pointer=null,last=null,strokes=[],destroyed=false;
  // A repeatable abrasive stamp: dense centre, flecks of foil, irregular edges.
  const grain=document.createElement('canvas');grain.width=grain.height=96;
  const grainContext=grain.getContext('2d'),pixels=grainContext.createImageData(96,96);
  const noise=(x,y=0)=>{const n=Math.sin(x*127.1+y*311.7)*43758.5453;return n-Math.floor(n);};
  for(let y=0;y<96;y++)for(let x=0;x<96;x++){
    const dx=(x-48)/46,dy=(y-48)/46,angle=Math.atan2(dy,dx);
    const edge=1+.12*Math.sin(angle*13)+.06*Math.sin(angle*23);
    const distance=Math.hypot(dx,dy)/edge,grit=noise(x,y);
    const strength=Math.max(0,Math.min(1,(1-distance)*13));
    pixels.data[(y*96+x)*4+3]=Math.round(255*strength*(noise(y,17)>.74?.035:1)*(grit>.87?.18:.72+grit*.28));
  }
  grainContext.putImageData(pixels,0,0);
  function erase(a,b,r,seed=0){
    const dx=b.x-a.x,dy=b.y-a.y,distance=Math.hypot(dx,dy),angle=Math.atan2(dy,dx);
    const steps=Math.max(1,Math.ceil(distance/Math.max(1,r*.72)));
    ctx.save();ctx.globalCompositeOperation='destination-out';
    for(let i=0;i<=steps;i++){
      const t=i/steps;ctx.save();ctx.translate(a.x+dx*t,a.y+dy*t);
      ctx.rotate(angle);
      ctx.drawImage(grain,-r,-r,r*2,r*2);ctx.restore();
    }
    // Thin abrasion grooves extend beyond the broad rubbed patch.
    ctx.lineCap='round';
    for(let i=0;i<7;i++){
      const side=(i%2?1:-1),offset=side*r*(.78+noise(seed,i)*.28);
      const nx=-Math.sin(angle)*offset,ny=Math.cos(angle)*offset;
      ctx.lineWidth=.35+noise(i,seed)*.8;ctx.globalAlpha=.35+noise(seed+9,i)*.55;
      ctx.beginPath();ctx.moveTo(a.x+nx,a.y+ny);ctx.lineTo(b.x+nx,b.y+ny);ctx.stroke();
    }
    ctx.restore();
  }
  function paint(){
    const bounds=container.getBoundingClientRect();width=Math.max(bounds.width,1);height=Math.max(bounds.height,1);const dpr=Math.min(devicePixelRatio||1,2);
    canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);
    const foil=ctx.createLinearGradient(0,0,width,height);[[0,'#b3b4b7'],[.14,'#eceef0'],[.36,'#c7c9cd'],[.55,'#f1f1ee'],[.72,'#c0c3c8'],[1,'#e5e5e6']].forEach(([p,c])=>foil.addColorStop(p,c));ctx.fillStyle=foil;ctx.fillRect(0,0,width,height);
    for(let y=0;y<height;y+=.75){ctx.fillStyle=`rgba(${y%3?'255,255,255':'75,80,90'},${.025+(Math.sin(y*73.1)+1)*.035})`;ctx.fillRect(0,y,width,.35);}
    for(let i=0;i<Math.round(width*height*.2);i++){const x=noise(i,1)*width,y=noise(i,2)*height;ctx.fillStyle=i%2?'#ffffff35':'#58606a22';ctx.fillRect(x,y,.35+noise(i,3),.35+noise(i,4));}
    ctx.font=`${Math.max(12,Math.min(14,width/27))}px Arial`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#65666a';ctx.fillText('Scratch here',width/2,height/2);
    coverage.clear();for(const s of strokes){const a={x:s.a.x*width,y:s.a.y*height},b={x:s.b.x*width,y:s.b.y*height};erase(a,b,s.r*width,s.seed);coverage.stroke(a,b,s.r*width*.82,width,height);}
  }
  function reveal(){if(revealed||destroyed)return;revealed=true;pointer=null;canvas.classList.add('revealed');container.dataset.revealed='true';onReveal();}
  function point(e){const r=canvas.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top};}
  function stroke(a,b){const r=brushSize/2,seed=strokes.length;erase(a,b,r,seed);strokes.push({seed,a:{x:a.x/width,y:a.y/height},b:{x:b.x/width,y:b.y/height},r:r/width});const progress=coverage.stroke(a,b,r*.82,width,height);onProgress(progress);if(progress>=threshold)reveal();}
  canvas.addEventListener('pointerdown',e=>{if(revealed||e.button!==0)return;pointer=e.pointerId;canvas.setPointerCapture(pointer);last=point(e);stroke(last,last);},{signal});
  canvas.addEventListener('pointermove',e=>{if(e.pointerId!==pointer||revealed)return;const events=e.getCoalescedEvents?.();for(const event of events?.length?events:[e]){const next=point(event);stroke(last,next);last=next;}},{signal});
  for(const type of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(type,()=>{pointer=null;last=null;},{signal});
  const observer=new ResizeObserver(paint);observer.observe(container);paint();
  return {reveal,reset(){if(destroyed)return;revealed=false;pointer=null;last=null;strokes=[];coverage.clear();canvas.classList.remove('revealed');delete container.dataset.revealed;paint();onProgress(0);},setBrush(size){brushSize=Math.max(6,Math.min(100,Number(size)||27));},get revealed(){return revealed;},destroy(){destroyed=true;abort.abort();observer.disconnect();strokes=[];}};
}

import {STEP,MAX_POINTS,DEFAULT_SPEED,MAX_SPEED,clockSteps,PRESETS,penAt,placedPenAt,clampPen,armsFor,toSVG} from './kinematics.js';
export function mountMachine(ink,mechanism,{onStatus=()=>{},onFinish=()=>{},onPenChange=()=>{}}={}) {
  const ctx=ink.getContext('2d'), rig=mechanism.getContext('2d');
  if(!ctx||!rig) throw new Error('Canvas 2D unavailable');
  let width=innerWidth,height=innerHeight,worldWidth=width,worldHeight=height,dpr=1;
  let scale=1,ox=0,oy=0,settings={...PRESETS.bloom},color='#345f9d',speed=DEFAULT_SPEED,show=true;
  let time=0,stepIndex=0,accumulator=0,last=performance.now(),raf=0,paused=false,hidden=document.hidden,disposed=false,total=0;
  let transit=null,placement=null,lifted=false,liftStart=null,liftTransit=null;let strokes=[],active,pen=penAt(0,settings,worldWidth,worldHeight);
  const map=p=>({x:p.x*scale+ox,y:p.y*scale+oy});
  const pathAt=t=>placedPenAt(t,settings,worldWidth,worldHeight,placement);
  function appendStroke(point){active={color,width:.65,points:[{...point}]};strokes.push(active);total++;}
  function newStroke(){const from=pen;time=0;stepIndex=0;accumulator=0;if(placement)placement={...pen,t:0};const to=pathAt(0);transit=strokes.length?{from,to,elapsed:0}:null;appendStroke(to);if(!transit)pen=to;paintRig();}
  function beginMove(){if(!show||disposed||total>=MAX_POINTS)return false;if(lifted)return true;liftStart={...pen};liftTransit=transit;lifted=true;transit=null;cancelAnimationFrame(raf);raf=0;paintRig();onStatus('Place the pen anywhere. Release to draw.');return true;}
  function moveTo(x,y){if(!lifted)return;const screen=clampPen({x,y},width,height);pen={x:(screen.x-ox)/scale,y:(screen.y-oy)/scale};paintRig();}
  function endMove(cancel=false){if(!lifted)return;lifted=false;if(cancel){pen=liftStart;transit=liftTransit;}else{if(worldWidth!==width||worldHeight!==height){for(const stroke of strokes){stroke.points=stroke.points.map(map);stroke.width=(stroke.width??.65)*scale;}pen=map(pen);worldWidth=width;worldHeight=height;scale=1;ox=0;oy=0;replay();}placement={...pen,t:time};appendStroke(pen);accumulator=0;}liftStart=null;liftTransit=null;paintRig();loop();onStatus(paused?'Pen placed. Release when ready.':'Let it wander.');}
  function inkStyle(stroke){ctx.strokeStyle=stroke.color;ctx.lineWidth=(stroke.width??.65)*scale;ctx.lineCap='round';ctx.lineJoin='round';}
  function replay(){ctx.clearRect(0,0,width,height);for(const stroke of strokes){if(stroke.points.length<2)continue;inkStyle(stroke);ctx.beginPath();stroke.points.forEach((p,i)=>{const q=map(p);i?ctx.lineTo(q.x,q.y):ctx.moveTo(q.x,q.y);});ctx.stroke();}}
  function resize(){const rect=ink.getBoundingClientRect();width=Math.max(1,rect.width);height=Math.max(1,rect.height);dpr=Math.min(devicePixelRatio||1,2,Math.sqrt(3000000/(width*height)));for(const c of [ink,mechanism]){c.width=Math.round(width*dpr);c.height=Math.round(height*dpr);}ctx.setTransform(dpr,0,0,dpr,0,0);rig.setTransform(dpr,0,0,dpr,0,0);scale=Math.min(width/worldWidth,height/worldHeight);ox=(width-worldWidth*scale)/2;oy=(height-worldHeight*scale)/2;replay();paintRig();}
  function bar(a,b,thickness) {
    const dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy);
    rig.save();rig.translate(a.x,a.y);rig.rotate(Math.atan2(dy,dx));
    rig.shadowColor='#1b292630';rig.shadowBlur=8;rig.shadowOffsetY=5;
    const grad=rig.createLinearGradient(0,-thickness/2,0,thickness/2);grad.addColorStop(0,'#65716e');grad.addColorStop(.12,'#424e4c');grad.addColorStop(.82,'#424e4c');grad.addColorStop(1,'#192322');rig.fillStyle=grad;
    rig.beginPath();rig.roundRect(-thickness/2,-thickness/2,len+thickness,thickness,thickness*.3);rig.fill();
    rig.shadowColor='transparent';rig.strokeStyle='#d2dad435';rig.lineWidth=.6;rig.beginPath();rig.moveTo(0,-thickness*.35);rig.lineTo(len,-thickness*.35);rig.stroke();rig.restore();
  }
  function pivot(p,r){rig.save();rig.translate(p.x,p.y);rig.shadowColor='#1d241c40';rig.shadowBlur=3;rig.shadowOffsetY=2;rig.fillStyle='#202b29';rig.beginPath();rig.arc(0,1,r+2,0,Math.PI*2);rig.fill();rig.shadowColor='transparent';const g=rig.createRadialGradient(-r*.3,-r*.4,0,0,0,r);g.addColorStop(0,'#ecdaa7');g.addColorStop(.65,'#b99a58');g.addColorStop(1,'#765e32');rig.fillStyle=g;rig.beginPath();rig.arc(0,0,r,0,Math.PI*2);rig.fill();rig.strokeStyle='#65532b';rig.lineWidth=1;rig.beginPath();rig.moveTo(-r*.35,-r*.05);rig.lineTo(r*.35,r*.05);rig.stroke();rig.restore();}
  function paintRig(){rig.clearRect(0,0,width,height);if(!pen)return;const target=map(pen);onPenChange({...target,lifted,visible:show});if(!show)return;const a=armsFor(target,width,height);const thickness=Math.max(6,Math.min(13,Math.min(width,height)*.017));
    for(const chain of a.chains){bar(chain.base,chain.elbow,thickness);bar(chain.elbow,a.tip,thickness);pivot(chain.elbow,thickness*.6);pivot(chain.base,thickness*.75);}pivot(a.tip,thickness*.78);
    // The nib ends at the very same mapped sample used by the ink canvas.
    rig.save();rig.translate(target.x,target.y-(transit||lifted?8:0));rig.shadowColor='#1b272744';rig.shadowBlur=7;rig.shadowOffsetX=3;rig.shadowOffsetY=4;
    const barrel=rig.createLinearGradient(-9,0,9,0);barrel.addColorStop(0,'#111b1c');barrel.addColorStop(.35,'#596362');barrel.addColorStop(.6,'#293432');barrel.addColorStop(1,'#121a1b');rig.fillStyle=barrel;rig.beginPath();rig.roundRect(-8,-49,16,33,4);rig.fill();rig.shadowColor='transparent';rig.fillStyle='#b59a61';rig.fillRect(-8,-20,16,5);rig.fillStyle='#233a4d';rig.beginPath();rig.moveTo(-4,-15);rig.lineTo(4,-15);rig.lineTo(0,0);rig.closePath();rig.fill();rig.restore();
  }
  function advance(dt){if(transit){transit.elapsed+=dt;const a=Math.min(1,transit.elapsed/.45),e=a*a*(3-2*a);pen={x:transit.from.x+(transit.to.x-transit.from.x)*e,y:transit.from.y+(transit.to.y-transit.from.y)*e};if(a===1){pen=transit.to;transit=null;}paintRig();return;}const batch=clockSteps(accumulator,dt,speed,MAX_POINTS-total);accumulator=batch.remainder;const before=active.points.length;const previous=pen;
    for(let i=0;i<batch.steps;i++){stepIndex++;time=stepIndex*STEP;pen=pathAt(time);active.points.push(pen);total++;}
    if(active.points.length>before){inkStyle(active);ctx.beginPath();const p=map(previous);ctx.moveTo(p.x,p.y);for(let i=before;i<active.points.length;i++){const q=map(active.points[i]);ctx.lineTo(q.x,q.y);}ctx.stroke();}
    if(total>=MAX_POINTS){paused=true;onStatus('Drawing complete. Save it, or clear to begin again.');onFinish();}
    paintRig();
  }
  function tick(now){raf=0;if(paused||hidden||disposed||lifted)return;const dt=Math.min(.05,Math.max(0,(now-last)/1000));last=now;advance(dt);if(!paused)raf=requestAnimationFrame(tick);}
  function loop(){cancelAnimationFrame(raf);raf=0;last=performance.now();if(!paused&&!hidden&&!disposed&&!lifted)raf=requestAnimationFrame(tick);}
  function visibility(){hidden=document.hidden;loop();}document.addEventListener('visibilitychange',visibility);
  newStroke();resize();const ro=new ResizeObserver(resize);ro.observe(ink);loop();
  return {
    setPaused(value){const next=Boolean(value)||total>=MAX_POINTS;if(next!==paused&&total<MAX_POINTS&&!lifted)onStatus(next?'Paused. Pick up the pen, or release to draw.':'Let it wander.');paused=next;loop();},
    setSpeed(value){speed=Math.max(.25,Math.min(MAX_SPEED,Number(value)||DEFAULT_SPEED));},
    beginMove, moveTo, endMove,
    penPosition(){return map(pen);},
    setSettings(next){if(lifted)endMove(true);settings={...settings,...next};if(total<MAX_POINTS)newStroke();},
    setColor(value){if(!/^#[0-9a-f]{6}$/i.test(value))return;if(lifted)endMove(true);color=value;if(total<MAX_POINTS){appendStroke(transit?.to||pen);paintRig();}},
    setVisible(value){if(lifted)endMove(true);show=Boolean(value);paintRig();},
    clear(preset){if(preset&&PRESETS[preset])settings={...PRESETS[preset]};lifted=false;liftStart=null;transit=null;placement=null;worldWidth=width;worldHeight=height;strokes=[];total=0;newStroke();resize();onStatus('Let it wander.');},
    svg(){return toSVG(strokes,worldWidth,worldHeight);},
    destroy(){disposed=true;cancelAnimationFrame(raf);ro.disconnect();document.removeEventListener('visibilitychange',visibility);},
  };
}

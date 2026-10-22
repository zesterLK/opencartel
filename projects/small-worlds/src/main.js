import './style.css';
import './ui.css';
import './cursor.css';
import './motion.css';
import './markdown-panel.css';
import { createRenderer } from './renderer.js';
import { mountCursor } from './cursor.js';
import { mountPageMotion, openDialog, closeDialog } from './motion.js';
import { mountMarkdownPanel } from './markdown-panel.js';
import { plateDefinitions, portraitDefinitions } from './plates.js';
const $=s=>document.querySelector(s);
const canvas=$('#world'), abort=new AbortController(), {signal}=abort;
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let images=new Map(), portrait=false;
let renderer, depth=0, target=0, playing=false, raf=0, last=0, generation=0;
const pointers=new Map(); let gesture;
const announce=text=>{$('#announcement').textContent=text;};
function setPlay(value){if(!value&&playing)target=depth;playing=value&&!reduced.matches&&!!renderer;$('#play').textContent=playing?'Pause':'Play';$('#play').setAttribute('aria-pressed',String(playing));requestFrame();}
function move(amount){setPlay(false);target=Math.max(0,target+amount);if(reduced.matches)depth=target;requestFrame();}
function reset(){setPlay(false);depth=target=0;requestFrame();announce('Back at the studio window.');}
function requestFrame(){if(!raf)raf=requestAnimationFrame(frame);}
function frame(now){raf=0;const dt=Math.min((now-last)/1000||0,.05);last=now;if(!renderer)return;if(playing&&!document.hidden&&!document.querySelector('dialog[open]'))target+=dt*.07;const gap=target-depth;depth=reduced.matches?target:depth+gap*(1-Math.exp(-dt*10));if(Math.abs(gap)<.00001)depth=target;renderer.render(depth);canvas.dataset.depth=depth.toFixed(6);if(!document.hidden&&(playing||Math.abs(target-depth)>.00001))requestFrame();}
function configureRenderer(){
  portrait=(innerWidth/innerHeight<.8&&images.has('studio-portrait.png'))||!images.has('studio.png');
  const definitions=portrait?portraitDefinitions:plateDefinitions;
  renderer?.destroy();
  renderer=createRenderer(canvas,definitions.map(d=>{const image=images.get(d.file);return {...d,image,width:image.naturalWidth,height:image.naturalHeight};}),{intro:true});
}
async function start(){
  const id=++generation;setPlay(false);renderer?.destroy();renderer=null;
  $('#loading').hidden=false;$('#fallback').hidden=true;
  try{
    const files=[...new Set([...plateDefinitions,...portraitDefinitions].map(d=>d.file))];
    const loaded=await Promise.allSettled(files.map(async file=>{const image=new Image();image.src=`${import.meta.env.BASE_URL}art/${file}`;await image.decode();return [file,image];}));
    if(id!==generation)return;
    images=new Map(loaded.filter(r=>r.status==='fulfilled').map(r=>r.value));if(!images.has('city.png')||(!images.has('studio.png')&&!images.has('studio-portrait.png')))throw new Error('Required artwork could not load.');configureRenderer();resize();$('#loading').hidden=true;reset();
  }catch(error){if(id!==generation)return;$('#loading').hidden=true;$('#fallback').hidden=false;console.error('Small Worlds could not start:',error);}
}
function resize(){if(renderer){const nextPortrait=(innerWidth/innerHeight<.8&&images.has('studio-portrait.png'))||!images.has('studio.png');if(portrait!==nextPortrait)configureRenderer();renderer.resize();}requestFrame();}
window.addEventListener('resize',resize,{signal});
canvas.addEventListener('wheel',e=>{e.preventDefault();const pixels=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?innerHeight:1);move(Math.max(-.35,Math.min(.35,pixels*.0008)));},{passive:false,signal});
function metrics(){const a=[...pointers.values()];return a.length>1?{y:(a[0].y+a[1].y)/2,d:Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y)}:{y:a[0]?.y,d:0};}
canvas.addEventListener('pointerdown',e=>{setPlay(false);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});gesture=metrics();canvas.setPointerCapture(e.pointerId);canvas.focus({preventScroll:true});},{signal});
canvas.addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId))return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});const next=metrics();if(gesture){if(next.d&&gesture.d)move(Math.log(next.d/gesture.d)*.65);else move((gesture.y-next.y)/innerHeight*.9);}gesture=next;},{signal});
function release(e){pointers.delete(e.pointerId);gesture=pointers.size?metrics():null;}
for(const type of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(type,release,{signal});
canvas.addEventListener('keydown',e=>{if(['ArrowUp','ArrowRight','+','='].includes(e.key)){e.preventDefault();move(.09);}else if(['ArrowDown','ArrowLeft','-','_'].includes(e.key)){e.preventDefault();move(-.09);}else if(e.code==='Space'){e.preventDefault();setPlay(!playing);}else if(e.key==='Home'){e.preventDefault();reset();}},{signal});
document.addEventListener('keydown',e=>{if(e.key==='Escape')setPlay(false);},{signal});
$('#in').addEventListener('click',()=>move(.18),{signal});$('#out').addEventListener('click',()=>move(-.18),{signal});$('#play').addEventListener('click',()=>setPlay(!playing),{signal});$('#reset').addEventListener('click',reset,{signal});$('#retry').addEventListener('click',start,{signal});
function syncMotion(){if(reduced.matches){setPlay(false);depth=target;}$('#play').disabled=reduced.matches;$('#play').title=reduced.matches?'Automatic travel is disabled with reduced motion':'Start or pause automatic travel';requestFrame();}
reduced.addEventListener('change',syncMotion,{signal});document.addEventListener('visibilitychange',()=>{last=performance.now();if(!document.hidden)requestFrame();},{signal});
const guide=mountMarkdownPanel($('#guide-panel'),{url:`${import.meta.env.BASE_URL}integrate.md`,filename:'INTEGRATE.md',validate:t=>t.startsWith('# Integrate Small Worlds')});
const notices=mountMarkdownPanel($('#notices-panel'),{url:`${import.meta.env.BASE_URL}licenses/THIRD-PARTY-NOTICES.txt`,filename:'THIRD-PARTY-NOTICES.txt'});
for(const name of ['info','guide']){const dialog=$(`#${name}-dialog`),button=$(`#${name}-button`);button.addEventListener('click',()=>{setPlay(false);openDialog(dialog);if(name==='guide')void guide.load();},{signal});$(`#close-${name}`).addEventListener('click',()=>closeDialog(dialog),{signal});dialog.addEventListener('cancel',e=>{e.preventDefault();closeDialog(dialog);},{signal});dialog.addEventListener('close',()=>button.focus(),{signal});}
$('#third-party-notices').addEventListener('toggle',e=>{if(e.target.open)void notices.load();},{signal});
const composed=import.meta.env.VITE_OPENCARTEL_COMPOSED==='1';$('#source-download').href=composed?'/downloads/small-worlds.zip':`${import.meta.env.BASE_URL}small-worlds-source.zip`;if(composed){$('#origin-link').hidden=false;$('#origin-link').href='/';}
const disposeCursor=mountCursor(),disposeMotion=mountPageMotion();syncMotion();void start();
if(import.meta.hot)import.meta.hot.dispose(()=>{generation++;abort.abort();cancelAnimationFrame(raf);renderer?.destroy();guide.dispose();notices.dispose();disposeCursor();disposeMotion();});

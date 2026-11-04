import './style.css';import './ui.css';import './cursor.css';import './motion.css';import './markdown-panel.css';
import {createGradientRenderer} from './gradient.js';import {mountCursor} from './cursor.js';import {mountPageMotion,openDialog,closeDialog} from './motion.js';import {mountMarkdownPanel} from './markdown-panel.js';
const $=s=>document.querySelector(s), abort=new AbortController(),{signal}=abort;
let renderer;try { renderer=createGradientRenderer($('#gradient')); } catch(error){$('#fallback').hidden=false;console.error(error);}
const media=matchMedia('(prefers-reduced-motion: reduce)');let paused=media.matches,phase='sequence',speed=1,elapsed=media.matches?3:0,previous=0,raf=0,disposed=false;
const preview=new URLSearchParams(location.search).has('preview');if(preview)document.body.classList.add('preview');
function sync(){ $('#pause').textContent=paused?'Play':'Pause';$('#pause').setAttribute('aria-pressed',String(paused)); }
function render(){renderer?.draw(elapsed,{phase});}
function tick(now){if(disposed)return;if(!paused&&!document.hidden){if(previous)elapsed+=Math.min((now-previous)/1000,.1)*speed;render();}previous=now;raf=requestAnimationFrame(tick);}
$('#pause').addEventListener('click',()=>{paused=!paused;previous=0;sync();},{signal});
$('#phase').addEventListener('change',e=>{phase=e.target.value;elapsed=phase==='sequence'?0:3;render();},{signal});
$('#speed').addEventListener('click',()=>{speed=speed===.5?1:speed===1?2:.5;$('#speed').textContent=`${speed}×`;$('#speed').setAttribute('aria-label',`Playback speed: ${speed} times`);},{signal});
$('#reset').addEventListener('click',()=>{elapsed=0;previous=0;render();},{signal});
media.addEventListener('change',()=>{paused=media.matches;sync();render();},{signal});document.addEventListener('visibilitychange',()=>{previous=0;},{signal});window.addEventListener('resize',render,{signal});sync();render();raf=requestAnimationFrame(tick);
const guide=mountMarkdownPanel($('#guide-panel'),{url:`${import.meta.env.BASE_URL}integrate.md`,filename:'INTEGRATE.md',validate:t=>t.startsWith('# Integrate Gradient Motion')});
const notices=mountMarkdownPanel($('#notices-panel'),{url:`${import.meta.env.BASE_URL}licenses/THIRD-PARTY-NOTICES.txt`,filename:'THIRD-PARTY-NOTICES.txt',validate:t=>t.startsWith('Gradient Motion')});
for(const name of ['info','guide']){const dialog=$(`#${name}-dialog`),trigger=$(`#${name}-button`);trigger.addEventListener('click',()=>{openDialog(dialog);if(name==='guide')guide.load();},{signal});$(`#close-${name}`).addEventListener('click',()=>closeDialog(dialog),{signal});dialog.addEventListener('cancel',e=>{e.preventDefault();closeDialog(dialog)},{signal});dialog.addEventListener('close',()=>trigger.focus(),{signal});dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeDialog(dialog);}},{signal});}
$('#third-party-notices').addEventListener('toggle',e=>{if(e.target.open)notices.load()},{signal});
const composed=import.meta.env.VITE_OPENCARTEL_COMPOSED==='1';$('#source-download').href=composed?'/downloads/gradient-motion.zip':`${import.meta.env.BASE_URL}gradient-motion-source.zip`;if(composed){$('#origin-link').hidden=false;$('#origin-link').href='/';}
const cursor=mountCursor(),motion=mountPageMotion();function dispose(){abort.abort();disposed=true;cancelAnimationFrame(raf);renderer?.destroy();guide.dispose();notices.dispose();cursor();motion();}if(import.meta.hot)import.meta.hot.dispose(dispose);

import './style.css';import './ui.css';import './cursor.css';import './motion.css';import './markdown-panel.css';
import {mountClock} from './clock.js';import {mountCursor} from './cursor.js';import {mountPageMotion,openDialog,closeDialog} from './motion.js';import {mountMarkdownPanel} from './markdown-panel.js';
const $=s=>document.querySelector(s),abort=new AbortController(),{signal}=abort;
if(new URLSearchParams(location.search).has('preview'))document.body.classList.add('preview');
const preview = document.body.classList.contains('preview');
let worker;
if (!preview && typeof Worker === 'function') {
  try { worker = new Worker(new URL('./stroke-worker.js', import.meta.url), {type: 'module'}); }
  catch { /* Embedded hosts may restrict workers; use synchronous playback there. */ }
}
let clock;try{clock=mountClock($('#clock'),{worker});$('#load-status').hidden=true;}catch{$('#load-status').textContent='This browser could not draw the clock. Try reloading.';}
let paused=false,speedIndex=1;const speeds=[.5,1,2];
const previewTime=new URLSearchParams(location.search).get('t');if(document.body.classList.contains('preview')&&previewTime!==null&&Number.isFinite(Number(previewTime))){clock?.setPaused(true);clock?.draw(Number(previewTime));paused=true;}
function pause(){paused=!paused;clock?.setPaused(paused);$('#pause').textContent=paused?'Play':'Pause';$('#pause').setAttribute('aria-pressed',String(paused));}
$('#pause').addEventListener('click',pause,{signal});$('#reset').addEventListener('click',()=>clock?.reset(),{signal});$('#mode').addEventListener('change',e=>{clock?.setMode(e.target.value);$('#speed').disabled=e.target.value==='time';},{signal});$('#speed').addEventListener('click',()=>{speedIndex=(speedIndex+1)%speeds.length;clock?.setSpeed(speeds[speedIndex]);$('#speed').textContent=speeds[speedIndex]+'×';},{signal});
window.addEventListener('keydown',e=>{if(e.target.closest('button,input,select,textarea,dialog')||e.metaKey||e.ctrlKey||e.altKey)return;if(e.code==='Space'){e.preventDefault();pause();}if(e.key.toLowerCase()==='r')clock?.reset();},{signal});
const guide=mountMarkdownPanel($('#guide-panel'),{url:`${import.meta.env.BASE_URL}integrate.md`,filename:'INTEGRATE.md',validate:t=>t.startsWith('# Integrate Jitter Clock')});
const notices=mountMarkdownPanel($('#notices-panel'),{url:`${import.meta.env.BASE_URL}licenses/THIRD-PARTY-NOTICES.txt`,filename:'THIRD-PARTY-NOTICES.txt'});
for(const kind of ['info','guide']){const dialog=$(`#${kind}-dialog`),button=$(`#${kind}-button`);button.addEventListener('click',()=>{openDialog(dialog);if(kind==='guide')void guide.load();},{signal});$(`#close-${kind}`).addEventListener('click',()=>closeDialog(dialog),{signal});dialog.addEventListener('cancel',e=>{e.preventDefault();closeDialog(dialog);},{signal});dialog.addEventListener('close',()=>button.focus(),{signal});}
$('#third-party-notices').addEventListener('toggle',e=>{if(e.target.open)void notices.load();},{signal});
const composed=import.meta.env.VITE_OPENCARTEL_COMPOSED==='1';$('#source-download').href=composed?'/downloads/jitter-clock.zip':`${import.meta.env.BASE_URL}jitter-clock-source.zip`;if(composed){$('#origin-link').href='/';$('#origin-link').hidden=false;}
const cursor=mountCursor(),motion=mountPageMotion();if(import.meta.hot)import.meta.hot.dispose(()=>{abort.abort();clock?.destroy();guide.dispose();notices.dispose();cursor();motion();});

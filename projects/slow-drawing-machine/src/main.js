import './style.css';import './ui.css';import './cursor.css';import './motion.css';import './markdown-panel.css';
import {mountMachine} from './machine.js';import {PRESETS} from './kinematics.js';
import {mountCursor} from './cursor.js';import {mountPageMotion,openDialog,closeDialog} from './motion.js';import {mountMarkdownPanel} from './markdown-panel.js';
const $=s=>document.querySelector(s),abort=new AbortController(),{signal}=abort;
const reduced=matchMedia('(prefers-reduced-motion: reduce)');let paused=reduced.matches,finished=false,machine,url;
const penHandle=$('#pen-handle');let pointerId=null,pointerOffset={x:0,y:0},keyboardLift=false;
function penChanged(p){penHandle.style.left=`${p.x}px`;penHandle.style.top=`${p.y}px`;penHandle.hidden=!p.visible;penHandle.setAttribute('aria-pressed',String(p.lifted));}
function announce(s){$('#announcement').textContent=s;}
function sync(){ $('#pause').textContent=finished?'Finished':paused?'Release':'Pause';$('#pause').disabled=finished;$('#pause').setAttribute('aria-pressed',String(paused));machine?.setPaused(paused||document.hidden);}
try {machine=mountMachine($('#ink'),$('#mechanism'),{onPenChange:penChanged,onStatus:s=>{$('#drawing-status').textContent=s;},onFinish:()=>{finished=true;paused=true;sync();announce('Drawing complete. Save SVG or clear to begin again.');}});}catch(e){console.error(e);$('#fallback').hidden=false;for(const element of document.querySelectorAll('.material-controls button,.material-controls input,.material-controls select'))element.disabled=true;}
function pointerPoint(e){const r=$('#ink').getBoundingClientRect();return {x:e.clientX-r.left,y:e.clientY-r.top};}
penHandle.addEventListener('pointerdown',e=>{if(pointerId!==null||e.isPrimary===false||e.button!==0||!machine?.beginMove())return;e.preventDefault();keyboardLift=false;pointerId=e.pointerId;const p=pointerPoint(e),pen=machine.penPosition();pointerOffset={x:pen.x-p.x,y:pen.y-p.y};penHandle.setPointerCapture(pointerId);},{signal});
penHandle.addEventListener('pointermove',e=>{if(e.pointerId!==pointerId)return;const p=pointerPoint(e);machine.moveTo(p.x+pointerOffset.x,p.y+pointerOffset.y);},{signal});
function releasePen(e,cancel=false){if(e.pointerId!==pointerId)return;const id=pointerId;pointerId=null;machine?.endMove(cancel);if(penHandle.hasPointerCapture(id))penHandle.releasePointerCapture(id);}
penHandle.addEventListener('pointerup',e=>releasePen(e),{signal});
penHandle.addEventListener('pointercancel',e=>releasePen(e,true),{signal});
penHandle.addEventListener('lostpointercapture',e=>releasePen(e,true),{signal});
penHandle.addEventListener('keydown',e=>{
 if(!machine||pointerId!==null)return;
 if(e.key==='Enter'||e.key===' '){e.preventDefault();if(keyboardLift){machine.endMove();keyboardLift=false;}else keyboardLift=machine.beginMove();}
 else if(e.key==='Escape'&&keyboardLift){e.preventDefault();machine.endMove(true);keyboardLift=false;}
 else if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();const held=keyboardLift;if(!held&&!machine.beginMove())return;const p=machine.penPosition(),step=e.shiftKey?40:10;machine.moveTo(p.x+(e.key==='ArrowLeft'?-step:e.key==='ArrowRight'?step:0),p.y+(e.key==='ArrowUp'?-step:e.key==='ArrowDown'?step:0));if(!held)machine.endMove();}
},{signal});
penHandle.addEventListener('blur',()=>{if(keyboardLift){machine?.endMove();keyboardLift=false;}},{signal});
function showSettings(s){$('#frequency-x').value=s.fx;$('#frequency-y').value=s.fy;$('#decay').value=s.decay*1000;for(const id of ['frequency-x','frequency-y'])$('#'+id+'-value').textContent=$('#'+id).value;$('#decay-value').textContent=`${(s.decay*100).toFixed(2)}%`;}
showSettings(PRESETS.bloom);sync();
$('#pattern').addEventListener('change',()=>{const key=$('#pattern').value;showSettings(PRESETS[key]);machine?.clear(key);finished=false;sync();announce('New '+key+' drawing.');},{signal});
for(const id of ['frequency-x','frequency-y','decay']){$('#'+id).addEventListener('input',()=>{const value=Number($('#'+id).value);$('#'+id+'-value').textContent=id==='decay'?`${(value/10).toFixed(2)}%`:String(value);},{signal});$('#'+id).addEventListener('change',()=>{machine?.setSettings({fx:Number($('#frequency-x').value),fy:Number($('#frequency-y').value),decay:Number($('#decay').value)/1000});announce('Rhythm changed. The pen begins a new stroke.');},{signal});}
$('#speed').addEventListener('input',()=>{const value=Number($('#speed').value)/100;$('#speed-value').textContent=`${value}×`;machine?.setSpeed(value);},{signal});
$('#ink-color').addEventListener('change',()=>machine?.setColor($('#ink-color').value),{signal});
$('#show-machine').addEventListener('change',()=>machine?.setVisible($('#show-machine').checked),{signal});
$('#pause').addEventListener('click',()=>{paused=!paused;sync();},{signal});
$('#clear').addEventListener('click',()=>{machine?.clear();finished=false;sync();announce('Canvas cleared.');},{signal});
$('#save').addEventListener('click',()=>{if(!machine)return;if(url)URL.revokeObjectURL(url);url=URL.createObjectURL(new Blob([machine.svg()],{type:'image/svg+xml;charset=utf-8'}));const link=document.createElement('a');link.href=url;link.download='slow-drawing.svg';link.click();announce('Drawing saved as an editable SVG.');},{signal});
reduced.addEventListener('change',()=>{paused=reduced.matches;sync();},{signal});document.addEventListener('visibilitychange',sync,{signal});
const tune=$('#tune');document.addEventListener('pointerdown',e=>{if(tune.open&&!tune.contains(e.target))tune.open=false;},{signal});tune.addEventListener('keydown',e=>{if(e.key==='Escape'){tune.open=false;tune.querySelector('summary').focus();}},{signal});
const guide=mountMarkdownPanel($('#guide-panel'),{url:`${import.meta.env.BASE_URL}integrate.md`,filename:'INTEGRATE.md',validate:t=>t.startsWith('# Integrate Slow Drawing Machine')});const notices=mountMarkdownPanel($('#notices-panel'),{url:`${import.meta.env.BASE_URL}licenses/THIRD-PARTY-NOTICES.txt`,filename:'THIRD-PARTY-NOTICES.txt'});
for(const[id,button,close,load]of[['info-dialog','info-button','close-info',null],['guide-dialog','guide-button','close-guide',()=>guide.load()]]){const dialog=$('#'+id),trigger=$('#'+button);trigger.addEventListener('click',()=>{tune.open=false;openDialog(dialog);load?.();},{signal});$('#'+close).addEventListener('click',()=>closeDialog(dialog),{signal});dialog.addEventListener('cancel',e=>{e.preventDefault();closeDialog(dialog);},{signal});dialog.addEventListener('close',()=>trigger.focus({preventScroll:true}),{signal});}
$('#third-party-notices').addEventListener('toggle',e=>{if(e.target.open)notices.load();},{signal});
const composed=import.meta.env.VITE_OPENCARTEL_COMPOSED==='1';$('#source-download').href=composed?'/downloads/slow-drawing-machine.zip':`${import.meta.env.BASE_URL}slow-drawing-machine-source.zip`;if(composed){$('#origin-link').href='/';$('#origin-link').hidden=false;}
const disposeCursor=mountCursor(),disposeMotion=mountPageMotion();function dispose(){abort.abort();machine?.destroy();guide.dispose();notices.dispose();disposeCursor();disposeMotion();if(url)URL.revokeObjectURL(url);}import.meta.hot?.dispose(dispose);

if(import.meta.env.DEV&&new URLSearchParams(location.search).has('capture')){import('./record-preview.js').then(m=>{const cleanup=m.mountPreviewRecorder({canvases:()=>[document.querySelector('#ink'),document.querySelector('#mechanism')],background:'#f4f3ed',filename:'slow-drawing-machine-clean.webm'});import.meta.hot?.dispose(cleanup);});}

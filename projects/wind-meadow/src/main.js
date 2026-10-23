import './style.css';
import './ui.css';
import './cursor.css';
import './motion.css';
import './markdown-panel.css';
import { mountMeadow } from './meadow.js';
import { mountCursor } from './cursor.js';
import { mountPageMotion, openDialog, closeDialog } from './motion.js';
import { mountMarkdownPanel } from './markdown-panel.js';
const $ = s => document.querySelector(s);
const abort = new AbortController(), { signal } = abort;
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
let surface, starting = false, disposed = false, paused = reduced.matches;
const announce = text => { $('#announcement').textContent = text; };
function syncPause() {
  $('#pause').textContent = paused ? 'Play' : 'Pause';
  $('#pause').setAttribute('aria-pressed', String(paused));
  surface?.setPaused(paused || document.hidden);
}
function options() {
  $('#wind-value').textContent = `${$('#wind').value}%`;
  $('#speed-value').textContent = `${Number($('#speed').value) / 100}×`;
  surface?.setOptions({wind: Number($('#wind').value)/100, speed:Number($('#speed').value)/100, light:$('#light').value,flowers:$('#flowers').checked,quality:$('#quality').value});
}
async function start() {
  if(starting || disposed) return;
  starting=true;
  surface?.destroy(); surface=null;
  $('#loading').hidden=false; $('#fallback').hidden=true;
  const old=$('#meadow'), next=old.cloneNode(false);old.replaceWith(next);
  try {
    const mounted=await mountMeadow(next,{onProgress:(value,label)=>{$('#load-progress').value=value;$('#load-label').textContent=label;},onStatus:announce});
    if(disposed) { mounted.destroy();return; }
    surface=mounted; options();syncPause();
    next.addEventListener('keydown', e => { if(e.code==='Space'){e.preventDefault();paused=!paused;syncPause();} }, {signal});
    next.addEventListener('webglcontextlost',event=>{event.preventDefault();surface?.setPaused(true);$('#error-message').textContent='The graphics connection was lost. Try again rebuilds the meadow.';$('#fallback').hidden=false;},{signal});
    announce('The meadow is ready.');
    // Read-only diagnostics for reproducible browser performance checks.
    window.meadowDiagnostics=()=>surface?.stats();
  } catch(error) { console.error(error);$('#error-message').textContent='The meadow could not start. Try again, or enable hardware acceleration in your browser.';$('#fallback').hidden=false; }
  finally { starting=false;$('#loading').hidden=true; }
}
$('#pause').addEventListener('click',()=>{paused=!paused;syncPause();},{signal});
$('#gust').addEventListener('click',()=>{if(paused){paused=false;syncPause();}surface?.gust();announce('A gust is moving through the meadow.');},{signal});
$('#reset').addEventListener('click',()=>{$('#wind').value=70;$('#speed').value=100;$('#light').value='golden';$('#flowers').checked=true;$('#quality').value='auto';options();surface?.resetEffects();announce('Effects reset.');},{signal});
for(const id of ['wind','speed','light','flowers','quality']) $('#'+id).addEventListener('input',options,{signal});
$('#retry-button').addEventListener('click',start,{signal});
document.addEventListener('visibilitychange',syncPause,{signal});
reduced.addEventListener('change',()=>{paused=reduced.matches;syncPause();},{signal});
const effects=$('#effects');
document.addEventListener('pointerdown',e=>{if(effects.open&&!effects.contains(e.target))effects.open=false;},{signal});
effects.addEventListener('keydown',e=>{if(e.key==='Escape'){effects.open=false;effects.querySelector('summary').focus();}},{signal});
const guide=mountMarkdownPanel($('#guide-panel'),{url:`${import.meta.env.BASE_URL}integrate.md`,filename:'INTEGRATE.md',validate:t=>t.startsWith('# Integrate Wind Meadow')});
const notices=mountMarkdownPanel($('#notices-panel'),{url:`${import.meta.env.BASE_URL}licenses/THIRD-PARTY-NOTICES.txt`,filename:'THIRD-PARTY-NOTICES.txt'});
for(const [id,button,close,load] of [['info-dialog','info-button','close-info',null],['guide-dialog','guide-button','close-guide',()=>guide.load()]]){
 const dialog=$('#'+id),trigger=$('#'+button);
 trigger.addEventListener('click',()=>{effects.open=false;openDialog(dialog);load?.();},{signal});
 $('#'+close).addEventListener('click',()=>closeDialog(dialog),{signal});
 dialog.addEventListener('cancel',e=>{e.preventDefault();closeDialog(dialog);},{signal});
 dialog.addEventListener('close',()=>trigger.focus({preventScroll:true}),{signal});
}
$('#third-party-notices').addEventListener('toggle',e=>{if(e.target.open)notices.load();},{signal});
const composed=import.meta.env.VITE_OPENCARTEL_COMPOSED==='1';
$('#source-download').href=composed?'/downloads/wind-meadow.zip':`${import.meta.env.BASE_URL}wind-meadow-source.zip`;
if(composed){$('#origin-link').href='/';$('#origin-link').hidden=false;}
const disposeCursor=mountCursor(),disposeMotion=mountPageMotion();
syncPause();void start();
function dispose(){disposed=true;abort.abort();surface?.destroy();guide.dispose();notices.dispose();disposeCursor();disposeMotion();delete window.meadowDiagnostics;}
import.meta.hot?.dispose(dispose);

if(import.meta.env.DEV&&new URLSearchParams(location.search).has('capture')){import('./record-preview.js').then(m=>{const cleanup=m.mountPreviewRecorder({canvases:()=>[document.querySelector('#meadow')],background:'#30441f',filename:'wind-meadow-clean.webm'});import.meta.hot?.dispose(cleanup);});}

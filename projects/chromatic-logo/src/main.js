import './style.css';import './ui.css';import './cursor.css';import './motion.css';import './markdown-panel.css';
import {mountChromaticLogo} from './chromatic-logo.js';import {mountCursor} from './cursor.js';import {mountPageMotion,openDialog,closeDialog} from './motion.js';import {mountMarkdownPanel} from './markdown-panel.js';
const $=s=>document.querySelector(s);const abort=new AbortController();const {signal}=abort;
let effect;const ready=mountChromaticLogo($('#reveal'),{logoUrl:new URL('../public/logo.svg',import.meta.url).href,onUnavailable:()=>{$('#reveal').hidden=true;$('#fallback').hidden=false;$('#replay').disabled=true;$('#status').textContent='Graphics paused. Reload to restore the glass.';}}).then(value=>effect=value).catch(error=>{$('#reveal').hidden=true;$('#fallback').hidden=false;$('#status').textContent='Your browser cannot render glass. The logo is still here.';$('#replay').disabled=true;console.warn(error);});
$('#replay').addEventListener('click',()=>effect?.replay(),{signal});$('#speed').addEventListener('change',()=>effect?.setSpeed(Number($('#speed').value)),{signal});
const guide=mountMarkdownPanel($('#guide-panel'),{url:`${import.meta.env.BASE_URL}integrate.md`,filename:'INTEGRATE.md',validate:t=>t.startsWith('# Integrate Chromatic')});
const notices=mountMarkdownPanel($('#notices-panel'),{url:`${import.meta.env.BASE_URL}licenses/THIRD-PARTY-NOTICES.txt`,filename:'THIRD-PARTY-NOTICES.txt'});
for(const kind of ['info','guide']){const dialog=$(`#${kind}-dialog`),button=$(`#${kind}-button`);button.addEventListener('click',()=>{openDialog(dialog);if(kind==='guide')void guide.load();},{signal});$(`#close-${kind}`).addEventListener('click',()=>closeDialog(dialog),{signal});dialog.addEventListener('cancel',e=>{e.preventDefault();closeDialog(dialog);},{signal});dialog.addEventListener('close',()=>button.focus(),{signal});}
$('#third-party-notices').addEventListener('toggle',e=>{if(e.target.open)void notices.load();},{signal});
const composed=import.meta.env.VITE_OPENCARTEL_COMPOSED==='1';$('#source-download').href=composed?'/downloads/chromatic-logo.zip':`${import.meta.env.BASE_URL}chromatic-logo-source.zip`;if(composed){$('#origin-link').href='/';$('#origin-link').hidden=false;}
const cursor=mountCursor(),motion=mountPageMotion();
function destroy(){abort.abort();void ready.then(()=>effect?.destroy());guide.dispose();notices.dispose();cursor();motion();}
if(import.meta.hot)import.meta.hot.dispose(destroy);
const params=new URLSearchParams(location.search);if(params.has('preview')){document.body.classList.add('preview');void ready.then(()=>{const time=Number(params.get('time'));if(params.has('time')&&Number.isFinite(time))effect?.seek(time);});}

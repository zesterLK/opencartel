import './style.css';import './code-input.css';import './ui.css';import './cursor.css';import './motion.css';import './markdown-panel.css';
import {mountCodeInput} from './code-input.js';import {mountCursor} from './cursor.js';import {mountPageMotion,openDialog,closeDialog} from './motion.js';import {mountMarkdownPanel} from './markdown-panel.js';
const $=s=>document.querySelector(s);const abort=new AbortController();const {signal}=abort;
const timers=new Set();
const code=mountCodeInput($('#code-demo'),{onComplete:()=>new Promise(resolve=>{const mode=$('#response').value;const timer=setTimeout(()=>{timers.delete(timer);resolve(mode==='success');},850);timers.add(timer);})});
$('#reset').addEventListener('click',()=>code.reset(),{signal});
const guide=mountMarkdownPanel($('#guide-panel'),{url:`${import.meta.env.BASE_URL}integrate.md`,filename:'INTEGRATE.md',validate:t=>t.startsWith('# Integrate Morphing')});
const notices=mountMarkdownPanel($('#notices-panel'),{url:`${import.meta.env.BASE_URL}licenses/THIRD-PARTY-NOTICES.txt`,filename:'THIRD-PARTY-NOTICES.txt'});
for(const kind of ['info','guide']){const dialog=$(`#${kind}-dialog`),button=$(`#${kind}-button`);button.addEventListener('click',()=>{openDialog(dialog);if(kind==='guide')void guide.load();},{signal});$(`#close-${kind}`).addEventListener('click',()=>closeDialog(dialog),{signal});dialog.addEventListener('cancel',e=>{e.preventDefault();closeDialog(dialog);},{signal});dialog.addEventListener('close',()=>button.focus(),{signal});}
$('#third-party-notices').addEventListener('toggle',e=>{if(e.target.open)void notices.load();},{signal});
const composed=import.meta.env.VITE_OPENCARTEL_COMPOSED==='1';$('#source-download').href=composed?'/downloads/morphing-code-input.zip':`${import.meta.env.BASE_URL}morphing-code-input-source.zip`;if(composed){$('#origin-link').href='/';$('#origin-link').hidden=false;}
const cursor=mountCursor(),motion=mountPageMotion();
function destroy(){abort.abort();code.destroy();timers.forEach(clearTimeout);guide.dispose();notices.dispose();cursor();motion();}
if(import.meta.hot)import.meta.hot.dispose(destroy);

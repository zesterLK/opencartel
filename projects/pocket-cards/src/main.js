import './style.css';import './pocket-cards.css';import './ui.css';import './cursor.css';import './motion.css';import './markdown-panel.css';
import {mountPocketCards} from './pocket-cards.js';import {mountCursor} from './cursor.js';import {mountPageMotion,openDialog,closeDialog} from './motion.js';import {mountMarkdownPanel} from './markdown-panel.js';
const $=s=>document.querySelector(s), abort=new AbortController(),{signal}=abort;
const wallet=mountPocketCards($('#wallet'));
$('#reset').addEventListener('click',()=>wallet.reset(),{signal});
const guide=mountMarkdownPanel($('#guide-panel'),{url:`${import.meta.env.BASE_URL}integrate.md`,filename:'INTEGRATE.md',validate:t=>t.startsWith('# Integrate Pocket Cards')});
const notices=mountMarkdownPanel($('#notices-panel'),{url:`${import.meta.env.BASE_URL}licenses/THIRD-PARTY-NOTICES.txt`,filename:'THIRD-PARTY-NOTICES.txt',validate:t=>t.startsWith('Pocket Cards')});
for(const name of ['info','guide']){const dialog=$(`#${name}-dialog`),trigger=$(`#${name}-button`);trigger.addEventListener('click',()=>{openDialog(dialog);if(name==='guide')guide.load();},{signal});$(`#close-${name}`).addEventListener('click',()=>closeDialog(dialog),{signal});dialog.addEventListener('cancel',e=>{e.preventDefault();closeDialog(dialog)},{signal});dialog.addEventListener('close',()=>trigger.focus(),{signal});dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeDialog(dialog);}},{signal});}
$('#third-party-notices').addEventListener('toggle',e=>{if(e.target.open)notices.load()},{signal});
const composed=import.meta.env.VITE_OPENCARTEL_COMPOSED==='1';$('#source-download').href=composed?'/downloads/pocket-cards.zip':`${import.meta.env.BASE_URL}pocket-cards-source.zip`;if(composed){$('#origin-link').hidden=false;$('#origin-link').href='/';}
const cursor=mountCursor(),motion=mountPageMotion();function dispose(){abort.abort();wallet.destroy();guide.dispose();notices.dispose();cursor();motion();}if(import.meta.hot)import.meta.hot.dispose(dispose);

import './style.css';import './ui.css';import './cursor.css';import './motion.css';import './markdown-panel.css';
import {mountScratch} from './scratch.js';import {mountCursor} from './cursor.js';import {mountPageMotion,openDialog,closeDialog} from './motion.js';import {mountMarkdownPanel} from './markdown-panel.js';
const $=s=>document.querySelector(s),abort=new AbortController(),{signal}=abort;
const code='A-LITTLE-JOY';
const scratch=mountScratch($('#scratch'),{onReveal(){ $('#status').textContent=`A little joy, on us. Your code is ${code}.`;$('#reveal').hidden=true;$('#copy').hidden=false;$('.gift-code').removeAttribute('aria-hidden'); }});
$('#reveal').addEventListener('click',()=>{scratch.reveal();$('#copy').focus();},{signal});
$('#reset').addEventListener('click',()=>{scratch.reset();$('#status').textContent='Scratch the silver panel to reveal your code.';$('#reveal').hidden=false;$('#copy').hidden=true;$('.gift-code').setAttribute('aria-hidden','true');},{signal});
$('#brush').addEventListener('input',e=>scratch.setBrush(e.target.value),{signal});
$('#copy').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(code);$('#status').textContent='Code copied. A little joy awaits.';}catch{$('#status').textContent=`Copy unavailable. Your code is ${code}.`;$('.gift-code').style.userSelect='text';}},{signal});
const guide=mountMarkdownPanel($('#guide-panel'),{url:`${import.meta.env.BASE_URL}integrate.md`,filename:'INTEGRATE.md',validate:s=>s.startsWith('# Integrate Scratch Reveal')});
const notices=mountMarkdownPanel($('#notices-panel'),{url:`${import.meta.env.BASE_URL}licenses/THIRD-PARTY-NOTICES.txt`,filename:'THIRD-PARTY-NOTICES.txt'});
for(const [name,panel] of [['info',null],['guide',guide]]){const d=$(`#${name}-dialog`),trigger=$(`#${name==='info'?'info':'guide'}-button`);trigger.addEventListener('click',()=>{openDialog(d);panel?.load();},{signal});$(`#close-${name}`).addEventListener('click',()=>closeDialog(d),{signal});d.addEventListener('cancel',e=>{e.preventDefault();closeDialog(d);},{signal});d.addEventListener('close',()=>trigger.focus(),{signal});}
$('#third-party-notices').addEventListener('toggle',e=>{if(e.target.open)notices.load();},{signal});
const composed=import.meta.env.VITE_OPENCARTEL_COMPOSED==='1';$('#source-download').href=composed?'/downloads/scratch-reveal.zip':`${import.meta.env.BASE_URL}scratch-reveal-source.zip`;if(composed){$('#origin-link').hidden=false;$('#origin-link').href='/';}
const cursor=mountCursor(),motion=mountPageMotion();
if(import.meta.hot)import.meta.hot.dispose(()=>{abort.abort();scratch.destroy();guide.dispose();notices.dispose();cursor();motion();});

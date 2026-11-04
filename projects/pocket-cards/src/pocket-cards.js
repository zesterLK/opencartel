/** Mount an independent, keyboard-accessible wallet. No document-wide listeners. */
export function mountPocketCards(host, { cards = defaultCards, onSelect = () => {} } = {}) {
  if (!host || !Array.isArray(cards) || cards.length < 1 || cards.length > 5) throw new TypeError('A host and one to five cards are required.');
  const abort = new AbortController();
  const root = document.createElement('div'); root.className = 'pc-wallet';
  root.setAttribute('role', 'group'); root.setAttribute('aria-label', 'Choose a membership card');
  const back = document.createElement('div'); back.className = 'pc-pocket-back';root.append(back);
  const buttons = cards.map((card,index) => {
    const b=document.createElement('button');b.type='button';b.className='pc-card';
    b.style.setProperty('--order',index);b.style.setProperty('--count',cards.length);
    b.style.setProperty('--card-color', card.color || '#244163');
    b.setAttribute('aria-pressed','false');b.setAttribute('aria-label',`Select ${card.title}`);
    for (const [className,text] of [['pc-brand',card.brand||'OpenCartel'],['pc-kind',card.title],['pc-description',card.description],['pc-member',card.label||'MEMBERSHIP'],['pc-number',card.number||'']]) {
      const span=document.createElement('span');span.className=className;span.textContent=text||'';b.append(span);
    }
    b.addEventListener('click',()=>select(desired===index?null:index),{signal:abort.signal});
    b.addEventListener('keydown',e=>{
      if(e.key==='Escape'){e.preventDefault();select(null);}
      const next=keyboardIndex(e.key,index,cards.length);
      if(next!==null){e.preventDefault();buttons[next].focus();}
    },{signal:abort.signal});root.append(b);return b;
  });
  const pocket=document.createElement('div');pocket.className='pc-pocket';pocket.setAttribute('aria-hidden','true');
  pocket.innerHTML='<svg viewBox="0 0 460 190" preserveAspectRatio="none"><defs><linearGradient id="pocket-gradient" x1="0" y1="0" x2="0.7" y2="1"><stop stop-color="#93cdf5" stop-opacity=".8"/><stop offset="1" stop-color="#3189c6" stop-opacity=".9"/></linearGradient></defs><path d="M2 15 Q2 2 18 2 H134 C159 2 169 28 230 28 S301 2 326 2 H442 Q458 2 458 18 V144 Q458 188 413 188 H47 Q2 188 2 144Z" fill="url(#pocket-gradient)" stroke="#d8eeff" stroke-width="2"/></svg><span class="pc-pocket-title">Your collection</span><span class="pc-pocket-caption">A few good things.</span>';
  // Unique paint IDs allow multiple wallets on one page.
  const paintId=`pc-paint-${++instance}`;pocket.querySelector('linearGradient').id=paintId;pocket.querySelector('path').setAttribute('fill',`url(#${paintId})`);
  root.append(pocket);
  const status=document.createElement('p');status.className='pc-status';status.setAttribute('role','status');status.textContent='Pick a card.';
  host.append(root,status);
  let selected=null, desired=null, destroyed=false, moving=false;
  const animations=new Set(), reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const value=name=>getComputedStyle(root).getPropertyValue(name).trim();
  const rest=index=>`translateY(${(cards.length-1-index)*-parseFloat(value('--stack-step'))}px)`;
  const lifted=()=>`translateY(${value('--lift')}) rotate(-4deg) scale(.9)`;
  const presented=()=>`translateY(${value('--travel')}) rotate(-3deg)`;
  async function travel(button,transform,duration){
    if(destroyed)return;
    const animation=button.animate([{transform:getComputedStyle(button).transform},{transform}],{
      duration:reduced.matches?0:duration,easing:'cubic-bezier(.35,0,.2,1)',fill:'forwards',
    });
    animations.add(animation);
    try{await animation.finished;}catch{}finally{animations.delete(animation);}
    if(!destroyed)button.style.transform=transform;
    animation.cancel();
  }
  function announce(){
    buttons.forEach((button,i)=>{const active=i===selected;
      button.setAttribute('aria-pressed',String(active));
      button.setAttribute('aria-label',`${active?'Return':'Select'} ${cards[i].title}${active?'. '+cards[i].description:''}`);
    });
    status.textContent=selected===null?'Pick a card.':cards[selected].title+' · '+cards[selected].description;
    onSelect(selected===null?null:cards[selected],selected);
  }
  async function move(){
    if(moving||destroyed)return;
    moving=true;
    try{
      while(!destroyed&&desired!==selected){
        if(selected!==null){
          const index=selected,button=buttons[index];root.dataset.phase='returning';
          await travel(button,lifted(),280);if(destroyed)break;
          // Change layers only at the top of the travel, never inside the stack.
          button.classList.remove('is-selected');selected=null;
          await travel(button,rest(index),340);if(destroyed)break;
          button.style.removeProperty('transform');announce();
        }
        if(desired!==null&&!destroyed){
          const index=desired,button=buttons[index];root.dataset.phase='lifting';
          await travel(button,lifted(),440);if(destroyed)break;
          button.classList.add('is-selected');selected=index;root.dataset.phase='settling';
          await travel(button,presented(),320);if(destroyed)break;
          button.style.removeProperty('transform');announce();
        }
      }
    }finally{moving=false;if(!destroyed){root.dataset.phase='idle';root.classList.toggle('has-selection',selected!==null);}}
  }
  function select(index){
    if(destroyed)return;
    if(index!==null&&(!Number.isInteger(index)||index<0||index>=cards.length))throw new RangeError('Unknown card index');
    desired=index;void move();
  }
  return {select,reset:()=>select(null),get selectedIndex(){return selected;},destroy(){
    if(destroyed)return;destroyed=true;abort.abort();for(const a of animations)a.cancel();animations.clear();root.remove();status.remove();
  }};
}
let instance=0;
export function keyboardIndex(key,index,count){if(key==='Home')return 0;if(key==='End')return count-1;if(['ArrowRight','ArrowDown'].includes(key))return (index+1)%count;if(['ArrowLeft','ArrowUp'].includes(key))return (index+count-1)%count;return null;}
export const defaultCards = [
 {title:'Studio',brand:'OpenCartel',description:'A space to make something.',label:'CREATIVE PASS',number:'OC / 001',color:'#243a60'},
 {title:'Library',brand:'OpenCartel',description:'A collection worth keeping.',label:'READER PASS',number:'OC / 002',color:'#507c69'},
 {title:'Events',brand:'OpenCartel',description:'Meet a few curious people.',label:'ALL ACCESS',number:'OC / 003',color:'#727ec4'}
];

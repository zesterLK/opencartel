/** A scoped, dependency-free code input. Import code-input.css alongside this file. */
export const cleanCode = (value, length = 6) => String(value).replace(/[^0-9]/g, '').slice(0, length);
export function mountCodeInput(host, { length = 6, onComplete = async () => true, label = 'Verification code' } = {}) {
  if (!host || !Number.isInteger(length) || length < 4 || length > 8) throw new TypeError('Provide a host and a length between 4 and 8.');
  const abort = new AbortController();
  let version = 0, destroyed = false, state = 'closed';
  const root = document.createElement('div'); root.className = 'code-input'; root.dataset.state = state;
  root.innerHTML = `<div class="code-pill"><button class="code-open" type="button" aria-expanded="false">Enter code</button><div class="code-entry" hidden><div class="code-cells" aria-hidden="true">${Array.from({length},()=>'<span class="code-cell"></span>').join('')}</div><input class="code-native" type="text" inputmode="numeric" autocomplete="one-time-code" spellcheck="false"><span class="code-result" aria-hidden="true"></span></div></div><p class="code-status" role="status" aria-live="polite"></p>`;
  host.append(root);
  const input = root.querySelector('input'), trigger = root.querySelector('button'), entry = root.querySelector('.code-entry'), status = root.querySelector('.code-status'), cells = [...root.querySelectorAll('.code-cell')], result = root.querySelector('.code-result');
  input.setAttribute('aria-label',label); input.setAttribute('aria-describedby', ''); input.maxLength = length;
  root.style.setProperty('--code-count',length);
  function setState(next) { state=next; root.dataset.state=next; input.readOnly=['pending','success'].includes(next); input.setAttribute('aria-busy',String(next==='pending')); input.setAttribute('aria-invalid',String(next==='error')); }
  function paint() { const index = Math.min(input.selectionStart ?? input.value.length,length-1); cells.forEach((cell,i)=>{cell.textContent=input.value[i]||'';cell.classList.toggle('active',i===index && document.activeElement===input);}); }
  function open() { if(destroyed)return; trigger.hidden=true; trigger.setAttribute('aria-expanded','true'); entry.hidden=false; setState('entry'); status.textContent=''; input.focus(); paint(); }
  async function verify() {
    const token = ++version; setState('pending'); status.textContent='Checking code…'; result.textContent='';
    try { const accepted=await onComplete(input.value); if(destroyed||token!==version)return; setState(accepted ? 'success':'error'); result.textContent=accepted?'✓':'';status.textContent=accepted?'You’re in.':'That code didn’t work. Try again.'; if(!accepted){input.select();paint();} }
    catch { if(destroyed||token!==version)return;setState('error');status.textContent='Could not check the code. Please try again.';input.select();paint(); }
  }
  function update() { input.value=cleanCode(input.value,length); if(state==='error'){setState('entry');status.textContent='';}paint();if(input.value.length===length)void verify(); }
  function reset() { if(destroyed)return;version++;input.value='';status.textContent='';result.textContent='';setState('closed');entry.hidden=true;trigger.hidden=false;trigger.setAttribute('aria-expanded','false');paint(); }
  trigger.addEventListener('click',open,{signal:abort.signal});
  input.addEventListener('input',update,{signal:abort.signal});
  input.addEventListener('paste',event=>{event.preventDefault();if(input.readOnly)return;const value=cleanCode(event.clipboardData.getData('text'),length);if(value){input.value=value;update();}},{signal:abort.signal});
  for(const event of ['focus','blur','keyup','click','select'])input.addEventListener(event,paint,{signal:abort.signal});
  input.addEventListener('keydown',e=>{if(e.key==='Escape'){reset();trigger.focus();}},{signal:abort.signal});
  return {open,reset,get value(){return input.value;},get state(){return state;},destroy(){destroyed=true;version++;abort.abort();root.remove();}};
}

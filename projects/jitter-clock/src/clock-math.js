export function countAt(seconds){return String((Math.floor(Math.max(0,seconds))+1)%10);}
export function timeDigits(date){return [date.getHours(),date.getMinutes(),date.getSeconds()].map(n=>String(n).padStart(2,'0')).join('');}
export function envelope(phase){const x=Math.min(1,Math.max(0,phase/.86));return x*x*(3-2*x);}

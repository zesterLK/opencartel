export function countAt(seconds){return String((Math.floor(Math.max(0,seconds))+1)%10);}
export function timeDigits(date){return [date.getHours(),date.getMinutes(),date.getSeconds()].map(n=>String(n).padStart(2,'0')).join('');}
// Most of the slack appears early in each beat. The next digit starts clean.
export function envelope(phase) {
 const progress = Math.min(1, Math.max(0, phase / .52));
 return 1 - (1 - progress) ** 3.5;
}

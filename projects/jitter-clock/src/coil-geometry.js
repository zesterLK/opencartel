// Even-odd containment treats counters as outside the solid glyph.
export function insideGlyph(contours,x,y){
 let inside=false;
 for(const contour of contours)for(let i=0,j=contour.length-1;i<contour.length;j=i++){
  const a=contour[i],b=contour[j];
  if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;
 }
 return inside;
}
function periodic(values,index){return values[(index%values.length+values.length)%values.length];}
function random(seed,index){
 let h=(seed^Math.imul(index+1,0x9e3779b1))>>>0;
 h=Math.imul(h^(h>>>16),0x85ebca6b);h=Math.imul(h^(h>>>13),0xc2b2ae35);
 return ((h^(h>>>16))>>>0)/4294967296;
}
function noise(position,seed,count){
 const cell=Math.floor(position),f=position-cell,ease=f*f*f*(f*(f*6-15)+10);
 const a=random(seed,(cell%count+count)%count),b=random(seed,((cell+1)%count+count)%count);
 return a+(b-a)*ease;
}
function contourSeed(glyph,raw,index){
 let seed=(Math.round(glyph.width*1000000)^Math.imul(index+1,0x45d9f3b))>>>0;
 for(let i=0;i<raw.length;i+=Math.max(1,Math.floor(raw.length/17))){seed=Math.imul(seed^Math.round(raw[i][0]*100000),16777619);seed=Math.imul(seed^Math.round(raw[i][1]*100000),16777619);}
 return seed>>>0;
}
function resample(points,spacing=.0005){
 const lengths=[0];for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];lengths.push(lengths[i]+Math.hypot(b[0]-a[0],b[1]-a[1]));}
 const perimeter=lengths.at(-1),count=Math.max(3200,Math.ceil(perimeter/spacing)),result=[];let edge=0;
 for(let i=0;i<count;i++){const distance=i/count*perimeter;while(lengths[edge+1]<distance)edge++;const a=points[edge],b=points[(edge+1)%points.length],mix=(distance-lengths[edge])/(lengths[edge+1]-lengths[edge]||1);result.push([a[0]+(b[0]-a[0])*mix,a[1]+(b[1]-a[1])*mix]);}
 const sigma=.004/(perimeter/count),span=Math.ceil(sigma*3);
 const smooth=result.map((_,i)=>{let x=0,y=0,total=0;for(let k=-span;k<=span;k++){const weight=Math.exp(-.5*(k/sigma)**2),p=periodic(result,i+k);x+=p[0]*weight;y+=p[1]*weight;total+=weight;}return [x/total,y/total];});
 return {points:smooth,perimeter};
}
export function prepareGlyph(glyph){
 const prepared=glyph.contours.map((raw,contourIndex)=>{
  const seed=contourSeed(glyph,raw,contourIndex);
  const {points,perimeter}=resample(raw),count=points.length,step=perimeter/count,window=Math.max(3,Math.round(.008/step));
  const tangents=points.map((p,i)=>{const a=periodic(points,i-window),b=periodic(points,i+window),length=Math.hypot(b[0]-a[0],b[1]-a[1])||1;return [(b[0]-a[0])/length,(b[1]-a[1])/length];});
  // Decide the empty side ONCE per closed contour. Per-point inside tests caused normal
  // reversals at corners, which were the long triangular spikes in the old renderer.
  let votes=0;for(let i=0;i<count;i+=Math.max(1,Math.floor(count/80))){const p=points[i],t=tangents[i];votes+=insideGlyph(glyph.contours,p[0]-t[1]*.008,p[1]+t[0]*.008)?-1:1;}
  const sign=votes>=0?1:-1;
  const turns=[],cornerWindow=Math.max(3,Math.round(.015/step));
  for(let i=0;i<count;i++){
   const p=points[i],a=periodic(points,i-cornerWindow),b=periodic(points,i+cornerWindow);
   const ux=p[0]-a[0],uy=p[1]-a[1],vx=b[0]-p[0],vy=b[1]-p[1];
   const angle=Math.acos(Math.max(-1,Math.min(1,(ux*vx+uy*vy)/(Math.hypot(ux,uy)*Math.hypot(vx,vy)||1))));
   turns.push(angle);
  }
  // Collapse each curved join to one anchor. At an anchor the travelling coil
  // returns to its contour, avoiding both a long quiet zone and corner bunching.
  const candidates=[];
  for(let i=0;i<count;i++)if(turns[i]>.48)candidates.push(i);
  const groups=[];
  for(const i of candidates){const last=groups.at(-1);if(last&&i===last.at(-1)+1)last.push(i);else groups.push([i]);}
  if(groups.length>1&&groups[0][0]===0&&groups.at(-1).at(-1)===count-1)groups[0]=groups.pop().concat(groups[0]);
  const corners=groups.map(group=>group.reduce((a,b)=>turns[a]>turns[b]?a:b)).sort((a,b)=>a-b);
  const anchors=corners.length?corners:[0];
  const spans=anchors.map((anchor,i)=>{
   const next=anchors[(i+1)%anchors.length],length=((next-anchor+count)%count)||count;
   const coils=Math.max(1,Math.round(length*step/.085*(1+.2*random(seed,i+917))));
   const cumulative=[0];
   for(let j=0;j<length;j++){
    const s=(anchor+j)%count/count;
    cumulative.push(cumulative.at(-1)+.9+1.4*noise(s*31,seed+13,31));
   }
   return {anchor,length,coils,cumulative,total:cumulative.at(-1)};
  });
  const output=points.map((p,i)=>{
   const [tx,ty]=tangents[i];let span=spans.at(-1);
   for(const candidate of spans)if((i-candidate.anchor+count)%count<candidate.length){span=candidate;break;}
   const local=(i-span.anchor+count)%count,phasePosition=span.cumulative[local]/span.total;
   const distance=corners.length?Math.min(local,span.length-local)*step:perimeter;
   const x=Math.max(0,Math.min(1,distance/.025)),smooth=x*x*x*(x*(x*6-15)+10);
   const limit=.4+.6*smooth;
   return {x:p[0],y:p[1],tx,ty,nx:-ty*sign,ny:tx*sign,s:i/count,limit,cornerDistance:distance,perimeter,coilS:phasePosition,coils:span.coils,
    phaseSlope:(.9+1.4*noise(i/count*31,seed+13,31))/span.total/step,
    radiusScale:.62+.9*noise(i/count*23,seed+37,23),
    aspect:1.25+1.45*noise(i/count*29,seed+71,29),
    tilt:-.85+1.7*noise(i/count*19,seed+101,19),
    shape:-.48+.96*noise(i/count*27,seed+131,27),
    phaseBias:random(seed,177)*Math.PI*2,
    compound:Math.max(0,Math.min(1,(noise(i/count*17,seed+233,17)-.35)*2)),
    lift:.18+.2*noise(i/count*11,seed+191,11)};
  });
  return output;
 });return {...glyph,prepared};
}
export function coilPhase(s,coils,elapsed,digitOffset=0){
 const arc=s*Math.PI*2,warp=Math.min(1,coils/28);
 // Anchored whole turns stay monotonic and return to the contour at both ends.
 return arc*coils+warp*(.35*Math.sin(arc*7)*Math.cos(elapsed*.20+digitOffset)+.18*Math.sin(arc*13)*Math.cos(elapsed*.27));
}
export function pointPhase(p,elapsed,digitOffset=0){
 return coilPhase(p.coilS,p.coils,elapsed*.7+p.phaseBias,digitOffset);
}
function writeCoilPoint(p,contourIndex,elapsed,amplitude,digitOffset,output,index){
 const theta=pointPhase(p,elapsed,digitOffset);
 const breathe=1+.055*Math.sin(elapsed*.34+p.phaseBias+p.s*Math.PI*4);
 const radius=(contourIndex===0?.029:.0215)*amplitude*p.limit*p.radiusScale*breathe;
 const rise=1-Math.cos(theta),cornerPosition=Math.min(1,p.cornerDistance/.03);
 const cornerFade=cornerPosition**3*(cornerPosition*(cornerPosition*6-15)+10);
 const drift=p.lift*cornerFade*(1+.35*Math.sin(elapsed*.2+p.phaseBias));
 const stretch=Math.max(radius*p.aspect,amplitude*.24/(p.phaseSlope*p.coils*(1-.36*p.compound)));
 const along=stretch*(Math.sin(theta)+p.compound*.18*Math.sin(theta*2))+radius*p.tilt*rise;
 const outward=radius*(rise*(1.15+p.shape*.5*Math.sin(theta))+p.compound*.65*(1-Math.cos(theta*2))+drift);
 output[index]=p.x+p.tx*along+p.nx*outward;output[index+1]=p.y+p.ty*along+p.ny*outward;return output;
}


export function coilPoint(p,contourIndex,elapsed,amplitude,digitOffset=0){
 return writeCoilPoint(p,contourIndex,elapsed,amplitude,digitOffset,[],0);
}
function roundPath(input,output){
 const half=12,count=input.length/2,window=half*2+1;let x=0,y=0;
 for(let j=-half;j<=half;j++){const i=((j+count)%count)*2;x+=input[i];y+=input[i+1];}
 for(let i=0;i<count;i++){
  output[i*2]=x/window;output[i*2+1]=y/window;
  const remove=((i-half+count)%count)*2,add=((i+half+1)%count)*2;
  x+=input[add]-input[remove];y+=input[add+1]-input[remove+1];
 }
}
export function createCoilBuffer(contour){
 const length=contour.length*2,raw=new Float64Array(length),temporary=new Float64Array(length),output=new Float64Array(length),correction=new Float64Array(length);
 for(let i=0;i<contour.length;i++){raw[i*2]=contour[i].x;raw[i*2+1]=contour[i].y;}
 roundPath(raw,temporary);roundPath(temporary,output);
 for(let i=0;i<length;i++)correction[i]=raw[i]-output[i];
 return {raw,temporary,output,correction,points:Array.from({length:contour.length},(_,i)=>output.subarray(i*2,i*2+2))};
}
export function coilContour(contour,contourIndex,elapsed,amplitude,digitOffset=0,buffer=createCoilBuffer(contour)){
 const {raw,temporary,output,correction}=buffer;
 if(amplitude===0){
  for(let i=0;i<contour.length;i++){output[i*2]=contour[i].x;output[i*2+1]=contour[i].y;}
  return buffer.points;
 }
 for(let i=0;i<contour.length;i++)writeCoilPoint(contour[i],contourIndex,elapsed,amplitude,digitOffset,raw,i*2);
 // A periodic triangular kernel rounds compound hairpin tips. Subtracting the
 // precomputed base smoothing preserves the exact outline continuously at zero.
 // Runtime supplies reusable typed buffers, so this creates no per-frame arrays.
 roundPath(raw,temporary);roundPath(temporary,output);
 for(let i=0;i<output.length;i++)output[i]+=correction[i];
 return buffer.points;
}

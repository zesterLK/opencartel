import opentype from 'opentype.js';
import {writeFile} from 'node:fs/promises';
const font=opentype.loadSync('public/fonts/ArchivoBlack-Regular.ttf');
const result={};
for(const digit of '0123456789'){
 let path=font.getPath(digit,0,0,1000);
 // The reference's numeral one has a curved flag and no slab foot.
 if(digit==='1'){
  path=new opentype.Path();path.moveTo(230,-500);path.lineTo(230,500);path.lineTo(30,500);path.lineTo(30,-135);path.lineTo(-230,-135);path.lineTo(-230,-290);path.curveTo(-65,-290,35,-390,55,-485);path.quadTo(58,-500,80,-500);path.close();
 }
 const box=path.getBoundingBox(),height=box.y2-box.y1;let contours=[],points=[],last;
 const push=(x,y)=>{points.push([x,y]);last=[x,y];};
 for(const c of path.commands){
  if(c.type==='M'){if(points.length)contours.push(points);points=[];push(c.x,c.y);}
  else if(c.type==='L')push(c.x,c.y);
  else if(c.type==='Q'||c.type==='C'){
   const [x,y]=last;const n=32;
   for(let i=1;i<=n;i++){const t=i/n,u=1-t;
    if(c.type==='Q')push(u*u*x+2*u*t*c.x1+t*t*c.x,u*u*y+2*u*t*c.y1+t*t*c.y);
    else push(u*u*u*x+3*u*u*t*c.x1+3*u*t*t*c.x2+t*t*t*c.x,u*u*u*y+3*u*u*t*c.y1+3*u*t*t*c.y2+t*t*t*c.y);
   }
  }else if(c.type==='Z'){contours.push(points);points=[];}
 }
 if(points.length)contours.push(points);
 const resampled=contours.map(contour=>{
  const lengths=contour.map((p,i)=>Math.hypot(p[0]-contour[(i+1)%contour.length][0],p[1]-contour[(i+1)%contour.length][1]));
  const length=lengths.reduce((a,b)=>a+b,0),n=Math.max(160,Math.ceil(length/1.2));let edge=0,start=0;
  return Array.from({length:n},(_,i)=>{const d=length*i/n;while(start+lengths[edge]<d&&edge<lengths.length-1){start+=lengths[edge++];}const t=(d-start)/(lengths[edge]||1),a=contour[edge],b=contour[(edge+1)%contour.length];return [+( ((a[0]+(b[0]-a[0])*t)-(box.x1+box.x2)/2)/height).toFixed(5),+(((a[1]+(b[1]-a[1])*t)-(box.y1+box.y2)/2)/height).toFixed(5)];});
 });
 // Preserve the font's original closed outlines. A sampled normal offset is not
 // a valid inset at acute joins: it folds the outline back and creates cusps.
 const outlines=digit==='1'?resampled:resampled.map(c=>c.map(p=>[+(.9*p[0]).toFixed(5),p[1]]));
 result[digit]={width:(box.x2-box.x1)/height*(digit==='1'?1:.9),contours:outlines};
}
await writeFile('src/contours.json',JSON.stringify(result));console.log('Cached ten glyph contours.');

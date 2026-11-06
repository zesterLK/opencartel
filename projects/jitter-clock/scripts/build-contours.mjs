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
 // A closed four gives the strand a triangular counter to move inside.
 if (digit === '4') {
  path = new opentype.Path();
  const roundedPolygon = (vertices, radius) => {
   const towards = (point, next) => {
    const dx = next[0] - point[0], dy = next[1] - point[1];
    const t = radius / Math.hypot(dx, dy);
    return [point[0] + dx * t, point[1] + dy * t];
   };
   vertices.forEach((point, i) => {
    const previous = vertices[(i + vertices.length - 1) % vertices.length];
    const next = vertices[(i + 1) % vertices.length];
    const entry = towards(point, previous);
    if (i === 0) path.moveTo(...entry);
    else path.lineTo(...entry);
    path.quadTo(...point, ...towards(point, next));
   });
   path.close();
  };
  roundedPolygon([[55,-500],[243,-500],[243,100],[373,100],[373,265],
   [243,265],[243,500],[45,500],[45,265],[-373,265],[-373,90]], 10);
  roundedPolygon([[45,-240],[-208,100],[45,100]], 6);
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
 const custom = digit === '1' || digit === '4';
 const outlines=custom?resampled:resampled.map(c=>c.map(p=>[+(.9*p[0]).toFixed(5),p[1]]));
 // Set the counter proportions separately so the moving line has room
 // to fold inside the small bowls while the outer contour stays intact.
 for (const counter of outlines.slice(1)) {
  const xs = counter.map(p => p[0]), ys = counter.map(p => p[1]);
  const w = Math.max(...xs) - Math.min(...xs), h = Math.max(...ys) - Math.min(...ys);
  const cx = Math.min(...xs) + w / 2, cy = Math.min(...ys) + h / 2;
  const target = {0: [.31,.67], 6: [.30,.35], 8: cy < 0 ? [.285,.26] : [.33,.31], 9: [.30,.35]}[digit];
  if (!target) continue;
  for (const point of counter) {
   point[0] = +(cx + (point[0]-cx) * target[0]/w).toFixed(5);
   point[1] = +(cy + (point[1]-cy) * target[1]/h).toFixed(5);
  }
 }
 result[digit]={width:(box.x2-box.x1)/height*(custom?1:.9),contours:outlines};
}
await writeFile('src/contours.json',JSON.stringify(result));console.log('Cached ten glyph contours.');

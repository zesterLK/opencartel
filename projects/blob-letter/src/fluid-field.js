// Small collocated stable-fluid solver. Units are grid cells per nominal frame.
// Pressure projection is approximate (24 Jacobi iterations), with closed walls.
export function createFluidField(n=76){
 const count=n*n,field=()=>new Float32Array(count);
 let vx=field(),vy=field(),tx=field(),ty=field(),x=field(),y=field(),dx=field(),dy=field(),p=field(),q=field();
 const divergence=field();
 const sample=(a,u,v)=>{u=Math.max(0,Math.min(n-1.001,u));v=Math.max(0,Math.min(n-1.001,v));const i=Math.floor(u),j=Math.floor(v),f=u-i,g=v-j;return a[j*n+i]*(1-f)*(1-g)+a[j*n+i+1]*f*(1-g)+a[(j+1)*n+i]*(1-f)*g+a[(j+1)*n+i+1]*f*g;};
 function walls(){for(let i=0;i<n;i++){vx[i]=vy[i]=vx[(n-1)*n+i]=vy[(n-1)*n+i]=0;vx[i*n]=vy[i*n]=vx[i*n+n-1]=vy[i*n+n-1]=0;}}
 function project(){
  walls();p.fill(0);q.fill(0);
  for(let j=1;j<n-1;j++)for(let i=1;i<n-1;i++){const k=j*n+i;divergence[k]=.5*(vx[k+1]-vx[k-1]+vy[k+n]-vy[k-n]);}
  for(let pass=0;pass<24;pass++){
   for(let j=1;j<n-1;j++)for(let i=1;i<n-1;i++){const k=j*n+i;q[k]=(p[k-1]+p[k+1]+p[k-n]+p[k+n]-divergence[k])*.25;}
   for(let i=1;i<n-1;i++){q[i]=q[n+i];q[(n-1)*n+i]=q[(n-2)*n+i];q[i*n]=q[i*n+1];q[i*n+n-1]=q[i*n+n-2];}
   [p,q]=[q,p];
  }
  for(let j=1;j<n-1;j++)for(let i=1;i<n-1;i++){const k=j*n+i;vx[k]-=.5*(p[k+1]-p[k-1]);vy[k]-=.5*(p[k+n]-p[k-n]);}walls();
 }
 return {
  get x(){return x;},get y(){return y;},
  impulse(u,v,fx,fy){for(let j=Math.max(1,Math.floor(v-18));j<Math.min(n-1,v+18);j++)for(let i=Math.max(1,Math.floor(u-18));i<Math.min(n-1,u+18);i++){const k=j*n+i,f=Math.exp(-((i-u)**2+(j-v)**2)/38);vx[k]=Math.max(-8,Math.min(8,vx[k]+fx*f*.8));vy[k]=Math.max(-8,Math.min(8,vy[k]+fy*f*.8));}},
  step(dt){
   const damping=Math.pow(.92,dt),recovery=Math.pow(.965,dt);
   for(let j=0;j<n;j++)for(let i=0;i<n;i++){const k=j*n+i,u=i-vx[k]*dt*.35,v=j-vy[k]*dt*.35;tx[k]=sample(vx,u,v)*damping;ty[k]=sample(vy,u,v)*damping;}
   [vx,tx]=[tx,vx];[vy,ty]=[ty,vy];project();let energy=0;
   // Transport the inverse displacement independently of the velocity field.
   for(let j=0;j<n;j++)for(let i=0;i<n;i++){const k=j*n+i,u=i-vx[k]*dt*.35,v=j-vy[k]*dt*.35;dx[k]=(sample(x,u,v)+vx[k]*dt*.35)*recovery;dy[k]=(sample(y,u,v)+vy[k]*dt*.35)*recovery;energy+=Math.abs(dx[k])+Math.abs(dy[k])+Math.abs(vx[k])+Math.abs(vy[k]);}
   [x,dx]=[dx,x];[y,dy]=[dy,y];return energy;
  },
 };
}

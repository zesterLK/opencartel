// Persistent world-space bend positions. Input changes the target; the spring
// changes the visible field once per frame, never once per pointer event.
export const BEND_FIELD_SIZE=128;
export const BEND_FIELD_BOUNDS=Object.freeze({minX:-14.5,maxX:14.5,minZ:-19.5,maxZ:9.5});
const SIZE=BEND_FIELD_SIZE,COUNT=SIZE*SIZE;
const {minX,maxX,minZ,maxZ}=BEND_FIELD_BOUNDS;
const STEP=(maxX-minX)/(SIZE-1),RADIUS=1.6;
const valid=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.z)&&Math.abs(p.x)<1e6&&Math.abs(p.z)<1e6;

export class BendField {
  #velocity;#target;#strength;
  constructor(){
    this.data=new Float32Array(COUNT*4);
    this.#velocity=new Float32Array(COUNT*2);
    this.#target=new Float32Array(COUNT*2);
    this.#strength=new Float32Array(COUNT);
    this.anchor=null;this.holdStart=null;this.active=false;this.uploadPending=false;
  }
  begin(point){
    if(!valid(point))return false;
    this.anchor={...point};this.holdStart=null;
    this.deposit(point,point,true);return true;
  }
  add(point){
    if(!this.anchor||!valid(point))return false;
    const dx=point.x-this.anchor.x,dz=point.z-this.anchor.z,length=Math.hypot(dx,dz);
    if(length<.0001)return false;
    this.deposit(this.anchor,point,false);
    // Holding keeps just the hand's current location pressed, not its old trail.
    const tail=Math.min(length,.3)/length;
    this.holdStart={x:point.x-dx*tail,z:point.z-dz*tail};
    this.anchor={...point};return true;
  }
  end(){this.anchor=null;this.holdStart=null;}
  clear(){
    this.end();this.data.fill(0);this.#velocity.fill(0);this.#target.fill(0);this.#strength.fill(0);
    this.active=false;this.uploadPending=true;
  }
  deposit(a,b,press){
    const loX=Math.max(0,Math.ceil((Math.min(a.x,b.x)-RADIUS-minX)/STEP));
    const hiX=Math.min(SIZE-1,Math.floor((Math.max(a.x,b.x)+RADIUS-minX)/STEP));
    const loZ=Math.max(0,Math.ceil((Math.min(a.z,b.z)-RADIUS-minZ)/STEP));
    const hiZ=Math.min(SIZE-1,Math.floor((Math.max(a.z,b.z)+RADIUS-minZ)/STEP));
    if(loX>hiX||loZ>hiZ)return;
    const dx=b.x-a.x,dz=b.z-a.z,lengthSquared=dx*dx+dz*dz;
    const inverseLength=lengthSquared>.00000001?1/Math.sqrt(lengthSquared):0;
    for(let row=loZ;row<=hiZ;row++)for(let col=loX;col<=hiX;col++){
      const x=minX+col*STEP,z=minZ+row*STEP;
      const along=lengthSquared>.00000001?Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/lengthSquared)):0;
      const ox=x-a.x-dx*along,oz=z-a.z-dz*along,d2=ox*ox+oz*oz;
      if(d2>RADIUS*RADIUS)continue;
      const weight=Math.exp(-d2/.42),index=row*SIZE+col;
      // The closest stroke coverage wins, rather than accumulating force for
      // every event. Repeated/coalesced samples cannot pump the field higher.
      if(weight+1e-6<this.#strength[index])continue;
      const inverseDistance=1/Math.sqrt(Math.max(d2,.0025));
      const outward=press?.95:1.85,forward=press?0:.16;
      this.#target[index*2]=(ox*inverseDistance*outward+dx*inverseLength*forward)*weight;
      this.#target[index*2+1]=(oz*inverseDistance*outward+dz*inverseLength*forward)*weight;
      this.#strength[index]=weight;this.active=true;
    }
  }
  update(dt){
    const pending=this.uploadPending;this.uploadPending=false;
    if(!Number.isFinite(dt)||dt<=0||!this.active)return pending;
    const elapsed=Math.min(dt,.05),steps=Math.ceil(elapsed*120),h=elapsed/steps;
    const recovery=Math.exp(-1.35*h),omega=14,damping=Math.exp(-omega*h);
    let changed=false;
    for(let step=0;step<steps;step++){
      for(let i=0;i<COUNT;i++){
        this.#strength[i]*=recovery;
        this.#target[i*2]*=recovery;this.#target[i*2+1]*=recovery;
      }
      if(this.anchor)this.deposit(this.holdStart||this.anchor,this.anchor,!this.holdStart);
      let moving=false;
      for(let i=0;i<COUNT;i++){
        for(let axis=0;axis<2;axis++){
          const j=i*2+axis,k=i*4+axis,previous=this.data[k],target=this.#target[j],velocity=this.#velocity[j];
          const displacement=previous-target,c=velocity+omega*displacement;
          let next=target+(displacement+c*h)*damping;
          let speed=(velocity-omega*c*h)*damping;
          if(Math.abs(target)<.00002&&Math.abs(next)<.00002&&Math.abs(speed)<.00002){next=0;speed=0;this.#target[j]=0;}
          else moving=true;
          this.data[k]=next;this.#velocity[j]=speed;
          if(Math.abs(this.data[k]-previous)>1e-8)changed=true;
        }
        if(this.#target[i*2]===0&&this.#target[i*2+1]===0)this.#strength[i]=0;
      }
      this.active=moving||Boolean(this.anchor);
    }
    return pending||changed;
  }
}

// Grid nodes cover the inclusive world bounds; map them to texture pixel centres.
// The same sample is used by procedural/modelled foliage and their shadow passes.
export const dragFieldGLSL=/* glsl */`
uniform sampler2D uBendField;
vec2 dragField(vec2 p){
  vec2 normalized=(p-vec2(-14.5,-19.5))/29.0;
  if(any(lessThan(normalized,vec2(0.0)))||any(greaterThan(normalized,vec2(1.0)))) return vec2(0.0);
  vec2 fieldUv=(normalized*127.0+0.5)/128.0;
  return texture2D(uBendField,fieldUv).rg;
}
`;

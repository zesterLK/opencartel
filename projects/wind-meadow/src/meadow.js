import * as THREE from 'three';
import { BendField, BEND_FIELD_SIZE } from './interaction.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { foliageVertex, foliageFragment, depthFragment, scannedVertex } from './shaders.js';

const MAX_BLADES = 78000;
const FIELD = 29;
const PRESETS = {
  golden: { sun: [0.63, 0.33, -0.70], color: 0xffe4a0, ambient: 0xa7b99a, exposure: 1.35 },
  daylight: { sun: [0.35, 0.88, -0.22], color: 0xfff5df, ambient: 0xa3b7a1, exposure: 1.15 },
  dusk: { sun: [-0.78, 0.22, -0.38], color: 0xb2cfff, ambient: 0x899ac8, exposure: 0.92 },
};
const nextFrame = () => new Promise(resolve => requestAnimationFrame(resolve));
function random(seed = 16321) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t ^= t + Math.imul(t ^ t >>> 7, 61 | t); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

// Shared profiles have real tapered silhouettes; no alpha textures or billboards.
function profile(type) {
  const pos=[], uv=[], parts=[], index=[];
  const vertex=(x,y,z,u,v,p=0)=>{pos.push(x,y,z);uv.push(u,v);parts.push(p);return parts.length-1;};
  const quad=(a,b,c,d)=>index.push(a,b,c,b,d,c);
  if(type==='grass') {
    const segments=6;
    for(let j=0;j<=segments;j++) {
      const t=j/segments;
      const width=.026*Math.pow(1-t,.74)*(0.76+0.24*Math.sin(t*Math.PI));
      vertex(-width,t,0,0,t); vertex(0,t,width*.36,.5,t); vertex(width,t,0,1,t);
      if(j){const row=(j-1)*3,next=j*3;quad(row,row+1,next,next+1);quad(row+1,row+2,next+1,next+2);}
    }
  } else {
    // A narrow, segmented stem shares the exact curve of the flower/seed head.
    for(let j=0;j<=5;j++) {
      const t=j/5; vertex(-.003,t,0,0,t); vertex(.003,t,0,1,t);
      if(j) quad((j-1)*2,(j-1)*2+1,j*2,j*2+1);
    }
    if(type==='seed') {
      for(let j=0;j<8;j++) {
        const y=.73+j*.032;
        for(const side of [-1,1]) {
          const x=side*(.011+(1-j/9)*.02), z=(j%2?1:-1)*.008;
          const a=vertex(x,y-.017,z,0,y,1), b=vertex(x+side*.009,y+.016,z,1,y,1), c=vertex(x+side*.002,y+.045,z,0.5,y,1);
          index.push(a,b,c);
        }
      }
    } else {
      const petals=8;
      for(let j=0;j<petals;j++) {
        const a=j/petals*Math.PI*2, length=.052*(1+.12*Math.sin(j*4.2));
        const first=parts.length;
        for(let k=0;k<=5;k++) {
          const t=k/5,r=.012+t*length,w=.014*Math.pow(Math.sin(t*Math.PI),.65);
          // Shallow downward cupping gives the small daisies a real silhouette.
          const y=1.008+.010*Math.sin(t*Math.PI)-.006*t*t;
          vertex(Math.cos(a)*r-Math.sin(a)*w,y,Math.sin(a)*r+Math.cos(a)*w,0,1,2);
          vertex(Math.cos(a)*r+Math.sin(a)*w,y,Math.sin(a)*r-Math.cos(a)*w,1,1,2);
          if(k)quad(first+(k-1)*2,first+(k-1)*2+1,first+k*2,first+k*2+1);
        }
      }
      const c=vertex(0,1.017,0,.5,1,3);
      for(let j=0;j<8;j++) {
        const a=j/8*Math.PI*2,b=(j+1)/8*Math.PI*2;
        index.push(c,vertex(Math.cos(a)*.020,1.013,Math.sin(a)*.020,0,1,3),vertex(Math.cos(b)*.020,1.013,Math.sin(b)*.020,1,1,3));
      }
    }
  }
  const geometry=new THREE.InstancedBufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
  geometry.setAttribute('part',new THREE.Float32BufferAttribute(parts,1));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  geometry.boundingSphere=new THREE.Sphere(new THREE.Vector3(),FIELD);
  return geometry;
}

function populate(geometry,count,type,rng) {
  const roots=new Float32Array(count*4), habits=new Float32Array(count*4), shapes=new Float32Array(count*2);
  const tufts=[];
  let remaining=count;
  while(remaining>0) {
    // Roots share a small elongated base. Blades fan along a growth axis rather
    // than radiating evenly into circular crowns or occupying unrelated points.
    const members=Math.min(remaining,type==='grass'?6+Math.floor(rng()*7):type==='seed'?2+Math.floor(rng()*3):1+Math.floor(rng()*2));
    const z=6-Math.pow(rng(),1.22)*24;
    const x=(rng()-.5)*2*(4.5+(6-z)*.4);
    const axis=rng()*Math.PI*2, broad=type==='grass'&&rng()<.24;
    tufts.push({x,z,members,axis,broad,height:type==='grass'?(broad?.68+rng()*.44:.94+rng()*.56):1.12+rng()*.48,lean:.12+rng()*.28,phase:rng()*Math.PI*2,curl:1.25+rng()*1.55,width:.85+rng()*.3});
    remaining-=members;
  }
  let i=0;
  // Interleave growth layers across every tuft. A reduced instanceCount retains
  // the entire meadow and merely reduces each tuft's blade count.
  for(let layer=0;layer<12;layer++) for(const tuft of tufts) {
    if(layer>=tuft.members)continue;
    // Alternating fan edges keeps its spread visible in every quality level.
    const rank=layer%2===0?layer/2:tuft.members-1-(layer-1)/2;
    const fan=tuft.members>1?rank/(tuft.members-1)*2-1:0;
    const broad=type==='grass'&&(tuft.broad?rng()<.76:rng()<.015);
    const growth=tuft.axis+fan*(tuft.broad?1.15:.72)+(rng()-.5)*.34;
    const along=(rng()-.5)*.055,across=(rng()-.5)*.026;
    const rootX=tuft.x+Math.cos(tuft.axis)*along-Math.sin(tuft.axis)*across;
    const rootZ=tuft.z+Math.sin(tuft.axis)*along+Math.cos(tuft.axis)*across;
    const bladeHeight=tuft.height*(.84+rng()*.26)*(broad?.94:1);
    const bladeWidth=type==='grass'?(broad?.80+rng()*.45:.26+rng()*.34)*tuft.width:type==='flower'?.65+rng()*.7:.64+rng()*.15;
    const orientation=growth+Math.PI/2+(rng()-.5)*.7;
    roots.set([rootX,rootZ,bladeHeight,orientation],i*4);
    habits.set([growth,tuft.lean+Math.abs(fan)*.23+(rng()-.5)*.09,tuft.phase+(rng()-.5)*.32,bladeWidth],i*4);
    shapes.set(type==='grass'?[tuft.curl+(broad?.1:.45)+rng()*.55,(rng()-.5)*(broad?1.35:2.2)]:[.12+rng()*.24,(rng()-.5)*.25],i*2);
    i++;
  }
  geometry.setAttribute('root',new THREE.InstancedBufferAttribute(roots,4));
  geometry.setAttribute('habit',new THREE.InstancedBufferAttribute(habits,4));
  geometry.setAttribute('shape',new THREE.InstancedBufferAttribute(shapes,2));
  geometry.instanceCount=count;
  return geometry;
}

export async function mountMeadow(canvas,{onProgress=()=>{},onStatus=()=>{}}={}) {
  onProgress(4,'Preparing the meadow');
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.1;
  let shaderFailure=null;
  renderer.debug.onShaderError=(gl,program,vertex,fragment)=>{shaderFailure=new Error('Meadow shader could not compile: '+[gl.getShaderInfoLog(vertex),gl.getShaderInfoLog(fragment),gl.getProgramInfoLog(program)].filter(Boolean).join(' '));};
  const scene=new THREE.Scene();
  scene.background=new THREE.Color(0x172411);
  const camera=new THREE.PerspectiveCamera(43,1,.1,70);
  camera.position.set(0,3.2,4.3);camera.lookAt(0,.5,-1.5);
  const options={wind:1,speed:1,light:'golden',flowers:true,quality:'auto'};
  let time=2.5,paused=false,destroyed=false,graphicsLost=false,hidden=document.hidden,raf=0,last=performance.now(),frames=0;
  let width=1,height=1,scale=1,autoLevel=1,slowFrames=0,fastFrames=0,gustIndex=0;
  let drawCalls=0,triangles=0,renderMs=0,shadowMs=0,shadowDirty=true,frameMs=16.7,elapsedSample=0,sampleFrames=0,fps=60;
  const intervals=[],renderCosts=[];
  let bladeTexture=null;
  const scannedMeshes=[],modelResources=new Set(),scannedMaterials=[];
  const bendField=new BendField();
  // RGBA16F is linearly filterable in WebGL2; FLOAT input is converted on upload.
  // One shared field sample replaces history scans in every foliage/shadow vertex.
  const bendTexture=new THREE.DataTexture(bendField.data,BEND_FIELD_SIZE,BEND_FIELD_SIZE,THREE.RGBAFormat,THREE.FloatType);
  bendTexture.internalFormat='RGBA16F';bendTexture.minFilter=THREE.LinearFilter;bendTexture.magFilter=THREE.LinearFilter;
  bendTexture.generateMipmaps=false;bendTexture.needsUpdate=true;
  const uniforms={uTime:{value:time},uWind:{value:1},uSun:{value:new THREE.Vector3()},uSunColor:{value:new THREE.Color()},uAmbient:{value:new THREE.Color()},uExposure:{value:1},uBladeAlbedo:{value:null},uModelSurface:{value:0},uModelAlbedo:{value:null},uModelNormal:{value:null},uModelRoughness:{value:null},uModelAlpha:{value:null},uShadowMap:{value:null},uShadowMatrix:{value:new THREE.Matrix4()},uShadowTexel:{value:new THREE.Vector2(1/1536,1/1536)},uShadowEnabled:{value:1},uBendField:{value:bendTexture},uGusts:{value:Array.from({length:4},()=>new THREE.Vector4(0,0,-100,0))}};
  const material=new THREE.ShaderMaterial({vertexShader:foliageVertex,fragmentShader:foliageFragment,uniforms,side:THREE.DoubleSide});
  const depthMaterial=new THREE.ShaderMaterial({vertexShader:foliageVertex,fragmentShader:depthFragment,uniforms,side:THREE.DoubleSide});
  const shadowTarget=new THREE.WebGLRenderTarget(1536,1536,{minFilter:THREE.NearestFilter,magFilter:THREE.NearestFilter,depthBuffer:true});
  shadowTarget.depthTexture=new THREE.DepthTexture(1536,1536,THREE.UnsignedIntType);
  shadowTarget.depthTexture.minFilter=THREE.NearestFilter;shadowTarget.depthTexture.magFilter=THREE.NearestFilter;
  uniforms.uShadowMap.value=shadowTarget.depthTexture;
  const shadowCamera=new THREE.OrthographicCamera(-15,15,15,-15,.1,60);
  const shadowBias=new THREE.Matrix4().set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1);
  const rng=random();
  await nextFrame();
  const grassGeometry=populate(profile('grass'),MAX_BLADES,'grass',rng);
  const grass=new THREE.Mesh(grassGeometry,material);grass.frustumCulled=false;scene.add(grass);
  onProgress(35,'Growing curved blades');await nextFrame();
  const seedGeometry=populate(profile('seed'),1900,'seed',rng);
  const seeds=new THREE.Mesh(seedGeometry,material);seeds.frustumCulled=false;scene.add(seeds);
  const flowerGeometry=populate(profile('flower'),160,'flower',rng);
  const flowers=new THREE.Mesh(flowerGeometry,material);flowers.frustumCulled=false;scene.add(flowers);
  const groundGeometry=new THREE.PlaneGeometry(FIELD,FIELD);
  const groundMaterial=new THREE.MeshBasicMaterial({color:0x26371c});
  const ground=new THREE.Mesh(groundGeometry,groundMaterial);ground.rotation.x=-Math.PI/2;ground.position.y=-.012;ground.position.z=-5;scene.add(ground);
  onProgress(63,'Setting sunlight and wildflowers');await nextFrame();

  function lighting(name) {
    const preset=PRESETS[name]||PRESETS.golden;
    uniforms.uSun.value.set(...preset.sun).normalize();uniforms.uSunColor.value.set(preset.color);
    uniforms.uAmbient.value.set(preset.ambient);uniforms.uExposure.value=preset.exposure;
    shadowCamera.position.copy(uniforms.uSun.value).multiplyScalar(25).add(new THREE.Vector3(0,.6,-5));shadowCamera.lookAt(0,.6,-5);shadowCamera.updateMatrixWorld();
    uniforms.uShadowMatrix.value.copy(shadowBias).multiply(shadowCamera.projectionMatrix).multiply(shadowCamera.matrixWorldInverse);shadowDirty=true;
  }
  function resize() {
    const rect=canvas.getBoundingClientRect();width=Math.max(1,rect.width);height=Math.max(1,rect.height);
    camera.aspect=width/height;
    // Portrait retains blade scale and depth rather than revealing a horizon.
    camera.fov=camera.aspect>1.8?THREE.MathUtils.radToDeg(2*Math.atan(Math.tan(THREE.MathUtils.degToRad(30)/2)*1.8/camera.aspect)):30;camera.updateProjectionMatrix();
    const mode=options.quality;
    const cap=mode==='high'?2300000:mode==='low'?850000:1550000*autoLevel;
    const maxDpr=mode==='high'?1.75:mode==='low'?1.1:1.5;
    scale=Math.min(devicePixelRatio||1,maxDpr,Math.sqrt(cap/(width*height)));
    renderer.setPixelRatio(scale);renderer.setSize(width,height,false);
    uniforms.uShadowEnabled.value=mode==='low'||(mode==='auto'&&autoLevel<.8)?0:1;shadowDirty=true;
    grassGeometry.instanceCount=mode==='high'?MAX_BLADES:mode==='low'?42000:Math.round(58000*autoLevel);
    for(const mesh of scannedMeshes)mesh.geometry.instanceCount=Math.round(mesh.userData.capacity*(mode==='high'?1:mode==='low'?.55:.8*autoLevel));
  }
  function render(){
    if(destroyed||graphicsLost)return;
    const start=performance.now();drawCalls=0;triangles=0;
    // The small foliage shadow atlas is refreshed every other animation frame.
    if(uniforms.uShadowEnabled.value&&(shadowDirty||frames%2===0)) {
      const shadowStart=performance.now();
      ground.visible=false;
      grass.material=depthMaterial;seeds.material=depthMaterial;flowers.material=depthMaterial;
      for(const mesh of scannedMeshes)mesh.material=mesh.userData.depthMaterial;
      renderer.setRenderTarget(shadowTarget);renderer.clear();renderer.render(scene,shadowCamera);drawCalls+=renderer.info.render.calls;triangles+=renderer.info.render.triangles;
      renderer.setRenderTarget(null);ground.visible=true;
      grass.material=material;seeds.material=material;flowers.material=material;
      for(const mesh of scannedMeshes)mesh.material=mesh.userData.surfaceMaterial;
      shadowMs=performance.now()-shadowStart;shadowDirty=false;
    }
    renderer.render(scene,camera);drawCalls+=renderer.info.render.calls;triangles+=renderer.info.render.triangles;renderMs=performance.now()-start;renderCosts.push(renderMs);if(renderCosts.length>240)renderCosts.shift();
  }
  lighting(options.light);resize();
  function disposeGraphics(){bendTexture.dispose();bladeTexture?.dispose();for(const mesh of scannedMeshes)mesh.geometry.dispose();for(const resource of modelResources)resource.dispose();for(const m of scannedMaterials)m.dispose();[grassGeometry,seedGeometry,flowerGeometry,groundGeometry].forEach(g=>g.dispose());material.dispose();depthMaterial.dispose();shadowTarget.depthTexture.dispose();shadowTarget.dispose();groundMaterial.dispose();renderer.dispose();}
  try {
    onProgress(68,'Loading photographed blade detail');
    bladeTexture=await new THREE.TextureLoader().loadAsync(`${import.meta.env.BASE_URL}textures/grass-blade-albedo.png`);
    bladeTexture.flipY=true;
    bladeTexture.colorSpace=THREE.SRGBColorSpace;
    bladeTexture.minFilter=THREE.LinearFilter;bladeTexture.magFilter=THREE.LinearFilter;
    bladeTexture.wrapS=THREE.ClampToEdgeWrapping;bladeTexture.wrapT=THREE.ClampToEdgeWrapping;
    bladeTexture.generateMipmaps=false;bladeTexture.needsUpdate=true;
    uniforms.uBladeAlbedo.value=bladeTexture;
    onProgress(72,'Loading natural grass tufts');
    const model=await new GLTFLoader().loadAsync(`${import.meta.env.BASE_URL}models/grass-medium-01/grass_medium_01_1k.gltf`);
    const sourceMeshes=new Map();
    model.scene.traverse(object=>{
      if(!object.isMesh)return;sourceMeshes.set(object.name,object);modelResources.add(object.geometry);
      for(const m of Array.isArray(object.material)?object.material:[object.material]){modelResources.add(m);for(const value of Object.values(m))if(value?.isTexture)modelResources.add(value);}
    });
    const sourceMaterial=sourceMeshes.values().next().value.material;
    const modelAlpha=await new THREE.TextureLoader().loadAsync(`${import.meta.env.BASE_URL}models/grass-medium-01/textures/grass_medium_01_alpha_1k.png`);
    modelResources.add(modelAlpha);
    // glTF UV origin matches its original images with flipY=false. Opacity is
    // linear data and must clip identical silhouettes in colour and depth.
    modelAlpha.flipY=false;modelAlpha.colorSpace=THREE.NoColorSpace;
    modelAlpha.wrapS=sourceMaterial.map.wrapS;modelAlpha.wrapT=sourceMaterial.map.wrapT;
    modelAlpha.needsUpdate=true;
    // The original material's UVs and OpenGL normal map form a matched basis.
    const scanUniforms={...uniforms,uModelSurface:{value:1},uModelAlbedo:{value:sourceMaterial.map},uModelNormal:{value:sourceMaterial.normalMap},uModelRoughness:{value:sourceMaterial.roughnessMap},uModelAlpha:{value:modelAlpha}};
    const scanMaterial=new THREE.ShaderMaterial({vertexShader:scannedVertex,fragmentShader:foliageFragment,uniforms:scanUniforms,side:THREE.DoubleSide});
    const scanDepth=new THREE.ShaderMaterial({vertexShader:scannedVertex,fragmentShader:depthFragment,uniforms:scanUniforms,side:THREE.DoubleSide});
    scannedMaterials.push(scanMaterial,scanDepth);
    const variants=[['small_a',80,6.5,1.8],['small_b',80,7.4,1.8],['tall_a',70,4.7,1.5],['tall_b',70,4.7,1.5],['tall_c',70,5.2,1.5]];
    for(const [name,count,minScale,range] of variants){
      const source=sourceMeshes.get(`grass_medium_01_${name}_LOD0`);
      if(!source)throw new Error(`Grass tuft variant ${name} is unavailable.`);
      const geometry=new THREE.InstancedBufferGeometry().copy(source.geometry);
      geometry.computeBoundingBox();geometry.translate(0,-geometry.boundingBox.min.y,0);geometry.computeBoundingBox();
      const modelHeight=geometry.boundingBox.max.y;
      const placements=new Float32Array(count*4),details=new Float32Array(count*3);
      for(let i=0;i<count;i++){
        const z=4-Math.pow(rng(),1.15)*21,x=(rng()-.5)*2*(4.2+(4-z)*.4);
        placements.set([x,z,minScale+rng()*range,rng()*Math.PI*2],i*4);
        details.set([modelHeight,rng()*Math.PI*2,rng()],i*3);
      }
      geometry.setAttribute('aRoot',new THREE.InstancedBufferAttribute(placements,4));
      geometry.setAttribute('aModel',new THREE.InstancedBufferAttribute(details,3));geometry.instanceCount=count;
      const mesh=new THREE.Mesh(geometry,scanMaterial);mesh.frustumCulled=false;
      mesh.userData={capacity:count,depthMaterial:scanDepth,surfaceMaterial:scanMaterial};scannedMeshes.push(mesh);scene.add(mesh);
    }
    resize();
    onProgress(76,'Natural tuft shapes and materials decoded');await nextFrame();
    onProgress(78,'Warming up the wind shader');
    if(renderer.compileAsync) await renderer.compileAsync(scene,camera);else renderer.compile(scene,camera);
    render();if(shaderFailure)throw shaderFailure;
  } catch(error) {disposeGraphics();throw error;}
  await nextFrame();onProgress(100,'Ready');
  const resizeObserver=new ResizeObserver(()=>{resize();if(paused||hidden)render();});resizeObserver.observe(canvas);
  const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2(),plane=new THREE.Plane(new THREE.Vector3(0,1,0),-.45),hit=new THREE.Vector3();
  function addGust(x,z,strength=1) {uniforms.uGusts.value[gustIndex%4].set(x,z,time,strength);gustIndex++;}
  let activePointer=null;
  const originalTouchAction=canvas.style.touchAction;canvas.style.touchAction='none';
  function projectPointer(event){
    const r=canvas.getBoundingClientRect();
    pointer.set(((event.clientX-r.left)/r.width)*2-1,1-((event.clientY-r.top)/r.height)*2);
    raycaster.setFromCamera(pointer,camera);
    return raycaster.ray.intersectPlane(plane,hit)&&Number.isFinite(hit.x)&&Math.abs(hit.x)<40&&Math.abs(hit.z)<40?{x:hit.x,z:hit.z}:null;
  }
  function endDrag(){
    const id=activePointer;activePointer=null;bendField.end();
    if(id!==null&&canvas.hasPointerCapture(id))canvas.releasePointerCapture(id);
  }
  function pointerDown(event){
    if(paused||hidden||graphicsLost||activePointer!==null||event.button!==0||!event.isPrimary)return;
    const point=projectPointer(event);if(!point)return;
    activePointer=event.pointerId;bendField.begin(point);canvas.setPointerCapture(event.pointerId);
  }
  function pointerMove(event){
    if(event.pointerId!==activePointer||paused||hidden)return;
    if(event.pointerType==='mouse'&&!(event.buttons&1)){endDrag();return;}
    const samples=event.getCoalescedEvents?.();
    for(const sample of samples?.length?samples:[event]){
      const point=projectPointer(sample);
      if(point){if(bendField.anchor)bendField.add(point);else bendField.begin(point);}else bendField.end();
    }
  }
  function pointerEnd(event){if(event.pointerId!==activePointer)return;if(event.type==='pointerup'){const point=projectPointer(event);if(point)bendField.add(point);}endDrag();}
  canvas.addEventListener('pointerdown',pointerDown);canvas.addEventListener('pointermove',pointerMove);
  canvas.addEventListener('pointerup',pointerEnd);canvas.addEventListener('pointercancel',pointerEnd);canvas.addEventListener('lostpointercapture',pointerEnd);
  function visibility(){hidden=document.hidden;if(hidden)endDrag();last=performance.now();if(!hidden&&!paused&&!destroyed&&!graphicsLost&&!raf)raf=requestAnimationFrame(tick);}
  document.addEventListener('visibilitychange',visibility);
  function contextLost(event){event.preventDefault();endDrag();graphicsLost=true;cancelAnimationFrame(raf);raf=0;onStatus('Graphics interrupted. Restart the meadow to restore it.');}
  canvas.addEventListener('webglcontextlost',contextLost);
  function tick(now) {
    raf=0;if(destroyed||graphicsLost||paused||hidden)return;
    const raw=now-last;const dt=Math.min(.05,Math.max(0,raw/1000));last=now;
    time+=dt*options.speed;uniforms.uTime.value=time;if(bendField.update(dt))bendTexture.needsUpdate=true;
    frameMs=frameMs*.92+raw*.08;frames++;sampleFrames++;elapsedSample+=raw;
    intervals.push(raw);if(intervals.length>240)intervals.shift();
    if(elapsedSample>=1000){fps=1000*sampleFrames/elapsedSample;sampleFrames=0;elapsedSample=0;}
    render();
    // Adapt slowly to sustained frame pressure; keep the selected quality fixed.
    if(options.quality==='auto'&&frames>90) {
      if(raw>23){slowFrames++;fastFrames=0;}else if(raw<18){fastFrames++;slowFrames=Math.max(0,slowFrames-1);}
      if(slowFrames>70&&autoLevel>.68){autoLevel=Math.max(.68,autoLevel-.12);slowFrames=0;resize();}
      if(fastFrames>900&&autoLevel<1){autoLevel=Math.min(1,autoLevel+.08);fastFrames=0;resize();}
    }
    raf=requestAnimationFrame(tick);
  }
  raf=requestAnimationFrame(tick);
  return {
    setOptions(next={}) {
      if(destroyed)return;
      if(Number.isFinite(next.wind)){const wind=THREE.MathUtils.clamp(next.wind,0,2);if(wind!==options.wind){options.wind=wind;shadowDirty=true;}}
      if(Number.isFinite(next.speed))options.speed=THREE.MathUtils.clamp(next.speed,.25,2);
      if(next.light in PRESETS&&next.light!==options.light){options.light=next.light;lighting(options.light);}
      if(typeof next.flowers==='boolean'&&next.flowers!==options.flowers){options.flowers=next.flowers;flowers.visible=next.flowers;shadowDirty=true;}
      if(['auto','high','low'].includes(next.quality)&&next.quality!==options.quality){options.quality=next.quality;resize();}
      uniforms.uWind.value=options.wind;if(paused||hidden)render();
    },
    setPaused(value) {if(destroyed)return;paused=Boolean(value);if(paused)endDrag();cancelAnimationFrame(raf);raf=0;last=performance.now();if(!paused&&!hidden&&!graphicsLost&&!destroyed)raf=requestAnimationFrame(tick);},
    gust(){if(destroyed)return;addGust(-2.5,-1.5,1.65);if(paused)render();},
    resetEffects(){if(destroyed)return;endDrag();bendField.clear();bendTexture.needsUpdate=true;shadowDirty=true;time=2.5;uniforms.uTime.value=time;uniforms.uGusts.value.forEach(g=>g.set(0,0,-100,0));if(paused||hidden)render();},
    // CPU submission time and rAF intervals are diagnostics, not GPU timer-query results.
    stats(){return {frames,time,paused,hidden,contextLost:graphicsLost,fps:Number(fps.toFixed(1)),frameMs:Number(frameMs.toFixed(2)),renderMs:Number(renderMs.toFixed(2)),shadowMs:Number(shadowMs.toFixed(2)),shadowEnabled:Boolean(uniforms.uShadowEnabled.value),blades:grassGeometry.instanceCount,modeledTufts:scannedMeshes.reduce((sum,mesh)=>sum+mesh.geometry.instanceCount,0),drawCalls,triangles,pixelRatio:scale,resolution:[canvas.width,canvas.height],autoLevel,frameIntervals:[...intervals],renderCosts:[...renderCosts],options:{...options}};},
    destroy(){if(destroyed)return;destroyed=true;cancelAnimationFrame(raf);resizeObserver.disconnect();document.removeEventListener('visibilitychange',visibility);endDrag();canvas.style.touchAction=originalTouchAction;canvas.removeEventListener('pointerdown',pointerDown);canvas.removeEventListener('pointermove',pointerMove);canvas.removeEventListener('pointerup',pointerEnd);canvas.removeEventListener('pointercancel',pointerEnd);canvas.removeEventListener('lostpointercapture',pointerEnd);canvas.removeEventListener('webglcontextlost',contextLost);disposeGraphics();},
  };
}

import { dragFieldGLSL } from './interaction.js';

// Original rooted, curved foliage. All animation is evaluated on the GPU.
export const foliageVertex = /* glsl */`
attribute vec4 root;
attribute vec4 habit;
attribute vec2 shape;
attribute float part;
uniform float uTime;
uniform float uWind;
uniform vec4 uGusts[4];
${dragFieldGLSL}
varying vec3 vNormal;
varying vec3 vWorld;
varying vec2 vUv;
varying float vVariation;
varying float vPart;
varying float vHeight;
varying float vLean;
varying float vWindBend;

void main() {
  float t = position.y;
  vec2 p = root.xy;
  float phase = habit.z;
  // A spatial wave packet crosses the patch; the roots never translate.
  float packet = pow(0.5 + 0.5*sin(dot(p,vec2(0.42,0.28))-uTime*0.63), 7.0);
  float ripple = sin(dot(p,vec2(1.15,-0.72))-uTime*1.42+sin(p.y*.49));
  float flutter = sin(uTime*2.4+phase+p.x*2.3)*0.038;
  vec2 bend = vec2(cos(habit.x),sin(habit.x))*habit.y;
  float windBend=uWind*(0.14+packet*1.16+ripple*.065);
  bend += normalize(vec2(0.93,0.35))*windBend;
  bend += vec2(flutter,cos(uTime*1.8+phase)*.025)*uWind;
  for(int i=0;i<4;i++) {
    float age = uTime-uGusts[i].z;
    vec2 flow = normalize(vec2(.93,.35));
    vec2 delta = p-uGusts[i].xy;
    float along = dot(delta,flow)-age*2.2;
    float acrossFlow = dot(delta,vec2(-flow.y,flow.x));
    float wave = exp(-pow(along/1.8,2.0)-pow(acrossFlow/5.5,2.0));
    float strength = wave*exp(-max(age,0.0)*.55)*smoothstep(0.0,.3,age)*uGusts[i].w;
    bend += flow*strength*.9;
    windBend += strength*.9;
  }
  vec2 hand=dragField(p);
  bend=bend*(1.0-min(.72,length(hand)*.4))+hand;
  float angle = clamp(length(bend),0.025,1.48);
  vec2 direction = normalize(bend+vec2(.00001));
  // Two joined circular arcs preserve length and tangent continuity while the
  // flexible last third curls over instead of ending as an upright sword.
  float joint=0.6666667;
  float upper=max(0.0,t-joint);
  float lower=min(t,joint);
  float upperCurvature=angle+shape.x;
  float lowerArc=angle*lower;
  float arc=lowerArc+upperCurvature*upper;
  vec2 centrePlane=vec2((1.0-cos(lowerArc))/angle,sin(lowerArc)/angle);
  centrePlane+=vec2((cos(lowerArc)-cos(arc))/upperCurvature,(sin(arc)-sin(lowerArc))/upperCurvature);
  vec3 centre=vec3(direction.x*centrePlane.x,centrePlane.y,direction.y*centrePlane.x)*root.z;
  vec3 tangent=vec3(direction.x*sin(arc),cos(arc),direction.y*sin(arc));
  vec3 binormal=vec3(-direction.y,0.0,direction.x);
  vec3 bendNormal=vec3(-direction.x*cos(arc),sin(arc),-direction.y*cos(arc));
  vec2 rootAcross=vec2(cos(root.w),sin(root.w));
  float baseCos=dot(rootAcross,vec2(-direction.y,direction.x));
  float baseSin=-dot(rootAcross,direction);
  float twist=shape.y*t*t;
  float cs=baseCos*cos(twist)-baseSin*sin(twist);
  float sn=baseSin*cos(twist)+baseCos*sin(twist);
  vec3 across=binormal*cs+bendNormal*sn;
  vec3 curveNormal=bendNormal*cs-binormal*sn;
  vec3 point=vec3(p.x,0.0,p.y)+centre+habit.w*(across*position.x+curveNormal*position.z);
  // Analytic Jacobian includes axial twist and curl, so the highlight follows
  // the actual twisted surface instead of retaining a flat ribbon normal.
  float curvature=t>joint?upperCurvature:angle;
  float twistRate=2.0*shape.y*t;
  vec3 along=tangent*(root.z+habit.w*curvature*(position.x*sn+position.z*cs));
  along+=habit.w*twistRate*(curveNormal*position.x-across*position.z);
  vWorld=point;
  vNormal=normalize(normal.x*cross(along,curveNormal)+normal.y*habit.w*cross(curveNormal,across)+normal.z*cross(across,along));
  vUv = uv;
  vHeight = t;
  vLean = angle;
  vWindBend = windBend;
  vVariation = fract(sin(phase*123.3)*4325.7);
  vPart = part;
  gl_Position=projectionMatrix*modelViewMatrix*vec4(point,1.0);
}`;

export const foliageFragment = /* glsl */`
uniform vec3 uSun;
uniform vec3 uSunColor;
uniform vec3 uAmbient;
uniform float uExposure;
uniform sampler2D uBladeAlbedo;
uniform float uModelSurface;
uniform sampler2D uModelAlbedo;
uniform sampler2D uModelNormal;
uniform sampler2D uModelRoughness;
uniform sampler2D uModelAlpha;
uniform sampler2D uShadowMap;
uniform mat4 uShadowMatrix;
uniform vec2 uShadowTexel;
uniform float uShadowEnabled;
varying vec3 vNormal;
varying vec3 vWorld;
varying vec2 vUv;
varying float vVariation;
varying float vPart;
varying float vHeight;
varying float vLean;
varying float vWindBend;
void main() {
  if(uModelSurface>.5 && texture2D(uModelAlpha,vUv).r<.5) discard;
  vec3 n = normalize(vNormal);
  if(uModelSurface>.5) {
    // Derivative tangent basis uses the original model UVs after deformation.
    vec3 dp1=dFdx(vWorld),dp2=dFdy(vWorld);
    vec2 duv1=dFdx(vUv),duv2=dFdy(vUv);
    float determinant=duv1.x*duv2.y-duv1.y*duv2.x;
    if(abs(determinant)>.00000001){
      vec3 tangent=(dp1*duv2.y-dp2*duv1.y)/determinant;
      vec3 bitangent=(-dp1*duv2.x+dp2*duv1.x)/determinant;
      tangent=normalize(tangent-n*dot(n,tangent));
      float handedness=dot(cross(n,tangent),bitangent)<0.0?-1.0:1.0;
      bitangent=normalize(cross(n,tangent))*handedness;
      vec3 mapped=texture2D(uModelNormal,vUv).xyz*2.0-1.0;
      mapped.xy*=.65;n=normalize(tangent*mapped.x+bitangent*mapped.y+n*mapped.z);
    }
  }
  if(!gl_FrontFacing) n=-n;
  vec3 view = normalize(cameraPosition-vWorld);
  // Fine longitudinal ribs and a subtly folded central vein.
  // The actual folded cross-section supplies the primary highlight.
  n = normalize(n+vec3(0.0,0.015*cos(vUv.x*24.0),0.0));
  float diffuse = max(dot(n,uSun),0.0);
  float backlit = pow(max(dot(-view,uSun),0.0),2.0);
  float translucency = (0.30+0.70*backlit)*max(dot(-n,uSun),0.0);
  float rib = 0.98+0.02*cos(vUv.x*36.0);
  float veins = 1.0-0.04*exp(-abs(vUv.x-.5)*65.0);
  // Four CC0 photographic blade interiors, with padded half-texel sampling.
  // SRGBColorSpace makes the texture sample linear before lighting.
  vec3 green;
  if(uModelSurface>.5) {
    green=texture2D(uModelAlbedo,vUv).rgb*mix(vec3(.72,1.04,.80),vec3(.88,1.10,.78),vVariation);
  } else {
    float variant=floor(vVariation*4.0);
    vec2 bladeUv=vec2((variant*64.0+4.5+clamp(vUv.x,0.0,1.0)*55.0)/256.0,(0.5+clamp(vHeight,0.0,1.0)*511.0)/512.0);
    vec3 bladeAlbedo=texture2D(uBladeAlbedo,bladeUv).rgb;
    green=bladeAlbedo*mix(vec3(.66,1.04,.78),vec3(.86,1.12,.72),vVariation);
  }
  if(vPart>.5 && vPart<1.5) green=mix(vec3(.16,.19,.038),vec3(.45,.36,.12),vHeight*.75);
  if(vPart>1.5 && vPart<2.5) green=vVariation<.72?vec3(.84,.81,.66):vec3(.72,.48,.018);
  if(vPart>2.5) green=vec3(.68,.39,.018);
  float rootOcclusion = mix(.28,1.0,smoothstep(.01,.36+vVariation*.10,vHeight));
  float shadowField=sin(vWorld.x*1.52+sin(vWorld.z*.83)*1.5)*sin(vWorld.z*1.31+vWorld.x*.3);
  float canopyShade=.55+.45*smoothstep(-.75,.65,shadowField);
  canopyShade=mix(canopyShade,1.0,pow(vHeight,4.0)*.35);
  if(uShadowEnabled>.5) canopyShade=1.0;
  float visibility=1.0;
  if(uShadowEnabled>.5) {
    vec4 projected=uShadowMatrix*vec4(vWorld,1.0);
    vec3 sc=projected.xyz/projected.w;
    if(sc.x>0.0&&sc.x<1.0&&sc.y>0.0&&sc.y<1.0&&sc.z<1.0) {
      float bias=.00035+.0003*(1.0-abs(dot(n,uSun)));
      float depth=sc.z-bias;
      float occlusion=0.0;
      occlusion+=step(depth,texture2D(uShadowMap,sc.xy+uShadowTexel*vec2(-.6,-.6)).r);
      occlusion+=step(depth,texture2D(uShadowMap,sc.xy+uShadowTexel*vec2(.6,-.6)).r);
      occlusion+=step(depth,texture2D(uShadowMap,sc.xy+uShadowTexel*vec2(-.6,.6)).r);
      occlusion+=step(depth,texture2D(uShadowMap,sc.xy+uShadowTexel*vec2(.6,.6)).r);
      visibility=.22+.78*occlusion*.25;
    }
  }
  // Thin upper leaves transmit some diffuse light even in a neighbour's shadow.
  float transmittedVisibility=mix(.42,1.0,visibility);
  vec3 color=green*(uAmbient*.98+uSunColor*(diffuse*1.12*visibility+translucency*1.2*transmittedVisibility))*rootOcclusion*canopyShade*rib*veins;
  if(vPart<.5) {
    // A rolling crest exposes the middle of the bent leaf to grazing sunlight.
    // Separate wind-driven curvature from its fixed rest lean so the whole field
    // does not acquire the same yellow wash.
    float crest=smoothstep(.22,.72,vWindBend)*smoothstep(.35,1.05,vLean);
    float exposedFace=smoothstep(.23,.64,vHeight)*(.35+.65*abs(dot(n,uSun)));
    color+=green*vec3(2.8,1.75,.9)*uSunColor*crest*exposedFace*(.33+.67*visibility);
    color+=green*vec3(.6,.45,.2)*uSunColor*pow(vHeight,3.0)*diffuse*visibility;
  }
  vec3 halfVector=normalize(view+uSun);
  float roughness=uModelSurface>.5?texture2D(uModelRoughness,vUv).g:.44;
  float spec=pow(max(dot(n,halfVector),0.0),mix(110.0,18.0,roughness))*mix(.34,.075,roughness);
  color += uSunColor*spec*rootOcclusion*visibility;
  gl_FragColor=vec4(color*uExposure,1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export const depthFragment = /* glsl */`
uniform float uModelSurface;
uniform sampler2D uModelAlpha;
varying vec2 vUv;
void main() {
  if(uModelSurface>.5 && texture2D(uModelAlpha,vUv).r<.5) discard;
  gl_FragColor=vec4(1.0);
}
`;

// Original tuft silhouettes and UVs are retained; only a rooted wind deformation
// is added. This is bounded procedural motion, not a botanical simulation.
export const scannedVertex = /* glsl */`
attribute vec4 aRoot;
attribute vec3 aModel;
uniform float uTime;
uniform float uWind;
uniform vec4 uGusts[4];
${dragFieldGLSL}
varying vec3 vNormal;
varying vec3 vWorld;
varying vec2 vUv;
varying float vVariation;
varying float vPart;
varying float vHeight;
varying float vLean;
varying float vWindBend;
void main(){
  vec2 p=aRoot.xy;
  vec2 flow=normalize(vec2(.93,.35));
  float phase=aModel.y;
  float packet=pow(.5+.5*sin(dot(p,vec2(.42,.28))-uTime*.63),7.0);
  float windBend=uWind*(.14+packet*1.16+sin(dot(p,vec2(1.15,-.72))-uTime*1.42+sin(p.y*.49))*.065);
  for(int i=0;i<4;i++){
    float age=uTime-uGusts[i].z;
    vec2 delta=p-uGusts[i].xy;
    float along=dot(delta,flow)-age*2.2,acrossFlow=dot(delta,vec2(-flow.y,flow.x));
    float wave=exp(-pow(along/1.8,2.0)-pow(acrossFlow/5.5,2.0));
    windBend+=wave*exp(-max(age,0.0)*.55)*smoothstep(0.0,.3,age)*uGusts[i].w*.9;
  }
  vec2 hand=dragField(p);
  vec2 bentFlow=flow*(windBend+sin(uTime*1.9+phase)*uWind*.025)*(1.0-min(.72,length(hand)*.4))+hand;
  float bend=clamp(length(bentFlow),0.0,1.25);
  flow=normalize(bentFlow+vec2(.000001));
  float ca=cos(aRoot.w),sa=sin(aRoot.w);
  vec3 local=vec3(ca*position.x+sa*position.z,position.y,-sa*position.x+ca*position.z)*aRoot.z;
  vec3 originalNormal=vec3(ca*normal.x+sa*normal.z,normal.y,-sa*normal.x+ca*normal.z);
  float height=max(.01,aModel.x*aRoot.z),t=clamp(local.y/height,0.0,1.0);
  vec3 point=local+vec3(flow.x*.4*bend,-.13*bend*bend,flow.y*.4*bend)*height*t*t;
  float dx=.8*flow.x*bend*t,dy=1.0-.26*bend*bend*t,dz=.8*flow.y*bend*t;
  vNormal=normalize(vec3(originalNormal.x,(originalNormal.y-dx*originalNormal.x-dz*originalNormal.z)/dy,originalNormal.z));
  vWorld=point+vec3(p.x,0.0,p.y);vUv=uv;vHeight=t;vLean=bend*1.2;vWindBend=windBend;vVariation=aModel.z;vPart=0.0;
  gl_Position=projectionMatrix*modelViewMatrix*vec4(vWorld,1.0);
}`;

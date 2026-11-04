/** A deterministic, standalone renderer. Call draw(seconds); destroy() releases GPU resources. */
export const LOOP_SECONDS = 30;
export const PHASES = Object.freeze(['sequence', 'membrane', 'ember', 'field', 'orbit']);
export function phaseTime(seconds, phase = 'sequence') {
  const t = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
  if (phase === 'membrane') return (t % 26 <= 13 ? t % 26 : 26 - t % 26);
  if (phase === 'ember') return 13.8 + .5 * Math.sin(t * .4);
  if (phase === 'field') return 18 + .75 * Math.sin(t * .35);
  if (phase === 'orbit') return 24 + t % (2 * Math.PI / 1.7);
  return t % LOOP_SECONDS;
}
export const fragmentShader = `
precision highp float;
uniform vec2 u_resolution;
uniform float u_time;
const float PI=3.14159265359;
float sat(float x){return clamp(x,0.,1.);}
float ease(float a,float b,float t){return smoothstep(a,b,t);}
float gauss(float x,float w){return exp(-x*x/(w*w));}
float shape(float a,float t){
 float star=.86/pow(pow(sqrt(cos(a)*cos(a)+.0004),.68)+pow(sqrt(sin(a)*sin(a)+.0004),.68),1./.68);
 float n=1.3; float diamond=.87/pow(pow(abs(cos(a)),n)+pow(abs(sin(a)),n),1./n);
 float rounded=.76+.045*cos(3.*a+.3)+.025*sin(2.*a);
 float lobed=.72+.077*sin(5.*a+.7)+.035*cos(3.*a-1.);
 float circle=.77+.012*sin(3.*a+t*.2);
 float r=mix(star,diamond,ease(0.,3.,t));
 r=mix(r,rounded,ease(3.,6.,t));r=mix(r,lobed,ease(6.,9.,t));
 r=mix(r,circle,ease(9.,12.5,t));return r;
}
vec3 membrane(vec2 p,float t){
 float a=atan(p.y,p.x);float r=shape(a,t);float d=length(p)-r;
 float mask=1.-smoothstep(-.016,.016,d);
 float bottom=pow(sat(.48-p.y*.72),1.4);
 vec3 body=mix(vec3(.095,.025,.63),vec3(.62,.79,1.),bottom);
 body+=vec3(.12,.075,.32)*gauss(p.y+.03,.45);
 body=mix(body,vec3(.025,.005,.075),.75*gauss(length(p-vec2(-.18,.40)),.30));
 body+=vec3(.16,.15,.22)*gauss(length(p-vec2(.10,-.48)),.33);
 float highlight=pow(sat(dot(normalize(p),normalize(vec2(-.8,.9)))),2.);
 float edge=gauss(d+.018,.025);
 body=mix(body,vec3(.08,.025,.20),gauss(d+.01,.04)*.85);
 body+=vec3(1.,.075,.035)*edge*highlight*1.6;
 float heat=sat(.46-.56*sin(a)+.12*cos(a+.9));
 vec3 rim=mix(vec3(.16,.13,1.),vec3(1.,.12,.045),heat);
 vec3 glow=rim*(gauss(d-.045,.083)*.8+gauss(d-.075,.18)*.22);
 glow+=vec3(.60,.56,.42)*gauss(d-.10,.16)*.16;
 vec3 c=body*mask+glow*(1.-mask);
 float warm=ease(12.4,13.7,t);
 vec3 ember=mix(vec3(1.,.08,.015),vec3(1.,.83,.22),sat(p.y*.85+.48));
 ember=mix(ember,vec3(.80,.92,.88),gauss(length(p-vec2(-.22,.30)),.30)*.92);
 ember*=1.-.80*gauss(d+.015,.12)*sat(-p.y);
 vec3 emberGlow=mix(vec3(.20,.10,.83),vec3(.94,.17,.025),sat(p.y*2.+.5));
 vec3 hot=ember*mask+emberGlow*(gauss(d,.09)*.35+gauss(d-.04,.18)*.15)*(1.-mask);
 return mix(c,hot,warm)*(1.-ease(14.4,15.5,t));
}
vec3 field(vec2 uv,float t){
 float y=uv.y+(t-18.)*.60;
 float wave=sin(y*3.6+.45*sin(uv.x*5.+t*.5));
 vec3 c=mix(vec3(.02,.015,.07),vec3(.22,.20,.60),smoothstep(-.9,-.1,wave));
 c=mix(c,vec3(.61,.58,.31),gauss(wave-.30,.30));
 c=mix(c,vec3(.96,.20,.025),gauss(wave-.65,.30));
 c=mix(c,vec3(.005),ease(.70,.99,wave));
 return c*ease(16.5,17.8,t)*(1.-ease(19.3,20.8,t));
}
vec3 orbit(vec2 p,float t){
 float angle=atan(p.y,p.x);float r=length(p);float turn=(t-22.)*1.7;
 float aa=mod(angle+PI*.5+6.2831853,6.2831853);
 float reveal=ease(22.,24.,t)*6.4;
 float visible=mix(1.-smoothstep(reveal-.18,reveal,aa),1.,ease(23.6,24.,t));
 float radius=.64+.018*sin(angle*2.+turn);
 float d=r-radius;
 vec3 color=mix(vec3(.27,.20,1.),vec3(1.,.29,.05),.5+.5*sin(angle+turn));
 vec3 fine=mix(vec3(.60,.55,1.),vec3(1.,.5,.26),.5+.5*cos(angle+turn));
 vec3 c= fine*gauss(d,.0038)*.95;
 c+=vec3(.42,.40,.92)*gauss(r-(.65+.02*sin(angle*2.+turn+.6)),.0023)*.6;
 c+=color*gauss(d,.08)*(.2+.12*sin(angle*2.-turn));
 c+=color*gauss(d-.035,.20)*.13;
 return c*visible*ease(21.4,22.4,t)*(1.-ease(28.3,29.3,t));
}
void main(){
 vec2 uv=(gl_FragCoord.xy-.5*u_resolution)/min(u_resolution.x,u_resolution.y);
 vec2 p=uv*mix(2.25,2.75,smoothstep(.85,1.45,u_resolution.x/u_resolution.y));
 float t=u_time;
 vec3 c=membrane(p,t);
 if(t>15.5)c=field(uv,t);
 if(t>21.)c=orbit(p,t);
 float grain=fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453)-.5;
 c+=grain*.008*smoothstep(.005,.1,max(c.r,max(c.g,c.b)));
 gl_FragColor=vec4(clamp(c,0.,1.),1.);
}`;
export function createGradientRenderer(canvas, { pixelRatio = Math.min(globalThis.devicePixelRatio || 1, 1.5) } = {}) {
  const gl = canvas.getContext('webgl', { alpha: false, antialias: false, depth: false, stencil: false, powerPreference: 'low-power', preserveDrawingBuffer: false });
  if (!gl) throw new Error('WebGL is unavailable');
  let disposed = false, lost = false, program, buffer, vertex, fragment, resolution, time;
  function compile(type, source) {
    const shader = gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);
    if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)){const error=gl.getShaderInfoLog(shader);gl.deleteShader(shader);throw new Error(error);}return shader;
  }
  function setup(){
    vertex=compile(gl.VERTEX_SHADER,'attribute vec2 a_position;void main(){gl_Position=vec4(a_position,0.,1.);}');
    fragment=compile(gl.FRAGMENT_SHADER,fragmentShader);program=gl.createProgram();gl.attachShader(program,vertex);gl.attachShader(program,fragment);gl.linkProgram(program);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program));
    buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
    gl.useProgram(program);const loc=gl.getAttribLocation(program,'a_position');gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
    resolution=gl.getUniformLocation(program,'u_resolution');time=gl.getUniformLocation(program,'u_time');
  }
  let previousTime=0,previousPhase='sequence';
  function draw(seconds=0,{phase='sequence'}={}){
    if(disposed||lost)return;previousTime=seconds;previousPhase=phase;
    const bounds=canvas.getBoundingClientRect();const w=Math.max(1,Math.round(bounds.width*pixelRatio)),h=Math.max(1,Math.round(bounds.height*pixelRatio));
    if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
    gl.viewport(0,0,w,h);gl.useProgram(program);gl.uniform2f(resolution,w,h);gl.uniform1f(time,phaseTime(seconds,phase));gl.drawArrays(gl.TRIANGLES,0,6);
  }
  const onLost=e=>{e.preventDefault();lost=true;};const onRestored=()=>{lost=false;setup();draw(previousTime,{phase:previousPhase});};
  canvas.addEventListener('webglcontextlost',onLost);canvas.addEventListener('webglcontextrestored',onRestored);setup();
  function destroy(){if(disposed)return;disposed=true;canvas.removeEventListener('webglcontextlost',onLost);canvas.removeEventListener('webglcontextrestored',onRestored);gl.deleteBuffer(buffer);gl.deleteProgram(program);gl.deleteShader(vertex);gl.deleteShader(fragment);}
  return {draw,destroy};
}

// Analytic rounded-Z signed distance with a linearly sampled flow texture.
export function createInkRenderer(canvas){
 const gl=canvas.getContext('webgl',{alpha:true,antialias:false,premultipliedAlpha:false});if(!gl)throw Error('WebGL unavailable');
 canvas.dataset.experienceContext='webgl';
 function shader(type,src){const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;}
 const vs=shader(gl.VERTEX_SHADER,'attribute vec2 p;varying vec2 uv;void main(){uv=p*.5+.5;gl_Position=vec4(p,0.,1.);}');
 const fs=shader(gl.FRAGMENT_SHADER,`precision highp float;
 varying vec2 uv;uniform sampler2D flow;uniform vec2 size,origin;uniform float scale,grow,dark,time,liquid;
 float seg(vec2 p,vec2 a,vec2 b){vec2 v=b-a;return length(p-a-v*clamp(dot(p-a,v)/dot(v,v),0.,1.));}
 void main(){
 vec2 px=vec2(uv.x,1.-uv.y)*size;
 vec2 f=(texture2D(flow,vec2(uv.x,1.-uv.y)).rg-.5)*32.;
 vec2 p=(px-origin)/scale-f*.032;
 float t=time*.22;float strength=sin(clamp(liquid,0.,1.)*3.14159);
 // Cascaded curl-domain advection produces stretched fingers rather than a scaled outline.
 for(int i=0;i<4;i++){float k=float(i);float freq=3.+k*4.;vec2 q=p;
 p+=strength/(1.+k*1.8)*vec2(sin(q.y*freq+t+sin(q.x*2.-t)),cos(q.x*freq-t+sin(q.y*3.+t)))*.36;}
 float d=min(seg(p,vec2(-.30,-.34),vec2(.30,-.34)),min(seg(p,vec2(.30,-.34),vec2(-.30,.34)),seg(p,vec2(-.30,.34),vec2(.30,.34))))-.155-grow;
 float hole=length((p-vec2(-.23,-.34))*vec2(1.,1.25))-.064+grow*.7;d=max(d,-hole);
 float a=1.-smoothstep(-1./scale,1./scale,d);
 vec3 c=mix(vec3(.063,.055,.047),vec3(1.,.976,.969),dark);
 gl_FragColor=vec4(c,a);}`);
 const program=gl.createProgram();gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));gl.useProgram(program);
 const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);const a=gl.getAttribLocation(program,'p');gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,2,gl.FLOAT,false,0,0);
 const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);for(const param of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,param,gl.LINEAR);for(const param of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D,param,gl.CLAMP_TO_EDGE);
 const locations=Object.fromEntries(['size','origin','scale','grow','dark','time','liquid'].map(n=>[n,gl.getUniformLocation(program,n)]));
 let pixels=null,textureSize=0;
 return {draw(x,y,n,{width,height,origin=[width/2,height/2],scale=Math.min(width,height)*.58,grow=0,dark=false,time=0,liquid=0}){
   if(gl.isContextLost())return;
   if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}
   gl.viewport(0,0,width,height);
   if(textureSize!==n){textureSize=n;pixels=new Uint8Array(n*n*4);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,n,n,0,gl.RGBA,gl.UNSIGNED_BYTE,null);}
   for(let i=0;i<x.length;i++){pixels[i*4]=Math.max(0,Math.min(255,128+x[i]*8));pixels[i*4+1]=Math.max(0,Math.min(255,128+y[i]*8));pixels[i*4+3]=255;}
   gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,n,n,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
   gl.uniform2f(locations.size,width,height);gl.uniform2f(locations.origin,...origin);gl.uniform1f(locations.scale,scale);gl.uniform1f(locations.grow,grow);gl.uniform1f(locations.dark,dark?1:0);gl.uniform1f(locations.time,time);gl.uniform1f(locations.liquid,liquid);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
 },destroy(){gl.deleteTexture(texture);gl.deleteBuffer(b);gl.deleteProgram(program);gl.deleteShader(vs);gl.deleteShader(fs);pixels=null;}};
}

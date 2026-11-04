const vertex=`attribute vec2 position;varying vec2 uv;void main(){uv=position*.5+.5;gl_Position=vec4(position,0.,1.);}`;
const fragment=`precision highp float;
varying vec2 uv;uniform sampler2D logo;uniform float time;uniform float pixel;
float smoother(float x){x=clamp(x,0.,1.);return x*x*x*(x*(x*6.-15.)+10.);}
float mark(vec2 p,float width){vec2 v=p/vec2(width,width*.6151)+.5;if(v.x<0.||v.x>1.||v.y<0.||v.y>1.)return 0.;return texture2D(logo,vec2(v.x,1.-v.y)).a;}
vec2 rayToMark(vec2 p,vec3 normal,float opticalDepth,float ior){
 vec3 ray=refract(vec3(0.,0.,-1.),normal,1./ior);
 return p+ray.xy/max(-ray.z,.01)*opticalDepth;
}
void main(){
 vec2 p=(uv-.5)*2.;float t=time;
 vec3 bg=vec3(.852,.855,.861),ink=vec3(.018,.029,.037);
 float born=smoother((t-.105)/.045),unfold=smoother((t-.28)/.11);
 float growth=smoother((t-.12)/.24);
 float relax=smoother((t-.40)/.55),presence=1.-smoother((t-1.02)/.30);
 float wobble=sin(clamp((t-.17)/.65,0.,1.)*3.14159265)*(1.-relax);
 float settleTime=max(t-.39,0.);
 float recoil=sin(settleTime*19.)*exp(-settleTime*7.)*smoother(settleTime/.09)*(1.-relax);
 float size=mix(.29,.432,growth)+.012*wobble+.006*recoil;
 // A smooth superelliptic height field has no rounded-box medial-axis seams.
 vec2 q=p+vec2(sin(p.y*7.+.4),sin(p.x*8.-.7))*.009*wobble;
 float exponent=mix(2.,6.5,unfold);
 vec2 ap=abs(q)/size;
 float sum=pow(ap.x,exponent)+pow(ap.y,exponent);
 float rho=pow(max(sum,.0000001),1./exponent);
 vec2 gradRho=sign(q)*pow(ap,vec2(exponent-1.))/max(size*pow(rho,exponent-1.),.00001);
 float inside=1.-smoothstep(1.-pixel/size,1.+pixel/size,rho);
 float d=(rho-1.)*size;
 float curvaturePower=mix(2.,5.,unfold);
 float cap=pow(clamp(rho,0.,.9999),curvaturePower);
 // The mark settles before the thinner meniscus finishes relaxing.
 float height=mix(.19,.065,smoother((t-.40)/.22));
 height*=mix(1.,.5,smoother((t-.62)/.42));
 height=mix(height,.003,smoother((t-1.02)/.30))*(1.+.035*recoil);
 vec2 slope=gradRho*(height*.5*curvaturePower*pow(clamp(rho,0.,.9999),curvaturePower-1.)/sqrt(max(1.-cap,.001)));
 float anisotropy=.22*wobble;
 float rho4=pow(rho,4.);
 float crossTerm=q.x*q.y/(size*size);
 slope=slope*(1.+anisotropy*crossTerm*rho4)-height*sqrt(max(1.-cap,.001))*anisotropy*(vec2(q.y,q.x)*rho4/(size*size)+crossTerm*4.*pow(rho,3.)*gradRho);
 slope*=1.+.52*wobble*sin(atan(q.y,q.x)*3.+.8);
 vec2 bulgeA=q-vec2(.15,.29),bulgeB=q-vec2(-.18,-.28);
 vec2 variance=vec2(.018,.014);
 slope+=.028*wobble*(bulgeA/variance*exp(-dot(bulgeA*bulgeA,1./variance))+bulgeB/variance*exp(-dot(bulgeB*bulgeB,1./variance)));
 vec3 normal=normalize(vec3(slope,1.));
 float angle=atan(q.y,q.x);
 float logoRelax=smoother((t-.40)/.38);
 float depth=mix(.42,.02,logoRelax)*presence;
 float orb=1.-unfold;
 vec2 base=p*mix(.48,1.,unfold);
 float peak=smoothstep(.18,.38,t)*(1.-logoRelax);
 float width=mix(.40,.69,peak);
 // Distinct wavelengths take distinct paths through the same curved volume.
 vec3 mask=vec3(mark(rayToMark(base,normal,depth,1.44),width),mark(rayToMark(base,normal,depth,1.47),width),mark(rayToMark(base,normal,depth,1.50),width));
 vec3 color=mix(bg,ink,mask*inside*born);
 // A reflected studio field is evaluated along the curved surface normal.
 // Opposite dark cards create the broad opposed menisci of the reference.
 float twist=.58*(1.-normal.z)*cos(angle*2.+.3);

 float darkCard=smoothstep(-.04,.07,sin(2.*angle+.10+twist));
 vec3 reflectionMask=vec3(1.-smoothstep(.927,.949,normal.z),1.-smoothstep(.940,.962,normal.z),1.-smoothstep(.953,.975,normal.z));
 float caustic=exp(-pow((normal.z-.974)/.009,2.))*darkCard*inside*presence*born*smoothstep(.65,.8,rho);
 color=mix(color,vec3(1.,1.,.96),caustic*.95);
 float cornerSpectrum=.08+.92*clamp(abs(normal.x*normal.y)*8.,0.,1.);
 vec3 spectralOffset=vec3(.006,.002,-.002)*cornerSpectrum;
 vec3 spectralInside=1.-smoothstep(vec3(-pixel)+spectralOffset,vec3(pixel)+spectralOffset,vec3(d));
 color=mix(color,ink,reflectionMask*darkCard*spectralInside*presence*born);
 float reflectedLight=pow(1.-normal.z,3.)*(1.-darkCard)*inside;
 color=mix(color,vec3(.99,1.,1.),reflectedLight*presence*born*.8);
 float coolCorner=smoothstep(-.1,.6,-sin(angle));
 float causticArc=exp(-pow((normal.z-.55)/.12,2.))*(1.-darkCard)*inside*presence*born;
 color=mix(color,mix(vec3(1.,.95,.64),vec3(.48,.88,1.),coolCorner),causticArc*.75);
 float whiteArc=exp(-pow((normal.z-.63)/.045,2.))*(1.-darkCard)*inside*presence*born;
 color=mix(color,vec3(1.),whiteArc*.8);
 // Local spectral glints gather at the curved boundary between dark and light studio fields.
 // The moving normal drives them, rather than a static coloured outline.
 float lightBoundary=exp(-pow(sin(2.*angle+.10+twist)/.20,2.));
 float prism=lightBoundary*exp(-pow((normal.z-.48)/.23,2.))*inside*presence*born*wobble;
 vec3 prismColor=mix(vec3(.22,.18,.82),vec3(.23,.75,1.),smoothstep(.30,.66,normal.z));
 color=mix(color,prismColor,prism*.46);
 float fineCaustic=exp(-pow((normal.z-.71-.018*sin(angle*3.+t*2.))/.019,2.))*(1.-darkCard)*inside*presence*born;
 color=mix(color,vec3(1.),fineCaustic*.35);
 // The first orb catches a broad white Fresnel reflection, which clears before unfolding.
 float earlyFresnel=(1.-smoother((t-.20)/.07))*orb*inside*born*(1.-smoothstep(.52,.75,normal.z));
 color=mix(color,vec3(.99,1.,1.),earlyFresnel*.94);
 float surfaceGlint=exp(-pow(d/(.0035+orb*.002),2.));
 color=mix(color,vec3(1.),surfaceGlint*presence*born);
 float rimEcho=exp(-pow((d+.020)/.0013,2.))*smoothstep(.1,.9,-sin(angle*2.));
 color=mix(color,vec3(.98,1.,1.),rimEcho*presence*born*.55);
 float outer=exp(-pow((d-.005)/.0018,2.));
 color=mix(color,vec3(.71,.76,.80),outer*presence*born*.22);
 gl_FragColor=vec4(color,1.);
}`;
/** Dependency-free WebGL logo reveal. Call destroy when removing the canvas. */
export async function mountChromaticLogo(canvas,{logoUrl,speed=1,onUnavailable=()=>{}}={}){
 const gl=canvas.getContext('webgl',{alpha:false,antialias:false,powerPreference:'low-power'});if(!gl)throw new Error('WebGL unavailable');
 const shaders=[];function compile(type,source){const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(shader));shaders.push(shader);return shader;}
 const program=gl.createProgram();gl.attachShader(program,compile(gl.VERTEX_SHADER,vertex));gl.attachShader(program,compile(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program));gl.useProgram(program);
 const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);const loc=gl.getAttribLocation(program,'position');gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
 const image=new Image();image.src=logoUrl;await image.decode();
 // Explicit raster dimensions avoid dimensionless SVG uploads producing an incomplete texture.
 const raster=document.createElement('canvas');raster.width=1024;raster.height=630;const context=raster.getContext('2d');context.clearRect(0,0,1024,630);context.drawImage(image,0,0,1024,630);
 const texture=gl.createTexture();gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,raster);gl.uniform1i(gl.getUniformLocation(program,'logo'),0);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
 const timeLoc=gl.getUniformLocation(program,'time'),pixelLoc=gl.getUniformLocation(program,'pixel');let frame=0,elapsed=0,last=0,dead=false;const media=matchMedia('(prefers-reduced-motion: reduce)');
 function render(){if(dead)return;const rect=canvas.getBoundingClientRect();const size=Math.max(1,Math.round(Math.min(rect.width,rect.height)*Math.min(devicePixelRatio,2)));if(canvas.width!==size||canvas.height!==size){canvas.width=size;canvas.height=size;gl.viewport(0,0,size,size);}gl.uniform1f(timeLoc,elapsed);gl.uniform1f(pixelLoc,2/size);gl.drawArrays(gl.TRIANGLES,0,6);}
 function tick(now){frame=0;if(dead)return;if(!document.hidden){if(last)elapsed+=Math.min((now-last)/1000,.05)*speed*.5;render();}last=now;if(elapsed<1.5)frame=requestAnimationFrame(tick);}
 function replay(){if(dead)return;cancelAnimationFrame(frame);elapsed=0;last=0;frame=requestAnimationFrame(tick);}
 function settled(){cancelAnimationFrame(frame);elapsed=1.5;render();}
 const resize=new ResizeObserver(render);resize.observe(canvas);const abort=new AbortController();canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();cancelAnimationFrame(frame);onUnavailable(new Error('Graphics context lost'));},{signal:abort.signal});media.addEventListener('change',()=>{if(media.matches)settled();},{signal:abort.signal});
 if(media.matches)settled();else replay();
 return {replay,setSpeed(value){speed=Math.min(3,Math.max(.25,Number(value)||1));},seek(seconds){cancelAnimationFrame(frame);elapsed=Math.max(0,seconds);render();},destroy(){dead=true;cancelAnimationFrame(frame);resize.disconnect();abort.abort();gl.deleteTexture(texture);gl.deleteBuffer(buffer);gl.deleteProgram(program);shaders.forEach(s=>gl.deleteShader(s));}};
}

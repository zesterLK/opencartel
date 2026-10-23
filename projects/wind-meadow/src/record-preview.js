// Local authoring utility. This module is loaded only by Vite's development server.
export function mountPreviewRecorder({canvases,background,filename}) {
 const button=document.createElement('button');button.textContent='Record 12-second preview';button.style.cssText='position:fixed;left:24px;bottom:80px;z-index:1000;padding:12px;background:#fff;color:#222;border:1px solid #aaa;border-radius:8px';document.body.append(button);
 let url,raf=0,stream,recorder,timer;
 button.onclick=()=>{
  if(recorder?.state==='recording')return;
  const layers=canvases(),composite=document.createElement('canvas');composite.width=1280;composite.height=800;const ctx=composite.getContext('2d');
  function draw(){ctx.fillStyle=background;ctx.fillRect(0,0,1280,800);for(const c of layers)ctx.drawImage(c,0,0,1280,800);raf=requestAnimationFrame(draw);}if(layers.length>1)draw();
  stream=(layers.length===1?layers[0]:composite).captureStream(30);const mimeType=['video/webm;codecs=vp9','video/webm;codecs=vp8'].find(t=>MediaRecorder.isTypeSupported(t));
  recorder=new MediaRecorder(stream,{mimeType,videoBitsPerSecond:8000000});const chunks=[];recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
  recorder.onstop=()=>{cancelAnimationFrame(raf);stream.getTracks().forEach(t=>t.stop());if(url)URL.revokeObjectURL(url);url=URL.createObjectURL(new Blob(chunks,{type:'video/webm'}));const link=document.createElement('a');link.href=url;link.download=filename;link.textContent='Download clean recording';link.style.cssText=button.style.cssText;button.replaceWith(link);};
  recorder.start();button.disabled=true;button.textContent='Recording canvas only…';timer=setTimeout(()=>recorder.stop(),12000);
 };
 return()=>{clearTimeout(timer);if(recorder?.state==='recording')recorder.stop();cancelAnimationFrame(raf);stream?.getTracks().forEach(t=>t.stop());if(url)URL.revokeObjectURL(url);button.remove();};
}

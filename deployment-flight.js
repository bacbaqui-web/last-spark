import * as T from 'three';
import {createFlightScene,flightCargoSnapshot} from './deployment-flight-scene.js';
import './deployment-flight.css';

export async function showDeploymentFlight({cargo,stage}){
 const cargoJSON=flightCargoSnapshot(cargo);
 const root=document.createElement('section');root.className='deploymentFlight';root.setAttribute('role','status');root.setAttribute('aria-label','회수작전 지역으로 드론 비행 중');
 root.innerHTML='<canvas aria-hidden="true"></canvas><header class="flightHeading"><small>REMOTE INSERTION / <span></span></small><h1>작전 지역으로 이동 중</h1><p>회수 드론 · 원격 기체 수송</p></header><div class="flightStatus"><small>UPLINK ESTABLISHED</small><h2>비행 경로 연결 중…</h2><div class="flightProgress indeterminate" role="progressbar" aria-label="도시 구역 준비"><i></i></div><p>도시 구역이 준비되면 착륙을 시작합니다.<br>위성 코어 회수 후 이 드론으로 돌아오세요.</p></div>';
 root.querySelector('.flightHeading span').textContent=`STAGE ${stage}`;document.body.append(root);
 let canvas=root.querySelector('canvas'),worker,renderer,flight,timer,closed=false,readyResolve;
 const status=root.querySelector('.flightStatus h2'),bar=root.querySelector('.flightProgress'),paintURL=new URL('./textures/street/return-drone-top-v1.png',document.baseURI).href;
 const size=()=>{const scale=Math.min(1,1280/innerWidth,800/innerHeight);return {width:Math.max(1,Math.round(innerWidth*scale)),height:Math.max(1,Math.round(innerHeight*scale))};};
 const ready=new Promise(resolve=>{readyResolve=resolve;}),started=performance.now();
 function fallback(){
  if(closed||renderer)return;worker?.terminate();worker=null;
  // A transferred canvas cannot become a main-thread WebGL canvas again.
  const replacement=document.createElement('canvas');replacement.setAttribute('aria-hidden','true');canvas.replaceWith(replacement);canvas=replacement;
  try{
   renderer=new T.WebGLRenderer({canvas,antialias:true,powerPreference:'low-power'});renderer.setPixelRatio(1);renderer.toneMapping=T.ACESFilmicToneMapping;flight=createFlightScene(cargoJSON);
   root.dataset.renderer='main';resize();
   const draw=()=>{if(closed||document.hidden)return;flight.update((performance.now()-started)/1000);renderer.render(flight.scene,flight.camera);};draw();timer=setInterval(draw,1000/30);
   fetch(paintURL).then(r=>r.blob()).then(blob=>createImageBitmap(blob,{imageOrientation:'flipY'})).then(image=>{if(!closed)flight.setPaint(image);else image.close();}).catch(()=>{});
  }catch(error){console.warn('비행 미리보기 렌더링 실패',error);}
  readyResolve();
 }
 function resize(){const bounds=size();if(worker)worker.postMessage({type:'resize',...bounds});else if(renderer&&flight){renderer.setSize(bounds.width,bounds.height,false);flight.resize(bounds.width,bounds.height);}}
 function visibility(){worker?.postMessage({type:'visibility',hidden:document.hidden});}
 window.addEventListener('resize',resize);document.addEventListener('visibilitychange',visibility);
 const timeout=setTimeout(fallback,5000);
 try{
  if(!canvas.transferControlToOffscreen||typeof Worker==='undefined')fallback();
  else{
   worker=new Worker(new URL('./deployment-flight-worker.js',import.meta.url),{type:'module'});
   worker.onmessage=({data})=>{if(closed)return;if(data.type==='ready'){root.dataset.renderer='worker';clearTimeout(timeout);readyResolve();}else if(data.type==='stats'){root.dataset.frames=String(data.frames);root.dataset.seconds=data.seconds.toFixed(2);}else if(data.type==='error')fallback();};
   worker.onerror=event=>{event.preventDefault();fallback();};
   const offscreen=canvas.transferControlToOffscreen();worker.postMessage({type:'start',canvas:offscreen,cargo:cargoJSON,paintURL,...size()},[offscreen]);visibility();
  }
  await ready;clearTimeout(timeout);
  // Present the first flight frame before synchronous city generation starts.
  await new Promise(resolve=>setTimeout(resolve,0));
 }catch(error){fallback();clearTimeout(timeout);}
 return {
  progress(message,completed,total){status.textContent=message;const known=total>0;bar.classList.toggle('indeterminate',!known);if(known){const percent=Math.min(100,Math.max(0,completed/total*100));bar.setAttribute('aria-valuenow',String(Math.round(percent)));bar.querySelector('i').style.width=percent+'%';}else bar.removeAttribute('aria-valuenow');},
  close(){if(closed)return;closed=true;clearTimeout(timeout);clearInterval(timer);worker?.terminate();worker=null;flight?.dispose();renderer?.dispose();renderer?.forceContextLoss();window.removeEventListener('resize',resize);document.removeEventListener('visibilitychange',visibility);root.remove();}
 };
}

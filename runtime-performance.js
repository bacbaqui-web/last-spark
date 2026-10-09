export function frameSteps(elapsedMs){if(!Number.isFinite(elapsedMs)||elapsedMs<=0||elapsedMs>250)return [];const seconds=Math.min(elapsedMs/1000,.1),count=Math.ceil(seconds/(1/60+.0001));return Array(count).fill(seconds/count);}
export function createPerformanceWindow(size=600){
 const frames=[];return {reset(){frames.length=0;},record(frame){frames.push(frame);if(frames.length>size)frames.shift();},snapshot(){const sorted=frames.map(f=>f.elapsed).sort((a,b)=>a-b),average=key=>frames.reduce((sum,f)=>sum+f[key],0)/Math.max(1,frames.length),percentile=p=>sorted[Math.max(0,Math.ceil(sorted.length*p)-1)]||0;return {frames:frames.length,averageFrameMs:average('elapsed'),averageUpdateMs:average('update'),averageRenderSubmissionMs:average('render'),p50FrameMs:percentile(.5),p95FrameMs:percentile(.95),p99FrameMs:percentile(.99),maxFrameMs:sorted.at(-1)||0};}};
}
// Count presented frame callbacks, not simulation substeps. Reuse one small
// text node and refresh twice a second so the counter does not add HUD churn.
export function installFPSMeter(){
 if(typeof document==='undefined')return {sample(){},reset(){}};
 const meter=document.createElement('div');meter.id='fpsCounter';meter.className='fpsCounter';meter.hidden=true;meter.textContent='— FPS';meter.setAttribute('aria-label','초당 프레임 수');document.body.appendChild(meter);
 let frames=0,duration=0;
 function reset(){frames=0;duration=0;if(!meter.hidden){meter.hidden=true;meter.textContent='— FPS';}}
 return {reset,sample(elapsed,enabled=true){
  if(!enabled){reset();return;}
  if(!Number.isFinite(elapsed)||elapsed<=0)return;
  if(meter.hidden)meter.hidden=false;frames++;duration+=elapsed;
  if(duration>=500){const text=`${Math.round(frames*1000/duration)} FPS`;if(meter.textContent!==text)meter.textContent=text;frames=0;duration=0;}
 }};
}
// Cache the shadow map between updates. Camera/animation frames remain at the
// display rate; only the expensive shadow depth pass has a separate budget.
export function createShadowBudget(renderer){
 let last=-Infinity,lastKey,wasEnabled=false,updates=0,reuses=0;renderer.shadowMap.autoUpdate=false;
 return {invalidate(){last=-Infinity;},prepare(now,key,rate=20){
  const shadow=renderer.shadowMap;
  if(!shadow.enabled){wasEnabled=false;return false;}
  const refresh=!wasEnabled||key!==lastKey||shadow.needsUpdate||now<last||now-last>=1000/rate-.01;
  wasEnabled=true;
  if(refresh){last=now;lastKey=key;shadow.needsUpdate=true;updates++;}else reuses++;
  return refresh;
 },snapshot(){return {shadowUpdates:updates,shadowReuses:reuses};}};
}

// The transparent weapon canvas needs the camera's children and scene lights,
// not another traversal of the whole city, enemies and combat effects.
export function createWeaponPass(scene,camera,renderer){
 const hidden=[];
 return ()=>{
  const background=scene.background,auto=scene.matrixWorldAutoUpdate,layers=camera.layers.mask;
  for(const child of scene.children)if(child!==camera&&!child.isLight&&child.visible){hidden.push(child);child.visible=false;}
  scene.background=null;scene.matrixWorldAutoUpdate=false;camera.layers.set(1);
  try{renderer.render(scene,camera);}finally{for(const child of hidden)child.visible=true;hidden.length=0;scene.background=background;scene.matrixWorldAutoUpdate=auto;camera.layers.mask=layers;}
 };
}
export function installQualityControls(renderers){
 if(typeof document==='undefined')return {sample(){},get preset(){return 'balanced';}};
 const profiles={low:{ratio:.85,shadows:false},balanced:{ratio:1.25,shadows:true},high:{ratio:1.5,shadows:true},auto:{ratio:1,shadows:true}};
 let preset='auto',ratio=1.25,lastChange=0,samples=[];try{const saved=localStorage.getItem('last-spark-quality');if(profiles[saved])preset=saved;}catch{}
 const label=document.createElement('label');label.className='qualitySetting';label.textContent='화질 ';const select=document.createElement('select');select.setAttribute('aria-label','게임 화질');for(const [value,text]of [['auto','자동'],['low','성능 우선'],['balanced','균형'],['high','화질 우선']]){const option=document.createElement('option');option.value=value;option.textContent=text;select.appendChild(option);}select.value=preset;label.appendChild(select);document.body.appendChild(label);
 const apply=()=>{const profile=profiles[preset];ratio=Math.min(devicePixelRatio,profile.ratio);for(const [index,renderer] of renderers.entries()){renderer.setPixelRatio(Math.min(ratio,index===0?Infinity:1));renderer.shadowMap.enabled=index===0&&profile.shadows;renderer.shadowMap.needsUpdate=renderer.shadowMap.enabled;renderer.setSize(innerWidth,innerHeight);}samples=[];lastChange=0;};apply();select.onchange=()=>{preset=select.value;try{localStorage.setItem('last-spark-quality',preset);}catch{}apply();};
 return {get preset(){return preset;},sample(elapsed,now){if(preset!=='auto'||!Number.isFinite(elapsed)||elapsed<=0||elapsed>250)return;samples.push(elapsed);if(samples.length<90)return;const ordered=samples.sort((a,b)=>a-b),p95=ordered[Math.floor(ordered.length*.95)];samples=[];if(now-lastChange<(p95>23?3000:10000))return;const next=Math.max(.65,Math.min(Math.min(devicePixelRatio,1),ratio+(p95>23?-.15:p95<17?.05:0)));if(Math.abs(next-ratio)<.01)return;ratio=next;lastChange=now;for(const [index,renderer] of renderers.entries()){renderer.setPixelRatio(Math.min(ratio,index===0?Infinity:1));renderer.setSize(innerWidth,innerHeight);}}};
}

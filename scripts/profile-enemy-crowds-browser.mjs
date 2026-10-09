// Real game RAF/substeps, AI, shots and WebGL. Test hooks never ship to the app.
// Use an isolated Chrome profile and memory-only recovery campaign.
import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {basename,join} from 'node:path';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const counts=(process.env.CROWD_COUNTS??'40,80,120,200').split(',').filter(Boolean).map(Number),seconds=Number(process.env.CROWD_SECONDS||20),liveSeconds=Number(process.env.CROWD_LIVE_SECONDS||60),modes=(process.env.CROWD_MODES||'training,recovery').split(',');
const label=process.env.CROWD_LABEL||'current',preset=process.env.CROWD_QUALITY||'balanced';
const injection=`
let crowdFixture=null,crowdSamples=null,crowdPopulation=[],crowdSpawned=0,crowdSerial=0,crowdHome,crowdYaw;
const crowdTypes=['trooper','trooper','assassin','spider','sniper','scoutDrone'];
function addCrowdEnemy(){
 const index=crowdSerial++,type=crowdTypes[index%crowdTypes.length];spawn(false,type);crowdSpawned++;const e=enemies.at(-1),lane=(index%10-4.5)*(salvageMode?.65:1),row=Math.floor(index/10)%20;
 const p=salvageMode?sortieWorld.route.sample(16+row*.85,lane):{x:crowdHome.x+lane,z:crowdHome.z+12+row*.65};
 e.group.position.set(p.x,type==='scoutDrone'?2:0,p.z);e.crowdAnchor=e.group.position.clone();e.bossAnchor.copy(e.group.position);e.awareness={state:'combat'};
 if(!crowdFixture.live)e.hp=e.max=1000000;
}
const crowdUpdate=update;
update=function(dt){
 if(crowdFixture){
  player.pos.copy(crowdHome);player.vel.set(0,0,0);player.hp=maxPlayerHP();damageGrace=9999;countdownTime=0;arrival=null;
  yaw=crowdYaw+(crowdFixture.live?Math.sin(time*.4)*.15:0);pitch=0;
  if(sortie)sortie.battery=sortie.stats.battery;
  while(enemies.length<crowdFixture.count)addCrowdEnemy();
  if(!crowdFixture.live)for(const e of enemies){e.group.position.copy(e.crowdAnchor);e.hp=e.max;}
  equippedSlot=1;weapon='rapid';ammo=240;slotAmmo[0]=240;firing=true;
 }
 return crowdUpdate(dt);
};
const crowdRecord=frameStats.record.bind(frameStats);
frameStats.record=sample=>{crowdRecord(sample);if(crowdSamples){crowdSamples.push(sample);if(crowdSamples.length%30===0)crowdPopulation.push({time,enemies:enemies.length,active:enemies.filter(e=>!e.dormant).length,visible:enemies.filter(e=>e.group.visible).length,drawCalls:renderer.info.render.calls,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures,dying:dying.length,drops:drops.length,projectiles:projectiles.length});}};
window.crowdCheck={
 compareRender(){
  const saved=enemyRenderBatch.render,wasActive=active;active=false;
  try{
   const capture=batched=>{enemyRenderBatch.render=batched?saved:(_enemies,draw)=>draw();shadowBudget.invalidate();renderGame();const gl=renderer.getContext(),w=gl.drawingBufferWidth,h=gl.drawingBufferHeight,pixels=new Uint8Array(w*h*4);gl.readPixels(0,0,w,h,gl.RGBA,gl.UNSIGNED_BYTE,pixels);return {pixels,png:canvas.toDataURL('image/png'),calls:renderer.info.render.calls};};
   capture(false);capture(true);const original=capture(false),batched=capture(true);let different=0,totalError=0;
   for(let i=0;i<original.pixels.length;i+=4){let delta=0;for(let j=0;j<3;j++){const d=Math.abs(original.pixels[i+j]-batched.pixels[i+j]);delta=Math.max(delta,d);totalError+=d;}if(delta>24)different++;}
   return {differentFraction:different/(original.pixels.length/4),meanChannelError:totalError/(original.pixels.length/4*3),calls:{original:original.calls,batched:batched.calls},original:original.png,batched:batched.png};
  }finally{enemyRenderBatch.render=saved;active=wasActive;prev=performance.now();}
 },
 graphics(){const gl=renderer.getContext(),debug=gl.getExtension('WEBGL_debug_renderer_info');return {renderer:gl.getParameter(debug?debug.UNMASKED_RENDERER_WEBGL:gl.RENDERER),vendor:gl.getParameter(debug?debug.UNMASKED_VENDOR_WEBGL:gl.VENDOR),version:gl.getParameter(gl.VERSION)};},
 async init(){
  await SALVAGE.prepareCombatAssets();let seed=319;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  selectedWeapons=['rapid','shotgun'];
  if(salvageMode){campaign=SALVAGE.createCampaign({getItem(){return null;},setItem(){}});selectedMission=sortieMission({blocks:3,seed:3040804531});campaign.frame().weaponSlots=[SALVAGE.makeWeapon('rapid','crowd'),SALVAGE.makeWeapon('shotgun','crowd-2')];campaign.state.ammo.rapid=100000;reset(false);await launchRemoteFrame();await sortieWorld.ready;baseUI.hide();arrival=null;crowdHome=player.pos.clone();crowdYaw=sortieWorld.route.spawnYaw??0;}
  else{crowdHome=new THREE.Vector3(-28,1.703,-4);crowdYaw=Math.PI;}
 },
 setup(count,live=false){
  active=false;crowdFixture=null;crowdSamples=null;reset(false);wave=1;crowdSerial=0;crowdSpawned=0;crowdFixture={count,live};while(enemies.length<count)addCrowdEnemy();
  for(let i=0;i<80;i++)drop(new THREE.Vector3(crowdHome.x+(i%10-5)*.4,.5,crowdHome.z+(salvageMode?-1:1)*(3+Math.floor(i/10)*.5)),'ammo',0);
  player.pos.copy(crowdHome);yaw=crowdYaw;pitch=0;fallback=true;active=true;damageGrace=9999;prev=performance.now();fpsMeter.reset();$('overlay').style.display='none';$('loadoutOverlay').hidden=true;
 },
 start(){crowdSamples=[];crowdPopulation=[];frameStats.reset();return performance.now();},
 finish(){const result={samples:crowdSamples,population:crowdPopulation,status:window.performanceStatus(),spawned:crowdSpawned,fpsText:document.getElementById('fpsCounter').textContent,gameTime:time};crowdSamples=null;return result;},
 pause(){pauseGame();},resume(){active=true;prev=performance.now();$('overlay').style.display='none';},
 stop(){crowdFixture=null;active=false;firing=false;reset(false);}
};`;
const server=await createServer({plugins:[{name:'crowd-test-hooks',enforce:'pre',transform(source,id){
 if(process.env.CROWD_BASELINE_DIR&&['main.js','wild-enemy-models.js','sortie-runtime.js'].includes(basename(id)))source=readFileSync(join(process.env.CROWD_BASELINE_DIR,basename(id)),'utf8');
 if(id.endsWith('/main.js'))return source+injection;
 if(process.env.CROWD_BASELINE_DIR&&['wild-enemy-models.js','sortie-runtime.js'].includes(basename(id)))return source;
 // Diagnostic comparison only: do not change the shipped death animation.
 if(id.endsWith('/death-budget.js')&&process.env.CROWD_DEATH_DETAIL==='simple'){
  assert(source.includes('maxDetailed=6'),'Death budget configuration changed');return source.replace('maxDetailed=6','maxDetailed=0');
 }
}}],server:{host:'127.0.0.1',port:5188,strictPort:true,hmr:false,watch:null}});
const directory='output/crowd-performance';mkdirSync(directory,{recursive:true});
const summary=values=>{const sorted=values.toSorted((a,b)=>a-b),mean=values.reduce((a,b)=>a+b,0)/values.length;return {mean,p95:sorted[Math.ceil(sorted.length*.95)-1],p99:sorted[Math.ceil(sorted.length*.99)-1],max:sorted.at(-1)};};
const results=[],errors=[],graphics={};let browser;
try{
 await server.listen();browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 for(const mode of modes){
  const context=await browser.newContext({viewport:{width:1280,height:720},deviceScaleFactor:1}),page=await context.newPage();
  page.on('pageerror',error=>errors.push(mode+': '+error.message));page.on('console',message=>{if(message.type()==='error')errors.push(mode+': '+message.text());});
  await page.addInitScript(preset=>localStorage.setItem('last-spark-quality',preset),preset);
  await page.goto('http://127.0.0.1:5188/'+(mode==='training'?'?training':'?workshopCheck'),{waitUntil:'networkidle',timeout:120000});await page.waitForFunction(()=>!!window.crowdCheck);await page.evaluate(()=>crowdCheck.init());graphics[mode]=await page.evaluate(()=>crowdCheck.graphics());
  const cases=counts.map(count=>({count,live:false,seconds}));if(liveSeconds>0)cases.push({count:120,live:true,seconds:liveSeconds});
  for(const config of cases){
   await page.evaluate(config=>crowdCheck.setup(config.count,config.live),config);await page.waitForTimeout(3000);
   await page.waitForFunction(()=>/^\d+ FPS$/.test(document.querySelector('#fpsCounter').textContent)&&!document.querySelector('#fpsCounter').hidden);
   let profiler;if(process.env.CROWD_PROFILE==='1'){profiler=await context.newCDPSession(page);await profiler.send('Profiler.enable');await profiler.send('Profiler.start');}
   await page.evaluate(()=>crowdCheck.start());await page.waitForTimeout(config.seconds*1000);const raw=await page.evaluate(()=>crowdCheck.finish());assert(raw.samples.length>10,'game loop stopped');assert(!raw.status.error&&raw.status.active,'game paused or failed');
   const intervals=raw.samples.map(s=>s.elapsed),frameMs=summary(intervals),slowest=intervals.toSorted((a,b)=>b-a).slice(0,Math.max(1,Math.ceil(intervals.length*.01)));
   const result={mode,quality:preset,deathDetail:process.env.CROWD_DEATH_DETAIL||'default',...config,frames:intervals.length,frameMs,averageFPS:1000/frameMs.mean,onePercentLowFPS:1000/(slowest.reduce((a,b)=>a+b,0)/slowest.length),over33ms:intervals.filter(n=>n>33.4).length,over50ms:intervals.filter(n=>n>50.1).length,updateMs:summary(raw.samples.map(s=>s.update)),renderSubmissionMs:summary(raw.samples.map(s=>s.render)),activeEnemies:summary(raw.population.map(p=>p.active)),status:raw.status,spawned:raw.spawned,fpsText:raw.fpsText};
   const name=mode+'-'+config.count+(config.live?'-live':'')+'-'+label;if(profiler){const {profile}=await profiler.send('Profiler.stop');writeFileSync(directory+'/'+name+'.cpuprofile',JSON.stringify(profile));await profiler.detach();}writeFileSync(directory+'/'+name+'.json',JSON.stringify({...result,population:raw.population,samples:raw.samples},null,2));await page.screenshot({path:directory+'/'+name+'.png'});results.push(result);console.log(JSON.stringify(result));
  }
  if(process.env.CROWD_RENDER_CHECK==='1'){
   const {original,batched,...comparison}=await page.evaluate(()=>crowdCheck.compareRender());
   writeFileSync(directory+'/'+mode+'-original-'+label+'.png',Buffer.from(original.split(',')[1],'base64'));writeFileSync(directory+'/'+mode+'-batched-'+label+'.png',Buffer.from(batched.split(',')[1],'base64'));
   writeFileSync(directory+'/'+mode+'-render-comparison-'+label+'.json',JSON.stringify(comparison,null,2));console.log(JSON.stringify({renderComparison:comparison}));
   assert(comparison.differentFraction<.01,'batched render differs from original poses');
  }
  await page.evaluate(()=>crowdCheck.pause());await page.waitForTimeout(100);assert(await page.locator('#fpsCounter').isHidden(),'FPS counter should hide while paused');
  await page.evaluate(()=>crowdCheck.resume());await page.waitForFunction(()=>/^\d+ FPS$/.test(document.querySelector('#fpsCounter').textContent)&&!document.querySelector('#fpsCounter').hidden);
  await page.setViewportSize({width:390,height:844});await page.waitForTimeout(300);const layout=await page.evaluate(()=>{const meter=document.querySelector('#fpsCounter').getBoundingClientRect(),others=[...document.querySelectorAll('.qualitySetting,#hud .bottom .weapon,#hud .stats,#minimap,#enemyCounts,#boss')].map(e=>e.getBoundingClientRect());return {visible:meter.x>=0&&meter.right<=innerWidth&&meter.bottom<=innerHeight,separate:others.every(r=>!r.width||!r.height||meter.right<=r.left||meter.left>=r.right||meter.bottom<=r.top||meter.top>=r.bottom),pointerEvents:getComputedStyle(document.querySelector('#fpsCounter')).pointerEvents};});assert(layout.visible&&layout.separate&&layout.pointerEvents==='none','FPS overlaps HUD or captures input');await page.screenshot({path:directory+'/'+mode+'-fps-mobile-'+label+'.png'});
  await page.evaluate(()=>crowdCheck.stop());await context.close();
 }
 writeFileSync(directory+'/summary-'+label+'.json',JSON.stringify({browser:browser.version(),graphics,viewport:{width:1280,height:720},quality:preset,results,errors},null,2));assert.deepEqual(errors,[]);
}finally{await browser?.close();await server.close();}

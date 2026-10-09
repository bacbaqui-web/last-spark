// Diagnostics only: real recovery encounters and RAF, isolated memory save.
// Scripted route movement/aim, invulnerability and infinite ammunition. No audio.
import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {mkdirSync,writeFileSync} from 'node:fs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const seconds=Number(process.env.ROUTE_SECONDS||110),label=process.env.ROUTE_LABEL||'current';
const injection=`
let routeRunning=false,routeSamples=[],routePopulation=[],routeDistance=6,routeTarget=null,routeAimNext=0,routeTick=0;
const routeOriginalUpdate=update;
update=function(dt){
 if(routeRunning){
  routeDistance=THREE.MathUtils.clamp(routeDistance+(sortie.core?-1:1)*4.2*dt,6,sortieWorld.route.length-2);
  const p=sortieWorld.route.sample(routeDistance),height=platforms.streetCollision?.height(p.x,p.z,0)||0;
  player.pos.set(p.x,height+1.703,p.z);player.vel.set(0,0,0);player.hp=maxPlayerHP();damageGrace=9999;sortie.battery=sortie.stats.battery;
  if(time>=routeAimNext||!routeTarget||routeTarget.hp<=0){
   routeAimNext=time+.2;routeTarget=null;let best=55;
   for(const e of enemies){
    if(e.hp<=0)continue;
    const center=e.group.position.clone().add(new THREE.Vector3(0,e.boss?2.4:e.type==='spider'?.4:e.type==='scoutDrone'?.6:1.3,0)),delta=center.sub(player.pos),distance=delta.length();
    if(distance>=best)continue;ray.set(player.pos,delta.normalize());ray.far=distance-.2;
    if(ray.intersectObjects(worldObstacles,false).length)continue;best=distance;routeTarget=e;
   }
  }
  let aim;
  if(routeTarget){const mesh=routeTarget.robot.hitMeshes.find(m=>m.userData.weakPoint)||routeTarget.robot.hitMeshes[0];aim=mesh.getWorldPosition(new THREE.Vector3());}
  else{const ahead=sortieWorld.route.sample(THREE.MathUtils.clamp(routeDistance+(sortie.core?-4:4),0,sortieWorld.route.length));aim=new THREE.Vector3(ahead.x,player.pos.y,ahead.z);}
  const delta=aim.sub(player.pos);yaw=Math.atan2(-delta.x,-delta.z);pitch=Math.atan2(delta.y,Math.hypot(delta.x,delta.z));
  equippedSlot=1;weapon='rapid';ammo=240;slotAmmo[0]=240;firing=!!routeTarget;
  if(!sortie.core&&sortieWorld.unlocked&&Math.hypot(player.pos.x-sortieWorld.target.position.x,player.pos.z-sortieWorld.target.position.z)<4)interactRoadSortie();
 }
 return routeOriginalUpdate(dt);
};
const routeRecord=frameStats.record.bind(frameStats);
frameStats.record=sample=>{
 routeRecord(sample);if(!routeRunning)return;
 // Initialization can resume an already queued RAF with an older timestamp.
 // Keep all gameplay hitches, but omit callbacks before simulation begins.
 if(time>0&&sample.elapsed>0)routeSamples.push({...sample,time,distance:routeDistance});
 if(time>=routeTick){routeTick=time+1;routePopulation.push({time,distance:routeDistance,kills,enemies:enemies.length,active:enemies.filter(e=>!e.dormant).length,dying:dying.length,drops:drops.length,core:!!sortie.core,drawCalls:renderer.info.render.calls,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures,heap:performance.memory?.usedJSHeapSize});}
};
window.routeCheck={
 async init(){
  await SALVAGE.prepareCombatAssets();let seed=319;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  selectedWeapons=['rapid','shotgun'];campaign=SALVAGE.createCampaign({getItem(){return null;},setItem(){}});
  selectedMission=sortieMission({blocks:3,seed:3040804531});campaign.frame().weaponSlots=[SALVAGE.makeWeapon('rapid','route'),SALVAGE.makeWeapon('shotgun','route-2')];campaign.state.ammo.rapid=100000;
  reset(false);await launchRemoteFrame();await sortieWorld.ready;baseUI.hide();arrival=null;beginWave();
  fallback=true;active=true;damageGrace=9999;prev=performance.now();fpsMeter.reset();$('overlay').style.display='none';$('loadoutOverlay').hidden=true;routeRunning=true;frameStats.reset();
  return {mission:selectedMission,length:sortieWorld.route.length,enemies:enemies.length};
 },
 progress(){return routePopulation.at(-1);},
 finish(){routeRunning=false;active=false;firing=false;return {samples:routeSamples,population:routePopulation,status:window.performanceStatus()};}
};`;
const server=await createServer({plugins:[{name:'route-diagnostics',enforce:'pre',transform(source,id){if(id.endsWith('/main.js'))return source+injection;}}],server:{host:'127.0.0.1',port:5188,strictPort:true,hmr:false,watch:null}});
const directory='output/recovery-route-performance';mkdirSync(directory,{recursive:true});let browser;
try{
 await server.listen();browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 const context=await browser.newContext({viewport:{width:1280,height:720},deviceScaleFactor:1}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.addInitScript(()=>localStorage.setItem('last-spark-quality','balanced'));
 await page.goto('http://127.0.0.1:5188/?workshopCheck',{waitUntil:'networkidle',timeout:120000});await page.waitForFunction(()=>!!window.routeCheck);
 const configuration=await page.evaluate(()=>routeCheck.init());console.log(JSON.stringify({configuration}));
 let profiler;if(process.env.ROUTE_PROFILE==='1'){profiler=await context.newCDPSession(page);await profiler.send('Profiler.enable');await profiler.send('Profiler.start');}
 for(let elapsed=0;elapsed<seconds;elapsed+=10){await page.waitForTimeout(Math.min(10,seconds-elapsed)*1000);console.log(JSON.stringify({elapsed:Math.min(seconds,elapsed+10),progress:await page.evaluate(()=>routeCheck.progress())}));}
 const result=await page.evaluate(()=>routeCheck.finish());
 if(profiler){const {profile}=await profiler.send('Profiler.stop');writeFileSync(directory+'/'+label+'.cpuprofile',JSON.stringify(profile));await profiler.detach();}
 await page.screenshot({path:directory+'/'+label+'.png'});
 writeFileSync(directory+'/'+label+'.json',JSON.stringify({browser:browser.version(),configuration,seconds,errors,...result},null,2));
 assert(result.samples.length>100,'Loop did not run');assert(!result.status.error,'Runtime fault');assert.deepEqual(errors,[]);
}finally{await browser?.close();await server.close();}

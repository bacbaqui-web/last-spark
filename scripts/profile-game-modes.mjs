// Real WebGL, isolated browser/storage, fixed population and deterministic inputs.
// PROFILE=1 adds a sampling CPU profile; compare timings without it.
import {createServer} from 'vite';
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {basename,resolve} from 'node:path';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const mode=process.env.BENCH_MODE||'training',label=process.env.BENCH_LABEL||'current',snapshot=process.env.BENCH_SNAPSHOT,frames=Number(process.env.BENCH_FRAMES||900);
const injection=`
window.modeBenchmark=async frames=>{
 await SALVAGE.prepareCombatAssets();let seed=319;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 if(salvageMode){campaign=SALVAGE.createCampaign({getItem(){return null;},setItem(){}});selectedMission=sortieMission({blocks:3,seed:3040804531});campaign.frame().weaponSlots=[SALVAGE.makeWeapon('rapid','bench'),null];campaign.state.ammo.rapid=100000;selectedWeapons=['rapid'];reset(false);await launchRemoteFrame();await sortieWorld.ready;baseUI.hide();arrival=null;}
 else{selectedWeapons=['rapid','shotgun'];reset(false);wave=1;}
 for(const e of enemies){scene.remove(e.group);disposeRobot(e.robot);}enemies.length=0;
 const home=player.pos.clone();
 for(let i=0;i<40;i++){spawn(false,'trooper');const e=enemies.at(-1),side=i<20?1:-1,row=Math.floor((i%20)/5),lane=(i%5-2)*4;let p;
  if(salvageMode)p=sortieWorld.route.sample(18+row*6+ (side===1?0:35),lane);
  else p={x:lane,z:home.z-side*(10+row*5)};
  e.group.position.set(p.x,0,p.z);e.benchHome=e.group.position.clone();e.hp=e.max=100000;e.awareness={state:'combat'};e.attack=999;
 }
 for(let i=0;i<80;i++){const x=(i%10-5)*2,z=home.z-3-Math.floor(i/10)*2;drop(new THREE.Vector3(home.x+x,.5,z),'ammo',i%2);}
 active=true;fallback=true;countdownTime=0;damageGrace=9999;$('overlay').style.display='none';$('loadoutOverlay').hidden=true;
 const timing={},wrap=(name,fn)=>(...args)=>{const start=performance.now();try{return fn(...args);}finally{const m=timing[name]??={calls:0,total:0,max:0};const delta=performance.now()-start;m.calls++;m.total+=delta;m.max=Math.max(m.max,delta);}};
 collectNearbySupplies=wrap('pickupScan',collectNearbySupplies);updateCombatRing=wrap('combatRing',updateCombatRing);updateSlotHUD=wrap('weaponHUD',updateSlotHUD);drawMinimap=wrap('radar',drawMinimap);backEquipment.update=wrap('supportEquipment',backEquipment.update);
 const updates=[],renders=[],intervals=[];let frame=0,last=performance.now();
 await new Promise((resolve,reject)=>{const tick=()=>{try{
  player.pos.copy(home);player.vel.set(0,0,0);player.hp=maxPlayerHP();damageGrace=9999;yaw=salvageMode?(sortieWorld.route.spawnYaw??0):0;pitch=0;
  for(const e of enemies){e.group.position.copy(e.benchHome);e.attack=999;e.hp=e.max;}
  if(sortie)sortie.battery=sortie.stats.battery;
  // The changing ammo exercises the actual weapon HUD at minigun firing cadence.
  if(frame%3===0){equippedSlot=1;weapon='rapid';ammo=240-frame%240;slotAmmo[0]=ammo;}
  const begin=performance.now();update(1/60);const draw=performance.now();renderGame();const end=performance.now();
  if(frame>=180){updates.push(draw-begin);renders.push(end-draw);intervals.push(begin-last);}last=begin;frame++;window.modeBenchmarkFrame=frame;
  if(frame<frames)requestAnimationFrame(tick);else resolve();
 }catch(error){reject(error);}};requestAnimationFrame(tick);});
 const summary=values=>{const sorted=values.slice().sort((a,b)=>a-b);return {average:values.reduce((a,b)=>a+b,0)/values.length,p95:sorted[Math.floor(sorted.length*.95)],max:sorted.at(-1)};};
 return {mode:gameMode,frames,updateMs:summary(updates),renderSubmissionMs:summary(renders),frameIntervalMs:summary(intervals),sections:timing,status:window.performanceStatus()};
};`;
const server=await createServer({plugins:[{name:'profile-modes',enforce:'pre',transform(source,id){if(id.includes('?'))return;const file=basename(id);if(snapshot&&existsSync(resolve(snapshot,file)))source=readFileSync(resolve(snapshot,file),'utf8');if(file==='main.js')return source.replaceAll('requestAnimationFrame(loop);','')+injection;if(snapshot&&existsSync(resolve(snapshot,file)))return source;}}],server:{host:'127.0.0.1',port:5188,strictPort:true,hmr:false,watch:null}});
let browser;mkdirSync('output/mode-performance',{recursive:true});
try{
 await server.listen();browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1}),errors=[];page.on('pageerror',error=>errors.push(error.message));page.on('console',msg=>{if(msg.type()==='error')errors.push(msg.text());});await page.addInitScript(()=>localStorage.setItem('last-spark-quality','balanced'));
 await page.goto('http://127.0.0.1:5188/'+(mode==='training'?'?training':'?workshopCheck'),{waitUntil:'networkidle',timeout:120000});await page.waitForFunction(()=>typeof window.modeBenchmark==='function',null,{timeout:120000});
 let cdp;if(process.env.PROFILE==='1'){cdp=await page.context().newCDPSession(page);await cdp.send('Profiler.enable');await cdp.send('Profiler.start');}
 const result=await page.evaluate(frames=>window.modeBenchmark(frames),frames);if(cdp){const {profile}=await cdp.send('Profiler.stop');writeFileSync('output/mode-performance/'+mode+'-'+label+'.cpuprofile',JSON.stringify(profile));}
 result.errors=errors;writeFileSync('output/mode-performance/'+mode+'-'+label+'.json',JSON.stringify(result,null,2));await page.screenshot({path:'output/mode-performance/'+mode+'-'+label+'.png'});console.log(JSON.stringify(result,null,2));if(errors.length)process.exitCode=1;
}finally{await browser?.close();await server.close();}

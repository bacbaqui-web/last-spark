// Browser integration benchmark, with isolated storage and a fixed map/input.
// PLAYWRIGHT_MODULE may point to an existing Playwright install outside the repo.
// BENCH_SNAPSHOT optionally supplies source files for a before/after comparison.
import {createServer} from 'vite';
import {readFileSync,existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {basename,resolve} from 'node:path';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const label=process.env.BENCH_LABEL||'after',seconds=Number(process.env.BENCH_SECONDS||60),snapshot=process.env.BENCH_SNAPSHOT;
const injection=String.raw`
window.combatBenchmark=async(seconds)=>{
 campaign=SALVAGE.createCampaign({getItem(){return null;},setItem(){}});campaign.frame().hp=100;campaign.frame().weaponSlots=[SALVAGE.makeWeapon('rapid','benchmark'),null];campaign.state.ammo.rapid=100000;selectedWeapons=['rapid'];selectedMission=sortieMission({blocks:3,seed:3040804531});
 reset(false);await launchRemoteFrame();await sortieWorld.ready;
 baseUI.hide();$('overlay').style.display='none';active=true;fallback=true;arrival=null;damageGrace=999;
 let seed=319;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const samples=[],errors=[],timings=[],updates=[],renders=[];let spawned=0;
 const addTargets=()=>{for(let i=0;i<6;i++){spawn(false,i%3===0?'spider':'trooper');const e=enemies.at(-1),p=sortieWorld.route.sample(20+Math.floor(i/3)*7,(i%3-1)*3);e.group.position.set(p.x,0,p.z);e.hp=e.max=140;e.awareness={state:'combat'};spawned++;}};
 let frame=0,last=performance.now();
 await new Promise((resolve,reject)=>{
  const tick=()=>{try{
   const now=performance.now();if(frame%480===0){for(const e of enemies)e.hp=0;addTargets();}
   firing=true;weapon='rapid';ammo=100000;slotAmmo[0]=100000;sortie.battery=sortie.stats.battery;player.hp=maxPlayerHP();damageGrace=999;yaw=sortieWorld.route.spawnYaw??0;pitch=0;
   const begin=performance.now();update(1/60);const draw=performance.now();renderGame();const end=performance.now();
   if(frame>=120){timings.push(now-last);updates.push(draw-begin);renders.push(end-draw);}last=now;frame++;window.combatBenchmarkFrame=frame;
   if(frame%300===0)samples.push({frame,time,...window.performanceStatus(),jsHeap:performance.memory?.usedJSHeapSize});
   if(frame<seconds*60)requestAnimationFrame(tick);else resolve();
  }catch(error){reject(error);}};requestAnimationFrame(tick);
 });
 firing=false;for(const e of enemies)e.hp=0;
 for(let i=0;i<360;i++){damageGrace=999;update(1/60);if(i%30===0)renderGame();}
 const settled=window.performanceStatus();reset(false);renderGame();const resetStatus=window.performanceStatus();
 const summary=values=>{const sorted=values.slice().sort((a,b)=>a-b);return {average:values.reduce((a,b)=>a+b,0)/values.length,p95:sorted[Math.floor(sorted.length*.95)],max:sorted.at(-1)};};
 return {simulatedSeconds:seconds,spawned,viewport:[innerWidth,innerHeight],pixelRatio:devicePixelRatio,renderer:renderer.capabilities.isWebGL2?'WebGL2':'WebGL',intervalMs:summary(timings),updateMs:summary(updates),renderSubmissionMs:summary(renders),samples,settled,reset:resetStatus};
};
`;
const server=await createServer({plugins:[{name:'combat-benchmark',enforce:'pre',transform(source,id){
 if(id.includes('?'))return;
 const file=basename(id);if(snapshot&&existsSync(resolve(snapshot,file)))source=readFileSync(resolve(snapshot,file),'utf8');
 if(file==='main.js')return source.replaceAll('requestAnimationFrame(loop);','')+injection;
 if(snapshot&&existsSync(resolve(snapshot,file)))return source;
}}],server:{host:'127.0.0.1',port:5188,strictPort:true,hmr:false,watch:null}});
let browser;
try{
 await server.listen();browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1}),errors=[];
 page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(message.type()==='error')errors.push(message.text()+' '+message.location().url);});
 await page.addInitScript(()=>localStorage.setItem('last-spark-quality','balanced'));
 await page.goto('http://127.0.0.1:5188/?workshopCheck',{waitUntil:'networkidle',timeout:120000});
 await page.waitForFunction(()=>typeof window.combatBenchmark==='function',null,{timeout:120000});
 const running=page.evaluate(seconds=>window.combatBenchmark(seconds),seconds);
 await page.waitForFunction(()=>window.combatBenchmarkFrame>=600,null,{timeout:180000});
 mkdirSync('output/combat-performance',{recursive:true});await page.screenshot({path:`output/combat-performance/browser-${label}.png`});
 const result=await running;
 result.repeatedRounds=[];for(let round=1;round<Number(process.env.BENCH_ROUNDS||1);round++)result.repeatedRounds.push(await page.evaluate(seconds=>window.combatBenchmark(seconds),seconds));
 if(result.repeatedRounds.length>=2){
  const resets=[result,...result.repeatedRounds].map(round=>round.reset),keys=['geometries','textures','programs','effectPoolRetained'];
  result.resourcePlateau={pass:keys.every(key=>resets.at(-1)[key]===resets.at(-2)[key])&&resets.every(value=>value.effectPoolActive===0),resets:resets.map(value=>Object.fromEntries([...keys,'effectPoolActive'].map(key=>[key,value[key]])))};
  if(!result.resourcePlateau.pass)errors.push('Repeated reset resources did not stabilize');
 }
 result.errors=errors;result.browser=browser.version();result.headless=true;
 mkdirSync('output/combat-performance',{recursive:true});writeFileSync(`output/combat-performance/browser-${label}.json`,JSON.stringify(result,null,2));
 console.log(JSON.stringify({label,simulatedSeconds:seconds,updateMs:result.updateMs,renderSubmissionMs:result.renderSubmissionMs,errors}));
 if(errors.length)process.exitCode=1;
}finally{await browser?.close();await server.close();}

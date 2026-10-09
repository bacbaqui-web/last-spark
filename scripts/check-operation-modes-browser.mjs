// Isolated-browser integration: no personal browser profile or save is used.
// PLAYWRIGHT_MODULE can point to an existing Playwright installation.
import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {mkdirSync,writeFileSync} from 'node:fs';
import {gameModeURL} from '../game-modes.js';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const injection=`
let briefingPreviewCalls=0;
if(sortieWorld){const preview=sortieWorld.preview.bind(sortieWorld);sortieWorld.preview=(...args)=>{briefingPreviewCalls++;return preview(...args);};}
window.operationCheck={
 previewCalls:()=>briefingPreviewCalls,
 seed:()=>{const frame=campaign.frame();frame.hp=63;frame.parts=[{...SALVAGE.makePart('armor','retained-armor'),slot:0,isNew:false}];frame.equipment={back:SALVAGE.makeEquipment('jetPack','retained-jet',()=>.5)};campaign.state.stash=[SALVAGE.makePart('core','retained-core')];campaign.state.stashWeapons=[SALVAGE.makeWeapon('sniper','retained-sniper',4)];campaign.state.stashEquipment=[SALVAGE.makeEquipment('moto','retained-helmet',()=>.5)];campaign.state.materials=73;campaign.state.ammo.rifle=192;campaign.state.ammo.sniper=24;campaign.save();baseUI.show();},
 view:()=>{yaw=0;pitch=-.08;},
 budgets:()=>{
  active=false;reset(false);player.pos.set(0,1.703,14);player.vel.set(0,0,0);yaw=0;pitch=0;damageGrace=9999;
  spawn(false,'trooper');const hidden=enemies.at(-1);hidden.group.position.set(0,0,22);hidden.awareness={state:'combat'};const before=hidden.group.position.clone();
  for(let i=0;i<60;i++)update(1/60);
  const frozen=hidden.dormant&&!hidden.group.visible&&hidden.group.position.equals(before);
  yaw=Math.PI;update(1/60);const woke=!hidden.dormant&&hidden.group.visible;
  reset(false);damageGrace=9999;beginWave();for(let i=0;i<420;i++)update(1/60);
  const arrivals=enemies.every(e=>!e.entryTarget&&!e.transport);
  reset(false);yaw=0;pitch=0;damageGrace=9999;
  for(let i=0;i<80;i++)drop(new THREE.Vector3((i%10-5)*.2,.5,10-Math.floor(i/10)*.2),'ammo',0);
  update(1/60);const details=drops.filter(d=>d.m.visible).length,markers=drops.filter(d=>d.beam.visible).length,hiddenDrop=drops.find(d=>!d.m.visible&&d.beam.visible),beforeCount=drops.length;
  if(hiddenDrop){for(const d of drops)if(d!==hiddenDrop)d.m.position.x+=100;slotAmmo[0]=0;equippedSlot=0;weapon='pistol';player.pos.copy(hiddenDrop.m.position).add(new THREE.Vector3(0,.85,0));collectNearbySupplies();}
  const pickup=!!hiddenDrop&&hiddenDrop.life===0&&slotAmmo[0]>0&&drops.length===beforeCount;
  reset(false);return {frozen,woke,arrivals,details,markers,pickup};
 },
 state:()=>({campaign:!!campaign,city:!!arenaCityWorld,salvageWorld:!!sortieWorld,perches:sniperPerches.length,mode:gameMode}),
 protect:()=>{damageGrace=9999;},
 clearWave:()=>{for(const e of enemies)e.hp=0;damageGrace=9999;},
 lose:()=>{damageGrace=0;progression.player.damageTaken=1;damage(99999);},
 unmount:()=>{campaign.unequipWeapon(0);campaign.unequipWeapon(1);baseUI.show();},
 restore:()=>{campaign.equipWeapon('starter-1',0);baseUI.show();},
 unlockFinal:()=>{campaign.state.unlockedStage=12;campaign.save();baseUI.show();}
};`;
const server=await createServer({plugins:[{name:'operation-check',enforce:'pre',transform(source,id){if(id.endsWith('/main.js'))return source+injection;}}],server:{host:'127.0.0.1',port:5188,strictPort:true,hmr:false,watch:null}});
let browser;const evidence={checks:[],errors:[]};
const pass=label=>{evidence.checks.push(label);console.log('PASS '+label);};
try{
 await server.listen();browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 const page=await browser.newPage({viewport:{width:1280,height:900},deviceScaleFactor:1});
 page.on('pageerror',error=>evidence.errors.push(error.message));page.on('console',message=>{if(message.type()==='error')evidence.errors.push(message.text());});
 await page.addInitScript(()=>localStorage.setItem('last-spark-quality','balanced'));
 page.setDefaultTimeout(30000);page.setDefaultNavigationTimeout(120000);
 const base='http://127.0.0.1:5188/';
 await page.goto(base,{waitUntil:'networkidle'});await page.waitForFunction(()=>!!window.operationCheck);await page.evaluate(()=>window.operationCheck.seed());
 await page.click('#hangarDeploy');
 assert(await page.locator('#recoveryMode').isVisible()&&await page.locator('#trainingMode').isVisible(),'both choices are visible on entry');
 assert(await page.locator('#recoveryBrief').isHidden()&&await page.locator('#trainingBrief').isHidden(),'no operation is selected automatically');
 assert.equal(await page.locator('.operationMode[aria-pressed=true]').count(),0);
 assert.equal(await page.evaluate(()=>window.operationCheck.previewCalls()),0,'no recovery preview is generated before selection');
 mkdirSync('output/operation-modes',{recursive:true});await page.screenshot({path:'output/operation-modes/mode-choice.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});
 assert(await page.evaluate(()=>[...document.querySelectorAll('.operationMode')].every(el=>{const r=el.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight;})),'both choices fit the first mobile screen');
 await page.screenshot({path:'output/operation-modes/mode-choice-mobile.png',fullPage:true});await page.setViewportSize({width:1280,height:900});
 await page.click('#trainingMode');assert(await page.locator('#trainingBrief').isVisible());
 assert.equal(await page.evaluate(()=>window.operationCheck.previewCalls()),0,'training selection does not generate a recovery map');
 await page.locator('#trainingBrief [data-brief-back]').click();await page.click('#hangarDeploy');
 assert(await page.locator('#modeChoiceBack').isVisible()&&await page.locator('#trainingBrief').isHidden(),'returning always starts at mode selection');
 await page.locator('#modeChoiceBack [data-brief-back]').click();assert(await page.locator('#hangarDeploy').isVisible(),'selection screen can return to hangar');
 await page.click('#hangarDeploy');await page.click('#recoveryMode');await page.waitForSelector('#operationMap svg');
 pass('Deployment opens an unselected two-mode screen; training skips recovery preview and mobile shows both choices');
 assert.equal(await page.locator('.operationMode').count(),2);
 assert.equal(await page.locator('#missionStage option:disabled').count(),11);
 const layout=await page.evaluate(()=>({map:document.querySelector('#operationMap').getBoundingClientRect().bottom,story:document.querySelector('.operationStory').getBoundingClientRect().top}));assert(layout.story>=layout.map);
 assert.match(await page.locator('#missionRewards').innerText(),/Lv.3–5/);
 pass('Two modes, map above story, locked stages and actual stage-one rewards');
 mkdirSync('output/operation-modes',{recursive:true});
 await page.screenshot({path:'output/operation-modes/recovery.png',fullPage:true});
 await page.click('#trainingMode');assert(await page.locator('#trainingBrief').isVisible());assert(!(await page.locator('#recoveryBrief').isVisible()));
 await page.screenshot({path:'output/operation-modes/training-brief.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});
 for(const mode of ['recovery','training']){await page.click('#'+mode+'Mode');assert(await page.evaluate(()=>document.querySelector('#sortieBriefing').scrollWidth<=innerWidth),'mobile briefing overflows');await page.screenshot({path:`output/operation-modes/${mode}-mobile.png`,fullPage:true});}
 pass('Both briefing layouts fit 390px mobile width');
 await page.setViewportSize({width:1280,height:900});
 await page.locator('#trainingBrief [data-brief-back]').click();
 await page.evaluate(()=>window.operationCheck.unmount());await page.click('#hangarDeploy');await page.click('#recoveryMode');await page.waitForSelector('#operationMap svg');
 assert(await page.locator('#deploySortie').isDisabled());await page.click('#trainingMode');assert(await page.locator('#connectTraining').isEnabled());
 pass('A frame without weapons can access training; recovery launch stays blocked');
 await page.locator('#trainingBrief [data-brief-back]').click();await page.evaluate(()=>window.operationCheck.restore());
 await page.evaluate(()=>window.operationCheck.unlockFinal());await page.click('#hangarDeploy');await page.click('#recoveryMode');await page.waitForSelector('#operationMap svg');
 assert.match(await page.locator('#missionRewards').innerText(),/Lv.14–16/);assert.doesNotMatch(await page.locator('#missionRewards').innerText(),/STAGE 13/);
 await page.selectOption('#missionStage','1');await page.selectOption('#missionStage','2');await page.click('#trainingMode');await page.click('#recoveryMode');await page.waitForFunction(()=>!document.querySelector('#deploySortie').disabled);
 assert.match(await page.locator('#missionRewards').innerText(),/Lv.4–6/);
 pass('Stage changes retain the latest preview and final-stage rewards never unlock stage 13');
 // Let the existing hangar loader normalize the seeded save before measuring training.
 await page.reload({waitUntil:'networkidle'});await page.waitForFunction(()=>!!window.operationCheck);await page.click('#hangarDeploy');await page.click('#trainingMode');
 const saveSnapshot=()=>page.evaluate(()=>Object.fromEntries(Object.entries(localStorage).filter(([key])=>key.startsWith('last-spark-salvage'))));
 const before=await saveSnapshot();
 await page.click('#connectTraining');await page.waitForURL('**/?training=');await page.waitForFunction(()=>!!window.operationCheck);
 assert.deepEqual(await page.evaluate(()=>window.operationCheck.state()),{campaign:false,city:false,salvageWorld:false,perches:4,mode:'training'});
 assert.equal(await page.evaluate(()=>window.lastSparkStorageLock),null);
 assert.deepEqual(await saveSnapshot(),before);
 await page.click('#loadout-rapid');await page.click('#loadout-shotgun');await page.click('#confirmLoadout');
 await page.waitForFunction(()=>window.gameStatus?.().wave===1,{},{timeout:120000});await page.evaluate(()=>window.operationCheck.protect());
 assert.equal(await page.evaluate(()=>window.gameStatus().enemies),8);assert.equal(await page.evaluate(()=>window.gameStatus().bosses),1);
 const slotNode=await page.locator('#weaponSlots .weaponSlot').first().elementHandle();
 await page.keyboard.press('Digit2');await page.mouse.move(640,450);await page.mouse.down();await page.waitForFunction(()=>window.gameStatus().slotAmmo[0]<240);await page.mouse.up();assert(await slotNode.evaluate(node=>node.isConnected),'firing rebuilt the weapon HUD');assert.equal(await page.locator('#weaponSlots .weaponSlot').first().locator('strong').innerText(),(await page.evaluate(()=>window.gameStatus().slotAmmo[0]))+' / 240');
 pass('Live firing updates the ammo label while retaining the same weapon HUD nodes');
 assert.deepEqual(await saveSnapshot(),before);pass('Training uses square arena, virtual ammo and no campaign or storage ownership');
 await page.evaluate(()=>window.operationCheck.clearWave());await page.waitForSelector('#upgradeOverlay:not([hidden])');await page.click('#upgrade0');await page.waitForFunction(()=>window.gameStatus().wave===2);
 assert.equal(await page.evaluate(()=>window.gameStatus().bosses),1);assert.deepEqual(await saveSnapshot(),before);
 pass('Clearing enemies and boss offers upgrade, then starts next wave without campaign rewards');
 await page.evaluate(()=>window.operationCheck.view());await page.waitForFunction(()=>window.gameStatus().time>10);await page.screenshot({path:'output/operation-modes/arena.png'});
 await page.evaluate(()=>window.operationCheck.lose());await page.waitForSelector('#gameOverOverlay:not([hidden])');assert.match(await page.locator('#recordStatus').innerText(),/실제 기체/);assert.deepEqual(await saveSnapshot(),before);
 await page.evaluate(()=>Promise.all(document.querySelector('#gameOverOverlay').getAnimations({subtree:true}).map(animation=>animation.finished)));await page.screenshot({path:'output/operation-modes/training-ended.png'});
 await page.click('#retryGame');await page.click('#confirmLoadout');await page.waitForFunction(()=>window.gameStatus().wave===1);assert.deepEqual(await saveSnapshot(),before);
 pass('Death and retry leave all campaign save and backup values byte-for-byte unchanged');
 const budgets=await page.evaluate(()=>window.operationCheck.budgets());assert(budgets.frozen&&budgets.woke,'training offscreen freeze/resume');assert(budgets.arrivals,'offscreen transport arrival must finish');assert(budgets.details<=32&&budgets.markers>32,'full models capped while markers survive');assert(budgets.pickup,'hidden-detail loot remains collectible');assert.deepEqual(await saveSnapshot(),before);pass('Training freezes unseen enemies, resumes on turn, completes arrivals and keeps capped loot collectible');
 await page.reload({waitUntil:'networkidle'});await page.waitForFunction(()=>!!window.operationCheck);assert.deepEqual(await saveSnapshot(),before);
 await page.locator('#loadoutPicker .trainingExit').click();await page.waitForSelector('#hangarDeploy');assert.deepEqual(await saveSnapshot(),before);
 pass('Reload and return to hangar preserve the real frame, equipment, ammo and progress');
 // A training URL must not resolve an existing real deployment, even with a dev preview flag.
 await page.evaluate(()=>{const key='last-spark-salvage-v1',save=JSON.parse(localStorage.getItem(key));save.deployed={frameId:save.frames[0].id,name:save.frames[0].name,core:false};localStorage.setItem(key,JSON.stringify(save));});
 const deployedBefore=await saveSnapshot();await page.goto(gameModeURL('training',base)+'&workshopCheck',{waitUntil:'networkidle'});await page.waitForFunction(()=>!!window.operationCheck);
 assert.equal(await page.evaluate(()=>window.operationCheck.state().campaign),false);assert.deepEqual(await saveSnapshot(),deployedBefore);
 pass('Direct training URLs do not forfeit an existing campaign deployment or run dev campaign previews');
 // Restore only this isolated test profile, then exercise the real recovery button.
 await page.evaluate(snapshot=>{for(const [key,value]of Object.entries(snapshot))localStorage.setItem(key,value);},before);
 await page.goto(base,{waitUntil:'networkidle'});await page.waitForSelector('#hangarDeploy');await page.click('#hangarDeploy');await page.click('#recoveryMode');await page.selectOption('#missionStage','1');await page.waitForFunction(()=>!document.querySelector('#deploySortie').disabled);
 await page.click('#deploySortie');await page.waitForFunction(()=>window.gameStatus?.().salvage&&window.gameStatus().sortie&&!window.gameStatus().sortie.finished,null,{timeout:120000});
 assert.equal(await page.evaluate(()=>window.operationCheck.state().mode),'recovery');assert.equal(await page.evaluate(()=>window.operationCheck.state().campaign),true);assert.equal(await page.evaluate(()=>window.operationCheck.state().salvageWorld),true);
 const deployed=await page.evaluate(()=>JSON.parse(localStorage.getItem('last-spark-salvage-v1')));assert.equal(deployed.sorties,JSON.parse(before['last-spark-salvage-v1']).sorties+1);assert(deployed.deployed);assert.equal(deployed.ammo.rifle,72);
 pass('Recovery briefing launch starts the real campaign deployment and deducts only its carried ammo');
 assert.deepEqual(evidence.errors,[]);evidence.browser=browser.version();
}finally{
 mkdirSync('output/operation-modes',{recursive:true});writeFileSync('output/operation-modes/checks.json',JSON.stringify(evidence,null,2));await browser?.close();await server.close();
}

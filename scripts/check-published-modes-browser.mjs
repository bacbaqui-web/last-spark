// Verify the production build using only public UI and an isolated browser profile.
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.GAME_URL||'https://bacbaqui-web.github.io/last-spark/';
const output='output/published-modes';
mkdirSync(output,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const evidence={url:base,checks:[],errors:[]};
const pass=label=>{evidence.checks.push(label);console.log('PASS '+label);};
try{
 const page=await browser.newPage({viewport:{width:1280,height:900},deviceScaleFactor:1});
 page.setDefaultTimeout(60000);page.setDefaultNavigationTimeout(120000);
 page.on('pageerror',error=>evidence.errors.push(error.message));
 page.on('console',message=>{if(message.type()==='error')evidence.errors.push(message.text());});
 await page.addInitScript(()=>localStorage.setItem('last-spark-quality','balanced'));
 await page.goto(base,{waitUntil:'networkidle'});await page.waitForSelector('#hangarDeploy');
 await page.click('#hangarDeploy');
 assert.equal(await page.locator('.operationMode').count(),2);
 for(const mode of ['recovery','training']){
  assert(await page.locator('#'+mode+'Mode').isVisible());
  assert.equal(await page.locator('#'+mode+'Mode').getAttribute('aria-pressed'),'false');
  assert(await page.locator('#'+mode+'Brief').isHidden());
 }
 await page.screenshot({path:output+'/mode-choice.png'});
 pass('Published deployment opens an unselected recovery/training choice');
 await page.setViewportSize({width:390,height:844});
 const fits=await page.locator('.operationMode').evaluateAll(cards=>cards.every(card=>{const r=card.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight&&r.left>=0&&r.right<=innerWidth;}));
 assert(fits);await page.screenshot({path:output+'/mode-choice-mobile.png'});
 pass('Both mode choices fit the first mobile viewport');
 await page.setViewportSize({width:1280,height:900});
 await page.click('#recoveryMode');await page.waitForSelector('#operationMap svg');
 assert.match(await page.locator('#missionRewards').innerText(),/Lv.3–5/);
 assert(await page.locator('#deploySortie').isEnabled());
 await page.screenshot({path:output+'/recovery-brief.png'});
 pass('Recovery selection shows its map, story, rewards and launch button');
 await page.click('#trainingMode');
 assert(await page.locator('#recoveryBrief').isHidden());
 assert.match(await page.locator('#trainingBrief').innerText(),/실제 기체·장비·창고 탄약은 그대로/);
 await page.screenshot({path:output+'/training-brief.png'});
 const save=()=>page.evaluate(()=>Object.fromEntries(Object.entries(localStorage).filter(([key])=>key.startsWith('last-spark-salvage'))));
 const before=await save();assert(before['last-spark-salvage-v1']);
 await page.click('#connectTraining');await page.waitForURL('**/?training=');
 await page.waitForSelector('#loadout-rapid');
 assert.equal(await page.evaluate(()=>window.gameStatus().mode),'training');
 assert.deepEqual(await save(),before);
 await page.click('#loadout-rapid');await page.click('#loadout-shotgun');await page.click('#confirmLoadout');
 await page.waitForFunction(()=>window.gameStatus?.().wave===1,null,{timeout:120000});
 assert.equal(await page.evaluate(()=>window.gameStatus().salvage),false);
 assert.equal(await page.evaluate(()=>window.gameStatus().sortie),null);
 assert.deepEqual(await save(),before);
 await page.screenshot({path:output+'/training-arena.png'});
 pass('Published training starts a real arena wave without changing campaign saves');
 await page.reload({waitUntil:'networkidle'});await page.waitForSelector('#loadoutPicker .trainingExit');
 assert.deepEqual(await save(),before);
 await page.locator('#loadoutPicker .trainingExit').click();await page.waitForSelector('#hangarDeploy');
 assert.deepEqual(await save(),before);
 await page.click('#hangarDeploy');assert(await page.locator('#modeChoiceBack').isVisible());
 assert(await page.locator('#recoveryBrief').isHidden()&&await page.locator('#trainingBrief').isHidden());
 pass('Training reload/return preserves equipment and reopens mode selection');
 assert.deepEqual(evidence.errors,[]);evidence.browser=browser.version();
}finally{
 writeFileSync(output+'/checks.json',JSON.stringify(evidence,null,2));await browser.close();
}

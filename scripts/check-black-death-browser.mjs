import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {mkdirSync,writeFileSync} from 'node:fs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const hooks=`
window.deathPreview={
 pose(age){resetWildDestruction(robot);animateWildEnemy(robot,0);motionMode='shot';shotAge=age;window.__testDeathAge=age;dieWildEnemy(robot,age);},
 state(){const d=robot.destruction;return {id:robot.wildId,age:d?.age,pieces:d?.pieces.length,black:d?.pieces.every(p=>p.mesh.material.color.getHex()===0x080808&&!p.mesh.material.map),visible:d?.group.visible,effects:d?.group.children.some(o=>o.isLight||o.isPoints||o.isSprite),physics:!!d?.physics,positions:d?.pieces.map(p=>p.node.position.toArray())};}
};`;
const server=await createServer({plugins:[{name:'black-death-visual-check',enforce:'pre',transform(source,id){if(id.endsWith('/wild-robot-lab.js'))return source.replace('shotAge+=motionDt;','shotAge=window.__testDeathAge??(shotAge+motionDt);')+hooks;}}],server:{host:'127.0.0.1',port:5188,strictPort:true,hmr:false,watch:null}});
const directory='output/black-death';mkdirSync(directory,{recursive:true});let browser;
try{
 await server.listen();browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 const context=await browser.newContext({viewport:{width:1360,height:920},deviceScaleFactor:1}),page=await context.newPage(),errors=[],results=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto('http://127.0.0.1:5188/wild-robot-lab.html',{waitUntil:'networkidle'});
 for(const id of ['rust-scout','forest-warden','assault-mantis','iron-beetle','wall-sniper-spider']){
  await page.locator('[data-model="'+id+'"]').click();await page.waitForFunction(id=>document.querySelector('#viewport').dataset.model===id&&document.querySelector('#viewport').dataset.status==='ready',id);
  await page.evaluate(()=>deathPreview.pose(0));await page.waitForTimeout(50);const start=await page.evaluate(()=>deathPreview.state());
  await page.evaluate(()=>deathPreview.pose(.22));await page.waitForTimeout(100);const flying=await page.evaluate(()=>deathPreview.state());
  assert(flying.black&&flying.visible&&!flying.effects&&!flying.physics&&flying.pieces>0,id+' simple black burst');assert.notDeepEqual(flying.positions,start.positions,id+' scatters immediately');
  await page.screenshot({path:directory+'/'+id+'.png'});
  // Lab appearance controls must never recolor black debris or break rendering.
  await page.locator('#clay').click();await page.waitForTimeout(50);assert((await page.evaluate(()=>deathPreview.state())).black);await page.locator('#clay').click();
  await page.evaluate(()=>deathPreview.pose(1.05));await page.waitForTimeout(50);assert(!(await page.evaluate(()=>deathPreview.state())).visible,id+' lifetime');
  results.push({id,pieces:flying.pieces,black:true});
 }
 assert.deepEqual(errors,[]);writeFileSync(directory+'/visual-check.json',JSON.stringify({results,errors},null,2));console.log(JSON.stringify({results,errors}));
}finally{await browser?.close();await server.close();}

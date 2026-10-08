import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createServer} from 'node:http';
import {createReviewService,modelAudit,safeRelative} from './asset-review-api.mjs';
import {candidateScore} from './asset-review-matching.mjs';
import {REVIEW_CURATED} from '../asset-review-curated.js';
import {REVIEW_BY_ID} from '../asset-review-catalog.js';
import * as T from 'three';
import {sceneToTemplate,registerLoadedUpgrade,applyRigidUpgrade,getUpgradedTemplate,upgradedSurface,attachRobotUpgrade,updateRobotUpgrade} from '../asset-upgrades.js';
import {createRobot,createSpider,animateRobot} from '../robot.js';
import {createWeaponModel} from '../weapon-models.js';
import {buildBrickStreet,disposeBrickStreet} from '../brick-street-scene.js';
import {generateBrickBlock} from '../brick-street-layout.js';

const target=REVIEW_BY_ID.get('street-sedan');
const candidate=(id,title='Weathered Sedan Car')=>({id,title,type:'model',price:{free:true},downloadable:true,formats:['gltf'],license:{name:'CC0',commercialUse:true},provider:'test',polyCount:12});
assert(candidateScore(candidate('ok'),target)>=0);
for(const title of ['Covered Car','Old Tyre','Sedan Wheel','Car toy','Abandoned temple'])assert.equal(candidateScore(candidate('bad',title),target),-1,title);
assert(candidateScore({...candidate('blend'),formats:['blend']},target)>=0);
assert.equal(candidateScore({...candidate('heavy'),polyCount:999999},target),-1);
for(const unsafe of ['../x','a/../../x','%2e%2e/x','/absolute','https://x','a\\b','%5c..%5cx','%00x'])assert.throws(()=>safeRelative(unsafe));

const root=await mkdtemp(path.join(os.tmpdir(),'last-spark-review-test-'));
const gltf={asset:{version:'2.0'},scenes:[{nodes:[0]}],nodes:[{mesh:0}],meshes:[{primitives:[{attributes:{POSITION:0}}]}],accessors:[{count:3,type:'VEC3',componentType:5126}],buffers:[]};
let downloads=0;
const apiJSON=async url=>{
 if(url.includes('/search?'))return {results:[candidate('bad','Old Tyre'),candidate('fixture:one'),candidate('fixture:two')],providers:[]};
 if(url.includes('/files?'))return {files:[{filename:'model.gltf',format:'gltf',url:'https://fixture.invalid/model'}]};
 const id=decodeURIComponent(url.split('/').at(-1));return {...candidate(id),files:[{format:'gltf'}]};
};
const options={root,curated:{},apiJSON,download:async()=>{downloads++;return Buffer.from(JSON.stringify(gltf));}};
let service=await createReviewService(options);
let server;
try{
 const first=await service.next(target.id);assert.equal(first.candidate.id,'fixture:one');
 await service.prepare(target.id,'fixture:one');assert.equal(downloads,1);assert.deepEqual((await service.snapshot()).approved,{},'prepare cannot approve');
 await assert.rejects(readFile(path.join(root,'public/asset-upgrades/manifest.json')),{code:'ENOENT'});
 assert.equal((await service.next(target.id)).candidate.id,'fixture:two');
 await assert.rejects(service.approve(target.id,'fixture:one'),/후보가 변경/);
 await service.next('street-hatch');
 await Promise.all([service.approve(target.id,'fixture:two',[0,90,0]),service.approve('street-hatch','fixture:one')]);
 let snapshot=await service.snapshot();assert.equal(Object.keys(snapshot.approved).length,2);assert.deepEqual(snapshot.approved[target.id].rotation,[0,90,0]);
 assert.equal(JSON.parse(await readFile(path.join(root,'public/asset-upgrades/files',snapshot.approved[target.id].key,'model.gltf'))).asset.version,'2.0');
 service=await createReviewService(options);assert.equal(Object.keys((await service.snapshot()).approved).length,2,'approval survives restart');
 await service.revert(target.id);snapshot=await service.snapshot();assert(!snapshot.approved[target.id]);assert(snapshot.approved['street-hatch'],'revert affects only one target');
 const credits=JSON.parse(await readFile(path.join(root,'public/asset-upgrades/credits.json')));assert.equal(credits.length,1);
 assert(!modelAudit({...gltf,accessors:[{count:3000000}]},target).compatible);
 assert(!modelAudit(gltf,REVIEW_BY_ID.get('robot-player')).compatible);
 assert(!modelAudit(gltf,REVIEW_BY_ID.get('robot-spider')).compatible);
 server=createServer((req,res)=>service.middleware(req,res,()=>{res.statusCode=404;res.end();}));await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const url='http://127.0.0.1:'+server.address().port+'/api/asset-review/';
 const httpState=await (await fetch(url+'state')).json();
 assert.equal((await fetch(url+'revert',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:'street-hatch'})})).status,400);
 assert.equal((await fetch(url+'revert',{method:'POST',headers:{'Content-Type':'application/json','X-Review-Token':httpState.token,Origin:'https://unrelated.invalid'},body:JSON.stringify({id:'street-hatch'})})).status,400);
 assert((await service.snapshot()).approved['street-hatch']);
 // Paid choices are review data, never a purchase or approval. A local file is staged first.
 const paid=REVIEW_CURATED['street-ambulance'][0];
 const paidService=await createReviewService({...options,curated:{'street-ambulance':[paid]}});
 // A prior curation revision may already be present in this isolated state; selection still works.
 await paidService.select('street-ambulance',paid.id);
 await assert.rejects(paidService.prepare('street-ambulance',paid.id),/구매 전/);
 await assert.rejects(paidService.approve('street-ambulance',paid.id),/구매 전/);
 const json=Buffer.from(JSON.stringify(gltf).padEnd(Math.ceil(JSON.stringify(gltf).length/4)*4,' '));
 const glb=Buffer.alloc(20+json.length);glb.write('glTF');glb.writeUInt32LE(2,4);glb.writeUInt32LE(glb.length,8);glb.writeUInt32LE(json.length,12);glb.writeUInt32LE(0x4e4f534a,16);json.copy(glb,20);
 await assert.rejects(paidService.importModel('street-ambulance',paid.id,'bad.exe',glb),/GLB/);
 await assert.rejects(paidService.importModel('street-ambulance',paid.id,'bad.glb',Buffer.from('invalid')),/GLB/);
 const imported=await paidService.importModel('street-ambulance',paid.id,'local.glb',glb);assert(imported.audit.compatible);
 assert(!(await paidService.snapshot()).approved['street-ambulance'],'import never approves');
 await paidService.approve('street-ambulance',paid.id);assert((await paidService.snapshot()).approved['street-ambulance']);
 await paidService.revert('street-ambulance');
 console.log('PASS paid candidate approval rejection, local file validation, import without approval and explicit import approval');
 console.log('PASS subject matching, file paths, staging without approval, stale candidate, concurrent approvals, restart, credits, per-target revert and request guards');
}finally{server?.close();await rm(root,{recursive:true,force:true,maxRetries:3,retryDelay:100});}

const scene=new T.Group();scene.add(new T.Mesh(new T.BoxGeometry(2,1,4),new T.MeshStandardMaterial()));scene.rotation.y=Math.PI/2;
const template=sceneToTemplate(scene);assert(Math.abs(template.size.x-4)<1e-5);assert.equal(template.size.y,1);
const value={entry:{source:{title:'Test fixture'}},gltf:{scene},template};registerLoadedUpgrade('street-sedan',value);
const fitted=getUpgradedTemplate('street-sedan',{size:new T.Vector3(2,1.5,5)});assert(fitted.size.x<=2.001);assert(fitted.size.y<=1.501);assert(fitted.size.z<=5.001);
const weapon=createWeaponModel('pistol'),anchors=JSON.stringify(weapon.userData);registerLoadedUpgrade('weapon-pistol',value);applyRigidUpgrade(weapon,'weapon-pistol');assert.equal(JSON.stringify(weapon.userData),anchors);assert(weapon.getObjectByName('approved-weapon-pistol'));
const texture=new T.Texture();registerLoadedUpgrade('surface-concrete',{entry:{},textures:{map:texture}});const base=new T.MeshStandardMaterial({color:0x444444}),upgraded=upgradedSurface('surface-concrete',base);assert.notEqual(upgraded,base);assert.equal(upgraded.map,texture);assert.equal(base.map,null);
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>new Proxy({},{get:()=>()=>{}})})};
const block=generateBrickBlock(34);block.vehicles[0].id='street-sedan';const colliders=[],street=buildBrickStreet(block,new Map(),{colliders});assert(colliders.length>10);assert(street.children.every(m=>m.geometry.attributes.position.array.every(Number.isFinite)));disposeBrickStreet(street);
const spiderScene=new T.Group();for(const name of ['body',...Array.from({length:8},(_,i)=>['hip'+i,'knee'+i]).flat()]){const part=new T.Mesh(new T.BoxGeometry(1,1,1),new T.MeshStandardMaterial());part.name=name;spiderScene.add(part);}registerLoadedUpgrade('robot-spider',{entry:{},gltf:{scene:spiderScene}});const spider=createSpider();assert.equal(spider.legs.filter(l=>l.hip.getObjectByName('approved-robot-spider')&&l.knee.getObjectByName('approved-robot-spider')).length,8);
const robot=createRobot(false,'player'),skin=new T.Group(),boneMap={};for(const bone of robot.bones){const cloned=new T.Bone();cloned.name=bone.name;cloned.position.copy(bone.getWorldPosition(new T.Vector3()));skin.add(cloned);boneMap[bone.name]=bone.name;}skin.add(new T.Mesh(new T.BoxGeometry(1,2,1),new T.MeshStandardMaterial()));registerLoadedUpgrade('robot-test',{entry:{audit:{boneMap}},gltf:{scene:skin}});attachRobotUpgrade(robot,'robot-test');const before=robot.upgradeRig.pairs.map(p=>p.target.quaternion.clone());animateRobot(robot,.016,{speed:6});updateRobotUpgrade(robot);assert(robot.upgradeRig.pairs.some((p,i)=>p.target.quaternion.angleTo(before[i])>.001),'animation reaches replacement bones');assert(robot.upgradeRig.pairs.every(p=>p.target.quaternion.toArray().every(Number.isFinite)));
console.log('PASS rotated model bounds, size fit, retained weapon anchors, PBR fallback, replacement street collision, spider joints and humanoid rotation transfer');

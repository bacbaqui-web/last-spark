import assert from 'node:assert/strict';
import * as T from 'three';
import {createRobot,createSpider,animateDeath,disposeRobot} from '../robot.js';
import {createBoss,createScoutDrone,createAssassin} from '../boss-models.js';
import {updateEnemyDeathBurst,resetEnemyDeathBurst,ENEMY_DEATH_DURATION} from '../enemy-death-burst.js';

// Fallback models and flying enemies must use the same death as GLB robots.
for(const [name,make]of [['trooper',()=>createRobot()],['sniper',()=>createRobot(false,'sniper')],['spider',createSpider],['scout',createScoutDrone],['assassin',createAssassin],['missile',()=>createBoss('missile')],['drone',()=>createBoss('drone')]]){
 const r=make(),scene=new T.Scene();scene.position.set(9,1,-12);scene.rotation.y=.4;scene.add(r.root);
 r.root.position.set(3,2,-4);r.root.rotation.y=1.2;scene.updateMatrixWorld(true);
 const sources=[];r.root.traverse(o=>{if(o.isMesh)sources.push({mesh:o,material:o.material});});
 animateDeath(r,0);const d=r.destruction;assert(d?.pieces.length>0,name+' scatters its real model');assert.equal(r.deathDuration,ENEMY_DEATH_DURATION);
 scene.updateMatrixWorld(true);
 for(const p of d.pieces){
  assert.equal(p.mesh.geometry,p.source.geometry,'reuse geometry');assert.equal(p.mesh.material.color.getHex(),0x080808,'uniform black');
  assert(![].concat(p.source.material).every(m=>m.opacity===0),'invisible hit proxies do not become black boxes');
  p.mesh.matrixWorld.elements.forEach((v,i)=>assert(Math.abs(v-p.source.matrixWorld.elements[i])<1e-6,'retain posed geometry under transformed/scaled parents'));
 }
 assert(d.pieces.every(p=>!p.mesh.castShadow&&!p.mesh.material.map),'no new textures or shadow casters');
 animateDeath(r,.3);const pose=d.pieces.map(p=>p.node.position.clone());animateDeath(r,.8);animateDeath(r,.3);
 d.pieces.forEach((p,i)=>assert(p.node.position.distanceTo(pose[i])<1e-8,'seeking has no catch-up simulation'));
 assert(sources.every(s=>s.mesh.material===s.material),'source materials remain unchanged');
 let blackDisposed=false;d.pieces[0].mesh.material.addEventListener('dispose',()=>blackDisposed=true);
 disposeRobot(r);assert(!r.destruction&&!d.group.parent&&!r.root.parent,'dispose removes burst and actor');assert(!blackDisposed,'shared black material survives other deaths');
}

// Instance transforms are expanded correctly, and dense deaths bound parts.
const root=new T.Group(),geometry=new T.BoxGeometry(),material=new T.MeshStandardMaterial({color:'red'}),instances=new T.InstancedMesh(geometry,material,40),matrix=new T.Matrix4();root.add(instances);
for(let i=0;i<40;i++)instances.setMatrixAt(i,matrix.makeTranslation(i*.2,1,0));
const r={root,hitMeshes:[instances],deathPartLimit:12};updateEnemyDeathBurst(r,0);assert.equal(r.destruction.pieces.length,12);assert(r.destruction.pieces.at(-1).p.x>7,'limited parts are spread over the model');
let disposed=0;geometry.addEventListener('dispose',()=>disposed++);resetEnemyDeathBurst(r);assert(instances.visible&&!r.destruction&&disposed===0,'reset restores source without releasing shared geometry');
const player=createRobot(false,'player');animateDeath(player,.25);assert(!player.destruction&&player.deathStarted,'player death camera keeps its existing animation');disposeRobot(player);
geometry.dispose();material.dispose();instances.dispose();
console.log('PASS black burst: seven fallback/aerial types, source pose/material isolation, scaled parents, instancing, bounded parts, cleanup and player death');

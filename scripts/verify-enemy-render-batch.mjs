import assert from 'node:assert/strict';
import * as THREE from 'three';
import './verify-wild-enemies.mjs';
import {createWildEnemy,animateWildEnemy,fireWildEnemy,dieWildEnemy,disposeWildEnemy} from '../wild-enemy-models.js';
import {createEnemyRenderBatch} from '../enemy-render-batch.js';

const scene=new THREE.Scene();scene.position.set(2,0,1);scene.rotation.y=.2;
const runtime=createEnemyRenderBatch(scene),enemies=[];
for(let i=0;i<80;i++){
 const robot=createWildEnemy(i%2?'rust-scout':'wall-sniper-spider'),group=robot.root;
 group.position.set((i%8)*3,0,Math.floor(i/8)*3);group.rotation.y=i*.12;
 scene.add(group);animateWildEnemy(robot,1/60,{speed:3,aim:1,elevation:.2});
 enemies.push({robot,group,hp:100,dormant:false});
}
const head=enemies[1].robot.hitMeshes.find(m=>m.userData.weakPoint),ray=new THREE.Raycaster();
scene.updateMatrixWorld(true);const center=new THREE.Box3().setFromObject(head).getCenter(new THREE.Vector3());
ray.set(center.clone().add(new THREE.Vector3(0,0,10)),new THREE.Vector3(0,0,-1));
const before=ray.intersectObject(head,false)[0];assert(before,'original head is raycastable');
const hidden=enemies[0].robot.head;hidden.visible=false;
enemies[2].group.visible=false;enemies[3].dormant=true;enemies[3].group.visible=false;
fireWildEnemy(enemies[1].robot);
const methods=enemies.map(e=>e.group.updateMatrixWorld);
let instances=0;
runtime.render(enemies,()=>{
 const batches=scene.children.filter(n=>n.isInstancedMesh&&n.visible);
 assert(batches.length<70&&batches.length>30,'parts are shared across same-type actors');
 for(const batch of batches){
  assert.equal(batch.instanceMatrix.usage,THREE.DynamicDrawUsage);
  const sources=enemies.filter(e=>!e.dormant&&e.group.visible).flatMap(e=>e.robot.hitMeshes).filter(m=>m.geometry===batch.geometry&&m.material===batch.material&&!hasHiddenParent(m));
  assert.equal(batch.count,sources.length);assert.equal(batch.castShadow,sources[0].castShadow);assert.equal(batch.receiveShadow,sources[0].receiveShadow);
  for(let i=0;i<batch.count;i++){
   const actual=new THREE.Matrix4();batch.getMatrixAt(i,actual);actual.premultiply(scene.matrixWorld);
   assert(actual.elements.every((v,j)=>Math.abs(v-sources[i].matrixWorld.elements[j])<2e-5),'instance keeps the articulated world pose');
   assert.equal(sources[i].visible,false);instances++;
  }
 }
 assert(enemies[1].robot.muzzleFlash.visible&&enemies[1].robot.eyeGlow.visible,'flash and eyes remain independently visible');
 scene.updateMatrixWorld(true);
});
function hasHiddenParent(m){for(let p=m.parent;p;p=p.parent)if(!p.visible)return true;return false;}
assert(instances>2000);assert.equal(runtime.snapshot().batchedEnemyMeshes,instances);
assert.equal(hidden.visible,false,'pre-existing hidden limb stays hidden');
for(const [i,e]of enemies.entries()){assert.equal(e.group.updateMatrixWorld,methods[i]);assert(e.robot.hitMeshes.every(m=>m.visible));}
assert(scene.children.filter(n=>n.isInstancedMesh).every(n=>!n.visible),'instances are confined to the main render pass');
const after=ray.intersectObject(head,false)[0];assert.equal(after.object,before.object);assert(Math.abs(after.distance-before.distance)<1e-9,'head hit/weak point is unchanged');
assert.throws(()=>runtime.render(enemies,()=>{throw Error('renderer');}),/renderer/);
assert(enemies.every((e,i)=>e.group.updateMatrixWorld===methods[i]&&e.robot.hitMeshes.every(m=>m.visible)),'render failure restores originals');
const capacityCount=scene.children.filter(n=>n.isInstancedMesh).length;
for(let i=0;i<8;i++)runtime.render(enemies.slice(0,i%2?20:80),()=>{});
assert.equal(scene.children.filter(n=>n.isInstancedMesh).length,capacityCount,'batches do not accumulate');
enemies[1].hp=0;dieWildEnemy(enemies[1].robot,0);
runtime.render(enemies,()=>assert(enemies[1].robot.destruction.pieces.length>0&&enemies[1].robot.destruction.group.visible,'death keeps the original black parts'));
let disposedSource=false;head.geometry.addEventListener('dispose',()=>disposedSource=true);
runtime.dispose();assert(!disposedSource,'instance cleanup preserves shared model geometry');assert(!scene.children.some(n=>n.isInstancedMesh));
for(const e of enemies)disposeWildEnemy(e.robot);
console.log('PASS enemy render batching: 80 actors, shared parts, articulated instance transforms, hidden actors/limbs, muzzle/eyes, exact head hits, exception restoration, bounded reuse and black-part deaths');

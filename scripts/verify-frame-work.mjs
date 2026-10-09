import assert from 'node:assert/strict';
import * as THREE from 'three';
import {withFrameWork,scheduleFrameWork,flushFrameWork,cancelFrameWork,inFrameWork} from '../frame-work.js';
import './verify-wild-enemies.mjs';
import './verify-wild-bosses.mjs';
import {WILD_ENEMIES,createWildEnemy,animateWildEnemy,animateWildAttack,fireWildEnemy,dieWildEnemy,disposeWildEnemy,flushEnemyPoses} from '../wild-enemy-models.js';

const work=[];
scheduleFrameWork('a',()=>work.push('immediate'));
withFrameWork(()=>{
 scheduleFrameWork('a',()=>work.push('stale'));scheduleFrameWork('a',()=>work.push('latest'));
 scheduleFrameWork('cancel',()=>work.push('cancelled'));cancelFrameWork('cancel');
 scheduleFrameWork('hit',()=>work.push('hit'));flushFrameWork('hit');
 scheduleFrameWork('hit',()=>work.push('next-hit'));
 assert.deepEqual(work,['immediate','hit']);
});
assert.deepEqual(work,['immediate','hit','latest','next-hit']);
assert.throws(()=>withFrameWork(()=>{scheduleFrameWork('a',()=>work.push('cleanup'));throw Error('simulation');}),/simulation/);
assert(!inFrameWork());assert.equal(work.at(-1),'cleanup');
assert.throws(()=>withFrameWork(()=>{scheduleFrameWork('bad',()=>{throw Error('pose');});scheduleFrameWork('cleanup',()=>work.push('after-pose-error'));}),/pose/);
assert(!inFrameWork());assert.equal(work.at(-1),'after-pose-error');

function matrices(root){const result=[];root.updateWorldMatrix(true,true);root.traverse(node=>result.push([...node.matrixWorld.elements]));return result;}
function same(a,b,label){const expected=matrices(a),actual=matrices(b);assert.equal(actual.length,expected.length);for(let i=0;i<actual.length;i++)for(let j=0;j<16;j++)assert(Math.abs(expected[i][j]-actual[i][j])<1e-8,`${label} node ${i} value ${j}: ${expected[i][j]} / ${actual[i][j]}`);}

let compared=0;
for(const id of Object.keys(WILD_ENEMIES)){
 const immediate=createWildEnemy(id),batched=createWildEnemy(id);
 for(let frame=0;frame<48;frame++){
  const steps=1+frame%6,dt=1/60,snapshots=[];
  const advance=(r,step)=>{
   const t=(frame*6+step)/60,speed=frame<6?0:frame<24?2.3:6;
   r.root.position.set(Math.sin(t)*2,0,t);r.root.rotation.y=t*.3;
   if(id==='wall-sniper-spider'){r.wallMounted=frame%3===0;r.mount.rotation.z=r.wallMounted?-Math.PI/2:0;}
   animateWildEnemy(r,dt,{speed,aim:.8,elevation:.2*Math.sin(t),grounded:frame%7!==0,velocityX:Math.sin(t)*speed,velocityZ:Math.cos(t)*speed,rolling:frame%13===0,rollTime:.2});
   if(frame%5===0&&['assault-mantis','forest-warden'].includes(id))animateWildAttack(r,.42-step*.016);
   if(frame%4===0)r.aimAt(new THREE.Vector3(8,2,10));
   if(step===1)fireWildEnemy(r);
  };
  for(let step=0;step<steps;step++){advance(immediate,step);snapshots.push({head:immediate.getAimOrigin(),muzzle:immediate.muzzle.getWorldPosition(new THREE.Vector3())});}
  withFrameWork(()=>{
   for(let step=0;step<steps;step++){
    advance(batched,step);
    assert(batched.getAimOrigin().distanceTo(snapshots[step].head)<1e-8,`${id}: AI eye on frame ${frame} substep ${step}, distance ${batched.getAimOrigin().distanceTo(snapshots[step].head)}`);
    assert(batched.muzzle.getWorldPosition(new THREE.Vector3()).distanceTo(snapshots[step].muzzle)<1e-8,`${id}: firing muzzle on substep ${step}`);
    if(frame%3===0)flushEnemyPoses();
   }
  });
  for(const field of ['age','phase','walkBlend','aimBlend','gaitSpeed','recoil','flashTime'])assert.equal(batched[field],immediate[field],id+' '+field);
  same(immediate.root,batched.root,`${id} frame ${frame}`);compared++;
 }
 // Death captures the latest mesh pose even in the middle of a frame.
 animateWildEnemy(immediate,1/60,{speed:3});dieWildEnemy(immediate,0);
 withFrameWork(()=>{animateWildEnemy(batched,1/60,{speed:3});dieWildEnemy(batched,0);});
 assert.equal(batched.destruction.pieces.length,immediate.destruction.pieces.length);
 for(let i=0;i<immediate.destruction.pieces.length;i++)assert(immediate.destruction.pieces[i].p.distanceTo(batched.destruction.pieces[i].p)<1e-8,id+' death piece');
 disposeWildEnemy(immediate);disposeWildEnemy(batched);
 const disposed=createWildEnemy(id);withFrameWork(()=>{animateWildEnemy(disposed,1/60,{speed:3});disposeWildEnemy(disposed);});assert.equal(disposed.root.parent,null);
}
console.log(`PASS frame work: coalescing, immediate hit flush, cancellation, failure cleanup, ${compared} exact multi-step poses, muzzle/AI origins and death capture`);

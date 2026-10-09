import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCombatPillbug,updateCombatPillbug} from '../pillbug-combat.js';
import {updateEnemyDeathBurst,resetEnemyDeathBurst} from '../enemy-death-burst.js';
for(const fps of [30,60,120])for(const contact of ['wall','player']){
 const r=createCombatPillbug(),target=new THREE.Vector3(0,1.7,12);let hits=0,exposed=0,airborne=false,locked;
 const env={target,collide:(a,b,rolling)=>rolling&&b.z>=10?contact:null,onHit:()=>hits++};
 for(let i=0;i<fps*8;i++){
  updateCombatPillbug(r,1/fps,env);
  if(r.phase==='windup'){locked??=r.direction.clone();target.x=8;assert(r.direction.distanceTo(locked)<1e-8,'aim locks during warning');}
  if(r.phase==='roll')target.x=0;
  if(!r.invulnerable){exposed+=1/fps;assert.equal(r.phase,'rebound');}
  if(r.phase==='rebound'&&r.age>3&&r.bug.root.position.y>1)airborne=true;
  assert(r.root.position.toArray().every(Number.isFinite));
 }
 assert.equal(hits,contact==='player'?1:0);assert(Math.abs(exposed-2.4)<.06);assert(airborne);assert(r.invulnerable);
 updateEnemyDeathBurst(r,0);assert(r.destruction.pieces.length>0);resetEnemyDeathBurst(r);r.dispose();
}
const endless=createCombatPillbug();endless.phase='roll';for(let i=0;i<300;i++)updateCombatPillbug(endless,1/60,{target:new THREE.Vector3(0,0,8)});assert.equal(endless.phase,'roll');assert(endless.root.position.z>80);endless.dispose();
console.log('PASS pillbug combat: locked telegraph, continuous charge, single collision, 2.4s vulnerability, jump recovery and destruction');

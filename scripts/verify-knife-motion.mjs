import assert from 'node:assert/strict';
import * as THREE from 'three';
import {sampleKnifeSlash} from '../knife-motion.js';
import {createRobot} from '../robot.js';
import {createThirdPersonView} from '../third-person.js';
const before=sampleKnifeSlash(.12),after=sampleKnifeSlash(.22);
assert(before.rotation.angleTo(after.rotation)>1,'blade sweeps through a large angle');
assert(after.rotation.angleTo(sampleKnifeSlash(.6).rotation)<1e-7,'follow-through holds instead of drifting');
assert(sampleKnifeSlash(1).grip.distanceTo(sampleKnifeSlash(-1).grip)<1e-7,'returns to ready');
for(const dt of [1/30,1/60]){
 const robot=createRobot(),view=createThirdPersonView(robot,['knife']);
 for(let t=0;t<=.66;t+=dt){view.pose({position:new THREE.Vector3(0,1.7,0),yaw:0,pitch:0,weapon:'knife',knifePhase:t/.66,dt});robot.root.updateMatrixWorld(true);const blade=robot.root.getObjectByName('weapon-knife');assert(blade.getWorldPosition(new THREE.Vector3()).distanceTo(robot.arms[1].hand.getWorldPosition(new THREE.Vector3()))<1e-6,'blade remains attached to trigger hand');assert([...blade.matrixWorld.elements].every(Number.isFinite),'finite rig pose');}
}
console.log('PASS: large fast cut, stable follow-through, ready return, hand attachment at 30/60 fps');

for(const combo of [1,2]){const pose=sampleKnifeSlash(.17,{combo}),edge=new THREE.Vector3(-1,0,0).applyQuaternion(pose.rotation),travel=new THREE.Vector3(combo===1?-1:1,-1,0).normalize();assert(edge.dot(travel)>.2,'cutting edge leads each diagonal swing');}
const guard=sampleKnifeSlash(-1,{guard:true}),parry=sampleKnifeSlash(-1,{guard:true,block:.24});assert(parry.grip.x>guard.grip.x&&parry.grip.y>guard.grip.y,'parry raises hands upper right');assert(new THREE.Vector3(-1,0,0).applyQuaternion(guard.rotation).y>0,'guard cutting edge faces upward');

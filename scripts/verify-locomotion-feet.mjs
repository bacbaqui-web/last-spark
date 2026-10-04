import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createRobot} from '../robot.js';
import {createThirdPersonView} from '../third-person.js';
const dt=1/60;
for(const direction of [new THREE.Vector3(0,0,-1),new THREE.Vector3(1,0,0),new THREE.Vector3(-1,0,0),new THREE.Vector3(.707,0,-.707)]){
 const avatar=createRobot(),view=createThirdPersonView(avatar,['pistol']),position=new THREE.Vector3(0,1.7,0);let velocity=direction.clone().multiplyScalar(10.8);
 function frame(intent,grounded=true){position.addScaledVector(velocity,dt);const state={position,yaw:0,pitch:0,weapon:'pistol',speed:velocity.length(),velocity,moveIntent:intent,grounded,dt};view.pose(state);view.pose({...state,dt:0});const feet=['l','r'].map(side=>avatar.root.worldToLocal(avatar.bones.find(b=>b.name==='foot_'+side).getWorldPosition(new THREE.Vector3())));if(grounded)assert(feet[0].x-feet[1].x>.04,'feet retain left/right order during strafe and braking');}
 let locks=0;for(let i=0;i<65;i++){frame(direction);avatar.root.userData.footContacts.forEach((a,index)=>{if(a&&avatar.root.userData.footContactWeights[index]===1){const foot=avatar.bones.find(b=>b.name===`foot_${index?'r':'l'}`).getWorldPosition(new THREE.Vector3());assert(foot.distanceTo(new THREE.Vector3(...a))<.005,'directional support stays at its world contact');locks++;}});}assert(locks>3,'directional strides contain firm contacts');
 const start=position.clone();let brace=false,landed=false,supportFrames=0;
 for(let i=0;i<55;i++){
  velocity.multiplyScalar(Math.exp(-11*dt));frame(new THREE.Vector3());
  const step=avatar.root.userData.brakingStep;
  if(!step)continue;brace=true;const axis=new THREE.Vector3(1,0,0).applyQuaternion(avatar.root.getWorldQuaternion(new THREE.Quaternion()));const order=new THREE.Vector3(...step.landing).sub(new THREE.Vector3(...step.supportAnchor)).dot(axis)*(step.free===0?1:-1);assert(order>=.239,'braking landing does not cross support foot');
  if(step.supportWeight===1){const foot=avatar.bones.find(b=>b.name===`foot_${step.support?'r':'l'}`).getWorldPosition(new THREE.Vector3());assert(foot.distanceTo(new THREE.Vector3(...step.supportAnchor))<.005,'braking keeps support planted');supportFrames++;}
  if(step.phase===1&&step.freeWeight===1){const foot=avatar.bones.find(b=>b.name===`foot_${step.free?'r':'l'}`).getWorldPosition(new THREE.Vector3());assert(foot.distanceTo(new THREE.Vector3(...step.landing))<.005,'opposite foot plants at predicted stopping point');landed=true;}
 }
 assert(brace&&landed&&supportFrames>=3,'every direction braces and completes a step');assert(position.distanceTo(start)>.5&&position.distanceTo(start)<1.1,'stop has a bounded momentum slide');assert(avatar.root.userData.brakingStep===null,'brake settles back to idle');
 // A second stop must cancel immediately if movement resumes or a jump starts.
 velocity.copy(direction).multiplyScalar(10.8);for(let i=0;i<30;i++)frame(direction);velocity.multiplyScalar(Math.exp(-11*dt));frame(new THREE.Vector3());assert(avatar.root.userData.brakingStep);frame(direction);assert(!avatar.root.userData.brakingStep,'new input releases braking feet');
 for(let i=0;i<15;i++)frame(direction);velocity.multiplyScalar(Math.exp(-11*dt));frame(new THREE.Vector3());assert(avatar.root.userData.brakingStep);frame(new THREE.Vector3(),false);assert(!avatar.root.userData.brakingStep,'jump releases braking feet');
}
console.log('PASS: directional stop prediction, support locking, opposite-foot landing, bounded slide, resume and jump cancellation');

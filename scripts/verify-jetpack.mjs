import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createRobot} from '../robot.js';
import {createThirdPersonView} from '../third-person.js';
const scene=new THREE.Scene(),avatar=createRobot();scene.add(avatar.root);const view=createThirdPersonView(avatar,['pistol','rapid','flame']);
const base={position:new THREE.Vector3(0,1.7,0),weapon:'pistol',yaw:0,pitch:0,grounded:true,speed:30,velocity:new THREE.Vector3(0,0,-30),boostPhase:.4,boostDirection:new THREE.Vector3(0,0,-1),dt:1/60};
const settle=s=>{for(let i=0;i<90;i++)view.pose({...base,...s});};
settle({});assert.equal(avatar.root.userData.motion,'JetBoost');assert(avatar.motion.rotation.x>0,'forward acceleration leans toward travel');
const foot=avatar.bones.find(b=>b.name==='foot_l'),q=foot.quaternion.clone();settle({speed:100,time:10});assert(q.angleTo(foot.quaternion)<.001,'boost has no speed-dependent foot cycle');
settle({boostDirection:new THREE.Vector3(1,0,0)});assert(avatar.motion.rotation.z>0,'right acceleration leans right without rotating facing');
settle({boostPhase:-1,jetJump:.2,grounded:false});assert.equal(avatar.root.userData.motion,'JetJump');
view.jetpack.update({boostPhase:-1,jetJump:0,weapon:'pistol'});assert(!view.jetpack.exhaust.visible,'first leg jump does not ignite thrusters');
view.jetpack.update({boostPhase:.4,boostDirection:new THREE.Vector3(1,0,0),weapon:'pistol',time:1});assert(view.jetpack.exhaust.visible);const axis=new THREE.Vector3(0,1,0).applyQuaternion(view.jetpack.exhaust.children[0].quaternion);assert(axis.x<-.9,'exhaust points opposite travel');
view.jetpack.update({jetJump:.2,weapon:'pistol'});const upAxis=new THREE.Vector3(0,1,0).applyQuaternion(view.jetpack.exhaust.children[0].quaternion);assert(upAxis.y<-.99,'second jump exhaust points downward');
settle({boostPhase:-1,jetJump:0,speed:0});assert(Math.abs(avatar.motion.rotation.z)<.001,'lean resets after boost');
console.log('PASS: fixed boost feet, directional torso lean, first/second jump separation, directional exhaust, recovery');
assert(!avatar.backpack.visible,'original player backpack removed');
const packSize=new THREE.Box3().setFromObject(view.jetpack.root).getSize(new THREE.Vector3());assert(packSize.x<.8&&packSize.y<.8,'compact pack fits the two metre frame');assert.deepEqual(view.jetpack.root.scale.toArray(),[.624,.624,.624],'authored pack scale stays uniform');
for(const weapon of ['rapid','flame','pistol']){
 settle({weapon,boostPhase:-1,jetJump:0,speed:0});
 assert.equal(view.jetpack.root.userData.variant,weapon==='pistol'?'standard':weapon,'jetpack changes variant with weapon');
 for(const [type,module]of Object.entries(view.equipment.packs)){
  assert.equal(module.parent,view.jetpack.root,'supply module is part of jetpack');
  assert.equal(module.visible,type===weapon,'only equipped module visible');
 }
 assert.equal(view.equipment.root.visible,weapon!=='pistol','connection only visible for heavy weapons');
}
console.log('PASS: removed original bag, compact jetpack, integrated ammo/fuel variants and switching cleanup');

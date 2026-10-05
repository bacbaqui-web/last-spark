import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createRobot} from '../robot.js';
import {createThirdPersonView} from '../third-person.js';
for(const weapon of ['pistol','shotgun','sniper','rapid','flame']){
 const avatar=createRobot(),view=createThirdPersonView(avatar,[weapon]),state={position:new THREE.Vector3(0,1.7,0),yaw:0,pitch:0,weapon,velocity:new THREE.Vector3(),motionPreview:true,disableCustomMotion:true,dt:1/60};
 view.pose(state);
 const grip=view.models[weapon].position.clone();
 const poses=[],weaponHand=[];
 for(const phase of [0,1/6,.5,1]){
  view.pose({...state,meleePhase:phase});
  assert.equal(avatar.root.userData.motion,'Punch_Cross_Left');
  assert(view.models[weapon].position.distanceTo(grip)<1e-6,'weapon stays in trigger hand');

  poses.push(avatar.arms[0].hand.getWorldPosition(new THREE.Vector3()));
  weaponHand.push(avatar.arms[1].hand.getWorldPosition(new THREE.Vector3()));
 }
 assert(poses[0].distanceTo(poses[1])>.5,'free left hand reaches gameplay contact');
 assert(weaponHand[0].distanceTo(weaponHand[1])<.3,'right weapon hand does not punch');
 assert(poses[0].distanceTo(poses[3])<.001,'source returns to guard');
 assert(poses[1].distanceTo(poses[2])>.1,'follow-through continues after contact');
}
console.log('PASS: mirrored source left cross, contact timing, weapon attachment and recovery across firearm types');

import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createRobot} from '../robot.js';
import {createThirdPersonView} from '../third-person.js';
import {actionState} from '../motion-settings.js';
const avatar=createRobot(),view=createThirdPersonView(avatar,['knife','pistol']);
const waist=avatar.bones.find(b=>b.name==='spine_01'),socket=waist.position.clone();
for(const weapon of ['knife','pistol']){
 const state=actionState(weapon,'move',.25);
 view.pose(state);avatar.root.updateMatrixWorld(true);
 const snapshot=avatar.bones.map(b=>({p:b.getWorldPosition(new THREE.Vector3()),q:b.getWorldQuaternion(new THREE.Quaternion())}));
 for(let i=0;i<30;i++)view.pose(state);
 avatar.root.updateMatrixWorld(true);
 for(let i=0;i<avatar.bones.length;i++){
  const b=avatar.bones[i];
  assert(b.getWorldPosition(new THREE.Vector3()).distanceTo(snapshot[i].p)<1e-5,`${weapon}: same preview frame keeps ${b.name} stationary`);
  assert(b.getWorldQuaternion(new THREE.Quaternion()).normalize().angleTo(snapshot[i].q.clone().normalize())<1e-5,`${weapon}: same preview frame keeps ${b.name} rotation`);
 }
 for(let frame=0;frame<=30;frame++){view.pose(actionState(weapon,'move',frame/30));assert(waist.position.distanceTo(socket)<1e-8,`${weapon}: waist socket stays connected to pelvis`);}
 assert(avatar.root.userData.sourceSprint,'preview uses gameplay sprint');
}
console.log('PASS: knife and gun run previews remain stationary on repeated frame sampling');

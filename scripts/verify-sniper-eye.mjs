import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createRobot} from '../robot.js';
import {createThirdPersonView} from '../third-person.js';
const avatar=createRobot(),view=createThirdPersonView(avatar,['sniper']);
for(const yaw of [0,.9])for(const pitch of [0,.3,-.3]){
 view.pose({position:new THREE.Vector3(0,1.7,0),yaw,pitch,weapon:'sniper',firing:true,motionPreview:true,dt:1/60});
 const scope=view.models.sniper.localToWorld(new THREE.Vector3(...view.models.sniper.userData.scopeEye)),rightEye=avatar.head.localToWorld(new THREE.Vector3(-.22,.05,.52)),leftEye=avatar.head.localToWorld(new THREE.Vector3(.22,.05,.52));
 assert(rightEye.distanceTo(scope)<.001,'right eye meets scope');assert(leftEye.distanceTo(scope)>.08,'left eye remains beside scope');
 const shoulders=avatar.arms.map(a=>a.shoulder.getWorldPosition(new THREE.Vector3()));assert(shoulders[1].y>shoulders[0].y+.02,'right shoulder rises with torso while both sockets remain attached');
}
console.log('PASS: sniper uses right eye, tilts head, and raises attached right shoulder');

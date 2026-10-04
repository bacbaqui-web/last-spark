import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createRobot,animateRobot} from '../robot.js';
import {createThirdPersonView} from '../third-person.js';
const avatar=createRobot(false,'player',.82),view=createThirdPersonView(avatar,['pistol']);
for(const yaw of[0,.7,Math.PI])for(const pitch of[0,.35,-.35]){
 for(let i=0;i<60;i++)view.pose({position:new THREE.Vector3(0,1.7,0),yaw,pitch,weapon:'pistol',speed:10.8,velocity:new THREE.Vector3(0,0,-10.8).applyAxisAngle(new THREE.Vector3(0,1,0),yaw),grounded:true,dt:1/60});
 const forward=new THREE.Vector3(0,0,1).applyQuaternion(avatar.head.getWorldQuaternion(new THREE.Quaternion())),wanted=new THREE.Vector3(0,Math.sin(pitch),Math.cos(pitch)).applyQuaternion(avatar.root.getWorldQuaternion(new THREE.Quaternion()));
 assert(forward.dot(wanted)>.999,'helmet faces aim without following the bowed torso');
}
const enemy=createRobot();for(let i=0;i<60;i++)animateRobot(enemy,1/60,{speed:6.2,elevation:0});const forward=new THREE.Vector3(0,0,1).applyQuaternion(enemy.head.getWorldQuaternion(new THREE.Quaternion()));assert(Math.abs(forward.y)<.001,'running enemy looks ahead');
console.log('PASS: level gaze while leaning/running, rotated headings and upward/downward aim');

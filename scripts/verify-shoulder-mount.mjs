import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createRobot} from '../robot.js';
import {createThirdPersonView} from '../third-person.js';
const weapons=['pistol','sniper','rocket','rapid','flame','bow','knife'];
const avatar=createRobot(),view=createThirdPersonView(avatar,weapons),chest=avatar.body.children.find(o=>o.isMesh&&!o.userData.cosmetic);
let baseline;
for(const weapon of weapons)for(const action of [{},{firing:true},{speed:10.8,velocity:new THREE.Vector3(0,0,-10.8)},{bowDrawing:true,bowCharge:2.2}]){
 view.pose({position:new THREE.Vector3(0,1.7,0),yaw:.7,pitch:.2,weapon,dt:1/60,grounded:true,motionPreview:true,...action});
 const sockets=avatar.arms.map(arm=>chest.worldToLocal(arm.shoulder.getWorldPosition(new THREE.Vector3())));
 assert(Math.abs(sockets[0].x+sockets[1].x)<1e-5,'shoulders mirror each other');
 assert(Math.abs(sockets[0].y-sockets[1].y)<1e-5&&Math.abs(sockets[0].z-sockets[1].z)<1e-5);
 baseline??=sockets.map(p=>p.clone());for(let i=0;i<2;i++)assert(sockets[i].distanceTo(baseline[i])<1e-5,'shoulder socket remains fixed on torso');
}
console.log('PASS: both shoulders remain fixed and symmetric on torso across weapons, idle, fire, run and bow draw');

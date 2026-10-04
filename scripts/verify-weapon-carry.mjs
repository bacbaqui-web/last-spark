import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createRobot} from '../robot.js';
import {createThirdPersonView} from '../third-person.js';
const avatar=createRobot(),view=createThirdPersonView(avatar,['pistol']);
const chest=avatar.bones.find(b=>b.name==='spine_03'),sample={position:new THREE.Vector3(0,1.7,0),yaw:0,pitch:0,weapon:'pistol',speed:10.8,velocity:new THREE.Vector3(0,0,-10.8),grounded:true,dt:1/60};
const heights=[],chestHeights=[];
for(let i=0;i<150;i++){view.pose(sample);if(i>30){heights.push(view.models.pistol.getWorldPosition(new THREE.Vector3()).y);chestHeights.push(chest.getWorldPosition(new THREE.Vector3()).y);}}
assert(Math.max(...heights)-Math.min(...heights)>.025,'carried gun follows visible body bounce');
const carryMean=heights.reduce((a,b)=>a+b,0)/heights.length;
for(let i=0;i<45;i++)view.pose({...sample,firing:true,flash:i%3===0});
const firingHeight=view.models.pistol.getWorldPosition(new THREE.Vector3()).y;
assert(firingHeight>carryMean+.06,'firing raises weapon toward the face and shoulder');
const model=view.models.pistol,trigger=new THREE.Vector3(0,-.33,.20),hand=avatar.arms[1].hand;
assert(model.localToWorld(trigger).distanceTo(hand.getWorldPosition(new THREE.Vector3()))<.001,'weapon grip stays attached to trigger hand');
console.log('PASS: moving body carries weapon, firing raises shoulder pose, trigger grip stays attached');

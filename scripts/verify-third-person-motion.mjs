import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createRobot,disposeRobot} from '../robot.js';
import {createThirdPersonView} from '../third-person.js';
const avatar=createRobot(),types=['knife','bow','chainsaw','pistol','rapid','shotgun','sniper','rail','rocket','flame','laser'],view=createThirdPersonView(avatar,types);
const base={position:new THREE.Vector3(0,1.7,0),yaw:0,pitch:0,weapon:'knife',speed:0,velocity:new THREE.Vector3(),grounded:true,knifePhase:-1,rollPhase:-1,throwPhase:-1,meleePhase:-1,dt:1/60};
const bone=name=>avatar.bones.find(b=>b.name===name);
function settle(state,frames=90){for(let i=0;i<frames;i++)view.pose({...base,...state});}
const rush={knifePhase:.4,knifeRush:true,knifeDirection:new THREE.Vector3(0,0,-1)};
settle({...rush,speed:30,velocity:new THREE.Vector3(0,0,-30)});assert.equal(avatar.root.userData.sourceMotion,'AuthoredDragonSlash');const thigh=bone('thigh_l').quaternion.clone();settle({...rush,speed:100,velocity:new THREE.Vector3(0,0,-100)});assert(thigh.angleTo(bone('thigh_l').quaternion)<.002,'rush retains planted authored legs at different speeds');
settle({weapon:'pistol',speed:30,velocity:new THREE.Vector3(30,0,0),rollPhase:.4,rollDirection:new THREE.Vector3(1,0,0)});assert.equal(avatar.root.userData.motion,'JetBoost');assert(Math.abs(Math.sin(avatar.root.rotation.y))<.01,'lateral boost retains aim facing');assert(avatar.motion.rotation.z>0,'boost leans toward lateral movement');
for(const yaw of [0,.9,-2.4])for(const pitch of [-.6,0,.7])for(const charge of [.2,1.1,2.2]){settle({weapon:'bow',yaw,pitch,bowDrawing:true,bowCharge:charge,bowMotionClip:'BowLoad'});const aim=new THREE.Vector3(0,0,-1).applyQuaternion(new THREE.Quaternion().setFromEuler(new THREE.Euler(pitch,yaw,0,'YXZ'))),arrow=view.models.bow.userData.nockedArrow,axis=new THREE.Vector3(0,0,-1).applyQuaternion(arrow.getWorldQuaternion(new THREE.Quaternion()));assert(axis.dot(aim)>.995,'nocked arrow follows aim throughout draw/yaw/pitch');}
for(const weapon of types)for(const state of [{},{speed:9.8,velocity:new THREE.Vector3(0,0,-9.8)},{grounded:false,velocity:new THREE.Vector3(0,8,0)},{grounded:true},{pitch:.8},{throwPhase:.4},{meleePhase:.4}]){settle({weapon,...state},20);for(const b of avatar.bones)assert([...b.position.toArray(),...b.quaternion.toArray(),...b.matrixWorld.elements].every(Number.isFinite),weapon+' has finite full-body transforms');}
settle({weapon:'pistol',throwPhase:.4});assert.equal(avatar.root.userData.motion,'OverhandThrow');settle({weapon:'pistol',meleePhase:.4});assert.equal(avatar.root.userData.motion,'Punch_Cross_Left');
settle({weapon:'pistol',speed:9.8,velocity:new THREE.Vector3(0,0,-9.8)});const beforeStop=bone('thigh_l').quaternion.clone();settle({weapon:'pistol'},1);assert(beforeStop.angleTo(bone('thigh_l').quaternion)<.7,'stop does not snap leg pose');
disposeRobot(avatar);console.log('PASS authored rush, boost facing/lean, bow aiming across 27 poses, finite movement/air/landing/aim/throw/melee for every weapon and smooth stop');

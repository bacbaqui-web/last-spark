import assert from 'node:assert/strict';
import {createRobot,animateRobot} from '../robot.js';
import {createThirdPersonView} from '../third-person.js';
import * as THREE from 'three';
const runner=createRobot();
for(const speed of [1.5,3,6.2,3,0])for(let i=0;i<30;i++){
 animateRobot(runner,1/60,{speed});
 for(const name of ['Walk_Loop','Jog_Fwd_Loop','Sprint_Loop']){
  const leg=runner.actions[name],upper=runner.actions[name+'_Upper'];
  assert(Math.abs(leg.time/leg.getClip().duration-upper.time/upper.getClip().duration)<1e-6,'upper and lower body share stride phase');
 }
 assert(runner.strideRate<=1.4&&Number.isFinite(runner.stridePhase),'stride remains bounded across speed transitions');
}
let avatar=createRobot(),view=createThirdPersonView(avatar,['pistol']);
let previous=null;const travel=new THREE.Vector3(0,1.7,0);
for(let i=0;i<180;i++){
 const angle=i*Math.PI/360,velocity=new THREE.Vector3(Math.sin(angle)*10.8,0,-Math.cos(angle)*10.8);
 travel.addScaledVector(velocity,1/60);view.pose({position:travel,yaw:0,pitch:0,weapon:'pistol',speed:10.8,velocity,grounded:true,dt:1/60});
 const thigh=avatar.bones.find(b=>b.name==='thigh_l').quaternion.clone();
 if(previous)assert(previous.angleTo(thigh)<.5,'direction transition does not snap the leg pose');
 previous=thigh;
}
console.log('PASS: synchronized body stride, bounded cadence and smooth directional running');
avatar=createRobot();view=createThirdPersonView(avatar,['pistol']);let contacts=0,held=0,flightFrames=0,lockedFrames=0,lastContacts=[null,null];
for(let i=0;i<240;i++){
 view.pose({position:new THREE.Vector3(0,1.7,-i*.18),yaw:0,pitch:0,weapon:'pistol',speed:10.8,velocity:new THREE.Vector3(0,0,-10.8),grounded:true,dt:1/60});
 if(avatar.root.userData.runFlight){flightFrames++;assert(avatar.root.userData.footContacts.every(a=>a===null),'flight releases both feet');}
 avatar.root.userData.footContacts.forEach((anchor,index)=>{
  if(anchor){contacts++;const foot=avatar.bones.find(b=>b.name===`foot_${index?'r':'l'}`).getWorldPosition(new THREE.Vector3());if(avatar.root.userData.footContactWeights[index]>.99){lockedFrames++;assert(foot.distanceTo(new THREE.Vector3(...anchor))<.04,'full stance keeps foot at its world anchor');}if(lastContacts[index]&&new THREE.Vector3(...anchor).distanceTo(new THREE.Vector3(...lastContacts[index]))<1e-6)held++;}
  lastContacts[index]=anchor;
 });
}
assert(flightFrames>30&&lockedFrames>5,'running includes flight and firm support');
assert(contacts>15&&held>5,'running repeatedly plants and holds feet');
view.pose({position:new THREE.Vector3(0,3,-44),yaw:0,pitch:0,weapon:'pistol',speed:10.8,velocity:new THREE.Vector3(0,6,-10.8),grounded:false,dt:1/60});
assert(avatar.root.userData.footContacts.every(a=>a===null),'jump releases contact anchors');
console.log('PASS: grounded world-space foot locking, repeated contacts, jump release');

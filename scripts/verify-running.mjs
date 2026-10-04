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
assert(avatar.root.userData.footContacts.every(a=>a===null),'authored locomotion has no procedural contact targets');
console.log('PASS: source directional motion without runtime ankle placement');

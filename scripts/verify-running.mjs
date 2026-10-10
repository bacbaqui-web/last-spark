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
const {createStepLocomotion,directionalCadence}=await import('../step-locomotion.js');
const controller=createStepLocomotion(),axis=new THREE.Vector3(0,1,0);
for(const yaw of [0,.7,Math.PI]){
 const forward=new THREE.Vector3(0,0,-1).applyAxisAngle(axis,yaw);
 assert.equal(controller.speedFor(forward,yaw),7.2,'forward runs by default regardless of world heading');
 for(const local of [new THREE.Vector3(1,0,0),new THREE.Vector3(-1,0,0),new THREE.Vector3(0,0,1),new THREE.Vector3(1,0,-1).normalize()]){
  const direction=local.applyAxisAngle(axis,yaw);
  assert.equal(controller.speedFor(direction,yaw),7.2,'all directions run by default');
  assert.equal(directionalCadence(10.8,direction,yaw),directionalCadence(10.8,forward,yaw),'all directions share cadence');
  assert.equal(controller.speedFor(direction,yaw,false,true),7.2,'running uses the increased speed');
  assert.equal(controller.speedFor(direction,yaw,true,true),2.4,'aim overrides running');
  assert.equal(controller.speedFor(direction,yaw,true),2.4,'aim speed preserved');
  const robot=createRobot(),view=createThirdPersonView(robot,['pistol']);
  for(let frame=0;frame<90;frame++)view.pose({position:new THREE.Vector3(0,1.7,0),yaw,weapon:'pistol',speed:2.8,sprinting:false,velocity:direction.clone().multiplyScalar(2.8),grounded:true,dt:1/60});
  assert(!robot.root.userData.sourceSprint&&robot.root.userData.motion.includes('TPSWalk'),'default movement uses a walking pose');
  for(let frame=0;frame<90;frame++)view.pose({position:new THREE.Vector3(0,1.7,0),yaw,weapon:'pistol',speed:5.4,velocity:direction.clone().multiplyScalar(5.4),grounded:true,dt:1/60});
  assert(robot.root.userData.sourceSprint,'every direction selects the preferred sprint');
 }
}
assert.equal(controller.speedFor(new THREE.Vector3(0,0,-1),0,false,false),3.2,'explicit walking speed');console.log('PASS default running, Ctrl walking gait and aim override at rotated headings');

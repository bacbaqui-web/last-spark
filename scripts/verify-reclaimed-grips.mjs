import assert from 'node:assert/strict';
import * as T from 'three';
import {createRobot} from '../robot.js';
import {createArmedMotionSampler} from '../robot-motion-weapons.js';
import {MOTION_STUDIES} from '../robot-motion-player.js';
import {RECLAIMED_GUNS} from '../reclaimed-weapons.js';
const r=createRobot(false,'player'),sampler=createArmedMotionSampler(r),bones=Object.fromEntries(r.bones.map(b=>[b.name,b]));
let framesChecked=0,maxContactError=0,maxRoll=0,maxLateralTravel=0,maxFingerDistance=0,maxFootError=0,maxHipTravel=0;
for(const type of Object.keys(RECLAIMED_GUNS))for(const aim of [false,true])for(const study of MOTION_STUDIES){
 sampler.setWeapon(type);sampler.setAim(aim);sampler.select(study.id);const chestX=[],hipX=[];

 for(let f=1;f<=sampler.frames;f++){
  sampler.sample(f);framesChecked++;const model=sampler.view.models[type];
  if(type==='rapid'&&sampler.study.id==='walk'){
   const a=r.arms[0],p=b=>b.getWorldPosition(new T.Vector3()),length=p(a.shoulder).distanceTo(p(a.elbow))+p(a.elbow).distanceTo(p(a.hand));
   assert(p(a.shoulder).distanceTo(p(a.hand))/length>.94,'minigun support arm stays nearly extended');
  }
  if(type==='rocket'){
   const direction=new T.Vector3(0,0,-1).applyQuaternion(model.getWorldQuaternion(new T.Quaternion()));
   assert(Math.abs(direction.x)<.001&&direction.z>.98,'launcher faces straight ahead');
   if(aim){
    const eye=r.salvageFrame.anchors.Head.localToWorld(new T.Vector3(-.049,-.004,.075));
    const ocular=model.localToWorld(new T.Vector3(...model.userData.scopeEye)).addScaledVector(direction,-.025);
    assert(eye.distanceTo(ocular)<.001,'right eye meets the eyecup');
   }else assert(direction.y<-.13,'relaxed launcher points slightly down');
  }
  for(const [side,key]of [['l','left'],['r','right']]){
   const {point,grip}=model.userData.handContacts[key],target=model.localToWorld(new T.Vector3(...grip));
   const contact=r.salvageFrame.anchors['hand_'+side].localToWorld(new T.Vector3(...point)),err=contact.distanceTo(target);maxContactError=Math.max(maxContactError,err);
   assert(err<.001,`${type}/${aim}/${study.id}/${f}/${side}: both palms stay on their handles`);
   for(const finger of ['thumb','index','middle','ring','pinky']){
    const tip=bones[`${finger}_04_leaf_${side}`].getWorldPosition(new T.Vector3()),distance=tip.distanceTo(target);
    maxFingerDistance=Math.max(maxFingerDistance,distance);assert(distance<.115,`${type}/${side}/${finger}: fingertips wrap close to handle`);
   }
  }
  const chest=r.salvageFrame.anchors.spine_03,relative=r.root.getWorldQuaternion(new T.Quaternion()).invert().multiply(chest.getWorldQuaternion(new T.Quaternion()));
  const euler=new T.Euler().setFromQuaternion(relative,'YXZ');maxRoll=Math.max(maxRoll,Math.abs(euler.z));
  if(type==='rapid'){
   assert(Math.abs(euler.y+Math.PI/4)<.005,'minigun chest faces 45 degrees right');
   const belt=sampler.view.minigunBelt.root,mesh=belt.children[0],matrix=new T.Matrix4();
   assert(belt.visible,'minigun belt is present');
   for(const [index,target]of [[0,sampler.view.minigunAmmo.localToWorld(new T.Vector3(-.208,-.033,0))],[mesh.count-1,model.localToWorld(new T.Vector3(...model.userData.beltFeed))]]){
    mesh.getMatrixAt(index,matrix);const endpoint=mesh.localToWorld(new T.Vector3().setFromMatrixPosition(matrix));
    assert(endpoint.distanceTo(target)<.001,'ammo belt endpoint follows its connector');
   }
  }
  if(study.id==='sprint'&&type!=='rapid'){assert(euler.x>.25&&euler.x<.32,'running torso leans forward');if(f===2||f===12)assert(r.root.userData.runImpact>.95,'compression matches alternating foot strikes');}
  assert(Math.abs(euler.z)<T.MathUtils.degToRad(1),'gun carry does not inherit the source sideways lean');
  hipX.push(r.root.worldToLocal(bones.pelvis.getWorldPosition(new T.Vector3())).x);
  chestX.push(r.root.worldToLocal(chest.getWorldPosition(new T.Vector3())).x);
  for(const [i,side]of ['l','r'].entries()){const err=bones['foot_'+side].getWorldPosition(new T.Vector3()).distanceTo(new T.Vector3(...r.root.userData.gaitFootTargets[i]));maxFootError=Math.max(maxFootError,err);assert(err<.006,`foot path error ${study.id}/${f}: ${err}`);}
 }
 const hipTravel=Math.max(...hipX)-Math.min(...hipX);maxHipTravel=Math.max(maxHipTravel,hipTravel);assert(hipTravel<.02,'pelvis lateral sway remains below 2cm');
 const travel=Math.max(...chestX)-Math.min(...chestX);maxLateralTravel=Math.max(maxLateralTravel,travel);assert(travel<.025,study.id+' upper body stays centered');
}
console.log(JSON.stringify({pass:true,framesChecked,maxFootErrorMm:maxFootError*1000,maxHipTravelCm:maxHipTravel*100,maxContactErrorMm:maxContactError*1000,maxRollDegrees:T.MathUtils.radToDeg(maxRoll),maxLateralTravelCm:maxLateralTravel*100,maxFingerDistanceCm:maxFingerDistance*100},null,2));

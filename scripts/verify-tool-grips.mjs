import assert from 'node:assert/strict';
import * as T from 'three';
import {createRobot} from '../robot.js';
import {createArmedMotionSampler} from '../robot-motion-weapons.js';
import {MOTION_STUDIES} from '../robot-motion-player.js';
const robot=createRobot(false,'player'),sampler=createArmedMotionSampler(robot);let frames=0,maxError=0;
for(const weapon of ['knife','bow','chainsaw'])for(const aim of [false,true])for(const study of MOTION_STUDIES){
 sampler.setWeapon(weapon);sampler.setAim(aim);sampler.select(study.id);
 for(let f=1;f<=sampler.frames;f++){
  sampler.sample(f);frames++;const model=sampler.view.models[weapon];
  for(const [side,contact]of Object.entries(model.userData.handContacts)){

   const palm=robot.salvageFrame.anchors['hand_'+side[0]].localToWorld(new T.Vector3(...contact.point));
   const error=palm.distanceTo(model.localToWorld(new T.Vector3(...contact.grip)));maxError=Math.max(maxError,error);
   assert(error<.001,`${weapon}/${aim}/${study.id}/${f}/${side} palm detached: ${error}`);
  }
  if(weapon==='bow'&&!aim){const p=model.userData.string.geometry.attributes.position;assert(Math.abs(p.getZ(1)+.22)<.00001,'resting string is undrawn');const dorsal=new T.Vector3(1,0,0).applyQuaternion(robot.salvageFrame.anchors.hand_l.getWorldQuaternion(new T.Quaternion()));assert(dorsal.y>.6,'left hand back faces upward without twisting the wrist');}
  if(weapon==='bow'&&aim){const p=model.userData.string.geometry.attributes.position,grip=model.userData.handContacts.right.grip;assert(new T.Vector3().fromBufferAttribute(p,1).distanceTo(new T.Vector3(...grip))<.00001);}
 }
}
console.log({pass:true,frames,maxPalmErrorMm:maxError*1000});

import * as THREE from 'three';
import {armIK} from './sword-combat.js';
// Contact anchors live in world space. Source animation still owns the swing leg.
export function createFootPlant(avatar){
 const bones=Object.fromEntries(avatar.bones.map(b=>[b.name,b])),feet=['l','r'].map(side=>({side,hip:bones['thigh_'+side],knee:bones['calf_'+side],foot:bones['foot_'+side],anchor:null,age:0,lastHeight:Infinity}));let blend=0,phase=0;const lastPose=new Map();
 return function update(state){
  const {dt=0,speed=0,grounded=true,position,velocity}=state,enabled=grounded&&speed>.5&&state.knifePhase<0&&!(state.boostPhase>=0)&&!(state.rollPhase>=0)&&!(state.jetJump>0)&&!state.motionPreview;
  blend=THREE.MathUtils.damp(blend,enabled?Math.min(1,speed/5):0,10,dt);phase+=dt*Math.min(1.3,speed/9.8)*Math.PI*4;
  if(enabled){avatar.root.updateMatrixWorld(true);bones.pelvis.position.add(new THREE.Vector3(0,(Math.cos(phase)*.028-.09)*blend,0).applyQuaternion(bones.pelvis.parent.getWorldQuaternion(new THREE.Quaternion()).invert()));avatar.motion.rotation.x+=.035*blend;bones.neck_01.rotateX(-avatar.motion.rotation.x*.8-.07*blend);}
  avatar.root.updateMatrixWorld(true);
  const heading=avatar.root.getWorldQuaternion(new THREE.Quaternion());
  for(const f of feet){
   const raw=f.foot.getWorldPosition(new THREE.Vector3()),floor=state.sampleGround?.(raw.x,raw.z)??position.y-1.7,height=raw.y-floor;
   const descending=height<=f.lastHeight+.003;f.lastHeight=height;
   if(!enabled){f.anchor=null;f.age=0;continue;}
   if(!f.anchor&&height<.23&&descending){f.anchor=raw.clone();f.anchor.y=floor+.085;f.age=0;}
   if(!f.anchor)continue;
   f.age+=dt;const hip=f.hip.getWorldPosition(new THREE.Vector3()),knee=f.knee.getWorldPosition(new THREE.Vector3()),reach=hip.distanceTo(knee)+knee.distanceTo(raw);
   if(f.age>.18||height>.29||hip.distanceTo(f.anchor)>reach*.98||raw.distanceTo(f.anchor)>.85||Math.abs(floor-(f.anchor.y-.085))>.15){f.anchor=null;continue;}
   const pole=knee.clone().add(new THREE.Vector3(0,0,.12).applyQuaternion(heading));
   armIK({shoulder:f.hip,elbow:f.knee,hand:f.foot},f.anchor,pole);
   f.foot.quaternion.copy(f.foot.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(heading));f.foot.updateWorldMatrix(false,true);
  }
  if(enabled)for(const f of feet)for(const bone of[f.hip,f.knee]){const last=lastPose.get(bone);if(last)bone.quaternion.copy(last.clone().rotateTowards(bone.quaternion,.35));lastPose.set(bone,bone.quaternion.clone());}else lastPose.clear();
  avatar.root.updateMatrixWorld(true);avatar.root.userData.footContactAges=feet.map(f=>f.anchor?f.age:0);
  avatar.root.userData.footContacts=feet.map(f=>f.anchor?f.anchor.toArray():null);
 };
}

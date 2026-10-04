import * as THREE from 'three';
import {armIK} from './sword-combat.js';
// Stance is a short part of the stride, followed by an explicit flight interval.
// Anchor only on stance entry: swing feet must never be caught by a height test.
export function createFootPlant(avatar){
 const bones=Object.fromEntries(avatar.bones.map(b=>[b.name,b]));
 const feet=['l','r'].map((side,index)=>({side,index,hip:bones['thigh_'+side],knee:bones['calf_'+side],foot:bones['foot_'+side],anchor:null,age:0,inStance:false}));
 let blend=0;
 return function update(state){
  const {dt=0,speed=0,grounded=true}=state;
  const enabled=grounded&&speed>.5&&(state.knifePhase??-1)<0&&!(state.boostPhase>=0)&&!(state.rollPhase>=0)&&!(state.jetJump>0)&&!state.motionPreview;
  blend=THREE.MathUtils.damp(blend,enabled?Math.min(1,speed/5):0,10,dt);
  const phase=avatar.root.userData.stridePhase||0,running=speed>=3;
  // Each half-stride has stance, push-off, then flight. Walk retains longer contact.
  const start=.02,end=running?.18:.49;
  const half=phase%.5,flight=running&&(half>=end||half<start);
  if(enabled){
   avatar.root.updateMatrixWorld(true);
   const lift=running?-.065*Math.cos((phase-.065)*Math.PI*4):0;
   avatar.root.userData.runPelvisOffset=lift*blend;
   bones.pelvis.position.add(new THREE.Vector3(0,lift*blend,0).applyQuaternion(bones.pelvis.parent.getWorldQuaternion(new THREE.Quaternion()).invert()));
   const twist=running?-.10*Math.sin(phase*Math.PI*2):0;
   const torso=bones.spine_01;
   const up=new THREE.Vector3(0,1,0).applyQuaternion(torso.parent.getWorldQuaternion(new THREE.Quaternion()).invert());
   torso.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(up,twist*blend));
   avatar.root.userData.runTorsoTwist=twist*blend;
   bones.neck_01.rotateX(-avatar.motion.rotation.x*.8-.05*blend);
  }
  avatar.root.updateMatrixWorld(true);
  for(const f of feet){
   f.weight=0;const local=(phase-f.index*.5+1)%1,stance=enabled&&local>=start&&local<end;
   if(!stance){f.anchor=null;f.age=0;f.inStance=false;continue;}
   const raw=f.foot.getWorldPosition(new THREE.Vector3());
   if(!f.inStance){f.anchor=raw.clone();f.anchor.y=(state.sampleGround?.(raw.x,raw.z)??state.position.y-1.7)+.082;f.age=0;}
   f.inStance=true;f.age+=dt;
   if(!f.anchor)continue;
   const hip=f.hip.getWorldPosition(new THREE.Vector3()),knee=f.knee.getWorldPosition(new THREE.Vector3()),reach=hip.distanceTo(knee)+knee.distanceTo(raw);
   // Ease off near full leg extension instead of snapping or replanting mid-stride.
   // Keep support fully locked; move the pelvis slightly if the leg would overextend.
   const distance=hip.distanceTo(f.anchor),limit=reach*.97;
   if(distance>limit){
    const correction=f.anchor.clone().sub(hip).multiplyScalar((distance-limit)/distance);
    bones.pelvis.position.add(correction.applyQuaternion(bones.pelvis.parent.getWorldQuaternion(new THREE.Quaternion()).invert()).divide(bones.pelvis.parent.getWorldScale(new THREE.Vector3())));
    avatar.root.updateMatrixWorld(true);
   }
   const weight=(1-THREE.MathUtils.smoothstep(local,end-.09,end))*THREE.MathUtils.smoothstep(blend,0,.8);
   f.weight=weight;const target=f.anchor.clone(),pole=knee.clone();
   const hipRotation=f.hip.quaternion.clone(),kneeRotation=f.knee.quaternion.clone();
   const footRotation=f.foot.getWorldQuaternion(new THREE.Quaternion());
   armIK({shoulder:f.hip,elbow:f.knee,hand:f.foot},target,pole);
   f.hip.quaternion.copy(hipRotation.slerp(f.hip.quaternion,weight));
   f.knee.quaternion.copy(kneeRotation.slerp(f.knee.quaternion,weight));
   avatar.root.updateMatrixWorld(true);
   // Preserve source ankle roll instead of flattening the foot every frame.
   f.foot.quaternion.copy(f.foot.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(footRotation));
  }
  avatar.root.updateMatrixWorld(true);
  avatar.root.userData.footContactAges=feet.map(f=>f.anchor?f.age:0);
  avatar.root.userData.footContacts=feet.map(f=>f.anchor?f.anchor.toArray():null);
  avatar.root.userData.footContactWeights=feet.map(f=>f.weight);
  avatar.root.userData.runFlight=enabled&&flight;
 };
}

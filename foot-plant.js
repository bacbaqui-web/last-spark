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
  const start=.02,end=running?.12:.49;
  const half=phase%.5,flight=running&&(half>=end||half<start);
  if(enabled){
   avatar.root.updateMatrixWorld(true);
   const lift=running?.035*Math.sin(Math.PI*THREE.MathUtils.clamp((half-end)/(.5-end),0,1)):0;
   bones.pelvis.position.add(new THREE.Vector3(0,lift*blend,0).applyQuaternion(bones.pelvis.parent.getWorldQuaternion(new THREE.Quaternion()).invert()));
   bones.neck_01.rotateX(-avatar.motion.rotation.x*.8-.05*blend);
  }
  avatar.root.updateMatrixWorld(true);
  for(const f of feet){
   f.weight=0;const local=(phase-f.index*.5+1)%1,stance=enabled&&local>=start&&local<end;
   if(!stance){f.anchor=null;f.age=0;f.inStance=false;continue;}
   const raw=f.foot.getWorldPosition(new THREE.Vector3());
   if(!f.inStance){f.anchor=raw.clone();f.age=0;}
   f.inStance=true;f.age+=dt;
   if(!f.anchor)continue;
   const hip=f.hip.getWorldPosition(new THREE.Vector3()),knee=f.knee.getWorldPosition(new THREE.Vector3()),reach=hip.distanceTo(knee)+knee.distanceTo(raw);
   // Ease off near full leg extension instead of snapping or replanting mid-stride.
   const reachWeight=1-THREE.MathUtils.smoothstep(hip.distanceTo(f.anchor)/reach,.98,1.02);
   const weight=Math.min(THREE.MathUtils.smoothstep(local,start,start+.015),1-THREE.MathUtils.smoothstep(local,end-.035,end))*blend*reachWeight;
   f.weight=weight;const target=raw.clone().lerp(f.anchor,weight),pole=knee.clone();
   const footRotation=f.foot.getWorldQuaternion(new THREE.Quaternion());
   armIK({shoulder:f.hip,elbow:f.knee,hand:f.foot},target,pole);
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

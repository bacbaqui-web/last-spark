import * as THREE from 'three';
import {armIK} from './sword-combat.js';
const smooth=t=>THREE.MathUtils.smoothstep(t,0,1);
// A contact-aware braking step. Gameplay still owns collision and translation.
export function createLocomotionFeet(avatar){
 const bones=Object.fromEntries(avatar.bones.map(b=>[b.name,b]));
 const legs=['l','r'].map(side=>({hip:bones['thigh_'+side],knee:bones['calf_'+side],foot:bones['foot_'+side]}));
 avatar.root.updateMatrixWorld(true);
 const laneSigns=legs.map(l=>Math.sign(avatar.root.worldToLocal(l.hip.getWorldPosition(new THREE.Vector3())).x)||1);
 let previousSpeed=0,previousVelocity=new THREE.Vector3(),brake=null,lastPosition=null;
 const ground=(state,p)=>(state.sampleGround?.(p.x,p.z)??state.position.y-1.7)+.082;
 function solve(leg,target,weight,adjustPelvis=true){
  avatar.root.updateMatrixWorld(true);
  const hip=leg.hip.getWorldPosition(new THREE.Vector3()),knee=leg.knee.getWorldPosition(new THREE.Vector3()),foot=leg.foot.getWorldPosition(new THREE.Vector3());
  const reach=hip.distanceTo(knee)+knee.distanceTo(foot),distance=hip.distanceTo(target);
  if(adjustPelvis&&distance>reach*.96){
   const correction=target.clone().sub(hip).multiplyScalar((distance-reach*.96)/distance*weight);
   bones.pelvis.position.add(correction.applyQuaternion(bones.pelvis.parent.getWorldQuaternion(new THREE.Quaternion()).invert()).divide(bones.pelvis.parent.getWorldScale(new THREE.Vector3())));
   avatar.root.updateMatrixWorld(true);
  }
  const h=leg.hip.quaternion.clone(),k=leg.knee.quaternion.clone(),ankle=leg.foot.getWorldQuaternion(new THREE.Quaternion());
  armIK({shoulder:leg.hip,elbow:leg.knee,hand:leg.foot},target,knee);
  leg.hip.quaternion.copy(h.slerp(leg.hip.quaternion,weight));leg.knee.quaternion.copy(k.slerp(leg.knee.quaternion,weight));
  avatar.root.updateMatrixWorld(true);leg.foot.quaternion.copy(leg.foot.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(ankle));
 }
 function separateFeet(preferred){
  avatar.root.updateMatrixWorld(true);
  const axis=new THREE.Vector3(1,0,0).applyQuaternion(avatar.root.getWorldQuaternion(new THREE.Quaternion()));
  const positions=legs.map(l=>l.foot.getWorldPosition(new THREE.Vector3()));
  const separation=positions[0].clone().sub(positions[1]).dot(axis)*laneSigns[0];
  if(separation>=.12)return;
  const contacts=avatar.root.userData.footContacts||[];
  const free=preferred??(contacts[0]?1:contacts[1]?0:positions[0].y>positions[1].y?0:1);
  const target=positions[free].clone().addScaledVector(axis,(.12-separation)*laneSigns[free]);
  solve(legs[free],target,1,false);avatar.root.updateMatrixWorld(true);
 }
 return function update(state){
  const {dt=0,speed=0,velocity=new THREE.Vector3(),moveIntent,grounded=true}=state;
  const allowed=grounded&&(state.knifePhase??-1)<0&&!(state.boostPhase>=0)&&!(state.rollPhase>=0)&&!(state.jetJump>0)&&!state.motionPreview;
  const noInput=moveIntent&&moveIntent.lengthSq()<.001;
  const teleported=lastPosition&&lastPosition.distanceTo(state.position)>3;
  if(!allowed||teleported||moveIntent?.lengthSq()>.01)brake=null;
  if(allowed&&!teleported&&!brake&&noInput&&previousSpeed>3&&speed<previousSpeed-.02&&dt>0){
   avatar.root.updateMatrixWorld(true);
   const points=legs.map(l=>l.foot.getWorldPosition(new THREE.Vector3()));
   const contacts=avatar.root.userData.footContacts||[];
   const direction=previousVelocity.clone().setY(0).normalize();
   const sideways=direction.clone().applyQuaternion(avatar.root.getWorldQuaternion(new THREE.Quaternion()).invert()).x;
   // On a side stop, the trailing foot supports the leading foot's braking step.
   const support=Math.abs(sideways)>.4?laneSigns.findIndex(sign=>sign*sideways<0):contacts[0]?0:contacts[1]?1:points[0].y<points[1].y?0:1,free=1-support;
   const planted=contacts[support]?new THREE.Vector3(...contacts[support]):points[support].clone();planted.y=ground(state,planted);
   const lateral=new THREE.Vector3(laneSigns[free]*.18,0,0).applyQuaternion(avatar.root.getWorldQuaternion(new THREE.Quaternion()));
   // Predict the stopping position from current exponential deceleration, then brace ahead.
   const landing=avatar.root.position.clone().addScaledVector(velocity,.085).addScaledVector(direction,.16).add(lateral);landing.y=ground(state,landing);
   const axis=new THREE.Vector3(1,0,0).applyQuaternion(avatar.root.getWorldQuaternion(new THREE.Quaternion()));
   const separation=landing.clone().sub(planted).dot(axis)*laneSigns[free];
   if(separation<.24)landing.addScaledVector(axis,(.24-separation)*laneSigns[free]);
   brake={age:0,support,free,planted,from:points[free].clone(),landing,direction,axis};
  }
  if(dt>0){previousSpeed=speed;previousVelocity.copy(velocity);lastPosition=state.position.clone();}
  if(!brake){avatar.root.userData.brakingStep=null;const lateral=velocity.clone().applyQuaternion(avatar.root.getWorldQuaternion(new THREE.Quaternion()).invert());if(allowed&&speed>.5&&Math.abs(lateral.x)>speed*.4)separateFeet();return false;}
  brake.age+=dt;const t=Math.min(1,brake.age/.24),release=1-smooth((brake.age-.48)/.22);
  const moving=brake.from.clone().lerp(brake.landing,smooth(t));moving.y+=Math.sin(Math.PI*t)*.13;
  const clearance=moving.clone().sub(brake.planted).dot(brake.axis)*laneSigns[brake.free];
  if(clearance<.16)moving.addScaledVector(brake.axis,(.16-clearance)*laneSigns[brake.free]);
  const supportWeight=(1-smooth((brake.age-.10)/.13))*release;
  const freeWeight=smooth(brake.age/.055)*release;
  const compress=-.055*Math.sin(Math.PI*t);
  bones.pelvis.position.add(new THREE.Vector3(0,compress,0).applyQuaternion(bones.pelvis.parent.getWorldQuaternion(new THREE.Quaternion()).invert()));
  const local=brake.direction.clone().applyQuaternion(avatar.root.getWorldQuaternion(new THREE.Quaternion()).invert());
  avatar.motion.rotation.x-=local.z*.13*Math.sin(Math.PI*t);avatar.motion.rotation.z+=local.x*.12*Math.sin(Math.PI*t);
  solve(legs[brake.free],moving,freeWeight);solve(legs[brake.support],brake.planted,supportWeight);
  avatar.root.updateMatrixWorld(true);
  separateFeet(brake.free);
  avatar.root.userData.brakingStep={support:brake.support,free:brake.free,phase:t,age:brake.age,landing:brake.landing.toArray(),supportAnchor:brake.planted.toArray(),supportWeight,freeWeight};
  avatar.root.userData.footContacts=legs.map((_,i)=>i===brake.support&&supportWeight===1?brake.planted.toArray():i===brake.free&&t===1&&freeWeight===1?brake.landing.toArray():null);
  avatar.root.userData.footContactWeights=legs.map((_,i)=>i===brake.support?supportWeight:t===1?freeWeight:0);
  avatar.root.userData.runFlight=false;
  if(brake.age>=.7){brake=null;avatar.root.userData.brakingStep=null;}
  return true;
 };
}

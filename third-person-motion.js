import * as THREE from 'three';
import data from './third-person-motion-data.json' with {type:'json'};
const upper=/^(spine|neck|Head|clavicle|upperarm|lowerarm|hand)/;
const lower=/^(root|pelvis|thigh|calf|foot)/;
const clips=Object.fromEntries(Object.entries(data).map(([name,clip])=>[name,{duration:clip.duration,tracks:clip.tracks.map(t=>({bone:t.name.split('.')[0],property:t.name.split('.')[1],sample:new (t.type==='quaternion'?THREE.QuaternionKeyframeTrack:THREE.VectorKeyframeTrack)(t.name,t.times,t.values).createInterpolant()}))}]));
// Gameplay owns translation. These layers preserve source torso/shoulder/hip rotations,
// while weapon grips and aim receive small final corrections in third-person.js.
export function createThirdPersonMotion(avatar){
 const bones=Object.fromEntries(avatar.bones.map(b=>[b.name,b])),previous=new Map();let clock=0,wasGrounded=true,airAge=0,landAge=1,lastWeapon='',shotKick=0,lastFlash=false;
 function apply(name,phase,mask=()=>true,weight=1){const clip=clips[name];if(!clip)return;for(const t of clip.tracks){const b=bones[t.bone];if(!b||!mask(t.bone))continue;const a=t.sample.evaluate(THREE.MathUtils.clamp(phase,0,1)*clip.duration);if(t.property==='quaternion')b.quaternion.slerp(new THREE.Quaternion().fromArray(a),weight);else b.position.lerp(new THREE.Vector3().fromArray(a),weight);}}
 function update(dt,state){
  clock+=dt;const {weapon,speed=0,velocity,yaw,pitch=0,grounded=true,knifePhase=-1,rollPhase=-1,meleePhase=-1,throwPhase=-1,bowMotionClip='BowIdle',bowMotionPhase=0,bowDrawing=false,bowCharge=0,flash=false}=state;
  if(grounded&&!wasGrounded)landAge=0;if(!grounded&&wasGrounded)airAge=0;wasGrounded=grounded;airAge+=dt;landAge+=dt;
  if(lastWeapon!==weapon){lastWeapon=weapon;shotKick=0;}if(flash&&!lastFlash)shotKick=1;lastFlash=flash;shotKick=THREE.MathUtils.damp(shotKick,0,18,dt);
  let bodyClip=weapon==='knife'?'Sword_Idle':weapon==='bow'?(bowDrawing?(bowCharge>=2.2?'BowHold':'BowLoad'):bowMotionClip==='BowRelease'?'BowRelease':'BowIdle'):['rapid','rocket','rail','chainsaw','flame'].includes(weapon)?'Idle_Rail_Loop':'Pistol_Aim_Neutral';
  const phase=bodyClip==='BowLoad'?Math.min(1,bowCharge/2.2):bodyClip==='BowRelease'?bowMotionPhase:(clock%(clips[bodyClip]?.duration||1))/(clips[bodyClip]?.duration||1);
  apply(bodyClip,phase,n=>upper.test(n)||speed<.2&&lower.test(n));
  // Eight directional source strides avoid running backward or sideways with forward feet.
  if(speed>.2&&grounded){const local=velocity.clone().applyAxisAngle(new THREE.Vector3(0,1,0),-yaw),angle=Math.atan2(local.x,-local.z),directions=['Forward','ForwardRight','Right','BackwardRight','Backward','BackwardLeft','Left','ForwardLeft'],index=(Math.round(angle/(Math.PI/4))+8)%8,clip='Strafe'+directions[index];apply(clip,(clock*Math.min(1.3,Math.max(.35,speed/9.8))/clips[clip].duration)%1,n=>lower.test(n));bodyClip+=' + '+clip;}
  if(!grounded){const clip=airAge<.15?'Jump_Start':'Jump_Loop';apply(clip,airAge<.15?airAge/.15:(clock%clips.Jump_Loop.duration)/clips.Jump_Loop.duration,n=>lower.test(n));bodyClip+=' + '+clip;}
  else if(landAge<.16){apply('Jump_Land',landAge/.16,n=>lower.test(n),1-landAge/.16);bodyClip+=' + Jump_Land';}
  if(knifePhase>=0){const p=knifePhase<.12?knifePhase/.12*.07:knifePhase<.55?.07+(knifePhase-.12)/.43*.19:.26+(knifePhase-.55)/.45*.74;apply('Sword_Dash',p);bodyClip='Sword_Dash';}
  else if(rollPhase>=0){apply('Roll',rollPhase);bodyClip='Roll';}
  else if(meleePhase>=0){apply('Melee_Hook',meleePhase);bodyClip='Melee_Hook';}
  else if(throwPhase>=0){apply('OverhandThrow',throwPhase,n=>upper.test(n));bodyClip='OverhandThrow';}
  // Aim bends the chest and neck, instead of rotating both arm targets around the eye.
  if(rollPhase<0){bones.spine_02.rotateX(THREE.MathUtils.clamp(pitch,-1.1,1.1)*.3);bones.spine_03.rotateX(THREE.MathUtils.clamp(pitch,-1.1,1.1)*.35);bones.neck_01.rotateX(THREE.MathUtils.clamp(pitch,-1.1,1.1)*.2);}
  if(shotKick>.001&&!['knife','bow','laser','chainsaw','flame'].includes(weapon)&&rollPhase<0)bones.spine_03.rotateX(-shotKick*.04);
  const attack=knifePhase>=0||rollPhase>=0||meleePhase>=0;const alpha=previous.size===0?1:dt>0?1-Math.exp(-dt*(attack?38:18)):0;
  for(const b of avatar.bones){let old=previous.get(b.name);if(old){b.quaternion.copy(old.q.clone().slerp(b.quaternion,alpha));b.position.copy(old.p.clone().lerp(b.position,alpha));}else old={q:new THREE.Quaternion(),p:new THREE.Vector3()};old.q.copy(b.quaternion);old.p.copy(b.position);previous.set(b.name,old);}
  avatar.motion.rotation.x=0;avatar.root.userData.motion=bodyClip;avatar.root.userData.strideRate=Math.min(1.3,Math.max(.35,speed/9.8));return {bodyClip,attack,rolling:rollPhase>=0};
 }
 return {update,bones,apply};
}

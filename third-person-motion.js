import {sampleKnifeSlash} from './knife-motion.js';
import * as THREE from 'three';
import data from './third-person-motion-data.json' with {type:'json'};
const upper=/^(spine|neck|Head|clavicle|upperarm|lowerarm|hand)/;
const lower=/^(root|pelvis|thigh|calf|foot)/;
const clips=Object.fromEntries(Object.entries(data).map(([name,clip])=>[name,{duration:clip.duration,tracks:clip.tracks.map(t=>({bone:t.name.split('.')[0],property:t.name.split('.')[1],sample:new (t.type==='quaternion'?THREE.QuaternionKeyframeTrack:THREE.VectorKeyframeTrack)(t.name,t.times,t.values).createInterpolant()}))}]));
// Gameplay owns translation. These layers preserve source torso/shoulder/hip rotations,
// while weapon grips and aim receive small final corrections in third-person.js.
export function createThirdPersonMotion(avatar){
 const bones=Object.fromEntries(avatar.bones.map(b=>[b.name,b])),previous=new Map();let clock=0,strideClock=0,wasGrounded=true,airAge=0,landAge=1,lastWeapon='',shotKick=0,lastFlash=false,wasMoving=false,transitionKind='',transitionAge=1,walkBlend=0;
 function apply(name,phase,mask=()=>true,weight=1){const clip=clips[name];if(!clip)return;for(const t of clip.tracks){const b=bones[t.bone];if(!b||!mask(t.bone))continue;const a=t.sample.evaluate(THREE.MathUtils.clamp(phase,0,1)*clip.duration);if(t.property==='quaternion')b.quaternion.slerp(new THREE.Quaternion().fromArray(a),weight);else b.position.lerp(new THREE.Vector3().fromArray(a),weight);}}
 function update(dt,state){
  clock+=dt;const {weapon,speed=0,velocity,yaw,pitch=0,grounded=true,knifePhase=-1,rollPhase=-1,meleePhase=-1,throwPhase=-1,bowMotionClip='BowIdle',bowMotionPhase=0,bowDrawing=false,bowCharge=0,flash=false}=state;
  strideClock+=dt*Math.min(1.3,Math.max(.35,speed/9.8));
  if(grounded&&!wasGrounded)landAge=0;if(!grounded&&wasGrounded)airAge=0;wasGrounded=grounded;airAge+=dt;landAge+=dt;
  if(lastWeapon!==weapon){lastWeapon=weapon;shotKick=0;}if(flash&&!lastFlash)shotKick=1;lastFlash=flash;shotKick=THREE.MathUtils.damp(shotKick,0,18,dt);
  const gun=['pistol','shotgun','sniper','laser'].includes(weapon),moving=speed>.7;walkBlend=THREE.MathUtils.damp(walkBlend,moving?1:0,10,dt);if(moving!==wasMoving){transitionKind=moving?'TPSStartRun':'TPSStopRun';transitionAge=0;}wasMoving=moving;transitionAge+=dt;
  let bodyClip=weapon==='knife'?'Sword_Idle':weapon==='bow'?(bowDrawing?(bowCharge>=2.2?'M2MBowHold':'M2MBowLoad'):bowMotionClip==='BowRelease'?'M2MBowRelease':'M2MBowIdle'):['rapid','rocket','rail','chainsaw','flame'].includes(weapon)?'Idle_Rail_Loop':'TPSAimIdle';
  const phase=bodyClip==='M2MBowLoad'?Math.min(1,bowCharge/2.2):bodyClip==='M2MBowRelease'?bowMotionPhase:(clock%(clips[bodyClip]?.duration||1))/(clips[bodyClip]?.duration||1);
  apply(bodyClip,phase,n=>upper.test(n)||speed<.2&&lower.test(n));
  if(gun&&moving)apply('TPSAimWalk',(strideClock/clips.TPSAimWalk.duration)%1,n=>upper.test(n),walkBlend);
  if(gun&&Math.abs(pitch)>.01)apply(pitch>0?'TPSAimUp':'TPSAimDown',0,n=>upper.test(n),Math.min(.65,Math.abs(pitch)/1.2));
  // Eight directional source strides avoid running backward or sideways with forward feet.
  if(speed>.2&&grounded){
   const local=velocity.clone().applyAxisAngle(new THREE.Vector3(0,1,0),-yaw),angle=Math.atan2(local.x,-local.z),directions=['Forward','ForwardRight','Right','BackwardRight','Backward','BackwardLeft','Left','ForwardLeft'],sector=((angle/(Math.PI/4))%8+8)%8,index=Math.floor(sector),mix=sector-index;
   const stride=name=>name==='Forward'?(speed<3?'TPSAimWalk':'TPSRun'):'Strafe'+name;
   const a=stride(directions[index]),b=stride(directions[(index+1)%8]);
   apply(a,(strideClock/clips[a].duration)%1,n=>lower.test(n));if(mix>.001)apply(b,(strideClock/clips[b].duration)%1,n=>lower.test(n),mix);
   bodyClip+=' + '+a+(mix>.001?' / '+b:'');
   if(Math.abs(angle)<Math.PI/4&&transitionKind==='TPSStartRun'&&transitionAge<.24){apply(transitionKind,.2+.5*transitionAge/.24,n=>lower.test(n),(1-transitionAge/.24)*.8);bodyClip+=' + '+transitionKind;}
  }else if(grounded&&transitionKind==='TPSStopRun'&&transitionAge<.22){apply('TPSStopRun',transitionAge/.22,n=>lower.test(n),1-transitionAge/.22);bodyClip+=' + TPSStopRun';}
  if(!grounded){const clip=airAge<.15?'Jump_Start':'Jump_Loop';apply(clip,airAge<.15?airAge/.15:(clock%clips.Jump_Loop.duration)/clips.Jump_Loop.duration,n=>lower.test(n));bodyClip+=' + '+clip;}
  else if(landAge<.16){apply('Jump_Land',landAge/.16,n=>lower.test(n),1-landAge/.16);bodyClip+=' + Jump_Land';}
  if(knifePhase>=0){
   apply('Sword_Dash',0,n=>upper.test(n));
   const slash=sampleKnifeSlash(knifePhase,{combo:state.knifeCombo,rush:state.knifeRush});bones.spine_02.rotateY(slash.twist*.45);bones.spine_03.rotateY(slash.twist*.55);bones.spine_02.rotateX(.12);bones.pelvis.rotateX(.06);
   bodyClip='Sword_Dash';
  }
  else if(rollPhase>=0){apply('Roll',rollPhase);bodyClip='Roll';}
  else if(meleePhase>=0){apply('Melee_Hook',meleePhase);bodyClip='Melee_Hook';}
  else if(throwPhase>=0){apply('OverhandThrow',throwPhase,n=>upper.test(n));bodyClip='OverhandThrow';}
  // Aim bends the chest and neck, instead of rotating both arm targets around the eye.
  if(rollPhase<0){bones.spine_02.rotateX(THREE.MathUtils.clamp(pitch,-1.1,1.1)*.3);bones.spine_03.rotateX(THREE.MathUtils.clamp(pitch,-1.1,1.1)*.35);bones.neck_01.rotateX(THREE.MathUtils.clamp(pitch,-1.1,1.1)*.2);}
  if(shotKick>.001&&!['knife','bow','laser','chainsaw','flame'].includes(weapon)&&rollPhase<0)bones.spine_03.rotateX(-shotKick*.04);
  if(state.motionPreview){const {action,phase:p}=state.motionPreview;const name=action==='move'?'TPSRun':action==='jump'?'Jump_Loop':action==='idle'? (weapon==='knife'?'Sword_Idle':weapon==='bow'?'M2MBowIdle':['rapid','rocket','rail','chainsaw','flame'].includes(weapon)?'Idle_Rail_Loop':'TPSAimIdle'):action==='hold'?'M2MBowHold':null;if(name)apply(name,p,n=>['move','jump'].includes(action)?lower.test(n):true);if(action==='move'&&gun)apply('TPSAimWalk',p,n=>upper.test(n));}
  const attack=knifePhase>=0||rollPhase>=0||meleePhase>=0;const alpha=state.motionPreview||previous.size===0?1:dt>0?1-Math.exp(-dt*(knifePhase>=0?90:attack?38:18)):0;
  for(const b of avatar.bones){let old=previous.get(b.name);if(old){b.quaternion.copy(old.q.clone().slerp(b.quaternion,alpha));b.position.copy(old.p.clone().lerp(b.position,alpha));}else old={q:new THREE.Quaternion(),p:new THREE.Vector3()};old.q.copy(b.quaternion);old.p.copy(b.position);previous.set(b.name,old);}
  avatar.motion.rotation.x=0;avatar.root.userData.motion=bodyClip;avatar.root.userData.sourceMotion=knifePhase>=0?'AuthoredDragonSlash':bodyClip;avatar.root.userData.strideRate=Math.min(1.3,Math.max(.35,speed/9.8));return {bodyClip,attack,rolling:rollPhase>=0};
 }
 return {update,bones,apply};
}

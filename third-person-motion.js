import {directionalCadence} from './step-locomotion.js';
import {sampleKnifeSlash} from './knife-motion.js';
import * as THREE from 'three';
import data from './third-person-motion-data.json' with {type:'json'};
import sideData from './side-locomotion-data.json' with {type:'json'};
const upper=/^(spine|neck|Head|clavicle|upperarm|lowerarm|hand)/;
const lower=/^(root|pelvis|thigh|calf|foot)/;
const clips=Object.fromEntries(Object.entries({...data,...sideData}).map(([name,clip])=>[name,{duration:clip.duration,tracks:clip.tracks.map(t=>({bone:t.name.split('.')[0],property:t.name.split('.')[1],sample:new (t.type==='quaternion'?THREE.QuaternionKeyframeTrack:THREE.VectorKeyframeTrack)(t.name,t.times,t.values).createInterpolant()}))}]));
// Gameplay owns translation. These layers preserve source torso/shoulder/hip rotations,
// while weapon grips and aim receive small final corrections in third-person.js.
export function createThirdPersonMotion(avatar){
 const sprintClip=avatar.actions.Sprint_Loop.getClip();
 const motionClips={...clips,Sprint_Loop:{duration:sprintClip.duration,tracks:sprintClip.tracks.map(t=>({bone:t.name.split('.')[0],property:t.name.split('.')[1],sample:t.createInterpolant()}))}};
 const bones=Object.fromEntries(avatar.bones.map(b=>[b.name,b])),previous=new Map();let clock=0,strideClock=0,strideRate=.35,wasGrounded=true,airAge=0,landAge=1,lastWeapon='',shotKick=0,lastFlash=false,wasMoving=false,transitionKind='',transitionAge=1,walkBlend=0;const momentum=new THREE.Vector3();let runLift=0,runTwist=0,runPoseBlend=0;
 function apply(name,phase,mask=()=>true,weight=1){const clip=motionClips[name];if(!clip)return;for(const t of clip.tracks){const b=bones[t.bone];if(!b||!mask(t.bone))continue;const a=t.sample.evaluate(THREE.MathUtils.clamp(phase,0,1)*clip.duration);if(t.property==='quaternion')b.quaternion.slerp(new THREE.Quaternion().fromArray(a),weight);else b.position.lerp(new THREE.Vector3().fromArray(a),weight);}}
 function applyStep(name,phase){
  const stop=name.startsWith('Stop'),mirror=name.endsWith('Right');
  const clip=clips[stop?'TPSStopRun':'StrafeLeft'];
  const sampleTime=stop?(.08+.88*phase)*clip.duration:((.8+.45*phase)%1)*clip.duration;
  for(const t of clip.tracks){
   if(!lower.test(t.bone))continue;
   const target=mirror?t.bone.replace(/_([lr])$/,(_,side)=>side==='l'?'_r':'_l'):t.bone,b=bones[target];if(!b)continue;
   const values=t.sample.evaluate(sampleTime);
   if(t.property==='quaternion'){const q=new THREE.Quaternion().fromArray(values);if(mirror){q.y=-q.y;q.z=-q.z;}b.quaternion.copy(q);}
   else{const p=new THREE.Vector3().fromArray(values);if(mirror)p.x=-p.x;b.position.copy(p);}
  }
 }
 const savedPose=avatar.bones.map(b=>({b,p:b.position.clone(),q:b.quaternion.clone()}));apply('TPSAimIdle',0);avatar.root.updateMatrixWorld(true);const upperAnchor={p:avatar.root.worldToLocal(bones.spine_01.getWorldPosition(new THREE.Vector3())),q:avatar.root.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(bones.spine_01.getWorldQuaternion(new THREE.Quaternion()))};for(const {b,p,q}of savedPose){b.position.copy(p);b.quaternion.copy(q);}
 const restPositions=new Map(avatar.bones.filter(b=>/^(spine|neck|Head)/.test(b.name)).map(b=>[b.name,b.position.clone()]));
 function update(dt,state){
  for(const [name,position]of restPositions)bones[name].position.copy(position);
  clock+=dt;const {weapon,speed=0,velocity,yaw,pitch=0,grounded=true,knifePhase=-1,rollPhase=-1,meleePhase=-1,throwPhase=-1,bowMotionClip='BowIdle',bowMotionPhase=0,bowDrawing=false,bowCharge=0,flash=false}=state;
  strideRate=THREE.MathUtils.damp(strideRate,directionalCadence(speed,velocity,yaw),8,dt);strideClock+=dt*strideRate;
  if(grounded&&!wasGrounded)landAge=0;if(!grounded&&wasGrounded)airAge=0;wasGrounded=grounded;airAge+=dt;landAge+=dt;
  if(lastWeapon!==weapon){lastWeapon=weapon;shotKick=0;}if(flash&&!lastFlash)shotKick=1;lastFlash=flash;shotKick=THREE.MathUtils.damp(shotKick,0,18,dt);
  const gun=['pistol','shotgun','sniper','laser'].includes(weapon),moving=speed>.7;walkBlend=THREE.MathUtils.damp(walkBlend,moving?1:0,10,dt);if(moving!==wasMoving){transitionKind=moving?'TPSStartRun':'TPSStopRun';transitionAge=0;}wasMoving=moving;transitionAge+=dt;
  let bodyClip=weapon==='knife'?'Sword_Idle':weapon==='bow'?(bowDrawing?(bowCharge>=2.2?'M2MBowHold':'M2MBowLoad'):bowMotionClip==='BowRelease'?'M2MBowRelease':'M2MBowIdle'):['rapid','rocket','rail','chainsaw','flame'].includes(weapon)?'Idle_Rail_Loop':'TPSAimIdle';
  const phase=bodyClip==='M2MBowLoad'?Math.min(1,bowCharge/2.2):bodyClip==='M2MBowRelease'?bowMotionPhase:(clock%(clips[bodyClip]?.duration||1))/(clips[bodyClip]?.duration||1);
  apply(bodyClip,!['knife','bow'].includes(weapon)?0:phase,n=>upper.test(n)||speed<.2&&lower.test(n));
  if(grounded&&speed<.2)apply('TPSAimIdle',0,n=>lower.test(n));

  if(gun&&Math.abs(pitch)>.01)apply(pitch>0?'TPSAimUp':'TPSAimDown',0,n=>upper.test(n),Math.min(.65,Math.abs(pitch)/1.2));
  // The same preferred forward sprint plays in every travel direction.
  if(speed>.2&&grounded){
   apply('Sprint_Loop',(strideClock/clips.TPSRun.duration)%1,n=>lower.test(n));
   bodyClip+=' + Sprint_Loop';
  }else if(grounded&&transitionKind==='TPSStopRun'&&transitionAge<.22){apply('TPSStopRun',transitionAge/.22,n=>lower.test(n),1-transitionAge/.22);bodyClip+=' + TPSStopRun';}
  if(grounded&&state.locomotion?.action){const action=state.locomotion.action;applyStep(action.name,action.phase);bodyClip+=' + '+action.name;}
  if(!grounded){const clip=airAge<.15?'Jump_Start':'Jump_Loop';apply(clip,airAge<.15?airAge/.15:(clock%clips.Jump_Loop.duration)/clips.Jump_Loop.duration,n=>lower.test(n));bodyClip+=' + '+clip;}
  else if(landAge<.16){apply('Jump_Land',landAge/.16,n=>lower.test(n),1-landAge/.16);bodyClip+=' + Jump_Land';}
  if(knifePhase>=0){
   apply('Sword_Dash',0,n=>upper.test(n));
   const slash=sampleKnifeSlash(knifePhase,{combo:state.knifeCombo,rush:state.knifeRush});bones.spine_02.rotateY(slash.twist*.45);bones.spine_03.rotateY(slash.twist*.55);bones.spine_02.rotateX(.12);bones.pelvis.rotateX(.06);
   bodyClip='Sword_Dash';
  }
  else if(rollPhase>=0){bodyClip='JetBoost';}
  else if(meleePhase>=0){apply('Melee_Hook',meleePhase);bodyClip='Melee_Hook';}
  else if(throwPhase>=0){apply('OverhandThrow',throwPhase,n=>upper.test(n));bodyClip='OverhandThrow';}
  const boosting=state.boostPhase>=0||rollPhase>=0,jetJump=state.jetJump>0;
  let leanX=0,leanZ=0;
  if(boosting||jetJump){
   // One frozen airborne stance: no stride clock or alternating feet during thrust.
   apply('Jump_Loop',.35,n=>lower.test(n));
   const local=(state.boostDirection||state.rollDirection||new THREE.Vector3(0,0,-1)).clone().applyAxisAngle(new THREE.Vector3(0,1,0),-(yaw+Math.PI));
   const amount=jetJump?.13:.30;leanX=local.z*amount;leanZ=-local.x*amount;
   for(const side of ['l','r']){bones['thigh_'+side].rotateX(-local.z*.18);bones['thigh_'+side].rotateZ(local.x*.15);bones['calf_'+side].rotateX(.12);}
   bodyClip=jetJump?'JetJump':'JetBoost';
  }
  if(!boosting&&!jetJump&&knifePhase<0&&meleePhase<0&&throwPhase<0&&!['knife','bow'].includes(weapon)){
   const gait=(strideClock/clips.TPSRun.duration)%1,pulse=Math.sin(gait*Math.PI*4),run=grounded&&moving;
   // Frozen carry pose with deliberate waist twist and vertically coupled breathing/stride.
   apply('TPSAimIdle',0,n=>/^(spine|neck|Head)/.test(n));
   if(run){/* Upper body is stabilized below, independently of the running pelvis. */}
   else if(grounded){bones.spine_01.position.y+=Math.sin(clock*1.8)*.0015;}
  }
  // Aim bends the chest and neck, instead of rotating both arm targets around the eye.
  if(rollPhase<0){bones.spine_02.rotateX(THREE.MathUtils.clamp(pitch,-1.1,1.1)*.3);bones.spine_03.rotateX(THREE.MathUtils.clamp(pitch,-1.1,1.1)*.35);}
  if(shotKick>.001&&!['knife','bow','laser','chainsaw','flame'].includes(weapon)&&rollPhase<0)bones.spine_03.rotateX(-shotKick*.04);
  if(state.motionPreview){const {action,phase:p}=state.motionPreview;const name=action==='move'?'TPSRun':action==='jump'?'Jump_Loop':action==='idle'? (weapon==='knife'?'Sword_Idle':weapon==='bow'?'M2MBowIdle':['rapid','rocket','rail','chainsaw','flame'].includes(weapon)?'Idle_Rail_Loop':'TPSAimIdle'):action==='hold'?'M2MBowHold':null;if(name)apply(name,p,n=>['move','jump'].includes(action)?lower.test(n):true);if(action==='move'&&gun)apply('TPSAimWalk',p,n=>upper.test(n));}
  const attack=boosting||jetJump||knifePhase>=0||rollPhase>=0||meleePhase>=0;const alpha=state.motionPreview||previous.size===0?1:dt>0?1-Math.exp(-dt*(knifePhase>=0?90:attack?38:18)):0;
  for(const b of avatar.bones){let old=previous.get(b.name);if(old){b.quaternion.copy(old.q.clone().slerp(b.quaternion,grounded&&speed>=3&&!attack&&lower.test(b.name)&&dt>0?1-Math.exp(-dt*36):alpha));b.position.copy(old.p.clone().lerp(b.position,alpha));}else old={q:new THREE.Quaternion(),p:new THREE.Vector3()};old.q.copy(b.quaternion);old.p.copy(b.position);previous.set(b.name,old);}
  const localMomentum=velocity.clone().applyAxisAngle(new THREE.Vector3(0,1,0),-(yaw+Math.PI));momentum.lerp(localMomentum,1-Math.exp(-dt*8));avatar.motion.rotation.x=leanX;avatar.motion.rotation.z=leanZ;avatar.root.userData.locomotionAction=state.locomotion?.action?.name??null;avatar.root.userData.footContacts=[null,null];avatar.root.userData.sourceSprint=bodyClip.includes('Sprint_Loop');avatar.root.userData.motion=bodyClip;avatar.root.userData.sourceMotion=knifePhase>=0?'AuthoredDragonSlash':bodyClip;avatar.root.userData.stridePhase=(strideClock/clips.TPSRun.duration)%1;avatar.root.userData.strideRate=directionalCadence(speed,velocity,yaw);const forward=velocity.dot(new THREE.Vector3(-Math.sin(yaw),0,-Math.cos(yaw)))>speed*.5;
  const forwardRun=grounded&&moving&&forward&&!attack&&throwPhase<0;
  const gait=(strideClock/clips.TPSRun.duration)%1;runPoseBlend=THREE.MathUtils.damp(runPoseBlend,forwardRun?1:0,10,dt);runLift=THREE.MathUtils.damp(runLift,forwardRun?(1-Math.cos(gait*Math.PI*4))*.022:0,18,dt);runTwist=THREE.MathUtils.damp(runTwist,forwardRun?Math.sin(gait*Math.PI*2)*.045:0,14,dt);avatar.motion.position.y=runLift;avatar.root.userData.forwardRunPose=forwardRun;
  if(forwardRun){
   const lift=runLift,twist=runTwist;
   avatar.motion.position.y=lift;avatar.root.updateMatrixWorld(true);
   bones.pelvis.rotateY(twist*.45);avatar.root.updateMatrixWorld(true);
   const parent=bones.spine_01.parent,target=avatar.root.localToWorld(upperAnchor.p.clone().add(new THREE.Vector3(0,lift*1.3,0))),rotation=avatar.root.getWorldQuaternion(new THREE.Quaternion()).multiply(upperAnchor.q).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(.10*runPoseBlend,twist,0)));
   bones.spine_01.position.copy(parent.worldToLocal(target));bones.spine_01.quaternion.copy(parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(rotation));bones.spine_01.updateWorldMatrix(false,true);avatar.root.userData.upperBodyStabilized=false;
  }else avatar.root.userData.upperBodyStabilized=false;
  avatar.lookForward?.(pitch);return {bodyClip,attack,rolling:rollPhase>=0};
 }
 return {update,bones,apply};
}

import * as THREE from 'three';
import {createThirdPersonView} from './third-person.js';
import {weapons} from './motion-settings.js';
import {FPS,frameTime} from './motion-frame-timeline.js';
import {MOTION_STUDIES,createMotionSampler} from './robot-motion-player.js';

export const MOTION_WEAPONS=weapons;
const lower=/^(root|pelvis|thigh|calf|foot|ball)/;

// Keep the six workshop gait studies, then use the game's weapon-specific
// upper-body pose and two-hand grip IK. Nothing is written to motion settings.
export function createArmedMotionSampler(robot){
  const reference=createMotionSampler(robot);
  const rest=robot.bones.map(b=>({b,p:b.position.clone(),q:b.quaternion.clone(),s:b.scale.clone()}));
  const bones=Object.fromEntries(robot.bones.map(b=>[b.name,b]));
  const view=createThirdPersonView(robot,Object.keys(MOTION_WEAPONS));
  const gameUpdate=view.motion.update.bind(view.motion);
  let study=MOTION_STUDIES[0],frames=reference.frames,tracks=[],weapon='pistol',aim=false,firing=false,sampleTime=0;
  const rawClips=new Map();
  for(const entry of MOTION_STUDIES){
    const clip=robot.actions[entry.clip].getClip();
    rawClips.set(entry.id,clip.tracks.filter(t=>lower.test(t.name.split('.')[0])).map(t=>{
      const [name,property]=t.name.split('.');return {bone:bones[name],property,interpolant:t.createInterpolant()};
    }));
  }
  view.motion.update=(dt,state)=>{
    const result=gameUpdate(dt,state);
    robot.root.updateMatrixWorld(true);
    const upperRotation=bones.spine_01.getWorldQuaternion(new THREE.Quaternion());
    // These clips already contain the corrected player bind translations.
    for(const {bone,property,interpolant}of tracks)bone[property].fromArray(interpolant.evaluate(sampleTime));
    if(weapon==='bow'&&study.id==='walk')for(const {b,q}of rest)if(/^(thigh|calf|foot|ball)/.test(b.name))b.quaternion.slerp(q,.18);
    // Gait clips already include pelvis travel. Do not add the game's sprint bounce.
    robot.motion.position.y=0;
    robot.root.updateMatrixWorld(true);
    bones.spine_01.quaternion.copy(bones.spine_01.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(upperRotation));
    robot.root.updateMatrixWorld(true);
    robot.lookForward(0);
    return result;
  };
  function sample(frame){
    const index=Math.max(1,Math.min(frames,Math.round(frame)||1));sampleTime=frameTime(index);
    for(const {b,p,q,s}of rest){b.position.copy(p);b.quaternion.copy(q);b.scale.copy(s);}
    robot.motion.position.set(0,0,0);robot.motion.rotation.set(0,0,0);
    const moving=['walk','sprint','crouchWalk'].includes(study.id),speed={walk:1.5,sprint:4.5,crouchWalk:1}[study.id]||0;
    view.pose({
      position:robot.root.position.clone().add(new THREE.Vector3(0,1.7,0)),yaw:Math.PI,pitch:0,
      weapon,speed,velocity:new THREE.Vector3(0,0,speed),grounded:true,time:sampleTime,dt:0,
      adsBlend:aim?1:0,firing:firing&&!['knife','bow','chainsaw'].includes(weapon),bowDrawing:weapon==='bow'&&aim,bowCharge:aim?2.2:0,knifeGuard:weapon==='knife'&&aim,
      motionStudy:study.id,
      motionPreview:{action:moving?'move':'idle',phase:(index-1)/frames},disableCustomMotion:true,
    });
    // The frame has articulated fingers; the source combat clips only key arms.
    // Close the grip without moving the wrist or the game's weapon attachment.
    if(!view.models[weapon].userData.reclaimedWeapon&&!view.models[weapon].userData.utilityWeapon)for(const [i,side]of ['l','r'].entries()){
      if(weapon==='knife'&&side==='l'&&!aim)continue;
      const hand=robot.arms[i].hand,axis=new THREE.Vector3(0,0,1).applyQuaternion(hand.getWorldQuaternion(new THREE.Quaternion()));
      const sign=side==='l'?-1:1,amount=weapon==='bow'&&side==='r'&&!aim?.4:1;
      for(const finger of ['index','middle','ring','pinky'])for(let segment=1;segment<=3;segment++){
        const bone=bones[finger+'_0'+segment+'_'+side];
        const turn=new THREE.Quaternion().setFromAxisAngle(axis,sign*[.65,1.05,.70][segment-1]*amount);
        const world=turn.multiply(bone.getWorldQuaternion(new THREE.Quaternion()));
        bone.quaternion.copy(bone.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(world));
        bone.updateWorldMatrix(false,true);
      }
    }
    // Use the outfit being evaluated, without also mounting the arena's packs.
    view.jetpack.root.visible=false;view.jetpack.exhaust.visible=false;view.equipment.root.visible=false;
    robot.blaster.visible=false;robot.root.updateMatrixWorld(true);
    return index;
  }
  function select(id){
    if(weapon==='rapid'&&id==='sprint')id='walk';
    const entry=MOTION_STUDIES.find(m=>m.id===id);if(!entry)throw Error('Unknown motion: '+id);
    study=entry;frames=Math.round(robot.actions[entry.clip].getClip().duration*FPS);tracks=rawClips.get(id);sample(1);return frames;
  }
  function setWeapon(type){if(!MOTION_WEAPONS[type])throw Error('Unknown weapon: '+type);weapon=type;if(type==='rapid'&&study.id==='sprint')select('walk');}
  select('idle');
  return {sample,select,setWeapon,setAim(value){aim=!!value;},setFiring(value){firing=!!value;},view,get weapon(){return weapon;},get aim(){return aim;},get study(){return study;},get frames(){return frames;}};
}

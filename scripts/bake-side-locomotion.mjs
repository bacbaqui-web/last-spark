import fs from 'node:fs';
import * as THREE from 'three';
import source from '../third-person-motion-data.json' with {type:'json'};
import {createRobot} from '../robot.js';
import {armIK} from '../sword-combat.js';
// Bake lane-safe source poses once. Runtime only interpolates these keyframes.
const avatar=createRobot(),bones=Object.fromEntries(avatar.bones.map(b=>[b.name,b])),output={};
for(const name of ['StrafeLeft','StrafeRight','StrafeForwardLeft','StrafeForwardRight','StrafeBackwardLeft','StrafeBackwardRight']){
 const clip=source[name],tracks=clip.tracks.filter(t=>/^(root|pelvis|thigh|calf|foot)/.test(t.name)).map(t=>({...t,sample:new (t.type==='quaternion'?THREE.QuaternionKeyframeTrack:THREE.VectorKeyframeTrack)(t.name,t.times,t.values).createInterpolant(),times:[],values:[]}));
 const frames=Math.ceil(clip.duration*60);
 for(let frame=0;frame<=frames;frame++){
  const time=frame/frames*clip.duration;
  for(const t of tracks){const [name,property]=t.name.split('.'),value=t.sample.evaluate(time);bones[name][property].fromArray(value);}
  avatar.root.updateMatrixWorld(true);
  for(const [side,sign]of [['l',1],['r',-1]]){
   const hip=bones['thigh_'+side],knee=bones['calf_'+side],foot=bones['foot_'+side],raw=foot.getWorldPosition(new THREE.Vector3());
   if(raw.x*sign<.085){const target=raw.clone();target.x=sign*.085;const ankle=foot.getWorldQuaternion(new THREE.Quaternion());armIK({shoulder:hip,elbow:knee,hand:foot},target,knee.getWorldPosition(new THREE.Vector3()));foot.quaternion.copy(foot.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(ankle));avatar.root.updateMatrixWorld(true);}
  }
  for(const t of tracks){const [name,property]=t.name.split('.');t.times.push(time);t.values.push(...bones[name][property].toArray().map(v=>Number(v.toFixed(7))));}
 }
 output[name]={duration:clip.duration,tracks:tracks.map(({name,type,times,values})=>({name,type,times,values}))};
}
fs.writeFileSync(new URL('../side-locomotion-data.json',import.meta.url),JSON.stringify(output));
console.log('Baked six directional clips with separated foot lanes');

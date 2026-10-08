import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createRobot,disposeRobot} from '../robot.js';
import {attachEquipmentStudies} from '../equipment-studies.js';
import {MOTION_STUDIES,createMotionSampler,createPreviewClock} from '../robot-motion-player.js';
import {MOTION_WEAPONS,createArmedMotionSampler} from '../robot-motion-weapons.js';

const bare=createRobot(false,'player'),equipped=createRobot(false,'player');
attachEquipmentStudies(equipped,{head:{type:'tactical'},chest:{type:'vest'},arms:{type:'marksman'},legs:{type:'runner'},back:{type:'batteryPack'}});
const samplers=[bare,equipped].map(createMotionSampler);
const signature=robot=>robot.bones.flatMap(b=>[...b.position.toArray(),...b.quaternion.toArray(),...b.scale.toArray()]);
const meshes=equipped.exoskeletonPreview.groups.map(group=>({group,parent:group.parent,position:group.position.clone(),quaternion:group.quaternion.clone()}));
const samePose=(a,b,message)=>assert(a.length===b.length&&a.every((v,i)=>Math.abs(v-b[i])<1e-9),message);
const movements=[];
for(const study of MOTION_STUDIES){
  const frames=samplers[0].select(study.id);assert.equal(samplers[1].select(study.id),frames);
  const first=signature(bare);
  for(let frame=1;frame<=frames;frame++){
    samplers.forEach(s=>s.sample(frame));
    samePose(signature(bare),signature(equipped),'equipment leaves the sampled skeleton unchanged');
    assert(bare.bones.every(b=>b.matrixWorld.elements.every(Number.isFinite)));
    assert(equipped.exoskeletonPreview.groups.every(g=>g.matrixWorld.elements.every(Number.isFinite)));
  }
  assert.notDeepEqual(first,signature(bare),study.id+' has actual motion');
  const target=Math.floor(frames/2);samplers[0].sample(target);const expected=signature(bare);
  samplers[0].sample(1);samplers[0].sample(frames);samplers[0].sample(target);
  samePose(signature(bare),expected,'scrubbing has no accumulated pose drift');
  samplers[0].select('idle');samplers[0].select(study.id);samplers[0].sample(target);
  samePose(signature(bare),expected,'switching clips restores the same frame');
  movements.push({id:study.id,frames});
}
for(const {group,parent,position,quaternion}of meshes){
  assert.equal(group.parent,parent);assert(group.position.equals(position));assert(group.quaternion.equals(quaternion));
}
const timer=createPreviewClock(40);timer.update(1);assert.equal(timer.frame,31);
timer.playing=false;timer.update(5);assert.equal(timer.frame,31);
timer.rate=.25;timer.playing=true;timer.reset(40);timer.update(4);assert.equal(timer.frame,31);
timer.update(10/7.5);assert.equal(timer.frame,1,'wraps after exactly 40 frames');
timer.seek(999);assert.equal(timer.frame,40);timer.step(-1);assert.equal(timer.frame,39);assert.equal(timer.playing,false);
timer.seek(-1);assert.equal(timer.frame,1);
timer.reset(20);timer.rate=1;timer.playing=true;for(let i=0;i<60;i++)timer.update(1/60);assert.equal(timer.frame,11,'render frequency does not change 30 FPS playback');
disposeRobot(bare);disposeRobot(equipped);

const armed=createRobot(false,'player'),armedSampler=createArmedMotionSampler(armed);
const weaponPose=()=>[...signature(armed),...armedSampler.view.models[armedSampler.weapon].matrixWorld.elements];
let checked=0;
for(const type of Object.keys(MOTION_WEAPONS))for(const aim of [false,true]){
  armedSampler.setWeapon(type);armedSampler.setAim(aim);
  for(const study of MOTION_STUDIES){
    const frames=armedSampler.select(study.id),frame=Math.floor(frames/2);
    armedSampler.sample(frame);const expected=weaponPose();
    armedSampler.sample(frames);armedSampler.sample(1);armedSampler.sample(frame);
    samePose(weaponPose(),expected,`${type}/${study.id}/${aim}: deterministic armed scrubbing`);
    assert(expected.every(Number.isFinite));
    assert.deepEqual(Object.entries(armedSampler.view.models).filter(([,m])=>m.visible).map(([id])=>id),[type],'exactly the selected weapon is visible');
    assert.equal(armedSampler.view.models[type].parent,armed.arms[type==='bow'?0:1].hand,'weapon follows its grip hand');
    assert(!armed.blaster.visible&&!armedSampler.view.jetpack.root.visible&&!armedSampler.view.equipment.root.visible,'no duplicate weapons or arena packs');
    if(type==='pistol'){
      const model=armedSampler.view.models[type],contact=model.userData.handContacts.right;
      const grip=model.localToWorld(new THREE.Vector3(...contact.grip));
      assert(grip.distanceTo(armed.salvageFrame.anchors.hand_r.localToWorld(new THREE.Vector3(...contact.point)))<1e-5,'trigger grip remains on the right palm contact');
    }
    checked++;
  }
}
armedSampler.setWeapon('pistol');armedSampler.setAim(false);armedSampler.select('walk');armedSampler.sample(12);const carry=weaponPose();
armedSampler.setAim(true);armedSampler.sample(12);assert.notDeepEqual(weaponPose(),carry,'aim changes the weapon pose');
armedSampler.setWeapon('sniper');armedSampler.sample(12);armedSampler.setWeapon('pistol');armedSampler.setAim(false);armedSampler.sample(12);
samePose(weaponPose(),carry,'weapon and aim switches leave no pose residue');
armedSampler.select('sprint');armedSampler.setWeapon('rapid');
assert.equal(armedSampler.study.id,'walk','equipping minigun during a run falls back to walking');
armedSampler.select('sprint');assert.equal(armedSampler.study.id,'walk','minigun cannot request a running clip');
armedSampler.setWeapon('pistol');armedSampler.select('sprint');assert.equal(armedSampler.study.id,'sprint','other weapons can run again');
disposeRobot(armed);
console.log(JSON.stringify({pass:true,movements,armedCombinations:checked,checks:'armed grip, weapon switching, aim, absolute scrubbing, equipment attachment, fixed 30 FPS, pause, slow motion and loop'},null,2));

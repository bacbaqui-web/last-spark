import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createRobot, animateRobot, disposeRobot} from '../robot.js';
import {applyFrameVisual} from '../frame-preview.js';
import {frameStats} from '../salvage-campaign.js';
import {salvageMetal} from '../salvage-metal.js';
import {createThirdPersonMotion} from '../third-person-motion.js';

const robot = createRobot(false, 'player'), second = createRobot(false, 'player');
assert(robot.salvageFrame && robot.salvageFrame.assemblies.length >= 20);
assert(robot.salvageFrame.assemblies.every(group => group.parent.isBone), 'all assemblies follow real animation bones');
second.mixer.stopAllAction(); second.skeleton.pose(); second.root.updateMatrixWorld(true);
for(const name of ['spine_01','spine_02','spine_03','upperarm_l','upperarm_r','thigh_l','thigh_r']){
  const bone=second.bones.find(b=>b.name===name),p=second.motion.worldToLocal(bone.getWorldPosition(new THREE.Vector3()));
  assert(Math.abs(p.z)<1e-6,name+' retains the shared side plane after pose reset');
}
for (const anchor of Object.values(second.salvageFrame.equipmentAnchors)) {
  const front = new THREE.Vector3(0, 0, 1).applyQuaternion(anchor.getWorldQuaternion(new THREE.Quaternion()));
  assert(front.z > .95, anchor.name + ' puts plates on the front of the limb');
}
let triangles = 0;
robot.root.traverse(o => {
  if (o.userData.frameAnchor) assert.equal(o.visible, false, 'old solid shells remain hidden');
  if (!o.userData.salvageFrame) return;
  assert(o.geometry.attributes.uv, 'every frame surface has texture coordinates');
  assert([...o.geometry.attributes.position.array].every(Number.isFinite));
  triangles += (o.geometry.index?.count??o.geometry.attributes.position.count) / 3;
});
assert(triangles < 9000, 'rib doors and interior wiring retain a bounded geometry budget');
assert.equal(robot.salvageFrame.sockets.length,3,'three physical cartridge bays');
const mechanism=robot.salvageFrame.chestMechanism;
assert.equal(mechanism.doors.length,2);
mechanism.setOpen(1);assert(mechanism.doors.every(d=>Math.abs(d.group.rotation.y)>1.8));
assert.equal(second.salvageFrame.chestMechanism.openAmount,0,'other avatars keep their doors closed');
mechanism.setOpen(0);assert(mechanism.doors.every(d=>d.group.rotation.y===0));
const steel = salvageMetal('steel');
assert(steel.map.isDataTexture && steel.normalMap && steel.roughnessMap && steel.metalnessMap);
assert.equal(steel.map.colorSpace, THREE.SRGBColorSpace);
assert.equal(steel.roughnessMap.colorSpace, THREE.NoColorSpace);
assert.equal(salvageMetal('steel'), steel, 'PBR resources shared between robots');
let disposed = false; steel.addEventListener('dispose', () => disposed = true);
const parts = [{type: 'armor', level: 2, slot:2}, {type: 'drive', level: 1, slot:0}];
const equipment = Object.fromEntries(Object.entries({head:'tactical',chest:'vest',arms:'brawler',legs:'exoleg',back:'batteryPack'}).map(([slot,type])=>[slot,{type,level:1}]));
applyFrameVisual(robot, frameStats({parts, equipment}));
assert.equal(robot.frameModules.find(g=>g.userData.moduleType==='armor').userData.chestSlot,2,'preserve a chosen slot, not array order');
assert.equal(robot.frameModules.find(g=>g.userData.moduleType==='drive').userData.chestSlot,0);
const count = robot.frameModules.length;
let equipmentTriangles = 0;
for(const group of robot.frameModules)group.traverse(o=>{if(o.isMesh){equipmentTriangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;if(o.userData.simpleEquipment){assert(o.material.userData.textureDetail, 'mechanical detail stays in PBR maps');assert.equal(o.geometry.attributes.position.count,24,'one simple box per shell');}}});
assert(equipmentTriangles<1000,'fully equipped silhouette uses simple shapes');
applyFrameVisual(robot, frameStats({parts, equipment}));
assert.equal(robot.frameModules.length, count, 're-equipping does not stack geometry');
for (let i = 0; i < 90; i++) animateRobot(robot, 1 / 60, {speed: i < 30 ? 1.5 : 4.5, elevation: .2});
robot.root.updateMatrixWorld(true);
assert(robot.bones.every(b => b.matrixWorld.elements.every(Number.isFinite)), 'walking and running keep valid transforms');
assert(robot.frameModules.every(g => g.parent.isBone));
applyFrameVisual(robot, frameStats({parts:[]}));
assert.equal(robot.frameModules.length, 0, 'equipment can return to bare skeleton');
applyFrameVisual(robot,frameStats({parts:[{type:'reactor',level:1,slot:1}]}));
assert.deepEqual(robot.frameModules.filter(g=>g.userData.chestSlot!==undefined).map(g=>g.userData.chestSlot),[1],'filling one bay leaves the other staggered bays empty');
applyFrameVisual(robot,frameStats({parts:[]}));
robot.setArmorLevel(1); assert.equal(robot.salvageFrame.armorPieces.filter(p=>p.holder.visible).length, 1);
robot.setArmorLevel(3); assert.equal(robot.salvageFrame.armorPieces.filter(p=>p.holder.visible).length, 5, 'arena armor progression preserved');
robot.setArmorLevel(0); assert(robot.salvageFrame.armorPieces.every(p=>!p.holder.visible));
disposeRobot(robot); assert.equal(disposed, false, 'disposing an avatar keeps shared PBR materials alive');
assert(second.salvageFrame.assemblies.length > 0);
const enemy = createRobot(); assert.equal(enemy.salvageFrame, undefined, 'enemy visual style unchanged');
const alignedMotion=createThirdPersonMotion(second),sourceMotion=createThirdPersonMotion(enemy);
for(const clip of ['TPSAimIdle','Sprint_Loop']){
  alignedMotion.apply(clip,.37);sourceMotion.apply(clip,.37);
  for(const name of (clip==='Sprint_Loop'?['thigh_l','thigh_r']:['spine_01','spine_02','spine_03','upperarm_l','upperarm_r'])){
    const actual=alignedMotion.bones[name].position,expected=sourceMotion.bones[name].position.clone().add(second.bindPositionOffsets.get(name));
    assert(actual.distanceTo(expected)<1e-6,clip+' preserves the corrected mount offset exactly once for '+name);
  }
}
disposeRobot(second);disposeRobot(enemy);
console.log(`PASS: textured articulated frame (${triangles} triangles), repeated equipment, shared surfaces, motion, arena armor and enemy isolation`);

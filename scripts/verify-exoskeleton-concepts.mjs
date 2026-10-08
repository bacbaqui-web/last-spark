import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createRobot,animateRobot,disposeRobot} from '../robot.js';
import {EXOSKELETON_CONCEPTS,attachExoskeleton,removeExoskeleton} from '../exoskeleton-concepts.js';
import {exoskeletonSurface} from '../exoskeleton-surface.js';

const robot=createRobot(false,'player');
const signatures=new Set();let maxTriangles=0;
assert.equal(EXOSKELETON_CONCEPTS.length,10);
for(const concept of EXOSKELETON_CONCEPTS)for(const armStyle of ['standard','melee']){
  const originalBones=robot.bones.map(b=>b.position.toArray());
  const result=attachExoskeleton(robot,concept.id,undefined,{armStyle});assert.deepEqual(robot.bones.map(b=>b.position.toArray()),originalBones,'attaching shells preserves the rig');maxTriangles=Math.max(maxTriangles,result.triangles);
  assert(result.triangles>1000&&result.triangles<9000,'bounded simple shells including front/rear plates and joint enclosures: '+concept.id);
  assert.equal(result.slots.length,5);
  assert.equal(result.jointCovers.length,12,'shoulders, elbows, wrists, hips, knees and ankles are enclosed');
  assert.equal(result.armStyle,armStyle);
  const signature=[];
  for(const group of result.groups){
    assert(group.parent,'every shell has an animated mount');
    group.traverse(o=>{if(!o.isMesh)return;assert([...o.geometry.attributes.position.array].every(Number.isFinite));assert(o.geometry.attributes.uv);o.geometry.computeBoundingBox();signature.push(o.geometry.boundingBox.min.toArray(),o.geometry.boundingBox.max.toArray(),o.geometry.attributes.position.count);});
  }
  signatures.add(JSON.stringify(signature));
  const material=exoskeletonSurface(concept.id);assert(material.map&&material.normalMap&&material.roughnessMap&&material.metalnessMap);
  // Rays from behind must meet an exterior plate before the black liner or a front plate.
  // This catches the former long rear openings even when screenshots only show the front.
  robot.root.updateMatrixWorld(true);
  function assertRearCovered(group,y,x=0){
    const origin=group.localToWorld(new THREE.Vector3(x,y,-.5));
    const direction=new THREE.Vector3(0,0,1).transformDirection(group.matrixWorld);
    const hit=new THREE.Raycaster(origin,direction).intersectObjects(group.children,true)[0];
    assert(hit&&hit.object.material===material,`${concept.id}/${armStyle}/${group.name}: rear must hit outer armor first at ${x}, ${y}`);
    assert(group.worldToLocal(hit.point.clone()).z<-.015,`${group.name}: hit is on the rear, not the opposite front face`);
  }
  for(const side of['l','r'])for(const [part,end]of[['upperarm','lowerarm'],['lowerarm','hand'],['thigh','calf'],['calf','foot']]){
    const name=part+'_'+side,group=result.groups.find(g=>g.name===`concept-${concept.id}-${name}`);
    const endpoint=robot.bones.find(b=>b.name===end+'_'+side).getWorldPosition(new THREE.Vector3());
    const span=robot.salvageFrame.anchors[name].worldToLocal(endpoint).length();
    for(const t of[.28,.5,.75])for(const x of[-.008,0,.008])assertRearCovered(group,-span*t,x);
  }
  const pelvis=result.groups.find(g=>g.name===`concept-${concept.id}-pelvis`);
  for(const x of[-.055,0,.055])assertRearCovered(pelvis,-.01,x);
  for(const name of['spine_01','spine_02'])assertRearCovered(result.groups.find(g=>g.name===`concept-${concept.id}-${name}`),name==='spine_01'?.04:-.005);
  const door=robot.salvageFrame.chestMechanism.doors[0],shell=door.group.children.find(g=>g.userData.exoskeletonConcept===concept.id);
  assert(shell,'front armor follows chest opening');shell.updateMatrix();const local=shell.matrix.clone();robot.salvageFrame.chestMechanism.setOpen(1);robot.root.updateMatrixWorld(true);assert(shell.matrix.equals(local),'opening preserves local attachment');robot.salvageFrame.chestMechanism.setOpen(0);
  for(let i=0;i<30;i++)animateRobot(robot,1/60,{speed:1.5});robot.root.updateMatrixWorld(true);
  assert(result.groups.every(g=>g.matrixWorld.elements.every(Number.isFinite)));
  for(const cover of result.jointCovers){
    const center=cover.group.getWorldPosition(new THREE.Vector3());
    assert(center.distanceTo(robot.salvageFrame.anchors[cover.name].getWorldPosition(new THREE.Vector3()))<1e-6,'covers stay centered on animated joint pivots');
  }
  const previous=result.groups;attachExoskeleton(robot,concept.id,['arms'],{armStyle});assert(previous.every(g=>g.parent===null),'switching disposes old set');
  assert(robot.exoskeletonPreview.groups.every(g=>/upperarm|lowerarm|hand/.test(g.name)),'slot selection only attaches requested parts');
  assert.equal(robot.exoskeletonPreview.jointCovers.length,6,'arms include shoulder, elbow and wrist covers without a chest slot');
  const chest=attachExoskeleton(robot,concept.id,['chest'],{armStyle});
  assert(chest.groups.some(g=>g.name.endsWith('-spine_01'))&&chest.groups.some(g=>g.name.endsWith('-spine_02')),'chest slot includes abdomen');
  assert(chest.groups.every(g=>/spine_0[123]|chest-door/.test(g.name)),'chest slot excludes pelvis and limbs');
  const legs=attachExoskeleton(robot,concept.id,['legs'],{armStyle});
  assert(chest.groups.every(g=>g.parent===null),'removing chest detaches torso and abdomen');
  assert(legs.groups.some(g=>g.name.endsWith('-pelvis')),'leg slot includes pelvis independently of chest');
  assert(legs.groups.every(g=>/pelvis|thigh|calf|foot/.test(g.name)),'leg slot excludes chest and abdomen');
  attachExoskeleton(robot,concept.id,[]);assert.equal(robot.exoskeletonPreview.triangles,0,'bare frame is available');
  robot.mixer.stopAllAction();robot.skeleton.pose();
}
assert.equal(signatures.size,20,'ten concepts each have distinct standard and melee silhouettes');
removeExoskeleton(robot);disposeRobot(robot);
console.log(`PASS: 10 exoskeletons × 2 arm styles, closed rear armor, 12 enclosed pivots, five slots, chest doors, animation, cleanup and PBR maps; at most ${maxTriangles} added triangles`);

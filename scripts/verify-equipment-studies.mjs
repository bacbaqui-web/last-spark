import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createRobot,animateRobot,disposeRobot} from '../robot.js';
import {EQUIPMENT} from '../equipment.js';
import {PARTS} from '../salvage-campaign.js';
import {EQUIPMENT_STUDIES,MODULE_STUDIES,attachEquipmentStudies} from '../equipment-studies.js';
import {EQUIPMENT_PAINTS,exoskeletonSurface} from '../exoskeleton-surface.js';
import {removeExoskeleton} from '../exoskeleton-concepts.js';
const robot=createRobot(false,'player'),signatures=new Set(),counts={};
assert.deepEqual(Object.keys(EQUIPMENT_STUDIES),Object.keys(EQUIPMENT));
assert.deepEqual(Object.keys(MODULE_STUDIES).sort(),Object.keys(PARTS).sort());
function signature(groups){const values=[];for(const g of groups)g.traverse(o=>{if(!o.isMesh)return;const p=o.geometry.attributes.position;assert([...p.array].every(Number.isFinite));assert(o.geometry.attributes.uv);values.push(g.name,Array.from(p.array),o.position.toArray(),o.rotation.toArray());});return JSON.stringify(values.map(v=>typeof v==='string'?'':v));}
for(const [type,d]of Object.entries(EQUIPMENT)){
 const bones=robot.bones.map(b=>b.position.toArray()),old=robot.exoskeletonPreview?.groups||[];
 const result=attachEquipmentStudies(robot,{[d.slot]:{type}});
 assert(old.every(g=>g.parent===null),'switching fully detaches the prior item');
 assert.deepEqual(robot.bones.map(b=>b.position.toArray()),bones,'item does not change rig proportions');
 assert(result.groups.every(g=>g.userData.equipmentType===type));
 counts[type]=result.triangles;assert(result.triangles>50&&result.triangles<5500,type+' must stay low polygon');
 signatures.add(signature(result.groups));
 if(d.slot==='legs')assert(result.groups.some(g=>g.name.endsWith('-pelvis')));
 if(d.slot==='chest'){
   assert(!result.groups.some(g=>g.name.endsWith('-pelvis')));
   for(const door of robot.salvageFrame.chestMechanism.doors)assert(result.groups.some(g=>g.parent===door.group));
   robot.root.updateMatrixWorld(true);
   const torso=robot.salvageFrame.anchors.spine_03;
   assert(result.triangles<({tshirt:1350,vest:1800,medic:1000}[type]),'textured torso keeps its reduced triangle budget including shoulder sockets, hood, pouches and repair cartridge');
   // The high guard must wrap both sides of the neck while retaining an open center.
   for(const sign of[-1,1]){
     const origin=torso.localToWorld(new THREE.Vector3(.022,.225,sign*.35));
     const direction=new THREE.Vector3(0,0,-sign).transformDirection(torso.matrixWorld);
     const hit=new THREE.Raycaster(origin,direction).intersectObjects(result.groups,true)[0];
     assert(hit,`${type} neck guard must cover front and rear`);
     const depth=torso.worldToLocal(hit.point.clone()).z*sign;assert(depth>.045&&depth<.13);
   }
   // Both sides of the abdomen must still be covered just above the navel hem.
   for(const sign of[-1,1]){
     const origin=torso.localToWorld(new THREE.Vector3(.035,-.235,sign*.5));
     const direction=new THREE.Vector3(0,0,-sign).transformDirection(torso.matrixWorld);
     const hit=new THREE.Raycaster(origin,direction).intersectObjects(result.groups,true)[0];
     assert(hit,`${type} must cover the lower abdomen at the navel`);
     assert(torso.worldToLocal(hit.point.clone()).z*sign>.05,'near-side coverage, not the opposite shell');
   }
   const materials=[];for(const g of result.groups)g.traverse(o=>{if(o.isMesh)materials.push(o.material);});
   assert(materials.every(m=>m.userData.textureDetail==='photographic-torso'),'small front details come from the photographic atlas');
   assert(materials.every(m=>['r','g','b'].every(channel=>m.color[channel]<=1)),'tints remain valid glTF base color factors');
   if(type==='tshirt'||type==='vest')assert(materials.some(m=>m.userData.surfaceKind==='fabric'&&m.metalness===0&&m.roughness>.9),'clothing must use matte nonmetallic fabric');
 }
 for(let n=0;n<10;n++)animateRobot(robot,1/30,{speed:1.5});robot.root.updateMatrixWorld(true);
 assert(result.groups.every(g=>g.matrixWorld.elements.every(Number.isFinite)));
 robot.mixer.stopAllAction();robot.skeleton.pose();
}
assert.equal(signatures.size,16,'all 16 items have distinct mesh geometry without their textures');
const moduleSignatures=new Set();
for(const type of Object.keys(MODULE_STUDIES)){
 const result=attachEquipmentStudies(robot,{},[0,1,2].map(slot=>({type,slot,level:1})));
 assert.equal(result.groups.length,3);assert(result.moduleTriangles>100&&result.moduleTriangles<3500);
 moduleSignatures.add(signature([result.groups[0]]));
 assert.deepEqual(result.groups.map(g=>g.userData.chestSlot),[0,1,2]);
}
assert.equal(moduleSignatures.size,6,'six modules differ in geometry');
const colorMaps=new Set();
for(const paint of Object.keys(EQUIPMENT_PAINTS)){
 const m=exoskeletonSurface('field',{paint,mark:1});assert(m.map&&m.normalMap&&m.roughnessMap&&m.metalnessMap);
 colorMaps.add(Buffer.from(m.map.image.data).toString('base64'));
 let rust=0,painted=0;const data=m.map.image.data;
 for(let i=0;i<data.length;i+=4){if(data[i]>data[i+1]*1.4&&data[i+1]>data[i+2]*1.3)rust++;else painted++;}
 assert(rust>100&&painted>1000,'paint and corrosion are both visible');
}
assert.equal(colorMaps.size,6);
const outfit={head:{type:'tactical'},chest:{type:'medic'},arms:{type:'brawler'},legs:{type:'exoleg'},back:{type:'houndPack'}};
const result=attachEquipmentStudies(robot,outfit,[{type:'core',slot:0}]);assert.equal(result.slots.length,5);assert.equal(result.jointCovers.length,12);assert(result.triangles<15000);
const before=result.groups.length;robot.salvageFrame.chestMechanism.setOpen(1);robot.root.updateMatrixWorld(true);assert.equal(result.groups.length,before);
removeExoskeleton(robot);assert(result.groups.every(g=>g.parent===null));disposeRobot(robot);
console.log(JSON.stringify({pass:true,items:16,modules:6,paints:6,triangles:counts,outfit:result.triangles},null,2));

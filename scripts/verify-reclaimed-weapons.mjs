import assert from 'node:assert/strict';
import * as T from 'three';
import {createWeaponModel} from '../weapon-models.js';
import {RECLAIMED_GUNS} from '../reclaimed-weapons.js';
import {createRobot} from '../robot.js';
import {createThirdPersonView} from '../third-person.js';

const ids=Object.keys(RECLAIMED_GUNS),report=[];
for(const type of ids){
 const model=createWeaponModel(type),other=createWeaponModel(type),bounds=new T.Box3().setFromObject(model),size=bounds.getSize(new T.Vector3());
 assert(model.userData.reclaimedWeapon);assert.deepEqual(model.scale.toArray(),[1,1,1],'all firearms use metres without legacy multipliers');
 assert(size.z>=.6&&size.z<=(type==='rapid'?1.18:1.13),type+' fits the two metre robot');assert(size.x<(type==='rapid'?.855:type==='rocket'?.40:.36)&&size.y<(type==='rapid'?.825:.44),type+' remains hand portable');
 for(const anchor of ['triggerGrip','supportGrip','muzzle'])assert(model.userData[anchor]?.length===3&&model.userData[anchor].every(Number.isFinite),type+' has '+anchor);
 const barrelBounds=new T.Box3();
 model.traverse(o=>{if(!o.isMesh)return;let parent=o;while(parent){if(parent===model.userData.pilotFlame)return;parent=parent.parent;}o.geometry.computeBoundingBox();barrelBounds.union(o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld));});
 const muzzle=new T.Vector3(...model.userData.muzzle);assert(muzzle.z<=barrelBounds.min.z+.005&&muzzle.z>barrelBounds.min.z-.05,type+' muzzle is ahead of the visible barrel, excluding the pilot flame');
 const hand=new T.Vector3(...model.userData.triggerGrip),support=new T.Vector3(...model.userData.supportGrip);assert(hand.distanceTo(support)<.53,type+' two hand spacing fits the arms');
 let triangles=0,meshes=0;model.traverse(o=>{if(!o.isMesh)return;meshes++;const g=o.geometry;assert([...g.attributes.position.array].every(Number.isFinite));assert(g.attributes.uv);triangles+=(g.index?.count||g.attributes.position.count)/3;});
 assert(triangles<2100,type+' keeps the low polygon budget');
 if(type==='rapid'){assert(model.userData.rotor.isGroup);assert.notEqual(model.userData.rotor,other.userData.rotor);model.userData.rotor.rotation.z=.5;assert.equal(other.userData.rotor.rotation.z,0);}
 if(type==='laser'){assert.equal(model.userData.chargeRings.length,5);const first=model.userData.chargeRings[0];first.material.emissiveIntensity=2;assert.equal(model.userData.chargeRings[1].material.emissiveIntensity,.08);assert.equal(other.userData.chargeRings[0].material.emissiveIntensity,.08);}
 if(type==='rail'){assert.equal(model.userData.chargeVents.length,6);assert(model.userData.chargeLight.isLight);assert(model.userData.chargeGlowMaterial);model.userData.chargeVents[0].vent.material.emissiveIntensity=2;assert.equal(other.userData.chargeVents[0].vent.material.emissiveIntensity,0);}
 if(type==='flame')assert(model.userData.pilotFlame.isGroup);
 if(type==='rocket'){assert(model.userData.sightAssembly.isGroup);assert(model.userData.shoulderMount);}
 if(type==='sniper')assert(model.userData.scopeEye);
 report.push({type,lengthCm:Math.round(size.z*100),triangles,meshes});
}
const alias=createWeaponModel('rifle');assert(alias.userData.reclaimedWeapon);assert.equal(alias.name,'weapon-rifle');
for(const type of ['bow','knife','chainsaw','sword'])assert(!createWeaponModel(type).userData.reclaimedWeapon,'non firearms retain their model');
// Exercise the shared attachment API after changing every weapon's dimensions.
const robot=createRobot(false,'player'),view=createThirdPersonView(robot,ids);
for(const type of ids)for(const adsBlend of [0,1]){
 view.pose({position:new T.Vector3(0,1.7,0),yaw:.4,pitch:0,weapon:type,velocity:new T.Vector3(),grounded:true,time:0,dt:.016,adsBlend,disableCustomMotion:true});
 const model=view.models[type],contact=model.userData.handContacts.right,grip=model.localToWorld(new T.Vector3(...contact.grip));
 const palm=robot.salvageFrame.anchors.hand_r.localToWorld(new T.Vector3(...contact.point));
 assert(grip.distanceTo(palm)<.001,type+' uses its physical palm contact');
 assert(robot.bones.every(b=>b.matrixWorld.elements.every(Number.isFinite)));
}
const packPose={position:new T.Vector3(0,1.7,0),yaw:0,pitch:0,weapon:'pistol',velocity:new T.Vector3(),grounded:true,time:0,dt:0,disableCustomMotion:true};
view.pose({...packPose,loadout:['rapid','pistol']});assert(view.minigunAmmo.visible,'minigun stage keeps ammo box when another gun is held');
view.pose({...packPose,loadout:['sniper','pistol']});assert(!view.minigunAmmo.visible,'stages without minigun omit ammo box');
view.pose({...packPose,weapon:'rapid',loadout:['rapid','pistol']});assert(view.minigunAmmo.visible&&!view.equipment.packs.rapid.visible,'only the under-backpack ammo box is visible');
console.log(JSON.stringify({pass:true,models:report,checks:'dimensions, geometry, anchors, animation handles, independent effects, rifle alias and shared attachment'},null,2));

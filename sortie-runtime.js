export {prepareCombatAssets} from './asset-loading.js';
export {frameSteps,createPerformanceWindow,installQualityControls,installFPSMeter} from './runtime-performance.js';
export {navigationColliders,enemyBlocked} from './collision-broadphase.js';
export {assistedDirection} from './aim-assist.js';
export {createBackEquipmentRuntime} from './back-equipment-runtime.js';
export {createEquipmentModel} from './equipment-models.js';
export {EQUIPMENT,EQUIPMENT_SLOTS,makeEquipment,lootEquipment} from './equipment.js';
import {createAtomicCityWorld} from './atomic-city-world.js';
import {createConnectedStreetWorld} from './connected-street-world.js';
export {applyFrameVisual,framePreview} from './frame-preview.js';
import * as THREE from 'three';
import {createCampaign,PARTS,frameStats,makePart,makeWeapon,makeCoreWeapon,SALVAGE_DROPS,weaponPerk,lootWeapon,lootPart,tickBattery,spendBattery} from './salvage-campaign.js';
import {createBaseUI} from './salvage-ui.js';
export {createCampaign,PARTS,frameStats,makePart,makeWeapon,makeCoreWeapon,SALVAGE_DROPS,weaponPerk,lootWeapon,lootPart,tickBattery,spendBattery,createBaseUI};
import {createRoadRoute,updateAwareness} from './road-route.js';
export {updateAwareness};
export function createSalvageWorld(scene,platforms,box,mats,{legacyTestWorld=false}={}){
 if(!legacyTestWorld&&typeof document!=='undefined')return new URLSearchParams(location.search).has('arena')?createAtomicCityWorld(scene,platforms,mats):createConnectedStreetWorld(scene,platforms,mats);
 if(!legacyTestWorld)return createConnectedStreetWorld(scene,platforms,mats);
 const route=createRoadRoute();platforms.bounds=route.bounds;
 const asphalt=new THREE.MeshStandardMaterial({color:0x626967,roughness:1}),paint=new THREE.MeshStandardMaterial({color:0xd8cfaa}),green=new THREE.MeshStandardMaterial({color:0x55734a,roughness:1}),trunk=new THREE.MeshStandardMaterial({color:0x675542,roughness:1});
 const ground=new THREE.Group();ground.name='long-bent-avenue';scene.add(ground);
 const part=(w,h,d,mat,x,y,z,angle=0)=>{const m=box(w,h,d,mat,x,y,z);m.rotation.y=angle;return m;};
 for(const seg of route.segments){const angle=Math.atan2(seg.dx,seg.dz);part(36,.08,seg.distance+2,asphalt,(seg.a.x+seg.b.x)/2,.04,(seg.a.z+seg.b.z)/2,angle);}
 for(const p of route.points)part(36,.08,36,asphalt,p.x,.04,p.z);
 for(let s=6;s<route.length;s+=6){const p=route.sample(s);part(.16,.015,2.8,paint,p.x,.09,p.z,Math.atan2(p.dx,p.dz));}
 const addCover=(p,w,h,d,mat=mats.wall)=>{part(w,h,d,mat,p.x,h/2,p.z);platforms.push({x:p.x,z:p.z,w,d,h});};
 // Large ruined facades flank every bend; dense windows are instanced below.
 const windows=[],vines=[];
 for(let s=22,index=0;s<route.length-22;s+=25,index++)for(const side of[-1,1]){
  const p=route.sample(s,side*33),w=17,d=18,h=16+(index%4)*5;
  addCover(p,w,h,d);for(let floor=2;floor<h;floor+=3.2){part(w+.4,.22,d+.4,mats.dark,p.x,floor,p.z);for(let col=-6;col<=6;col+=3)for(const face of[-1,1]){windows.push([p.x+col,floor+1.2,p.z+face*(d/2+.02)]);if((index+col+floor|0)%3===0)vines.push([p.x+col,floor,p.z+face*(d/2+.06)]);}}
  for(const off of[-5,2,6])part(3,1.8+(index%3),3,mats.wall,p.x+off,h+1,p.z+off*.4);
 }
 const batch=(geometry,material,positions,scale)=>{const mesh=new THREE.InstancedMesh(geometry,material,positions.length),dummy=new THREE.Object3D();positions.forEach((p,i)=>{dummy.position.set(...p);dummy.scale.set(...scale);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);});scene.add(mesh);return mesh;};
 batch(new THREE.BoxGeometry(1,1,1),mats.dark,windows,[1.6,1.9,.06]);batch(new THREE.BoxGeometry(1,1,1),green,vines,[.7,3,.08]);
 const trees=[],grass=[];
 for(let s=12,index=0;s<route.length;s+=9,index++)for(const side of[-1,1]){
  const p=route.sample(s,side*21);part(.55,4.5,.55,trunk,p.x,2.25,p.z);trees.push([p.x,5.5,p.z]);
  const a=route.sample(s,side*18.7);part(.4,.24,4,mats.wall,a.x,.12,a.z,Math.atan2(a.dx,a.dz));
  if(index%3===0){const pole=route.sample(s,side*17);part(.18,5.8,.18,mats.dark,pole.x,2.9,pole.z);part(1.1,2,.45,mats.dark,pole.x,5.4,pole.z);for(let j=0;j<3;j++)part(.5,.42,.08,new THREE.MeshBasicMaterial({color:[0xd45e48,0xe2b35d,0x77a762][j]}),pole.x,6-j*.65,pole.z+.27);part(5,.13,.18,mats.dark,pole.x-side*2.4,6.3,pole.z);}
  if(index%4===1){const c=route.sample(s,side*9);addCover(c,3.8,1.4,6,mats.dark);part(3.2,1,3,mats.wall,c.x,1.8,c.z);}
  if(index%5===2){const c=route.sample(s,side*6);addCover(c,4.5,1.1,2);}
  for(let i=0;i<160;i++){const g=route.sample(s+(i%20)*.4,side*(18+((i*17)%100)*.12));grass.push([g.x,.2+(i%4)*.05,g.z]);}
 }
 batch(new THREE.IcosahedronGeometry(1,1),green,trees,[2.7,3,2.7]);batch(new THREE.ConeGeometry(.1,1,3),green,grass,[1,.6,1]);
 // Wide guardian plaza, sealed by collapsed buildings behind the cache.
 const end=route.end;part(80,.08,65,asphalt,end.x,.04,end.z-15);
 for(const side of[-1,1]){addCover({x:end.x+side*44,z:end.z-10},14,28,55);addCover({x:end.x+side*25,z:end.z-44},35,10,12);}
 const extraction=new THREE.Group();extraction.position.set(route.start.x,0,route.start.z);scene.add(extraction);
 const ring=new THREE.Mesh(new THREE.RingGeometry(4,4.4,48),new THREE.MeshBasicMaterial({color:0x96e4ad,side:THREE.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.y=.1;extraction.add(ring);
 const target=new THREE.Group();target.name='locked-core-cache';target.position.set(end.x,.1,end.z-8);scene.add(target);
 const pedestal=new THREE.Mesh(new THREE.BoxGeometry(3,1.2,3),mats.dark);pedestal.position.y=.6;target.add(pedestal);
 const lid=new THREE.Mesh(new THREE.BoxGeometry(3.2,.35,3.2),mats.wall);lid.position.y=1.4;target.add(lid);
 const orb=new THREE.Mesh(new THREE.IcosahedronGeometry(.7,1),new THREE.MeshStandardMaterial({color:0xa882ff,emissive:0x693fd9,emissiveIntensity:1.2}));orb.position.y=1.7;orb.visible=false;target.add(orb);
 let unlocked=false;return {route,ground,extraction,target,get unlocked(){return unlocked;},reset(){unlocked=false;target.visible=true;orb.visible=false;lid.position.y=1.4;},unlock(){unlocked=true;orb.visible=true;},update(time){orb.rotation.y=time;orb.position.y=1.9+Math.sin(time*2)*.15;if(unlocked)lid.position.y=2.8;}};
}

export {roadEncounterPlan,budgetEnemy,updateDropVisibility} from './combat-budget.js';
export {createEnemyVisibility,setEnemySleeping} from './enemy-visibility.js';
export {createShadowBudget,createWeaponPass} from './runtime-performance.js';
export {disposeObjectResources} from './runtime-resources.js';

export {createCombatEffectPool} from './combat-effects.js';
export {createDeathBudget} from './death-budget.js';
export {createDropBudget} from './combat-budget.js';
export {createCombatLightPool} from './combat-lights.js';

export {gameMode,gameModeURL,trainingWaveSize,trainingWaveRoster} from './game-modes.js';
export {createWeaponSlotHUD} from './weapon-slot-hud.js';

export {withFrameWork,scheduleFrameWork} from './frame-work.js';
export {flushEnemyPoses} from './wild-enemy-models.js';
export {createEnemyRenderBatch} from './enemy-render-batch.js';

export {createTrainingDataEffects} from './training-data-effects.js';

export {pickTrainingSpawn} from './training-spawns.js';

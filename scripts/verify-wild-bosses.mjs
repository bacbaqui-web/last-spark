import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import * as THREE from 'three';
import {batchWildSurfaces} from '../wild-enemy-surfaces.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createBoss,createScoutDrone,animateBoss} from '../boss-models.js';
import {wildGait} from '../wild-enemy-gait.js';
import {WILD_ENEMIES,registerWildTemplate,createWildEnemy,wildEnemyId,animateWildEnemy,animateWildAttack,fireWildEnemy,dieWildEnemy,disposeWildEnemy} from '../wild-enemy-models.js';
// Exercise the actual GLB geometry and pivot nodes in Node; skip only browser image decoding.
for(const id of Object.keys(WILD_ENEMIES).filter(id=>WILD_ENEMIES[id].bossModel)){
 const bytes=await fs.readFile(new URL(`../public/models/wild-robots-v1/${id}.glb`,import.meta.url));
 const jsonSize=bytes.readUInt32LE(12),json=JSON.parse(bytes.subarray(20,20+jsonSize));
 const mappedMaterials=new Set(json.materials.filter(m=>m.pbrMetallicRoughness?.baseColorTexture).map(m=>m.name));
 for(const material of json.materials){delete material.normalTexture;delete material.emissiveTexture;delete material.occlusionTexture;if(material.pbrMetallicRoughness){delete material.pbrMetallicRoughness.baseColorTexture;delete material.pbrMetallicRoughness.metallicRoughnessTexture;}}
 delete json.images;delete json.textures;json.extensionsRequired=[];
 const data=Buffer.from(JSON.stringify(json)),size=Math.ceil(data.length/4)*4,bin=bytes.subarray(20+jsonSize),glb=Buffer.alloc(20+size+bin.length,32);
 bytes.copy(glb,0,0,20);glb.writeUInt32LE(glb.length,8);glb.writeUInt32LE(size,12);data.copy(glb,20);bin.copy(glb,20+size);
 const source=await new GLTFLoader().parseAsync(glb.buffer.slice(glb.byteOffset,glb.byteOffset+glb.length),'');const atlas=new THREE.Texture();source.scene.traverse(o=>{if(o.isMesh&&mappedMaterials.has(o.material.name))o.material.map=atlas;});batchWildSurfaces(source.scene);registerWildTemplate(id,source.scene);
 const r=createWildEnemy(id),other=createWildEnemy(id);
 assert(!r.spec.previewOnly,'bosses are enabled for game preload');
 const type=id==='queen-wasp-boss'?'drone':id==='moss-reaper-boss'?'blade':'missile';assert.equal(wildEnemyId(true,type),id);const actor=createBoss(type);assert.equal(actor.wildId,id);disposeWildEnemy(actor);
 assert(r.hitMeshes.length<=20,'detail batches by mechanical assembly');
 assert(r.eyeGlow.visible&&r.eyeGlow.parent===r.head,'red eye anchored to head');
 const ownedTriangles=r.hitMeshes.reduce((n,o)=>n+(o.geometry.index?.count||o.geometry.attributes.position.count)/3,0);
 assert(ownedTriangles>60000,`${id}: detailed authored geometry`);
 const fixed=r.arms.filter(a=>a.side!==undefined).flatMap(a=>[a.elbow,a.hand]).map(n=>({n,p:n.position.clone()}));
 for(const speed of [0,2.3,6])for(let i=0;i<90;i++){
  animateWildEnemy(r,1/60,{speed,aim:1});r.root.updateMatrixWorld(true);
  r.root.traverse(o=>assert(o.matrixWorld.elements.every(Number.isFinite),`${id}: finite transforms`));
  for(const {n,p}of fixed)assert(n.position.distanceTo(p)<1e-6,'arm anchors stay connected');
 }
 if(r.spec.flying){assert.equal(r.rotors.length,2);assert(r.rotors.every(o=>Math.abs(o.rotation.y)>.01));}
 if(r.spec.hand){assert.equal(r.blades.length,2);for(const a of r.arms)assert(a.hand.parent===a.elbow&&a.elbow.parent===a.shoulder);}
 for(const time of [.64,.45,.30,.12]){animateWildEnemy(r,0);animateWildAttack(r,time);r.root.updateMatrixWorld(true);r.root.traverse(o=>assert(o.matrixWorld.elements.every(Number.isFinite)));}
 if(id==='moss-reaper-boss'){
  const right=r.arms.find(a=>a.side<0),left=r.arms.find(a=>a.side>0);
  const poseAt=t=>{animateWildEnemy(r,0);animateWildAttack(r,r.spec.attackDuration*(1-t));};
  poseAt(.20);assert(right.shoulder.rotation.x<-.5&&Math.abs(left.shoulder.rotation.x)<.01,'right arm cuts first while left guards');
  poseAt(.60);assert(left.shoulder.rotation.x<-.5&&Math.abs(right.shoulder.rotation.x)<.01,'left arm follows after right recovers');
  poseAt(.24);assert(Math.abs(right.shoulder.rotation.y)>.05&&Math.abs(right.shoulder.rotation.z)>.05,'slash crosses diagonally');
  poseAt(.999);assert(r.arms.every(a=>Math.abs(a.shoulder.rotation.x)<.001),'combo recovers without snapping');
 }
 if(r.spec.attackKind==='missile'){assert.equal(r.missileMuzzles.length,2);assert(r.nodes.Missile_pod_1.rotation.x<0);}
 if(r.spec.attackKind==='missile-barrage'){assert.equal(r.missileMuzzles.length,6);const ports=new Set();for(let i=0;i<6;i++){fireWildEnemy(r);ports.add(r.muzzle.position.toArray().join(','));}assert.equal(ports.size,6,'barrage cycles all six launcher ports');}
 fireWildEnemy(r);assert(r.muzzleFlash.visible);dieWildEnemy(r,.03);assert(r.destruction.fx.flash.visible);
 animateWildEnemy(r,.016);assert(!r.destruction&&r.mount.visible);assert.equal(other.phase,0);
 disposeWildEnemy(r);disposeWildEnemy(other);console.log(`PASS ${id}: ${ownedTriangles} triangles, hierarchy, gait/flight, attack, death, reset and isolation`);
}

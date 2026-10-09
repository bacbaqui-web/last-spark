import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import * as THREE from 'three';
import {batchWildSurfaces} from '../wild-enemy-surfaces.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createBoss,createScoutDrone,animateBoss} from '../boss-models.js';
import {wildGait} from '../wild-enemy-gait.js';
import {WILD_ENEMIES,registerWildTemplate,createWildEnemy,wildEnemyId,animateWildEnemy,animateWildAttack,fireWildEnemy,dieWildEnemy,disposeWildEnemy} from '../wild-enemy-models.js';
// Exercise the actual GLB geometry and pivot nodes in Node; skip only browser image decoding.
for(const id of Object.keys(WILD_ENEMIES)){
 const bytes=await fs.readFile(new URL(`../public/models/wild-robots-v1/${id}.glb`,import.meta.url));
 const jsonSize=bytes.readUInt32LE(12),json=JSON.parse(bytes.subarray(20,20+jsonSize));
 const mappedMaterials=new Set(json.materials.filter(m=>m.pbrMetallicRoughness?.baseColorTexture).map(m=>m.name));
 for(const material of json.materials){delete material.normalTexture;delete material.emissiveTexture;delete material.occlusionTexture;if(material.pbrMetallicRoughness){delete material.pbrMetallicRoughness.baseColorTexture;delete material.pbrMetallicRoughness.metallicRoughnessTexture;}}
 delete json.images;delete json.textures;json.extensionsRequired=[];
 const data=Buffer.from(JSON.stringify(json)),size=Math.ceil(data.length/4)*4,bin=bytes.subarray(20+jsonSize),glb=Buffer.alloc(20+size+bin.length,32);
 bytes.copy(glb,0,0,20);glb.writeUInt32LE(glb.length,8);glb.writeUInt32LE(size,12);data.copy(glb,20);bin.copy(glb,20+size);
 const source=await new GLTFLoader().parseAsync(glb.buffer.slice(glb.byteOffset,glb.byteOffset+glb.length),'');const atlas=new THREE.Texture();source.scene.traverse(o=>{if(o.isMesh&&mappedMaterials.has(o.material.name))o.material.map=atlas;});batchWildSurfaces(source.scene);registerWildTemplate(id,source.scene);
 if(WILD_ENEMIES[id].flying){
  const drone=createWildEnemy(id),other=createWildEnemy(id);
  assert.equal(drone.rotors.length,2);assert.equal(drone.legs.length,0);
  for(const rotor of drone.rotors){
   rotor.updateWorldMatrix(true,true);const inverse=rotor.matrixWorld.clone().invert(),bounds=new THREE.Box3();
   rotor.traverse(o=>{if(o.isMesh){o.geometry.computeBoundingBox();bounds.union(o.geometry.boundingBox.clone().applyMatrix4(inverse.clone().multiply(o.matrixWorld)));}});
   assert(bounds.min.x>-.66&&bounds.max.x<.66&&bounds.min.z>-.66&&bounds.max.z<.66,'only rotor blades/hub rotate inside guard');
  }
  assert.equal(drone.muzzle.parent,drone.nodes.Stinger_gun);
  assert(drone.eyeGlow.visible&&source.scene.userData.wildEye.length===3);
  const poses=drone.rotors.map(o=>o.quaternion.clone());
  for(let i=0;i<60;i++)animateWildEnemy(drone,1/60,{speed:4,aim:1});
  drone.root.updateMatrixWorld(true);
  drone.root.traverse(o=>assert(o.matrixWorld.elements.every(Number.isFinite),'finite drone transforms'));
  drone.rotors.forEach((rotor,i)=>assert(rotor.quaternion.angleTo(poses[i])>.1,'rotors spin'));
  assert.equal(other.phase,0,'independent rotor poses');
  assert(new THREE.Box3().setFromObject(drone.asset).min.y>0,'hover clears floor');
  fireWildEnemy(drone);assert(drone.muzzleFlash.visible);
  dieWildEnemy(drone,.2);assert(drone.destruction.pieces.length>0);
  animateWildEnemy(drone,.016);assert(!drone.destruction&&drone.mount.visible);
  const boss=createBoss('drone'),scout=createScoutDrone();
  for(const actor of [boss,scout]){
   assert.equal(actor.wildId,id);assert.equal(actor.rotors.length,2);assert.equal(actor.missileMuzzles.length,2);
   actor.posePrepared=false;animateBoss(actor,.016,1,0);assert(actor.phase>0);
   for(const port of actor.missileMuzzles){port.parent.rotation.x=-Math.PI/2;assert(port.getWorldPosition(new THREE.Vector3()).toArray().every(Number.isFinite));}
   disposeWildEnemy(actor);
  }
  assert(scout.root.scale.x<boss.root.scale.x,'scout retains small size');
  disposeWildEnemy(drone);disposeWildEnemy(other);console.log('PASS wasp rotor, hover, red eye, fire and destruction');continue;
 }
 const r=createWildEnemy(id),other=createWildEnemy(id),before=r.legs[0].foot.getWorldPosition(new THREE.Vector3()),rest=other.legs[0].foot.getWorldPosition(new THREE.Vector3());
 assert(source.scene.userData.wildEye?.length===3,`${id}: optical center survives batching`);
 assert(r.eyeGlow.parent===r.head&&r.eyeGlow.visible,`${id}: eye glow follows the head`);
 assert(r.eyeGlow.material.color.r>.9&&r.eyeGlow.material.color.g<.02,`${id}: red eye glow`);
 let redEyeVertices=0;
 r.head.traverse(o=>{const emission=o.geometry?.attributes.wildEmission;if(emission)for(let i=0;i<emission.count;i++)if(emission.getX(i)>1&&emission.getY(i)<.1)redEyeVertices++;});
 assert(redEyeVertices>0,`${id}: head lens emits red light`);
 assert(r.hitMeshes.length<50,'one draw per rigid assembly');let lift=0;
 for(let i=0;i<90;i++){animateWildEnemy(r,1/60,{speed:3.6,aim:1,hit:i===30?.2:0});r.root.updateMatrixWorld(true);lift=Math.max(lift,r.legs[0].foot.getWorldPosition(new THREE.Vector3()).distanceTo(before));
  r.root.traverse(o=>assert(o.matrixWorld.elements.every(Number.isFinite),`${id}: finite animated transforms`));
  for(const leg of r.legs)for(const joint of leg.chain)assert(joint.position.distanceTo(r.rest.get(joint).p)<1e-6,`${id}: joint anchors stay connected`);
 }
 assert(lift>.035,`${id}: visible stride`);assert(other.legs[0].foot.getWorldPosition(new THREE.Vector3()).distanceTo(rest)<1e-6,`${id}: independent instance poses`);
 // +Z is the model's face/gun direction. The raised foot must return forward;
 // the planted foot must travel backward relative to a forward-moving chassis.
 for(const speed of [2.3,6])for(const yaw of [0,.8,Math.PI]){
  r.root.rotation.y=yaw;r.walkBlend=1;r.gaitSpeed=speed;
  const support=wildGait(id,speed).support;
  const footAt=cycle=>{r.phase=cycle*Math.PI*2;animateWildEnemy(r,0,{speed});return r.motion.worldToLocal(r.legs[0].foot.getWorldPosition(new THREE.Vector3()));};
  const swingStart=footAt(support+(1-support)*.25),swingEnd=footAt(support+(1-support)*.75);
  const stanceStart=footAt(support*.2),stanceEnd=footAt(support*.8);
  assert(swingEnd.z>swingStart.z+.1,`${id}: lifted foot returns forward at speed ${speed}, yaw ${yaw}`);
  assert(stanceEnd.z<stanceStart.z-.1,`${id}: planted foot pushes backward at speed ${speed}, yaw ${yaw}`);
  assert(swingStart.y>stanceEnd.y+.025&&swingEnd.y>stanceStart.y+.025,`${id}: return foot is raised above the matching front/rear support poses`);
  assert(Math.abs(stanceStart.y-stanceEnd.y)<.035,`${id}: planted foot stays level while chassis takes weight: ${stanceStart.y}, ${stanceEnd.y} at ${speed}`);
 }
 r.root.rotation.y=0;
 // Check full cycles on the real meshes, not just the foot-target function.
 for(const speed of [2.3,6]){
  const gait=wildGait(id,speed),heights=[],torsoHeights=[];let supportedFrames=0,minSupports=99;
  r.gaitSpeed=speed;r.walkBlend=1;r.travel.set(0,0,1);
  for(let frame=0;frame<120;frame++){
   r.phase=frame/120*Math.PI*2;animateWildEnemy(r,0,{speed});
   const supporting=r.legs.filter(leg=>leg.planted);minSupports=Math.min(minSupports,supporting.length);
   if(r.legs[0].planted){supportedFrames++;heights.push(r.motion.worldToLocal(r.legs[0].foot.getWorldPosition(new THREE.Vector3())).y);}
   torsoHeights.push(r.body.position.y);assert(r.legs.every(leg=>leg.foot.getWorldPosition(new THREE.Vector3()).y>=-.015),`${id}: feet never pass through the floor`);
  }
  assert(supportedFrames/120>.5,`${id}: feet bear weight for most of each cycle`);
  assert(minSupports>=(r.spec.count||1),`${id}: walking/rushing retains a support leg group`);
  assert(Math.max(...heights)-Math.min(...heights)<.05,`${id}: support feet do not bounce with the body: ${Math.max(...heights)-Math.min(...heights)} at ${speed}`);
  assert(Math.max(...torsoHeights)-Math.min(...torsoHeights)>gait.press*.35,`${id}: visible landing compression reaches the torso`);
  if(r.nodes.Pelvis)assert(Math.abs((r.body.position.y-r.rest.get(r.body).p.y)-(r.nodes.Pelvis.position.y-r.rest.get(r.nodes.Pelvis).p.y))<.005,`${id}: pelvis absorbs the same load as the torso`);
 }
 // The player-style bounded pace must remain stable across rendering rates.
 const at30=createWildEnemy(id),at60=createWildEnemy(id);
 for(let i=0;i<60;i++)animateWildEnemy(at30,1/30,{speed:6});
 for(let i=0;i<120;i++)animateWildEnemy(at60,1/60,{speed:6});
 assert(Math.abs(at30.phase-at60.phase)<.15,`${id}: cadence is frame-rate independent`);
 assert(at60.strideRate<2.1,`${id}: run does not degenerate into rapid short steps`);
 const airbornePhase=at60.phase;animateWildEnemy(at60,1/60,{speed:6,grounded:false});
 assert.equal(at60.phase,airbornePhase,`${id}: airborne stance stops the stride clock`);assert(at60.legs.every(leg=>!leg.planted));
 for(let i=0;i<90;i++)animateWildEnemy(at30,1/60,{speed:0});
 assert(at30.walkBlend<.001&&at30.strideRate<.001,`${id}: stopping settles rather than marching in place`);
 for(const [vx,vz] of [[2.3,0],[0,-2.3]]){
  for(let i=0;i<60;i++)animateWildEnemy(at30,1/60,{speed:2.3,velocityX:vx,velocityZ:vz});
  assert(at30.travel.dot(new THREE.Vector3(vx,0,vz).normalize())>.99,`${id}: stride follows strafing and retreating travel`);
 }
 disposeWildEnemy(at30);disposeWildEnemy(at60);
 if(id==='assault-mantis'){
  for(const arm of r.arms){
   assert.notEqual(arm.hand,arm.elbow,'mantis has a distinct wrist/blade hand');
   assert.equal(arm.hand.parent,arm.elbow,'wrist follows forearm');
   assert.equal(arm.elbow.parent,arm.shoulder,'forearm follows upper arm');
   const authored=source.scene.getObjectByName(arm.hand.name);
   assert.equal(authored.parent.name,arm.elbow.name,'three-part arm is authored in the GLB, not just the runtime');
  }
  const inModel=node=>r.motion.worldToLocal(node.getWorldPosition(new THREE.Vector3()));
  for(const speed of [0,2.3,6])for(const phase of [0,.7,2.1,4.5]){
   r.phase=phase;r.walkBlend=speed?1:0;animateWildEnemy(r,0,{speed});
   for(const arm of r.arms){
    const down=new THREE.Vector3().fromArray(arm.hand.userData.blade_edge_local).applyQuaternion(arm.hand.getWorldQuaternion(new THREE.Quaternion()));
    assert(down.y<-.97,'both mantis cutting edges face down and spines face up');
    assert(inModel(arm.bladeTip).z>inModel(arm.hand).z+.9,'blade extends forward from the wrist');
   }
  }
  r.walkBlend=0;
  const attackPose=age=>{animateWildEnemy(r,0);animateWildAttack(r,.65-age);r.root.updateMatrixWorld(true);return r.arms.map(arm=>inModel(arm.bladeTip));};
  const guard=attackPose(0),raised=attackPose(.20),impact=attackPose(.29),followThrough=attackPose(.35);
  for(let i=0;i<2;i++){
   assert(raised[i].y>guard[i].y+.8,'mantis lifts blades above the guard');
   assert(impact[i].y<raised[i].y-1,'mantis chops downward through the damage window');
   assert(followThrough[i].y<impact[i].y,'blade continues downward after impact');
   assert(Math.abs(raised[i].x-followThrough[i].x)<.001,'mantis cut stays in a vertical plane, not a sideways sweep');
  }
  for(const arm of r.arms)for(const joint of [arm.shoulder,arm.elbow,arm.hand])assert(joint.position.distanceTo(r.rest.get(joint).p)<1e-6,'all three arm joints remain connected');
  console.log('PASS mantis: authored upper arm/forearm/wrist hierarchy, vertical idle/run blades, overhead chop and connected joints');
 }
 if(id==='forest-warden'){
  const right=r.arms.find(a=>a.side<0),left=r.arms.find(a=>a.side>0);
  animateWildEnemy(r,0);const leftPose=left.shoulder.quaternion.clone();animateWildAttack(r,.45);
  assert(right.shoulder.rotation.x<-1.5&&left.shoulder.quaternion.angleTo(leftPose)<1e-7,'warden raises only the anatomical right arm for the slam');
  animateWildEnemy(r,0);animateWildAttack(r,.36);assert(right.shoulder.rotation.x>.6,'right arm swings down through the impact window');
  animateWildEnemy(r,0);const target=new THREE.Vector3(3,2,8);r.aimAt(target);r.root.updateMatrixWorld(true);
  const barrel=new THREE.Vector3(0,0,1).applyQuaternion(left.elbow.getWorldQuaternion(new THREE.Quaternion())),aim=target.clone().sub(left.elbow.getWorldPosition(new THREE.Vector3())).normalize();
  assert(barrel.dot(aim)>.999&&r.muzzle.parent===left.elbow,'left cannon aims and owns the projectile muzzle');
 }
 fireWildEnemy(r);animateWildEnemy(r,.016,{aim:1});assert(r.muzzleFlash.visible&&r.recoil>0,`${id}: firing response`);
 if(!r.spec.count){const arm=r.arms[0].shoulder.quaternion.clone();animateWildAttack(r,.42);assert(arm.angleTo(r.arms[0].shoulder.quaternion)>.1,`${id}: melee windup`);}
 if(id==='wall-sniper-spider'){
  assert(r.mountOnWall([{x:0,z:0,w:6,d:6,h:8}],new THREE.Vector3(5,0,0),new THREE.Vector3(10,1,0)));
  animateWildEnemy(r,.016,{aim:1});const target=new THREE.Vector3(10,1,5);r.aimAt(target);
  const rifle=r.nodes.Sniper_rifle,start=rifle.getWorldPosition(new THREE.Vector3()),forward=new THREE.Vector3(0,0,1).applyQuaternion(rifle.getWorldQuaternion(new THREE.Quaternion()));
  assert(forward.dot(target.clone().sub(start).normalize())>.999,'wall-mounted rifle aims in world space');
  const wallPhase=r.phase,wallFeet=r.legs.map(leg=>leg.foot.getWorldPosition(new THREE.Vector3()));
  for(let i=0;i<60;i++)animateWildEnemy(r,1/60,{speed:6,aim:1});
  assert.equal(r.phase,wallPhase,'wall pose does not cycle locomotion');
  r.legs.forEach((leg,i)=>assert(leg.foot.getWorldPosition(new THREE.Vector3()).distanceTo(wallFeet[i])<1e-6,'wall feet remain anchored'));
 }
 r.root.updateMatrixWorld(true);const livePose=r.hitMeshes.map(mesh=>mesh.matrixWorld.clone()),materials=r.hitMeshes.map(mesh=>mesh.material);
 dieWildEnemy(r,0);const destruction=r.destruction;
 assert(!r.mount.visible&&!r.muzzleFlash.visible&&destruction.pieces.length===r.hitMeshes.length,`${id}: every authored assembly bursts immediately`);
 r.root.updateMatrixWorld(true);
 for(const p of destruction.pieces){
  assert.equal(p.mesh.geometry,p.source.geometry,'parts reuse original geometry without new cuts');
  assert.equal(p.mesh.material.color.getHex(),0x080808,'every flying part is black');
  assert(p.mesh.material.isMeshBasicMaterial&&!p.mesh.material.map&&!p.mesh.castShadow,'unlit parts add no texture or shadow cost');
  p.mesh.matrixWorld.elements.forEach((v,i)=>assert(Math.abs(v-p.source.matrixWorld.elements[i])<1e-6,'initial burst preserves the exact posed assembly'));
 }
 assert(!destruction.physics&&!destruction.shards&&!destruction.frames,'no rigid bodies, additional shards or pose histories');
 destruction.group.traverse(o=>assert(!o.isLight,'burst does not add scene lights'));
 assert(destruction.fx.flash.isSprite&&destruction.fx.arcs.isLineSegments,'shared explosion and electricity effects');
 const initial=destruction.pieces.map(p=>p.node.position.clone());dieWildEnemy(r,.03);
 assert(destruction.pieces.every((p,i)=>p.node.position.distanceTo(initial[i])>.08),'all parts fly immediately without a collapse delay');
 for(const axis of ['x','z'])assert(destruction.pieces.some(p=>p.velocity[axis]>1)&&destruction.pieces.some(p=>p.velocity[axis]<-1),'scatter covers both directions');
 dieWildEnemy(r,.4);const pose=destruction.pieces.map(p=>({position:p.node.position.clone(),rotation:p.node.quaternion.clone()}));
 for(const fps of [30,60,144]){
  for(let frame=0;frame<fps;frame++)dieWildEnemy(r,frame/fps);
  dieWildEnemy(r,.4);destruction.pieces.forEach((p,i)=>{assert(p.node.position.distanceTo(pose[i].position)<1e-8,'same trajectory across frame rates and seeking');assert(p.node.quaternion.angleTo(pose[i].rotation)<1e-7,'same spin across frame rates');});
 }
 for(const time of [0,.1,.5,r.deathDuration]){dieWildEnemy(r,time);r.root.updateMatrixWorld(true);r.root.traverse(o=>assert(o.matrixWorld.elements.every(Number.isFinite),'wall and ground bursts stay finite'));}
 assert(!destruction.group.visible&&r.deathDuration<=1.1,'burst is gone after about one second');
 r.hitMeshes.forEach((mesh,i)=>{assert(mesh.matrixWorld.equals(livePose[i]),'live source pose is not changed');assert.equal(mesh.material,materials[i],'live materials remain untouched');});
 animateWildEnemy(r,.016);assert(!r.destruction&&r.mount.visible&&!destruction.group.parent,'replay restores the original model');
 for(let round=0;round<4;round++){dieWildEnemy(r,.2);assert.equal(r.destruction.pieces.length,initial.length,'replay does not accumulate parts');animateWildEnemy(r,0);}
 for(const yaw of [0,1.1]){
  const victim=createWildEnemy(id);victim.root.position.set(4,0,-7);victim.root.rotation.y=yaw;victim.root.updateMatrixWorld(true);
  const mesh=victim.hitMeshes[0],point=mesh.getWorldPosition(new THREE.Vector3()),direction=new THREE.Vector3(0,0,-1);
  victim.recordImpact(point,direction,1,mesh);dieWildEnemy(victim,.2);
  assert.equal(victim.destruction.hit.mesh,mesh,'lethal-hit metadata survives the new effect');
  assert(victim.destruction.hit.point.distanceTo(point)<1e-8,'world-space hit metadata is retained');
  disposeWildEnemy(victim);assert(!victim.destruction,'removal releases burst state');
 }
 const geometry=other.hitMeshes[0].geometry;let disposed=false;geometry.addEventListener('dispose',()=>disposed=true);disposeWildEnemy(r);assert(!disposed,'despawning keeps shared mesh geometry alive');
 console.log(`PASS ${id}: ${r.legs.length} legs, weighted support/compression, walk/run/strafe, 30/60 fps, stop/airborne, attack and destruction`);
}
assert.equal(wildEnemyId(false,'trooper'),'rust-scout');assert.equal(wildEnemyId(false,'spider'),'iron-beetle');assert.equal(wildEnemyId(false,'assassin'),'assault-mantis');assert.equal(wildEnemyId(false,'sniper'),'wall-sniper-spider');assert.equal(wildEnemyId(false,'blade'),'forest-warden');assert.equal(wildEnemyId(false,'player'),null);assert.equal(wildEnemyId(true,'drone'),'rust-wasp-drone');assert.equal(wildEnemyId(false,'scoutDrone'),'rust-wasp-drone');
console.log('PASS enemy mapping and player/aerial compatibility');

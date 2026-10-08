import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import * as THREE from 'three';
import {batchWildSurfaces} from '../wild-enemy-surfaces.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {wildGait} from '../wild-enemy-gait.js';
import {WILD_ENEMIES,registerWildTemplate,createWildEnemy,wildEnemyId,animateWildEnemy,animateWildAttack,fireWildEnemy,dieWildEnemy,disposeWildEnemy} from '../wild-enemy-models.js';
function assertSlowResponse(effect,label){
 const rest=effect.pieces.filter(p=>p.supported);
 assert(rest.some(p=>p.mesh.position.distanceTo(p.p)>1e-6||p.mesh.quaternion.angleTo(p.q)>1e-5),`${label}: the surviving frame reacts instead of freezing`);
 for(const p of rest){
  assert(p.mesh.position.distanceTo(p.p)<.28*effect.scale&&p.mesh.quaternion.angleTo(p.q)<.3,`${label}: ${p.mesh.name} has only a small initial reaction (${p.mesh.position.distanceTo(p.p)/effect.scale}, ${p.mesh.quaternion.angleTo(p.q)})`);
  assert(p.velocity.length()<1.2*effect.scale&&p.spin<1,`${label}: surviving frame absorbs most of the impulse`);
 }
}
function assertHeavyRest(effect,label){
 const mass=effect.pieces.reduce((n,p)=>n+p.mass,0);
 const speed=Math.sqrt(effect.pieces.reduce((n,p)=>n+p.mass*p.motionVelocity.lengthSq(),0)/mass)/effect.scale;
 assert(speed<(effect.age>=3?2:.7),`${label}: remaining mass-weighted speed ${speed.toFixed(3)} ${effect.pieces.filter(p=>p.motionVelocity.length()>effect.scale).map(p=>p.mesh.name+":"+p.motionVelocity.toArray().map(v=>(v/effect.scale).toFixed(2))).join(";")}`);
 assert(effect.pieces.every(p=>p.motionVelocity.length()<(effect.age>=3?4:2)*effect.scale),`${label}: no light limb retains a violent kick`);
}
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
 const r=createWildEnemy(id),other=createWildEnemy(id),before=r.legs[0].foot.getWorldPosition(new THREE.Vector3()),rest=other.legs[0].foot.getWorldPosition(new THREE.Vector3());
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
    const down=inModel(arm.bladeTip).sub(inModel(arm.hand)).normalize();
    assert(down.y<-.98,'idle and moving mantis blades hang vertically below the wrist');
   }
  }
  r.walkBlend=0;
  const attackPose=age=>{animateWildEnemy(r,0);animateWildAttack(r,.65-age);r.root.updateMatrixWorld(true);return r.arms.map(arm=>inModel(arm.bladeTip));};
  const guard=attackPose(0),raised=attackPose(.20),impact=attackPose(.29),followThrough=attackPose(.35);
  for(let i=0;i<2;i++){
   assert(raised[i].y>guard[i].y+1.5,'mantis lifts blades above the guard');
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
 r.root.updateMatrixWorld(true);const livePose=r.hitMeshes.map(mesh=>mesh.matrixWorld.clone());
 dieWildEnemy(r,0);const destruction=r.destruction;
 assert(!r.asset.visible&&!r.muzzleFlash.visible&&destruction.pieces.length===r.hitMeshes.length,`${id}: exactly one intact piece detaches for each authored mechanical assembly`);
 for(const mesh of r.hitMeshes)assert(destruction.pieces.filter(p=>p.mesh.name===mesh.name+'-fragment').length===1,'each limb or weapon retains its original shape as one piece');
 const initial=destruction.pieces.map(p=>p.mesh.position.clone());
 const sourceVertices=r.hitMeshes.reduce((n,m)=>n+(m.geometry.index?.count||m.geometry.attributes.position.count),0);
 assert.equal(destruction.pieces.reduce((n,p)=>n+(p.mesh.geometry.index?.count||p.mesh.geometry.attributes.position.count),0),sourceVertices,'all original triangles survive fragmentation');
 for(const p of destruction.pieces){const source=r.hitMeshes.find(m=>p.mesh.name===m.name+'-fragment');assert.equal(p.mesh.geometry.attributes.position.count,source.geometry.attributes.position.count,'assembly vertices are retained without extra cuts');assert(p.mesh.geometry.attributes.uv,'fragments keep atlas UV');if(p.mesh.material.name==='Wild robot shared atlas')assert(p.mesh.geometry.attributes.wildSurface,'batched fragments retain metal/paint attributes');}
 dieWildEnemy(r,.4);
 assertSlowResponse(destruction,`${id}: unshot destruction loses support gradually`);
 assert(destruction.flames.length===8&&destruction.embers.length===24&&destruction.flames[0].size<=.31*destruction.scale,'fatal hits use a small local discharge rather than a large explosion');
 assert(!destruction.electric.visible&&destruction.electric.count===21&&destruction.sparks.visible,'hot sparks continue through a dark gap between lightning flashes');
 const seekPose=destruction.pieces.map(p=>p.mesh.position.clone());dieWildEnemy(r,.8);dieWildEnemy(r,.4);
 destruction.pieces.forEach((p,i)=>assert(p.mesh.position.distanceTo(seekPose[i])<1e-6,'absolute-time effects are deterministic when seeking'));
 assert([.12,.16,.2,.24,.28].some(time=>{dieWildEnemy(r,time);return destruction.fire.geometry.attributes.alpha.array.some(a=>a>0)&&destruction.smoke.geometry.attributes.alpha.array.some(a=>a>0);}), 'brief fire and smoke overlap around the damaged joint');
 for(const time of [.09,.27,.49]){dieWildEnemy(r,time);assert(destruction.electric.visible&&destruction.glow.visible,'three short lightning bursts are visible');}
 for(const time of [0,.16,.35,.57,.8,1]){dieWildEnemy(r,time);assert(!destruction.electric.visible&&!destruction.glow.visible,'lightning is fully dark between bursts and ends early');}
 for(const fps of [30,60]){
  let count=0,previous=false,litFrames=0;
  for(let frame=0;frame<fps;frame++){dieWildEnemy(r,frame/fps);const lit=destruction.electric.visible;if(lit&&!previous)count++;if(lit)litFrames++;previous=lit;}
  assert(count===3&&litFrames/fps<.23,'all three brief discharges survive at 30 and 60 fps');
 }
 dieWildEnemy(r,2);
 assert(destruction.pieces.filter((p,i)=>p.mesh.position.distanceTo(initial[i])>.08*destruction.scale||p.mesh.quaternion.angleTo(p.q)>.1).length>destruction.pieces.length/2,`${id}: loss of support visibly collapses the connected frame after its hold`);
 assert(destruction.smoke.geometry.attributes.alpha.array.some(a=>a>0)&&!destruction.electric.visible,'smoke lingers after electrical discharge ends');
 assert(destruction.pieces.every(p=>p.mesh.position.y>=destruction.floor-.02*destruction.scale),'debris lands on the support plane');
 assert(destruction.pieces.every((p,i)=>Math.hypot(p.mesh.position.x-initial[i].x,p.mesh.position.z-initial[i].z)<3*destruction.scale),`debris stays compact: ${id}, radius ${Math.max(...destruction.pieces.map((p,i)=>Math.hypot(p.mesh.position.x-initial[i].x,p.mesh.position.z-initial[i].z)))/destruction.scale}`);
 dieWildEnemy(r,2.99);assert(!destruction.finalFire.visible&&!destruction.finalSmoke.visible,'secondary explosion stays off before three seconds');
 dieWildEnemy(r,3);assert(destruction.finalFire.visible&&destruction.light.intensity===16,'secondary explosion starts exactly at three seconds');
 assert(destruction.finalFire.geometry.attributes.alpha.array.some(a=>a>0),'three-second explosion has visible fire');
 assert(destruction.physics.finalBurstCenter?.toArray().every(Number.isFinite),'secondary blast originates from current wreck position');
 assert(destruction.pieces.some(p=>p.motionVelocity.y>.5*destruction.scale),'secondary blast kicks the heavy wreck upward');
 dieWildEnemy(r,3.12);const burstPose=destruction.pieces.map(p=>p.mesh.position.clone());
 dieWildEnemy(r,3.2);assert(destruction.pieces.every(p=>!p.mesh.visible)&&destruction.shards.every(p=>p.mesh.visible),'intact parts are replaced by visible charred shards at the final explosion');
 assert(destruction.finalFire.geometry.attributes.alpha.array.some(a=>a>0),'larger fireball surrounds the thrown parts');
 dieWildEnemy(r,3.6);assert(destruction.trailFire.geometry.attributes.alpha.array.some(a=>a>0)&&destruction.trailSmoke.geometry.attributes.alpha.array.some(a=>a>0),'flying parts leave fire and smoke trails');
 assert(destruction.physics.constraints.length===0,'final explosion severs the remaining joints');
 assert(destruction.shards.length>=destruction.pieces.length*2&&destruction.shards.length<=destruction.pieces.length*4,'each mechanical part becomes a bounded number of smaller shards');
 const triangleCount=g=>(g.index?.count??g.attributes.position.count)/3;
 assert.equal(destruction.shards.reduce((n,p)=>n+triangleCount(p.mesh.geometry),0),destruction.pieces.reduce((n,p)=>n+triangleCount(p.mesh.geometry),0),'fragmentation preserves all source surface triangles');
 assert(destruction.shards.every(p=>p.mesh.material.color.r<.03&&p.mesh.material.roughness>.9),'shards use dark rough charred metal');
 assert(destruction.shards.every(p=>!destruction.pieces.some(source=>source.mesh.material===p.mesh.material)),'charring never mutates shared live robot materials');
 const shardPose=destruction.shards.map(p=>p.mesh.position.clone());
 dieWildEnemy(r,4.4);assert(destruction.shards.some(p=>Number.isFinite(p.contactTime)&&p.mesh.quaternion.angleTo(p.startQ)>.2),'charred fragments land and tumble on the floor');
 dieWildEnemy(r,3.6);destruction.shards.forEach((p,i)=>assert(p.mesh.position.distanceTo(shardPose[i])<1e-6,'charred shard motion is reproducible when seeking'));

 dieWildEnemy(r,2.9);assert(destruction.shards.every(p=>!p.mesh.visible),'rewind hides charred shards before the explosion');assert(destruction.pieces.every(p=>p.mesh.visible&&p.mesh.scale.distanceTo(p.s)<1e-8),'rewinding restores the wreck before its final destruction');assert(!destruction.finalFire.visible,'rewind hides the later explosion');
 dieWildEnemy(r,3.12);destruction.pieces.forEach((p,i)=>assert(p.mesh.position.distanceTo(burstPose[i])<1e-6,'secondary blast is deterministic on replay without another impulse'));
 dieWildEnemy(r,r.deathDuration-.1);
 // A wall-mounted spider can spend most of this lifetime falling from height.
 if(!r.wallMounted)assertHeavyRest(destruction,`${id}: grounded unshot wreck slows through friction`);
 r.root.traverse(o=>assert(o.matrixWorld.elements.every(Number.isFinite),'finite explosion transforms'));
 r.hitMeshes.forEach((mesh,i)=>assert(mesh.matrixWorld.equals(livePose[i]),'destruction does not mutate the intact source pose'));
 dieWildEnemy(r,r.deathDuration);assert(destruction.shards.every(p=>!p.mesh.visible),'charred shards disappear after rolling');assert(!destruction.group.visible,'destruction completes at the published lifetime');
 let released=0;for(const resource of destruction.owned)resource.addEventListener('dispose',()=>released++);
 animateWildEnemy(r,.016);assert(!r.destruction&&r.asset.visible&&!destruction.group.parent,'returning to motion removes the explosion and restores the model');
 assert.equal(released,destruction.owned.length,'all per-explosion geometry and materials are released');
 dieWildEnemy(r,.4);assert(r.destruction.pieces.length===initial.length,'death can be replayed without accumulating fragments');
 // The actual projectile direction must survive world/model transforms, while
 // only the hit part recoils while the remaining frame moves slowly before losing support.
 for(const yaw of [0,.9,Math.PI]){
  const victim=createWildEnemy(id);victim.root.position.set(3,0,-5);victim.root.rotation.y=yaw;victim.root.updateMatrixWorld(true);
  const target=victim.nodes.Backpack||victim.nodes.Heavy_back||victim.nodes.Abdomen||victim.nodes.Carapace||victim.nodes.Sniper_rifle,mesh=victim.hitMeshes.find(m=>m.name.startsWith(target.name+'_Mesh'));
  const captured=new THREE.Box3().setFromObject(mesh).getCenter(new THREE.Vector3()),point=captured.clone(),direction=new THREE.Vector3(.8,-.12,.6).normalize();
  victim.recordImpact(point,direction,1,mesh);point.set(99,99,99);direction.set(0,1,0);
  dieWildEnemy(victim,0);const effect=victim.destruction,heading=effect.hit.direction.clone().setY(0).normalize();
  assert(effect.hit.point.distanceTo(victim.root.worldToLocal(captured.clone()))<1e-6,'hit point is copied and converted into the victim frame');
  const expected=new THREE.Vector3(.8,-.12,.6).normalize();assert(effect.hit.direction.clone().applyQuaternion(victim.root.quaternion).distanceTo(expected)<1e-6,'projectile direction is preserved for rotated robots');
  assert(effect.burstDelay===0&&effect.center.distanceTo(effect.hit.point)<1e-7&&effect.flames[0].p.distanceTo(effect.hit.point)<1e-7,'the local explosion starts at the actual bullet impact immediately');
  const near=effect.pieces.filter(p=>p.impactWeight>.6),far=effect.pieces.filter(p=>p.impactWeight<.15);
  assert(near.length&&far.length,'both near and distant pieces are covered');
  const chain=effect.recoil,source=chain.source,adjacent=chain.parts.find(p=>p.depth===1);
  assert.equal(chain.parts.length,victim.hitMeshes.length,'every rigid assembly participates in the connected joint graph');
  dieWildEnemy(victim,.036);
  assert(source.offset.dot(heading)>.32*effect.scale,'the stronger struck part is kicked back immediately');
  assertSlowResponse(effect,`${id}: frame reacts gently during the initial strike`);
  dieWildEnemy(victim,.133);
  assertSlowResponse(effect,`${id}: frame reacts gently after the struck part separates`);
  assert(source.pieces[0].mesh.position.distanceTo(source.pieces[0].p)>.3*effect.scale,'the struck assembly separates much faster than the surviving frame');
  assert(Math.min(...source.pieces.map(p=>p.delay))>.07&&Math.max(...source.pieces.map(p=>p.delay))<.09,'the struck part breaks during its initial moving response');
  assert(effect.fire.geometry.attributes.alpha.array.some(a=>a>0)&&effect.sparks.visible,'fire overlaps the still-moving pull instead of waiting for it to settle');
  dieWildEnemy(victim,.06);const assembly=source.pieces;
  for(const p of assembly)assert(Math.abs(p.mesh.position.distanceTo(assembly[0].mesh.position)-p.p.distanceTo(assembly[0].p))<1e-6,'triangles inside each moving assembly remain joined');
  dieWildEnemy(victim,.133);assert(source.pieces[0].mesh.position.distanceTo(source.pieces[0].p)>adjacent.pieces[0].mesh.position.distanceTo(adjacent.pieces[0].p)*5,'only the struck branch receives the strong recoil');
  const rest=effect.pieces.filter(p=>p.part!==source),sourceIndex=effect.pieces.findIndex(p=>p.part===source);
  assert(effect.collapseAt>=.65&&effect.collapseAt<=.85,'the damaged frame begins losing support after its slow reaction');
  assert(rest.every(p=>p.delay===effect.collapseAt),'the slowly moving frame hands off to full physics as support fails');
  assert.equal(effect.physics.blast,null,'no secondary blast knocks the remaining frame over');
  for(const time of [.1,.3,.45]){dieWildEnemy(victim,time);assertSlowResponse(effect,`${id} yaw ${yaw} at ${time}`);}
  dieWildEnemy(victim,.2);const earlyFrame=rest.map(p=>p.mesh.position.clone());
  dieWildEnemy(victim,.4);assert(rest.some((p,i)=>p.mesh.position.distanceTo(earlyFrame[i])>.001*effect.scale),'the body continues drifting during the supported phase');
  const movingPart=source.pieces[0];dieWildEnemy(victim,.3);const fallingHeight=movingPart.mesh.position.y;
  dieWildEnemy(victim,.65);assert(movingPart.contactTime<.65||movingPart.mesh.position.y<fallingHeight-.1*effect.scale,'the detached assembly falls while the frame is still supported');
  dieWildEnemy(victim,1.6);assert(rest.some(p=>p.mesh.position.y<p.p.y-.2*effect.scale),'gravity collapses the body after support fails');
  assert(effect.physics.links.length===effect.pieces.length-2,'only the struck assembly is removed from the joint tree');
  assert(effect.physics.links.every(link=>link.a!==sourceIndex&&link.b!==sourceIndex),'the struck assembly is the only free part');
  const connected=new Set([effect.pieces.indexOf(rest[0])]);
  for(let n=0;n<rest.length;n++)for(const link of effect.physics.links)if(connected.has(link.a)||connected.has(link.b)){connected.add(link.a);connected.add(link.b);}
  assert.equal(connected.size,rest.length,'all undamaged limbs stay connected, including across the missing armour assembly');
  for(const p of effect.pieces){
   dieWildEnemy(victim,p.delay-1e-6);const position=p.mesh.position.clone(),orientation=p.mesh.quaternion.clone();
   dieWildEnemy(victim,p.delay+1e-6);
   assert(p.mesh.position.distanceTo(position)<1e-4&&p.mesh.quaternion.angleTo(orientation)<1e-4,'parts inherit the rotating release pose without teleporting');
   dieWildEnemy(victim,p.delay-.002);const earlier=p.mesh.position.clone();
   dieWildEnemy(victim,p.delay-.001);const incoming=p.mesh.position.clone().sub(earlier).divideScalar(.001);

   const added=p.velocity.clone().sub(incoming);
   if(p.part===source)assert(added.dot(effect.hit.direction)>effect.scale&&added.length()<1.4*effect.scale,'only the struck assembly receives the local blast impulse');
   else assert(added.length()<.08*effect.scale,`${id} ${p.mesh.name}: body preserves its small incoming velocity without a new kick`);
  }
  const meanIncoming=new THREE.Vector3(),meanLaunch=new THREE.Vector3();
  for(const p of source.pieces){
   dieWildEnemy(victim,p.delay-.002);const before=p.mesh.position.clone();
   dieWildEnemy(victim,p.delay-.001);meanIncoming.add(p.mesh.position.clone().sub(before).divideScalar(.001));meanLaunch.add(p.velocity);
  }
  assert(meanIncoming.dot(heading)/source.pieces.length>3*effect.scale&&meanLaunch.dot(heading)>meanIncoming.dot(heading)*.8,'the intact detached source retains its impact direction and momentum');
  // Check oriented chunk surfaces at several airborne and resting phases.
  for(const age of [.1,.3,.8,1.5,2.7]){
   dieWildEnemy(victim,age);
   for(const joint of effect.physics.constraints){
    const a=joint.bodyA.pointToWorldFrame(joint.pivotA),b=joint.bodyB.pointToWorldFrame(joint.pivotB);
    assert(a.distanceTo(b)<.045*effect.scale,`${id} yaw ${yaw} age ${age}: joint gap ${a.distanceTo(b)/effect.scale} (${joint.bodyA.userData.piece}, ${joint.bodyB.userData.piece})`);
   }
   for(const p of effect.pieces)if(age>=p.delay){
    const upLocal=new THREE.Vector3(0,1,0).applyQuaternion(p.mesh.quaternion.clone().invert());
    const height=Math.abs(upLocal.x)*p.half.x+Math.abs(upLocal.y)*p.half.y+Math.abs(upLocal.z)*p.half.z;
    assert(p.mesh.position.y-height>=effect.floor-.045*effect.scale,`${id} yaw ${yaw} ${p.mesh.name} at ${age}: floor penetration ${(effect.floor-p.mesh.position.y+height)/effect.scale}`);
   }
  }
  // Tall parts can still be airborne at .8 s, depending on impact direction.
  // Measure continued motion after contact across the full landing interval.
  let rolled=false;
  for(const age of [.18,.24,.3,.4,.6,.8,1,1.2,1.4,1.6,1.8,2]){
   dieWildEnemy(victim,age);const floorPoses=effect.pieces.map(p=>({position:p.mesh.position.clone(),rotation:p.mesh.quaternion.clone(),landed:p.contactTime<age}));
   dieWildEnemy(victim,age+.2);
   rolled ||= effect.pieces.some((p,i)=>floorPoses[i].landed&&p.mesh.position.distanceTo(floorPoses[i].position)>.025*effect.scale&&p.mesh.quaternion.angleTo(floorPoses[i].rotation)>.12);
  }
  assert(rolled,`${id} at yaw ${yaw}: landed robot parts continue rolling and turning on the floor`);
  dieWildEnemy(victim,.5);const shotPose=effect.pieces.map(p=>p.mesh.position.clone());
  dieWildEnemy(victim,1.2);dieWildEnemy(victim,.5);effect.pieces.forEach((p,i)=>assert(p.mesh.position.distanceTo(shotPose[i])<1e-6,'staged breakup remains deterministic when seeking'));
  assert(effect.smoke.geometry.attributes.alpha.array.some(a=>a>0),'light smoke lingers after the brief discharge');
  dieWildEnemy(victim,victim.deathDuration-.1);
  assert(effect.pieces.every(p=>Math.hypot(p.mesh.position.x-p.start.x,p.mesh.position.z-p.start.z)<7*effect.scale),'the stronger final blast stays within a bounded wider radius');
  assert(effect.physics.events.every(e=>e.a===sourceIndex||e.b===sourceIndex),'overlapping connected armour cannot explosively push itself apart');
  assert(effect.pieces.some(p=>p.part!==source&&Number.isFinite(p.contactTime)),'the connected body reaches the floor');
  assertHeavyRest(effect,`${id}: the heavy body settles`);
  animateWildEnemy(victim,.016);assert(!victim.deathImpact,'restoring a robot clears the previous shot');disposeWildEnemy(victim);
 }
 // Selecting a different struck assembly must re-root the response graph.
 for(const target of [r.legs[0].foot,r.body]){
  const victim=createWildEnemy(id),mesh=victim.hitMeshes.find(m=>m.name.startsWith(target.name+'_Mesh'));
  victim.root.updateMatrixWorld(true);const point=new THREE.Box3().setFromObject(mesh).getCenter(new THREE.Vector3());
  victim.recordImpact(point,new THREE.Vector3(0,0,-1),1,mesh);dieWildEnemy(victim,.036);
  const reaction=victim.destruction.recoil;
  assert.equal(reaction.source.mesh,mesh,'the actual raycast mesh, including a foot, is the first driven assembly');
  if(reaction.failure!=='leg')assertSlowResponse(victim.destruction,`${id} ${target.name}: the remaining frame reacts gently`);
  const rootPose=victim.root.matrixWorld.clone();dieWildEnemy(victim,.3);assert(victim.root.matrixWorld.equals(rootPose),'recoil never translates or rotates the entire robot root');
  const effect=victim.destruction,hitIndex=effect.pieces.findIndex(p=>p.part===reaction.source),seen=new Set([hitIndex===0?1:0]);
  for(let n=0;n<effect.pieces.length;n++)for(const link of effect.physics.links)if(seen.has(link.a)||seen.has(link.b)){seen.add(link.a);seen.add(link.b);}
  if(reaction.failure!=='torso')assert(seen.size===effect.pieces.length-1&&!seen.has(hitIndex),'head and foot hits leave the rest of the skeleton connected');
  else assert(effect.pieces.some(p=>p.falling)&&effect.pieces.some(p=>p.supported),'torso loss separates immediate upper fall from slow lower collapse');
  for(const age of reaction.failure==='leg'?[]:[.12,.3,.45]){dieWildEnemy(victim,age);assertSlowResponse(effect,`${id} ${target.name}: small reaction at ${age}`);}
  for(const age of [.5,1,2,victim.deathDuration-.1]){
   dieWildEnemy(victim,age);
   for(const joint of effect.physics.constraints)assert(joint.bodyA.pointToWorldFrame(joint.pivotA).distanceTo(joint.bodyB.pointToWorldFrame(joint.pivotB))<.045*effect.scale,'remaining frame anchors do not separate during collapse');
  }
  assertHeavyRest(effect,`${id} ${target.name}: the heavy body settles`);
  disposeWildEnemy(victim);
 }
 // Shoulder/elbow and upper-leg hits carry their authored descendants away.
 // The detached branch must get joints before the slowly moving body releases.
 const limbTargets=[...(!r.spec.count?r.arms.flatMap(arm=>[arm.shoulder,arm.elbow]):[]),r.legs[0].hip,r.legs[0].knee];
 for(const target of limbTargets){
  const victim=createWildEnemy(id),joint=victim.nodes[target.name],mesh=victim.hitMeshes.find(m=>m.name.startsWith(joint.name+'_Mesh'));
  victim.root.updateMatrixWorld(true);
  const descendants=new Set();joint.traverse(o=>{if(victim.hitMeshes.includes(o))descendants.add(o);});
  victim.recordImpact(new THREE.Box3().setFromObject(mesh).getCenter(new THREE.Vector3()),new THREE.Vector3(.25,-.08,-1).normalize(),1,mesh);
  dieWildEnemy(victim,0);const effect=victim.destruction,branch=effect.pieces.filter(p=>p.detached),frame=effect.pieces.filter(p=>!p.detached);
  assert.equal(branch.length,descendants.size,`${id} ${target.name}: every dependent limb follows its parent`);
  assert(branch.every(p=>descendants.has(p.part.mesh))&&frame.every(p=>!descendants.has(p.part.mesh)),'the opposite arm, torso and unrelated legs remain on the body');
  assert(effect.physics.links.every(link=>effect.pieces[link.a].detached===effect.pieces[link.b].detached),'the severed branch is never reattached to the torso');
  const branchLinks=effect.physics.links.filter(link=>effect.pieces[link.a].detached);
  assert.equal(branchLinks.length,branch.length-1,'elbow, wrist and lower limb links stay connected');
  dieWildEnemy(victim,.12);
  assert(branchLinks.every(link=>link.active),'detached limb joints engage before the body enters physics');
  assert(branch.every(p=>p.physicsBody.world),'the severed limb falls immediately');
  if(effect.recoil.failure==='leg')assert(frame.every(p=>p.physicsBody.world),'loss of a leg immediately releases the remaining body');
  else assert(frame.every(p=>!p.physicsBody.world),'arm loss retains slow body support');
  dieWildEnemy(victim,.3);if(effect.recoil.failure!=='leg')assertSlowResponse(effect,`${id} ${target.name}: the damaged frame slowly yields`);
  if(branch.length>1)assert(branch.filter(p=>p.part!==effect.recoil.source).every(p=>p.mesh.position.distanceTo(p.p)>.08*effect.scale),'lower arms/hands visibly follow the struck shoulder');
  for(const age of [.3,.65,1,2.5,victim.deathDuration-.1]){
   dieWildEnemy(victim,age);
   for(const constraint of effect.physics.constraints){
    const a=constraint.bodyA.pointToWorldFrame(constraint.pivotA),b=constraint.bodyB.pointToWorldFrame(constraint.pivotB);
    assert(a.distanceTo(b)<.05*effect.scale,`${id} ${target.name} at ${age}: connected limb anchors stay together (${a.distanceTo(b)/effect.scale})`);
   }
   assert(effect.pieces.every(p=>p.mesh.position.toArray().every(Number.isFinite)),'all limb-hit transforms remain finite');
  }
  assert(branch.some(p=>Number.isFinite(p.contactTime)),'the detached limb lands under gravity');
  assert(effect.physics.events.every(e=>effect.pieces[e.a].detached!==effect.pieces[e.b].detached),'parts inside either connected branch do not collide with each other');
  assertHeavyRest(effect,`${id} ${target.name}: the connected wreck and severed limb settle`);
  disposeWildEnemy(victim);
 }
 // Support loss depends on anatomy, not on a universal delayed corpse pose.
 const failureTargets=[r.body,...(r.nodes.Pelvis?[r.nodes.Pelvis]:[]),...r.legs.filter(l=>l.index===0).map(l=>l.hip),...(!r.spec.count?r.arms.map(a=>a.shoulder):[])];
 for(const target of failureTargets)for(const yaw of [0,1.1]){
  const victim=createWildEnemy(id);victim.root.rotation.y=yaw;victim.root.updateMatrixWorld(true);
  const joint=victim.nodes[target.name],mesh=victim.hitMeshes.find(m=>m.name.startsWith(joint.name+'_Mesh'));
  const point=new THREE.Box3().setFromObject(mesh).getCenter(new THREE.Vector3());
  victim.recordImpact(point,new THREE.Vector3(0,0,-1),1,mesh);dieWildEnemy(victim,0);
  const effect=victim.destruction,{failure}=effect.recoil,upper=effect.pieces.filter(p=>p.falling),lower=effect.pieces.filter(p=>p.supported),body=effect.pieces.find(p=>p.part.joint===victim.body);
  if(failure==='torso'||failure==='pelvis'){
   assert(upper.some(p=>p.part.joint===victim.head),'unsupported head falls immediately');
   if(!victim.spec.count)for(const arm of victim.arms)assert(upper.some(p=>p.part.joint===arm.shoulder)&&upper.some(p=>p.part.joint===arm.elbow),'both shoulder/arm chains lose their upper support');
   if(failure==='torso')assert(lower.some(p=>p.part.joint===victim.legs[0].hip),'torso loss preserves the slower lower-body collapse');
   else {
    assert(upper.includes(body)&&lower.length===0,'pelvis loss puts the entire upper body into free fall');
    for(const leg of victim.legs)assert(effect.pieces.some(p=>p.part.joint===leg.hip&&p.detached)&&effect.pieces.some(p=>p.part.joint===leg.foot&&p.detached),'both legs stay with the detached pelvis');
   }
   assert(effect.physics.links.every(link=>effect.pieces[link.a].falling===effect.pieces[link.b].falling),'no phantom joint holds the upper body over its missing support');
   dieWildEnemy(victim,.12);assert(upper.every(p=>p.physicsBody.world&&!p.supported),'unsupported upper pieces use immediate full gravity');
   const head=upper.find(p=>p.part.joint===victim.head),early=head.mesh.position.y;
   dieWildEnemy(victim,.3);assert(head.contactTime<.3||head.mesh.position.y<early-.12*effect.scale,`${id} ${failure}: the upper body visibly falls instead of floating`);
   if(failure==='torso')assertSlowResponse(effect,`${id}: lower body still yields slowly after torso loss`);
  }else{
   const sourceSide=effect.recoil.source.joint.getWorldPosition(new THREE.Vector3()).applyMatrix4(victim.root.matrixWorld.clone().invert()).sub(effect.recoil.body.center).setY(0).normalize();
   const desired=sourceSide.multiplyScalar(failure==='arm'?-1:1);
   dieWildEnemy(victim,failure==='leg'?.25:.6);
   const tippedUp=new THREE.Vector3(0,1,0).applyQuaternion(body.mesh.quaternion.clone().multiply(body.q.clone().invert()));
   assert(tippedUp.dot(desired)>.015,`${id} ${target.name} yaw ${yaw}: tips ${failure==='arm'?'away from the broken arm':'toward the missing leg'} (${tippedUp.dot(desired)})`);
   if(failure==='leg')assert(body.delay<.1&&!body.supported,'leg loss has no supported waiting period');
   else {
    assert(body.delay>.6&&body.supported,'arm loss keeps the slow collapse');
    assert(effect.center.distanceTo(joint.getWorldPosition(new THREE.Vector3()).applyMatrix4(victim.root.matrixWorld.clone().invert()))<1e-6,'arm detachment bursts at the broken attachment');
   }
  }
  dieWildEnemy(victim,2);
  assert(effect.physics.events.every(e=>effect.pieces[e.a].collisionIsland!==effect.pieces[e.b].collisionIsland),'a connected branch cannot collide with itself');
  for(const constraint of effect.physics.constraints)assert(constraint.bodyA.pointToWorldFrame(constraint.pivotA).distanceTo(constraint.bodyB.pointToWorldFrame(constraint.pivotB))<.05*effect.scale,'remaining joints stay connected after support loss');
  disposeWildEnemy(victim);
 }
 for(const yaw of [0,1.1]){
  const victim=createWildEnemy(id);victim.root.rotation.y=yaw;victim.root.updateMatrixWorld(true);
  const mesh=victim.hitMeshes.find(m=>m.name.startsWith(victim.head.name+'_Mesh'));
  victim.recordImpact(new THREE.Box3().setFromObject(mesh).getCenter(new THREE.Vector3()),new THREE.Vector3(0,0,-1),1,mesh);
  dieWildEnemy(victim,.09);const d=victim.destruction,head=d.recoil.source;
  assert(d.recoil.failure==='head'&&d.recoil.detached.size===0,'headshots retain all mechanical parts until overload');
  assert(d.pieces.every(p=>p.delay===1.15&&!p.physicsBody.world),'headshot body retains support until the timed explosion');
  const forward=new THREE.Vector3(0,0,1).applyQuaternion(head.rotation);assert(forward.y>.55,'headshot death snaps the head strongly backward');
  const first=head.rotation.clone();dieWildEnemy(victim,.43);assert(head.rotation.angleTo(first)>.002,'head trembles continuously rather than freezing');
  dieWildEnemy(victim,.65);assert(new THREE.Vector3(0,0,1).applyQuaternion(head.rotation).y<-.2,'head folds forward after the backward hit');
  const torsoPiece=d.recoil.body.pieces[0];assert(torsoPiece.mesh.position.y<torsoPiece.p.y-.1*d.scale,`${id}: body descends as the knees buckle (${(torsoPiece.mesh.position.y-torsoPiece.p.y)/d.scale})`);
  dieWildEnemy(victim,1.1);assert(d.pieces.every(p=>!p.physicsBody.world),'falling frame stays connected until explosion');
  for(const t of [.29,.57,.85]){dieWildEnemy(victim,t);assert(d.electric.visible,'headshot electricity repeats throughout the overload');}
  dieWildEnemy(victim,1.14);assert(!d.finalFire.visible&&!d.shards,'headshot waits one second of electrical overload before exploding');
  dieWildEnemy(victim,1.35);assert(d.shards?.length>d.pieces.length&&d.finalFire.visible,'headshot ends with the accepted charred-fragment explosion');
  const pose=d.shards.map(p=>p.mesh.position.clone());dieWildEnemy(victim,.8);assert(d.pieces.every(p=>p.mesh.visible)&&d.shards.every(p=>!p.mesh.visible),'seeking restores the attached trembling body');
  dieWildEnemy(victim,1.35);d.shards.forEach((p,i)=>assert(p.mesh.position.distanceTo(pose[i])<1e-6,'headshot explosion replays deterministically'));
  disposeWildEnemy(victim);
 }
 if(id==='wall-sniper-spider'){
  const victim=createWildEnemy(id);victim.mountOnWall([{x:0,z:0,w:6,d:6,h:8}],new THREE.Vector3(5,0,0),new THREE.Vector3(10,1,0));
  const point=victim.head.getWorldPosition(new THREE.Vector3());victim.recordImpact(point,point.clone().sub(new THREE.Vector3(10,1,0)).normalize());
  for(const age of [0,.24,.45,.8,2.7]){dieWildEnemy(victim,age);victim.root.traverse(o=>assert(o.matrixWorld.elements.every(Number.isFinite),'wall-mounted recoil and falling remain finite'));}
  disposeWildEnemy(victim);
 }
 const geometry=other.hitMeshes[0].geometry;let disposed=false;geometry.addEventListener('dispose',()=>disposed=true);disposeWildEnemy(r);assert(!disposed,'despawning keeps shared mesh geometry alive');
 console.log(`PASS ${id}: ${r.legs.length} legs, weighted support/compression, walk/run/strafe, 30/60 fps, stop/airborne, attack and destruction`);
}
assert.equal(wildEnemyId(false,'trooper'),'rust-scout');assert.equal(wildEnemyId(false,'spider'),'iron-beetle');assert.equal(wildEnemyId(false,'assassin'),'assault-mantis');assert.equal(wildEnemyId(false,'sniper'),'wall-sniper-spider');assert.equal(wildEnemyId(false,'blade'),'forest-warden');assert.equal(wildEnemyId(false,'player'),null);assert.equal(wildEnemyId(true,'drone'),null);
console.log('PASS enemy mapping and player/aerial compatibility');

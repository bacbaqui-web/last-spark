import * as THREE from 'three';
import {inFrameWork,scheduleFrameWork,flushFrameWork,cancelFrameWork} from './frame-work.js';
import {batchWildSurfaces} from './wild-enemy-surfaces.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {wildGait,wildFootfall,wildLegPhase} from './wild-enemy-gait.js';
import {WILD_DESTRUCTION_DURATION,updateWildDestruction,resetWildDestruction,recordWildImpact} from './wild-enemy-destruction.js';
export {resetWildDestruction} from './wild-enemy-destruction.js';

export const WILD_ENEMIES = {
  'rust-wasp-drone': {name:'녹슨 말벌 드론',scale:.75,body:'Thorax',head:'Head',flying:true},
  'rust-scout': {name:'녹슨 척후병',scale:.82,body:'Torso',head:'Head',leg:'leg',shoulder:'Shoulder',forearm:'Forearm'},
  'forest-warden': {name:'숲의 파수꾼',scale:1.1,body:'Torso',head:'Head',leg:'heavy_leg',shoulder:'Heavy_shoulder',forearm:'Heavy_forearm'},
  'assault-mantis': {name:'이끼 사마귀 돌격병',scale:.86,body:'Thorax',head:'Head',leg:'mantis_leg',shoulder:'Mantis_shoulder',forearm:'Mantis_forearm',hand:'Blade_hand'},
  'iron-beetle': {name:'철갑 딱정벌레',scale:.55,body:'Chassis',head:'Front_head',leg:'Beetle',count:3},
  'wall-sniper-spider': {name:'폐허 거미 저격수',scale:.7,body:'Spider_body',head:'Spider_head',leg:'Spider',count:4}
};
const templates=new Map(),pending=new Map();

// Vite serves public assets at the app base, including in production subdirectories.
function assetURL(id){return new URL(`${import.meta.env?.BASE_URL||'./'}models/wild-robots-v1/${id}.glb`,typeof document==='object'?document.baseURI:import.meta.url).href;}
export function registerWildTemplate(id,scene){templates.set(id,scene);}
export async function loadWildTemplate(id){
  if(templates.has(id))return templates.get(id);
  if(!pending.has(id))pending.set(id,(async()=>{
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);
    try{const url=assetURL(id),response=await fetch(url,{signal:controller.signal});if(!response.ok)throw Error(`모델 로딩 실패 ${response.status}`);
      const buffer=await response.arrayBuffer(),gltf=await Promise.race([new GLTFLoader().parseAsync(buffer,new URL('.',url).href),new Promise((_,reject)=>{if(controller.signal.aborted)reject(Error('모델 로딩 시간 초과'));else controller.signal.addEventListener('abort',()=>reject(Error('모델 로딩 시간 초과')),{once:true});})]);
      if(controller.signal.aborted)throw Error('모델 로딩 시간 초과');
      gltf.scene.traverse(o=>{if(o.isMesh){o.castShadow=o.receiveShadow=true;for(const m of[].concat(o.material))if(m.map)m.map.anisotropy=4;}});
      batchWildSurfaces(gltf.scene);registerWildTemplate(id,gltf.scene);return gltf.scene;
    }finally{clearTimeout(timer);}
  })().catch(error=>{pending.delete(id);throw error;}));
  return pending.get(id);
}
export async function preloadWildEnemies(){
  const ids=Object.keys(WILD_ENEMIES).filter(id=>!WILD_ENEMIES[id].previewOnly),results=[];let cursor=0;await Promise.all(Array.from({length:2},async()=>{while(cursor<ids.length){const i=cursor++;try{await loadWildTemplate(ids[i]);results[i]={status:'fulfilled'};}catch(reason){results[i]={status:'rejected',reason};}}}));
  return results.flatMap((result,i)=>result.status==='rejected'?[{id:ids[i],error:String(result.reason)}]:[]);
}
export function wildEnemyId(boss,type){
  if(type==='player')return null;
  if(type==='drone'||type==='scoutDrone')return 'rust-wasp-drone';
  if(type==='assassin')return 'assault-mantis';
  if(type==='blade')return 'forest-warden';
  if(type==='sniper')return 'wall-sniper-spider';
  if(type==='spider')return 'iron-beetle';
  if(!boss&&type==='trooper')return 'rust-scout';
  return null; // Existing aerial and missile bosses keep their own weapons.
}
const v=new THREE.Vector3(),a=new THREE.Vector3(),b=new THREE.Vector3(),q=new THREE.Quaternion();
const legTarget=new THREE.Vector3(),jointInverse=new THREE.Matrix4(),soleOrientation=new THREE.Quaternion(),jointPosition=new THREE.Vector3(),jointScale=new THREE.Vector3();
function meshList(node){const list=[];node.traverse(o=>{if(o.isMesh)list.push(o);});return list;}
function socket(parent,position,name){const n=new THREE.Group();n.name=name;n.position.fromArray(position);parent.add(n);return n;}

// Soft additive muzzle bloom, shared by all instances without a postprocessing pass.
const flashPixels=new Uint8Array(32*32*4);
for(let y=0;y<32;y++)for(let x=0;x<32;x++){
  const i=(y*32+x)*4,d=Math.hypot((x-15.5)/15.5,(y-15.5)/15.5);
  flashPixels.set([255,255,255,Math.round(255*Math.max(0,1-d)**2)],i);
}
const muzzleGlowMap=new THREE.DataTexture(flashPixels,32,32);muzzleGlowMap.needsUpdate=true;
export function createWildEnemy(id,{scale=WILD_ENEMIES[id]?.scale}={}){
  const source=templates.get(id);if(!source)return null;
  const spec=WILD_ENEMIES[id],root=new THREE.Group(),mount=new THREE.Group(),motion=new THREE.Group(),asset=source.clone(true);
  root.name=id;root.userData.wildEnemy=id;root.add(mount);mount.add(motion);motion.add(asset);mount.scale.setScalar(scale);
  const nodes={};asset.traverse(o=>{nodes[o.name]=o;});
  const body=nodes[spec.body],head=nodes[spec.head];
  const attach=(child,parent)=>{root.updateMatrixWorld(true);parent.attach(child);};
  attach(head,body);
  for(const name of ['Backpack','Heavy_back','Abdomen','Carapace','Sniper_gimbal'])if(nodes[name])attach(nodes[name],body);
  if(nodes.Sniper_rifle)attach(nodes.Sniper_rifle,nodes.Sniper_gimbal);
  if(spec.flying){
    for(const side of [-1,1]){attach(nodes['Rotor_mount_'+side],body);attach(nodes['Rotor_'+side],nodes['Rotor_mount_'+side]);}
    attach(nodes.Stinger_gun,nodes.Abdomen);
    for(const side of [-1,1])for(let i=0;i<3;i++)attach(nodes[`Wasp_leg_${side}_${i}`],body);
  }
  const arms=[],legs=[];
  if(!spec.count&&!spec.flying)for(const side of [-1,1]){
    const shoulder=nodes[`${spec.shoulder}_${side}`],elbow=nodes[`${spec.forearm}_${side}`];
    const hand=spec.hand?nodes[`${spec.hand}_${side}`]:elbow;
    attach(shoulder,body);attach(elbow,shoulder);if(hand!==elbow)attach(hand,elbow);
    const bladeTip=hand.userData.blade_tip_local?socket(hand,hand.userData.blade_tip_local,'blade-tip-'+side):null;
    arms.push({shoulder,elbow,hand,bladeTip,side});
  }
  for(const side of [-1,1])for(let index=0;index<(spec.flying?0:(spec.count||1));index++){
    const prefix=spec.count?`${spec.leg}_${side}_${index}`:`${spec.leg}_${side}`;
    const chain=[0,1,2].map(i=>nodes[`${prefix}_segment_${i}`]),foot=nodes[`${prefix}_foot`];
    attach(chain[0],nodes.Pelvis||body);attach(chain[1],chain[0]);attach(chain[2],chain[1]);attach(foot,chain[2]);
    legs.push({hip:chain[0],knee:chain[1],hock:chain[2],foot,chain,side,index});
    const hose=nodes[`Leg_supply_hose_${side}_${index}`];if(hose)attach(hose,chain[0]);
  }
  // Each clone owns its transforms. The immutable mesh geometry and textures are shared.
  const rest=new Map();asset.traverse(o=>{if(!o.isMesh)rest.set(o,{p:o.position.clone(),q:o.quaternion.clone()});});
  root.updateMatrixWorld(true);
  for(const leg of legs){
    leg.restFoot=motion.worldToLocal(leg.foot.getWorldPosition(new THREE.Vector3()));leg.goal=leg.restFoot.clone();
    leg.hinges=leg.chain.map((joint,i)=>{
      if(!i||!spec.count)return new THREE.Vector3(1,0,0);
      const center=joint.getWorldPosition(new THREE.Vector3()),incoming=center.clone().sub(leg.chain[i-1].getWorldPosition(new THREE.Vector3())),outgoing=(leg.chain[i+1]||leg.foot).getWorldPosition(new THREE.Vector3()).sub(center);
      return incoming.cross(outgoing).normalize().applyQuaternion(joint.getWorldQuaternion(new THREE.Quaternion()).invert());
    });
  }
  const hitMeshes=meshList(asset);for(const mesh of hitMeshes)mesh.userData.enemyPart=true;
  for(const mesh of meshList(head))mesh.userData.weakPoint=true;
  const eyeGlow=new THREE.Sprite(new THREE.SpriteMaterial({map:muzzleGlowMap,color:0xff1028,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false,opacity:.85}));
  eyeGlow.name='red-eye-glow';
  if(asset.userData.wildEye){
    const eyePosition=head.worldToLocal(asset.localToWorld(new THREE.Vector3().fromArray(asset.userData.wildEye)));
    eyeGlow.position.copy(eyePosition);eyeGlow.position.z+=.035;
  }
  eyeGlow.scale.setScalar(.38);eyeGlow.visible=!!asset.userData.wildEye;head.add(eyeGlow);
  let weapon=nodes.Stinger_gun||nodes.Sniper_rifle||(id==='forest-warden'?nodes.Heavy_forearm_1:nodes['Forearm_-1'])||body;
  let muzzle=socket(weapon,weapon.userData.muzzle_local||(id==='rust-scout'?[.02,-.2328,.614]:id==='wall-sniper-spider'?[0,.052,1.598]:[0,0,.5]),'combat-muzzle');
  const sniper=id==='wall-sniper-spider',flashColor=sniper?0xff2034:0xffc466;
  const muzzleFlash=new THREE.Mesh(new THREE.ConeGeometry(.095,.34,6),new THREE.MeshBasicMaterial({color:flashColor,toneMapped:false}));
  const muzzleGlow=new THREE.Sprite(new THREE.SpriteMaterial({map:muzzleGlowMap,color:flashColor,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false}));
  muzzleGlow.position.z=.08;muzzleGlow.visible=false;muzzle.add(muzzleGlow);
  const muzzleLight=new THREE.PointLight(flashColor,0,5,2);muzzleLight.position.z=.18;muzzle.add(muzzleLight);
  muzzleFlash.rotation.x=Math.PI/2;muzzleFlash.position.z=.12;muzzleFlash.visible=false;muzzle.add(muzzleFlash);
  const r={root,mount,motion,asset,nodes,body,neck:head,head,arms,legs,hitMeshes,rest,wildId:id,spec,phase:0,age:0,walkBlend:0,aimBlend:0,recoil:0,flashTime:0,hitCooldown:0,blaster:weapon,eyeGlow,muzzle,muzzleFlash,muzzleGlow,muzzleLight,aimEmitter:muzzle,missileMuzzles:[],actions:{},rotors:[],blades:[],wallMounted:false};
  if(spec.flying){
    r.rotors=[nodes['Rotor_-1'],nodes.Rotor_1];
    r.missileMuzzles=[-1,1].map(side=>socket(socket(nodes.Stinger_gun,[side*.10,0,.30],'wasp-launch-pivot-'+side),[0,0,.20],'wasp-launch-port-'+side));
  }
  r.previousPosition=root.position.clone();r.travel=new THREE.Vector3(0,0,1);r.gaitSpeed=0;r.strideRate=0;
  r.deathDuration=WILD_DESTRUCTION_DURATION;
  r.captureHeadDeath=()=>captureHeadDeath(r);
  r.recordImpact=(point,direction,strength,mesh)=>recordWildImpact(r,point,direction,strength,mesh);
  if(spec.hand)r.blades=arms.map(arm=>arm.hand);
  // Compatibility sockets for read-only diagnostics on multi-legged enemies.
  if(!arms.length)r.arms=[{shoulder:body,elbow:body,hand:body},{shoulder:body,elbow:body,hand:body}];
  r.getAimOrigin=()=>head.getWorldPosition(new THREE.Vector3());
  r.aimAt=target=>aimWildEnemy(r,target);
  r.mountOnWall=(platforms,anchor,lookAt)=>mountWildSniper(r,platforms,anchor,lookAt);
  r.legNodes=new Set(legs.flatMap(leg=>[...leg.chain,leg.foot]));
  r.legParents=[...new Set(legs.map(leg=>leg.hip.parent))];
  r.finishLegPose=()=>{pendingLegs.delete(r);solveLegPose(r);r.motion.updateWorldMatrix(true,true);};
  // Rigid mesh offsets and decorative groups never animate; their joint parents do.
  const moving=new Set([root,mount,motion,body,head,weapon,...r.rotors,nodes.Pelvis,nodesRifle(r),muzzleFlash,muzzleGlow,...arms.flatMap(arm=>[arm.shoulder,arm.elbow,arm.hand]),...r.legNodes]);
  r.poseRest=new Map([...rest].filter(([node])=>moving.has(node)));
  root.traverse(node=>{if(!moving.has(node)){node.updateMatrix();node.matrixAutoUpdate=false;}});
  animateWildEnemy(r,0);return r;
}
function restore(r,deferLegs=false){for(const [node,rest]of r.poseRest){if(deferLegs&&r.legNodes.has(node))continue;node.position.copy(rest.p);node.quaternion.copy(rest.q);}r.motion.position.set(0,0,0);r.motion.rotation.set(0,0,0);}
const pendingLegs=new Set();
function solveLegPose(r){
 for(const node of r.legNodes){const rest=r.rest.get(node);node.position.copy(rest.p);node.quaternion.copy(rest.q);}
 r.motion.updateWorldMatrix(true,false);r.motion.getWorldQuaternion(soleOrientation);
 for(const parent of r.legParents)parent.updateWorldMatrix(true,false);
 for(const leg of r.legs)plantLeg(r,leg,leg.goal,true);
}
function flushLegPose(r){if(pendingLegs.has(r))flushFrameWork(r);}
// Exact mesh hits, melee poses and death capture cannot use a pending foot pose.
export function flushEnemyPoses(){for(const r of pendingLegs)flushLegPose(r);}
// Hips carry the lateral weight shift; knees and hocks stay mechanical hinges.
function updateLegChain(leg,from){for(let j=from;j<3;j++)leg.chain[j].updateWorldMatrix(false,false);leg.foot.updateWorldMatrix(false,false);}
function plantLeg(r,leg,goal,prepared=false){
  // CCD only needs the three joints and foot. Updating descendants here used
  // to visit every decorative mesh, then repeat the same work for each joint.
  if(!prepared){r.motion.updateWorldMatrix(true,false);r.motion.getWorldQuaternion(soleOrientation);leg.hip.parent.updateWorldMatrix(true,false);}
  legTarget.copy(goal).applyMatrix4(r.motion.matrixWorld);
  updateLegChain(leg,0);
  for(let pass=0;pass<12;pass++){
   if(a.setFromMatrixPosition(leg.foot.matrixWorld).distanceToSquared(legTarget)<.000004)break;
   for(let i=2;i>=0;i--){
    const joint=leg.chain[i];jointInverse.copy(joint.matrixWorld).invert();
    a.setFromMatrixPosition(leg.foot.matrixWorld).applyMatrix4(jointInverse);b.copy(legTarget).applyMatrix4(jointInverse);
    if(i===0){q.setFromUnitVectors(a.normalize(),b.normalize());joint.quaternion.multiply(q);}
    else {
      const axis=leg.hinges[i],dot=a.dot(b)-a.dot(axis)*b.dot(axis),cross=axis.x*(a.y*b.z-a.z*b.y)+axis.y*(a.z*b.x-a.x*b.z)+axis.z*(a.x*b.y-a.y*b.x);
      joint.rotateOnAxis(axis,THREE.MathUtils.clamp(Math.atan2(cross,dot),-.3,.3));
    }
    updateLegChain(leg,i);
  }
  }
  // Keep soles aligned with the support plane after solving the articulated chain.
  leg.foot.parent.matrixWorld.decompose(jointPosition,q,jointScale);
  leg.foot.quaternion.copy(q.invert().multiply(soleOrientation));
}
// Sample the intact mechanical rig before the final burst, preserving every joint.
function captureHeadDeath(r){
  flushLegPose(r);
  const nodes=[...r.rest.keys(),r.motion],rest=nodes.map(n=>({n,p:n.position.clone(),q:n.quaternion.clone()}));
  const feet=r.legs.map(l=>r.motion.worldToLocal(l.foot.getWorldPosition(new THREE.Vector3())));
  const hipHeight=(r.nodes.Pelvis||r.body).position.y;
  const limpArms=r.spec.count?[]:r.arms.map(arm=>{
    const end=arm.hand!==arm.elbow?arm.hand.getWorldPosition(new THREE.Vector3()):new THREE.Box3().setFromObject(arm.elbow).getCenter(new THREE.Vector3());
    return {...arm,lowerAxis:arm.elbow.worldToLocal(end).normalize()};
  });
  return (t,parts,inverse)=>{
    for(const {n,p,q} of rest){n.position.copy(p);n.quaternion.copy(q);}
    const kick=1-(1-THREE.MathUtils.clamp(t/.085,0,1))**3;
    // Hold the recoil, then let gravity accelerate the head before the knees give way.
    const fold=THREE.MathUtils.clamp((t-.32)/.85,0,1)**2.6;
    const kneel=THREE.MathUtils.clamp((t-1.17)/.83,0,1)**2;
    const fall=THREE.MathUtils.smoothstep(t,1.55,2);
    const recoil=kick*(1-THREE.MathUtils.smoothstep(t,.32,.95)),limp=THREE.MathUtils.smoothstep(t,.20,.80);
    const drop=hipHeight*(r.spec.count?.35:.70)*kneel;
    if(r.nodes.Pelvis)r.nodes.Pelvis.position.y-=drop;
    r.body.position.y-=drop;r.body.rotateX(-.16*recoil+(r.spec.count?.04:.38)*fold+(r.spec.count?.15:.3)*fall);
    r.head.rotateX(-.95*kick+(r.spec.count?1:1.4)*fold);
    r.body.position.z+=.12*kneel;
    for(let i=0;i<r.legs.length;i++)plantLeg(r,r.legs[i],feet[i]);
    // Once the knees give way, carry the connected frame forward into the fall.
    r.motion.rotateX(-.08*recoil+(r.spec.count?.20:.16)*fall);r.motion.updateWorldMatrix(true,true);
    for(const arm of limpArms){
      // Loss of motor torque: both segments settle toward gravity, without shaking.
      for(const [joint,axis] of [[arm.shoulder,arm.elbow.position.clone().normalize()],[arm.elbow,arm.lowerAxis]]){
        const down=new THREE.Vector3(0,-1,0).applyQuaternion(joint.parent.getWorldQuaternion(new THREE.Quaternion()).invert());
        joint.quaternion.slerp(new THREE.Quaternion().setFromUnitVectors(axis,down),limp);
        joint.updateWorldMatrix(false,true);
      }
    }
    r.motion.updateWorldMatrix(true,true);
    // Long arm tools meet the floor by folding their joints, not by lifting the
    // whole collapsing chassis. This also handles the newly authored mantis blades.
    for(const arm of limpArms){
      const joint=arm.elbow,base=joint.quaternion.clone(),floor=r.root.getWorldPosition(new THREE.Vector3()).y;
      const bounds=()=>new THREE.Box3().setFromObject(joint).min.y;
      if(bounds()<floor){let best=base.clone(),bestY=bounds();for(const sign of [-1,1])for(let angle=.1;angle<=2.5;angle+=.1){joint.quaternion.copy(base);joint.rotateX(sign*angle);joint.updateWorldMatrix(false,true);const y=bounds();if(y>bestY){bestY=y;best.copy(joint.quaternion);}if(y>=floor+.01)break;}joint.quaternion.copy(best);joint.updateWorldMatrix(false,true);}
    }
    for(const part of parts){
      const matrix=inverse.clone().multiply(part.mesh.matrixWorld).multiply(part.matrix.clone().invert());
      part.rotation.setFromRotationMatrix(new THREE.Matrix4().extractRotation(matrix));
      part.offset.copy(part.center).applyMatrix4(matrix).sub(part.center);
    }
    for(const {n,p,q} of rest){n.position.copy(p);n.quaternion.copy(q);}
    r.motion.updateWorldMatrix(true,true);
  };
}
export function animateWildEnemy(r,dt,{speed=0,aim=0,elevation=0,hit=0,rolling=false,rollTime=0,grounded=true,velocityX,velocityZ}={}){
  if(r.destruction)resetWildDestruction(r);
  dt=Math.min(.05,Math.max(0,dt));const deferLegs=inFrameWork();restore(r,deferLegs);r.age+=dt;r.lastSpeed=speed;
  if(r.spec.flying){
    r.aimBlend=THREE.MathUtils.damp(r.aimBlend,aim,12,dt);r.phase+=dt*(speed>3?65:48);
    r.motion.position.y=.10+Math.sin(r.age*2.1)*.035;
    r.motion.rotation.x=Math.min(.13,speed*.022)-Math.max(0,hit)*.4;
    r.motion.rotation.z=Math.sin(r.age*1.4)*.018;
    for(let i=0;i<r.rotors.length;i++)r.rotors[i].rotateY(r.phase*(i?1:-1));
    r.recoil=THREE.MathUtils.damp(r.recoil,0,18,dt);r.flashTime=Math.max(0,r.flashTime-dt);updateMuzzleFlash(r);
    r.nodes.Stinger_gun.position.z-=r.recoil*.055;
    r.motion.updateWorldMatrix(true,true);r.posePrepared=true;return;
  }
  const supported=grounded&&!r.wallMounted;
  r.walkBlend=THREE.MathUtils.damp(r.walkBlend,supported?Math.min(1,speed/.8):0,10,dt);
  r.gaitSpeed=THREE.MathUtils.damp(r.gaitSpeed,Math.max(0,speed),8,dt);
  const gait=wildGait(r.wildId,r.gaitSpeed);r.gait=gait;r.strideRate=gait.pace;
  r.aimBlend=THREE.MathUtils.damp(r.aimBlend,aim,12,dt);if(supported)r.phase+=dt*gait.pace*Math.PI*2;
  // Game actors can strafe or retreat while facing the player. The stationary
  // lab uses +Z; actual translation supplies the travel direction in combat.
  v.set(velocityX??(r.root.position.x-r.previousPosition.x),0,velocityZ??(r.root.position.z-r.previousPosition.z));
  if(v.lengthSq()>1e-8&&speed>.05){v.applyQuaternion(r.root.getWorldQuaternion(q).invert()).setY(0).normalize();r.travel.lerp(v,1-Math.exp(-dt*12));}
  r.previousPosition.copy(r.root.position);
  r.recoil=THREE.MathUtils.damp(r.recoil,0,18,dt);r.flashTime=Math.max(0,r.flashTime-dt);updateMuzzleFlash(r);
  const walk=supported?r.walkBlend:0,mantis=r.wildId==='assault-mantis',pelvis=r.nodes.Pelvis;
  let load=0,supportSide=0;
  for(const leg of r.legs){leg.step=wildFootfall(wildLegPhase(r,leg),gait.support);load=Math.max(load,leg.step.load);supportSide+=leg.side*leg.step.load;}
  supportSide/=r.spec.count||1;
  const settle=-(gait.crouch+gait.press*load)*walk,sway=supportSide*gait.sway*walk;
  const scoutRush=r.wildId==='rust-scout'?gait.run*walk*Math.max(0,r.travel.z):0;
  // Carry the hips forward over the planted feet, then hinge the chest into the run.
  if(pelvis)pelvis.position.z+=scoutRush*.10;
  if(pelvis){pelvis.position.y+=settle;pelvis.position.x+=sway;pelvis.rotateY(Math.sin(r.phase)*walk*.055);}
  // Move the leg roots WITH the chassis so the hinges visibly absorb weight.
  // Torso twist trails the pelvis; head counter-rotation keeps the eye steady.
  r.body.position.y+=settle+(!r.wallMounted?Math.sin(r.age*2)*.004:0);r.body.position.x+=sway;
  r.body.rotateX((mantis?.13+gait.run*.13:.045+gait.run*.10)*walk*r.travel.z-Math.max(0,hit)*.5);
  r.body.position.z+=scoutRush*.10;r.body.rotateX(scoutRush*.24);
  r.body.rotateZ(-supportSide*walk*(r.spec.count?.018:.04));r.body.rotateY(Math.sin(r.phase-.35)*walk*(r.spec.count?.018:.035));
  r.head.rotateX(-elevation*.55-r.body.rotation.x*.65);r.head.rotateZ(-r.body.rotation.z*.8);
  r.head.rotateY(Math.sin(r.age*.8)*.08*(1-r.aimBlend)-r.body.rotation.y*.6);
  for(const leg of r.legs){
    leg.goal.copy(leg.restFoot).addScaledVector(r.travel,leg.step.travel*walk*gait.stride);
    // Insects draw the supporting feet slightly underneath the shell instead
    // of overextending already spread legs when the stride opens up.
    if(r.spec.count)leg.goal.x-=leg.side*walk*(.045+gait.run*.055);
    leg.goal.y+=leg.step.height*walk*gait.lift;
    leg.planted=supported&&(walk<.01||leg.step.planted);
    if(!grounded){leg.goal.z-=.10;leg.goal.y+=.16;leg.planted=false;}
  }
  if(deferLegs){pendingLegs.add(r);scheduleFrameWork(r,r.finishLegPose);}else solveLegPose(r);
  if(!r.spec.count)for(const arm of r.arms){
    const swing=Math.sin(r.phase-.30+(arm.side>0?Math.PI:0))*walk*(.22+gait.run*.16);
    if(mantis){
      arm.shoulder.rotateX(swing*.25);arm.elbow.rotateX(-.08+walk*.03);
      // Keep the wrist-mounted blade vertical while the upper arm and forearm
      // absorb the running sway and the thorax leans forward.
      arm.hand.rotateX(-r.body.rotation.x-arm.shoulder.rotation.x-arm.elbow.rotation.x);
    }else arm.shoulder.rotateX(swing*(1-r.aimBlend));
    if(r.wildId==='rust-scout'&&arm.side<0){
      // Raise the upper arm to shoulder height, then extend the gun arm along the aim.
      const direction=new THREE.Vector3(0,Math.sin(elevation),Math.cos(elevation)).applyQuaternion(r.root.getWorldQuaternion(new THREE.Quaternion()));
      arm.shoulder.parent.updateWorldMatrix(true,false);
      const localAim=direction.clone().applyQuaternion(arm.shoulder.parent.getWorldQuaternion(new THREE.Quaternion()).invert());
      arm.shoulder.quaternion.slerp(new THREE.Quaternion().setFromUnitVectors(arm.elbow.position.clone().normalize(),localAim),r.aimBlend);
      arm.shoulder.updateWorldMatrix(false,false);
      const gunAim=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,0,1),direction);
      gunAim.premultiply(arm.elbow.parent.getWorldQuaternion(new THREE.Quaternion()).invert());
      arm.elbow.quaternion.slerp(gunAim,r.aimBlend);arm.elbow.rotateX(-r.recoil*.08);
    }
  }
  if(nodesRifle(r))nodesRifle(r).position.z-=r.recoil*.25;
  if(rolling){flushLegPose(r);r.body.position.y-=.16;r.body.rotation.z=Math.sin(Math.min(1,rollTime/.72)*Math.PI)*.5;}
  r.motion.updateWorldMatrix(true,true);r.posePrepared=true;
}
function nodesRifle(r){return r.nodes.Sniper_rifle||(r.wildId==='forest-warden'?r.nodes.Heavy_forearm_1:null);}
export function aimWildEnemy(r,target){
  if(!nodesRifle(r))return;
  const rifle=nodesRifle(r),origin=rifle.getWorldPosition(a),direction=b.copy(target).sub(origin).normalize();
  q.setFromUnitVectors(new THREE.Vector3(0,0,1),direction);
  rifle.quaternion.copy(rifle.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(q));
  rifle.updateWorldMatrix(false,true);
}
export function animateWildAttack(r,remaining){
  // Remaining time follows the game's .65 s melee attack, with impact at .27 s.
  if(!remaining)return;flushLegPose(r);const age=.65-remaining,t=THREE.MathUtils.clamp(age/.65,0,1);
  if(r.wildId==='assault-mantis'){
    // Upper arm, forearm and absolute blade pitch: lift above the head, chop
    // down through the .27 s damage window, then recover to a downward guard.
    const poses=[[0,0,-.08,0],[.20,-1.10,.10,-1.20],[.35,.15,-.20,.80],[.65,0,-.08,0]];
    const index=age<.20?0:age<.35?1:2,start=poses[index],end=poses[index+1];
    const blend=THREE.MathUtils.smootherstep(age,start[0],end[0]);
    const upper=THREE.MathUtils.lerp(start[1],end[1],blend),forearm=THREE.MathUtils.lerp(start[2],end[2],blend),blade=THREE.MathUtils.lerp(start[3],end[3],blend);
    r.body.rotateX(Math.sin(t*Math.PI)*.10);
    for(const arm of r.arms){arm.shoulder.rotation.x=upper;arm.elbow.rotation.x=forearm;arm.hand.rotation.x=blade-r.body.rotation.x-upper-forearm;}
    return;
  }
  if(r.wildId==='forest-warden'){
    const arm=r.arms.find(a=>a.side<0),poses=[[0,0],[.20,-1.8],[.29,.85],[.42,1.0],[.65,0]];
    const index=age<.20?0:age<.29?1:age<.42?2:3,start=poses[index],end=poses[index+1];
    const swing=THREE.MathUtils.lerp(start[1],end[1],THREE.MathUtils.smootherstep(age,start[0],end[0]));
    arm.shoulder.rotation.x=swing;arm.elbow.rotation.x=-.3*Math.max(0,-swing);
    r.body.rotateX(Math.max(0,swing)*.18);return;
  }
  const lift=t<.36?t/.36:Math.max(0,1-(t-.36)/.3),strike=Math.sin(Math.min(1,Math.max(0,(t-.36)/.35))*Math.PI);
  const heavy=r.wildId==='forest-warden';
  for(const arm of r.arms){arm.shoulder.rotateX(-lift*(heavy?1.8:.65)+strike*.9);arm.shoulder.rotateZ(arm.side*(heavy?.12:.65)*lift);arm.elbow.rotateX(-lift*.45+strike*.6);}
  r.body.rotateX(strike*(heavy?.2:.13));
}
function updateMuzzleFlash(r){
  const pulse=THREE.MathUtils.clamp(r.flashTime/.12,0,1),sniper=r.wildId==='wall-sniper-spider';
  const aiming=sniper?r.aimBlend:0;
  r.muzzleFlash.visible=pulse>0;r.muzzleFlash.scale.setScalar(.75+pulse*.65);
  r.muzzleGlow.visible=pulse>0||aiming>.01;
  r.muzzleGlow.material.opacity=pulse>0?pulse:.45*aiming;
  r.muzzleGlow.scale.setScalar(pulse>0?(r.wildId==='forest-warden'?1.35:.9)*(.7+pulse*.3):.18);
  r.muzzleLight.intensity=18*pulse*pulse+.12*aiming;
}
export function fireWildEnemy(r){r.recoil=1;r.flashTime=.12;updateMuzzleFlash(r);}
export function dieWildEnemy(r,progress){
  flushLegPose(r);
  updateWildDestruction(r,progress);
}
export function disposeWildEnemy(r){pendingLegs.delete(r);cancelFrameWork(r);resetWildDestruction(r);r.eyeGlow.material.dispose();r.muzzleFlash.geometry.dispose();r.muzzleFlash.material.dispose();r.muzzleGlow.material.dispose();r.muzzleLight.dispose();r.root.removeFromParent();}
export function mountWildSniper(r,platforms,anchor,lookAt){
  if(r.wildId!=='wall-sniper-spider')return false;
  const faces=[];
  for(const p of platforms){if(p.base||p.walkable||p.h<4||p.w<3.5||p.d<3.5)continue;
    for(const [nx,nz]of [[1,0],[-1,0],[0,1],[0,-1]]){
      const x=p.x+nx*(p.w/2+.05),z=p.z+nz*(p.d/2+.05),dist=Math.hypot(x-anchor.x,z-anchor.z);
      if(dist>24||(lookAt.x-x)*nx+(lookAt.z-z)*nz<0)continue;
      if(platforms.some(o=>o!==p&&o.h>2&&Math.abs(x+nx*.8-o.x)<o.w/2&&Math.abs(z+nz*.8-o.z)<o.d/2))continue;
      faces.push({x,z,nx,nz,y:Math.min(p.h-1.25,3.2),dist});
    }
  }
  const f=faces.sort((a,b)=>a.dist-b.dist)[0];if(!f)return false;
  r.root.position.set(f.x,f.y,f.z);r.root.rotation.set(0,Math.atan2(-f.nz,f.nx),0);
  r.mount.rotation.z=-Math.PI/2;r.wallMounted=true;r.wallYaw=r.root.rotation.y;r.root.updateMatrixWorld(true);return true;
}

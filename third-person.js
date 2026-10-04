import {decorateMinigunFlash} from './minigun-fire.js';
import {createJetpack} from './jetpack.js';
import {createHeavyEquipment} from './heavy-equipment.js';
import {sampleKnifeSlash} from './knife-motion.js';
import * as THREE from 'three';
import {createWeaponModel} from './weapon-models.js';
import {createThirdPersonMotion} from './third-person-motion.js';
import {createCustomMotion} from './motion-settings.js';
import {armIK} from './sword-combat.js';
import {animateRobot} from './robot.js';
const v=(x,y,z)=>new THREE.Vector3(x,y,z);
export function createThirdPersonView(avatar,types){
 const camera=new THREE.PerspectiveCamera(78,1,.08,150),models={},motion=createThirdPersonMotion(avatar);let bodyInitialized=false,firePose=0,fireHold=0,poseWeapon='',heavyAim=0;
 motion.apply('TPSAimIdle',0);avatar.root.updateMatrixWorld(true);const carryChest=avatar.bones.find(b=>b.name==='spine_03'),carryRestPosition=avatar.root.worldToLocal(carryChest.getWorldPosition(new THREE.Vector3())),carryRestRotation=avatar.root.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(carryChest.getWorldQuaternion(new THREE.Quaternion()));motion.apply('Sword_Idle',0);avatar.root.updateMatrixWorld(true);const knifeMount=avatar.arms[1].hand.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(new THREE.Quaternion().setFromUnitVectors(v(0,0,-1),v(-.45,.35,1).normalize()));
 for(const type of types){const model=createWeaponModel(type);model.scale.multiplyScalar((type==='rocket'?1.45:1)/1.17);model.visible=false;const muzzleFlash=new THREE.Mesh(new THREE.ConeGeometry(.07,.2,5),new THREE.MeshBasicMaterial({color:0xffeaa1}));muzzleFlash.rotation.x=-Math.PI/2;muzzleFlash.position.fromArray(model.userData.muzzle);muzzleFlash.visible=false;model.add(muzzleFlash);model.userData.viewFlash=muzzleFlash;if(type==='rapid'){muzzleFlash.scale.set(3.7,4.8,3.7);model.userData.fireLight=decorateMinigunFlash(muzzleFlash);}avatar.arms[type==='bow'?0:1].hand.add(model);model.traverse(o=>{if(o.isMesh)o.castShadow=true;});models[type]=model;}
 if(avatar.backpack)avatar.backpack.visible=false;
 const jetpack=createJetpack(avatar),equipment=createHeavyEquipment(avatar,jetpack);
 const customMotion=createCustomMotion(avatar,models),modelScales=Object.fromEntries(Object.entries(models).map(([k,m])=>[k,m.scale.clone()]));
 function pose(state){
  customMotion(null);for(const [k,m]of Object.entries(models))m.scale.copy(modelScales[k]);
  const {position,yaw,pitch,weapon,speed=0,velocity=v(0,0,0),knifePhase=-1,knifeCombo=1,knifeGuard=false,knifeBlock=0,knifeRush=false,bowDrawing=false,bowCharge=0,chainsawBlend=0,time=0,dt=0,flash=false,laserHeat=0,firing=false,adsBlend=0,rollPhase=-1,rollDirection,knifeDirection,throwPhase=-1}=state;
  let bodyYaw=yaw+Math.PI;
  if(knifePhase>=0&&knifeDirection?.lengthSq()>.01)bodyYaw=Math.atan2(knifeDirection.x,knifeDirection.z);
  avatar.root.position.copy(position).add(v(0,-1.7,0));const turn=Math.atan2(Math.sin(bodyYaw-avatar.root.rotation.y),Math.cos(bodyYaw-avatar.root.rotation.y));avatar.root.rotation.set(0,bodyInitialized?avatar.root.rotation.y+turn*(1-Math.exp(-dt*24)):bodyYaw,0);bodyInitialized=true;avatar.blaster.visible=false;
  // Normalize animation speed to the stride's recorded pace, never the 30m/s dash speed.
  animateRobot(avatar,dt,{speed:Math.min(5,speed/9.8*4.5),aim:0,velocityX:velocity.x,velocityZ:velocity.z,yaw:bodyYaw});
  const result=motion.update(dt,{...state,velocity});avatar.root.updateMatrixWorld(true);
  for(const [type,model]of Object.entries(models))model.visible=type===weapon;
  const model=models[weapon];if(!model)return;
  if(poseWeapon!==weapon){poseWeapon=weapon;firePose=0;fireHold=0;}
  if(firing||flash)fireHold=.22;else fireHold=Math.max(0,fireHold-dt);
  if(!(state.boostPhase>=0||state.jetJump>0||rollPhase>=0))firePose=THREE.MathUtils.damp(firePose,Math.max(adsBlend,fireHold>0?1:0),18,dt);
  heavyAim=['rapid','flame'].includes(weapon)?adsBlend:0;
  const heading=new THREE.Quaternion().setFromEuler(new THREE.Euler(pitch,yaw,0,'YXZ'));
  model.position.set(0,0,0);model.quaternion.identity();
  if(weapon==='knife'){
   if(knifePhase<0&&!knifeGuard||result.rolling||throwPhase>=0)model.quaternion.copy(knifeMount);
   else{
    const slash=sampleKnifeSlash(knifePhase,{combo:knifeCombo,guard:knifeGuard,block:knifeBlock,rush:knifeRush}),worldRotation=heading.clone().multiply(slash.rotation),grip=position.clone().add(slash.grip.clone().applyQuaternion(heading)),hand=avatar.arms[1].hand;
    armIK(avatar.arms[1],grip,position.clone().add(v(.65,-.2,.1).applyQuaternion(heading)));avatar.root.updateMatrixWorld(true);
    hand.quaternion.copy(hand.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(worldRotation));hand.updateWorldMatrix(false,true);
    model.quaternion.copy(hand.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(worldRotation));model.position.set(0,0,0);model.updateWorldMatrix(true,true);
    armIK(avatar.arms[0],model.localToWorld(v(0,0,.12)),position.clone().add(v(-.65,-.2,.1).applyQuaternion(heading)));
    model.userData.slashStage=slash.stage;
   }
  }
  else if(weapon==='bow'){
   // Keep both grip and nock on the aim line; retargeted wrist trajectories
   // have different proportions and otherwise turn the displayed arrow sideways.
   if(bowDrawing&&rollPhase<0){const grip=position.clone().add(v(-.13,-.24,-.63).applyQuaternion(heading));const leftPole=avatar.root.localToWorld(v(.5,1.45,.2));armIK(avatar.arms[0],grip,leftPole);avatar.root.updateMatrixWorld(true);const actualGrip=avatar.arms[0].hand.getWorldPosition(new THREE.Vector3()),draw=.2+.36*Math.min(1,bowCharge/2.2),nock=actualGrip.clone().add(v(0,0,draw).applyQuaternion(heading)),rightPole=position.clone().add(v(.48,-.18,.16).applyQuaternion(heading));armIK(avatar.arms[1],nock,rightPole);avatar.root.updateMatrixWorld(true);}
   const hand=avatar.arms[0].hand,desired=heading.clone();model.quaternion.copy(hand.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(desired));model.position.copy(v(0,0,.43*.8/1.17).applyQuaternion(model.quaternion));model.updateWorldMatrix(true,true);
   const pull=bowDrawing?model.worldToLocal(avatar.arms[1].hand.getWorldPosition(new THREE.Vector3())):v(0,0,.14),pos=model.userData.string.geometry.attributes.position;pull.x=0;pull.y=0;pos.setXYZ(1,pull.x,pull.y,pull.z);pos.needsUpdate=true;model.userData.string.geometry.computeBoundingSphere();model.userData.nockedArrow.visible=bowDrawing;model.userData.nockedArrow.position.copy(pull).sub(v(0,0,.14));model.userData.nockedArrow.quaternion.identity();for(const limb of model.userData.limbs)limb.rotation.x=limb.userData.side*Math.min(1,bowCharge/2.2)*.08;
  }else{
   const hand=avatar.arms[1].hand;
   if((!result.attack||state.boostPhase>=0||state.jetJump>0||rollPhase>=0)&&throwPhase<0){
    // Grip correction is layered over the source chest/shoulder pose. Lowered heavy
    // weapons and raised shoulder weapons use different anchors.
    const heavy=['rapid','flame','chainsaw','rail'].includes(weapon),reach=weapon==='chainsaw'?chainsawBlend*.15:0;
    const aim=THREE.MathUtils.clamp(Math.max(adsBlend,firePose),0,1);
    const weaponHeading=heading.clone();if(weapon!=='rocket')weaponHeading.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(THREE.MathUtils.lerp(heavy?-.16:-.30,0,aim),THREE.MathUtils.lerp(heavy?.34:.32,0,aim),THREE.MathUtils.lerp(heavy?-.10:-.05,0,aim))));
    const trigger=weapon==='rocket'?v(-.30,-.29,.10):weapon==='chainsaw'?v(.12,-.09,.50):weapon==='rapid'?v(0,-.14,.63):weapon==='laser'?v(0,-.31,.12):['pistol','shotgun','sniper'].includes(weapon)?v(0,weapon==='pistol'?-.33:-.25,weapon==='pistol'?.20:.22):v(0,-.2,.12);
    const canonical=position.clone().add(v(THREE.MathUtils.lerp(['rapid','flame'].includes(weapon)?.34:heavy?.12:.16,heavy?.32:.18,aim),THREE.MathUtils.lerp(heavy?-.59:-.46,heavy?-.49:-.27,aim),THREE.MathUtils.lerp(heavy?-.40:-.24,heavy?-.43:-.38,aim)-reach).applyQuaternion(heading)),anchor=weapon==='rocket'?avatar.arms[1].shoulder.getWorldPosition(new THREE.Vector3()).add(v(.03,.14,-.16).applyQuaternion(heading)).add(v(-.30,-.29,.10).multiplyScalar(model.scale.x).applyQuaternion(heading)):canonical;
    // Carry follows the animated chest, including pelvis bounce and torso twist.
    // Raising the weapon blends out that carry motion into a steady shoulder aim.
    if(weapon!=='rocket'){
     const bodyRotation=avatar.root.getWorldQuaternion(new THREE.Quaternion()),restChest=avatar.root.localToWorld(carryRestPosition.clone()),chest=carryChest.getWorldPosition(new THREE.Vector3()),delta=carryChest.getWorldQuaternion(new THREE.Quaternion()).multiply(bodyRotation.clone().multiply(carryRestRotation).invert());
     const carried=canonical.clone().sub(restChest).applyQuaternion(delta).add(chest);
     const influence=avatar.root.userData.forwardRunPose?.25:1;anchor.lerp(carried,(1-aim)*influence);weaponHeading.slerp(delta.clone().multiply(weaponHeading),(1-aim)*influence);
    }
    if(['pistol','shotgun','sniper'].includes(weapon)){const stock=v(0,weapon==='sniper'?-.08:-.05,weapon==='sniper'?.81:.79),shoulder=avatar.arms[1].shoulder.getWorldPosition(new THREE.Vector3()).add(v(0,.035,0).applyQuaternion(heading)),mounted=shoulder.add(trigger.clone().sub(stock).multiplyScalar(model.scale.x).applyQuaternion(weaponHeading));anchor.lerp(mounted,aim);}
    if(firing&&flash&&!['laser','chainsaw','flame'].includes(weapon))anchor.add(v(0,0,.025).applyQuaternion(heading));
    const pole=avatar.root.localToWorld(v(-.45,1.1,.05));armIK(avatar.arms[1],anchor,pole);
    hand.quaternion.copy(hand.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(weaponHeading));hand.updateWorldMatrix(false,true);
    // Model origin is the receiver; the trigger hand holds the actual grip below it.
    model.quaternion.copy(hand.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(weaponHeading));model.position.copy(trigger.multiplyScalar(-model.scale.x).applyQuaternion(model.quaternion));model.userData.gripRotation=model.quaternion.clone();model.userData.gripPosition=model.position.clone();model.updateWorldMatrix(true,true);
    const support=weapon==='rocket'?v(.16,-.23,-.06):weapon==='chainsaw'?v(-.16,.22,.05):weapon==='rapid'?v(-.19,-.22,-.14):weapon==='flame'?v(-.06,-.19,-.24):weapon==='laser'?v(-.06,-.17,-.53):v(-.045,-.08,-.43);
    const target=model.localToWorld(support),leftPole=avatar.root.localToWorld(v(.45,1.1,.05));armIK(avatar.arms[0],target,leftPole);
   }else{model.quaternion.copy(model.userData.gripRotation||new THREE.Quaternion());model.position.copy(model.userData.gripPosition||v(0,0,0));}
  }
  const customized=state.boostPhase>=0||state.jetJump>0?false:customMotion(state);if(customized&&weapon==='bow'&&bowDrawing){const pull=model.worldToLocal(avatar.arms[1].hand.getWorldPosition(new THREE.Vector3())),pos=model.userData.string.geometry.attributes.position;pos.setXYZ(1,pull.x,pull.y,pull.z);pos.needsUpdate=true;model.userData.string.geometry.computeBoundingSphere();model.userData.nockedArrow.position.copy(pull).sub(v(0,0,.14));const direction=v(0,0,-.43).sub(pull).normalize();model.userData.nockedArrow.quaternion.setFromUnitVectors(v(0,0,-1),direction);}
  if(weapon==='chainsaw')for(const tooth of model.userData.chainTeeth)tooth.position.z=tooth.userData.baseZ+((time*8)%1)*.065*chainsawBlend;
  jetpack.update({...state,weapon});equipment.update(weapon,model,time);
  model.userData.viewFlash.visible=flash&&!['knife','bow','chainsaw','laser','flame'].includes(weapon);if(weapon==='laser')for(const [i,ring]of model.userData.chargeRings.entries()){const lit=firing&&i<=Math.min(4,Math.floor(laserHeat+1e-7));ring.material.color.setHex(lit?0x65e8ff:0x37424c);ring.material.emissiveIntensity=lit?2.5:.08;}if(weapon==='rapid'){model.userData.rotor.rotation.z=time*(firing?45:0);model.userData.viewFlash.quaternion.setFromEuler(new THREE.Euler(-Math.PI/2,0,0)).multiply(new THREE.Quaternion().setFromAxisAngle(v(0,1,0),time*91));model.userData.viewFlash.scale.setScalar(3.8+Math.sin(time*113)*.8);model.userData.fireLight.intensity=flash?8:0;}avatar.root.updateMatrixWorld(true);
 }
 function cameraPose(aimCamera,obstacles,targets=[]){
  camera.fov=aimCamera.fov;camera.aspect=aimCamera.aspect;camera.updateProjectionMatrix();const origin=aimCamera.position.clone(),forward=aimCamera.getWorldDirection(new THREE.Vector3()),aimRay=new THREE.Raycaster(origin,forward,0,90),hit=aimRay.intersectObjects([...obstacles,...targets],false)[0],aimPoint=origin.clone().addScaledVector(forward,hit?.distance??90),offset=v(THREE.MathUtils.lerp(1.08,.66,heavyAim),THREE.MathUtils.lerp(.55,.02,heavyAim),THREE.MathUtils.lerp(3.25,.92,heavyAim)).applyQuaternion(aimCamera.quaternion),distance=offset.length(),direction=offset.clone().normalize();
  let limit=distance;for(const side of[v(0,0,0),v(.2,0,0),v(-.2,0,0),v(0,.2,0),v(0,-.2,0)]){const ray=new THREE.Raycaster(origin.clone().add(side),direction,0,distance),wall=ray.intersectObjects(obstacles,false)[0];if(wall)limit=Math.min(limit,Math.max(.08,wall.distance-.25));}
  camera.position.copy(origin).addScaledVector(direction,limit);camera.lookAt(aimPoint);camera.updateMatrixWorld(true);return camera;
 }
 return {camera,models,pose,cameraPose,motion,equipment,jetpack};
}

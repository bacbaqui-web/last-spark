import * as THREE from 'three';
import {createWeaponModel} from './weapon-models.js';
import {createThirdPersonMotion} from './third-person-motion.js';
import {armIK} from './sword-combat.js';
import {animateRobot} from './robot.js';
const v=(x,y,z)=>new THREE.Vector3(x,y,z);
export function createThirdPersonView(avatar,types){
 const camera=new THREE.PerspectiveCamera(78,1,.08,150),models={},motion=createThirdPersonMotion(avatar);let bodyInitialized=false;
 motion.apply('Sword_Idle',0);avatar.root.updateMatrixWorld(true);const knifeMount=avatar.arms[1].hand.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(new THREE.Quaternion().setFromUnitVectors(v(0,0,-1),v(0,1,.15).normalize()));
 for(const type of types){const model=createWeaponModel(type);model.scale.multiplyScalar(1/1.17);model.visible=false;const muzzleFlash=new THREE.Mesh(new THREE.ConeGeometry(.07,.2,5),new THREE.MeshBasicMaterial({color:0xffeaa1}));muzzleFlash.rotation.x=-Math.PI/2;muzzleFlash.position.fromArray(model.userData.muzzle);muzzleFlash.visible=false;model.add(muzzleFlash);model.userData.viewFlash=muzzleFlash;avatar.arms[type==='bow'?0:1].hand.add(model);model.traverse(o=>{if(o.isMesh)o.castShadow=true;});models[type]=model;}
 function pose(state){
  const {position,yaw,pitch,weapon,speed=0,velocity=v(0,0,0),knifePhase=-1,bowDrawing=false,bowCharge=0,chainsawBlend=0,time=0,dt=0,flash=false,laserHeat=0,firing=false,rollPhase=-1,rollDirection,knifeDirection,throwPhase=-1}=state;
  let bodyYaw=yaw+Math.PI;
  if(rollPhase>=0&&rollDirection?.lengthSq()>.01)bodyYaw=Math.atan2(rollDirection.x,rollDirection.z);
  else if(knifePhase>=0&&knifeDirection?.lengthSq()>.01)bodyYaw=Math.atan2(knifeDirection.x,knifeDirection.z);
  avatar.root.position.copy(position).add(v(0,-1.7,0));const turn=Math.atan2(Math.sin(bodyYaw-avatar.root.rotation.y),Math.cos(bodyYaw-avatar.root.rotation.y));avatar.root.rotation.set(0,bodyInitialized?avatar.root.rotation.y+turn*(1-Math.exp(-dt*24)):bodyYaw,0);bodyInitialized=true;avatar.blaster.visible=false;
  // Normalize animation speed to the stride's recorded pace, never the 30m/s dash speed.
  animateRobot(avatar,dt,{speed:Math.min(5,speed/9.8*4.5),aim:0,velocityX:velocity.x,velocityZ:velocity.z,yaw:bodyYaw});
  const result=motion.update(dt,{...state,velocity});avatar.root.updateMatrixWorld(true);
  for(const [type,model]of Object.entries(models))model.visible=type===weapon;
  const model=models[weapon];if(!model)return;
  const heading=new THREE.Quaternion().setFromEuler(new THREE.Euler(pitch,yaw,0,'YXZ'));
  model.position.set(0,0,0);model.quaternion.identity();
  if(weapon==='knife')model.quaternion.copy(knifeMount);
  else if(weapon==='bow'){
   // Keep both grip and nock on the aim line; retargeted wrist trajectories
   // have different proportions and otherwise turn the displayed arrow sideways.
   if(bowDrawing&&rollPhase<0){const grip=position.clone().add(v(-.13,-.24,-.63).applyQuaternion(heading));const leftPole=avatar.root.localToWorld(v(.5,1.45,.2));armIK(avatar.arms[0],grip,leftPole);avatar.root.updateMatrixWorld(true);const actualGrip=avatar.arms[0].hand.getWorldPosition(new THREE.Vector3()),draw=.2+.36*Math.min(1,bowCharge/2.2),nock=actualGrip.clone().add(v(0,0,draw).applyQuaternion(heading)),rightPole=position.clone().add(v(.48,-.18,.16).applyQuaternion(heading));armIK(avatar.arms[1],nock,rightPole);avatar.root.updateMatrixWorld(true);}
   const hand=avatar.arms[0].hand,desired=heading.clone();model.quaternion.copy(hand.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(desired));model.position.copy(v(0,0,.43*.8/1.17).applyQuaternion(model.quaternion));model.updateWorldMatrix(true,true);
   const pull=bowDrawing?model.worldToLocal(avatar.arms[1].hand.getWorldPosition(new THREE.Vector3())):v(0,0,.14),pos=model.userData.string.geometry.attributes.position;pull.x=0;pull.y=0;pos.setXYZ(1,pull.x,pull.y,pull.z);pos.needsUpdate=true;model.userData.string.geometry.computeBoundingSphere();model.userData.nockedArrow.visible=bowDrawing;model.userData.nockedArrow.position.copy(pull).sub(v(0,0,.14));model.userData.nockedArrow.quaternion.identity();for(const limb of model.userData.limbs)limb.rotation.x=limb.userData.side*Math.min(1,bowCharge/2.2)*.08;
  }else{
   const hand=avatar.arms[1].hand;
   if(!result.attack&&throwPhase<0){
    // Grip correction is layered over the source chest/shoulder pose. Lowered heavy
    // weapons and raised shoulder weapons use different anchors.
    const heavy=['rapid','flame','chainsaw','rail'].includes(weapon),reach=weapon==='chainsaw'?chainsawBlend*.15:0;
    const canonical=position.clone().add(v(.18,heavy?-.5:-.32,-.38-reach).applyQuaternion(heading)),anchor=heavy?canonical:hand.getWorldPosition(new THREE.Vector3()).lerp(canonical,.25);
    if(firing&&flash&&!['laser','chainsaw','flame'].includes(weapon))anchor.add(v(0,0,.025).applyQuaternion(heading));
    const pole=avatar.root.localToWorld(v(-.45,1.1,.05));armIK(avatar.arms[1],anchor,pole);
    hand.quaternion.copy(hand.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(heading));hand.updateWorldMatrix(false,true);
    // Model origin is the receiver; the trigger hand holds the actual grip below it.
    const trigger=weapon==='chainsaw'?v(.19,.16,.07):weapon==='rapid'?v(.19,.16,.07):v(0,-.2,.12);
    model.quaternion.copy(hand.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(heading));model.position.copy(trigger.multiplyScalar(-1/1.17).applyQuaternion(model.quaternion));model.userData.gripRotation=model.quaternion.clone();model.userData.gripPosition=model.position.clone();model.updateWorldMatrix(true,true);
    const support=weapon==='chainsaw'?v(-.16,.22,.05):weapon==='rapid'?v(-.19,.16,.07):v(-.045,-.08,-.43);
    const target=model.localToWorld(support),leftPole=avatar.root.localToWorld(v(.45,1.1,.05));armIK(avatar.arms[0],target,leftPole);
   }else{model.quaternion.copy(model.userData.gripRotation||new THREE.Quaternion());model.position.copy(model.userData.gripPosition||v(0,0,0));}
  }
  if(weapon==='chainsaw')for(const tooth of model.userData.chainTeeth)tooth.position.z=tooth.userData.baseZ+((time*8)%1)*.065*chainsawBlend;
  model.userData.viewFlash.visible=flash&&!['knife','bow','chainsaw','laser','flame'].includes(weapon);if(weapon==='laser')for(const [i,ring]of model.userData.chargeRings.entries()){const lit=firing&&i<=Math.min(4,Math.floor(laserHeat+1e-7));ring.material.color.setHex(lit?0xff7398:0x37424c);ring.material.emissiveIntensity=lit?2.5:.08;}if(weapon==='rapid')model.userData.rotor.rotation.z=time*(firing?45:0);avatar.root.updateMatrixWorld(true);
 }
 function cameraPose(aimCamera,obstacles,targets=[]){
  camera.fov=aimCamera.fov;camera.aspect=aimCamera.aspect;camera.updateProjectionMatrix();const origin=aimCamera.position.clone(),forward=aimCamera.getWorldDirection(new THREE.Vector3()),aimRay=new THREE.Raycaster(origin,forward,0,90),hit=aimRay.intersectObjects([...obstacles,...targets],false)[0],aimPoint=origin.clone().addScaledVector(forward,hit?.distance??90),offset=v(1.05,.55,4.4).applyQuaternion(aimCamera.quaternion),distance=offset.length(),direction=offset.clone().normalize();
  let limit=distance;for(const side of[v(0,0,0),v(.2,0,0),v(-.2,0,0),v(0,.2,0),v(0,-.2,0)]){const ray=new THREE.Raycaster(origin.clone().add(side),direction,0,distance),wall=ray.intersectObjects(obstacles,false)[0];if(wall)limit=Math.min(limit,Math.max(.08,wall.distance-.25));}
  camera.position.copy(origin).addScaledVector(direction,limit);camera.lookAt(aimPoint);camera.updateMatrixWorld(true);return camera;
 }
 return {camera,models,pose,cameraPose,motion};
}

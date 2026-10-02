import * as THREE from 'three';
import {createWeaponModel} from './weapon-models.js';
import {sampleWeaponMotion} from './weapon-motion.js';
import {armIK} from './sword-combat.js';
import {animateRobot} from './robot.js';
const v=(x,y,z)=>new THREE.Vector3(x,y,z);
const baseWrist=sampleWeaponMotion('Sword_Dash',0)[5].quaternion.clone().invert();
const bladeRest=new THREE.Quaternion().setFromUnitVectors(v(0,0,-1),v(.1,.9,-.4).normalize());
export function createThirdPersonView(avatar,types){
 const camera=new THREE.PerspectiveCamera(78,1,.08,150),models={};
 for(const type of types){const model=createWeaponModel(type);model.scale.multiplyScalar(1/1.17);model.visible=false;const muzzleFlash=new THREE.Mesh(new THREE.ConeGeometry(.07,.2,5),new THREE.MeshBasicMaterial({color:0xffeaa1}));muzzleFlash.rotation.x=-Math.PI/2;muzzleFlash.position.fromArray(model.userData.muzzle);muzzleFlash.visible=false;model.add(muzzleFlash);model.userData.viewFlash=muzzleFlash;avatar.arms[type==='bow'?0:1].hand.add(model);model.traverse(o=>{if(o.isMesh)o.castShadow=true;});models[type]=model;}
 function pose({position,yaw,pitch,weapon,speed=0,velocity,knifePhase=-1,bowDrawing=false,bowCharge=0,chainsawBlend=0,time=0,dt=0,bowMotionClip='BowIdle',bowMotionPhase=0,flash=false,laserHeat=0,firing=false}){
  avatar.root.position.copy(position).add(v(0,-1.7,0));avatar.root.rotation.set(0,yaw+Math.PI,0);avatar.blaster.visible=false;
  animateRobot(avatar,dt,{speed,aim:1,elevation:pitch,velocityX:velocity.x,velocityZ:velocity.z,yaw:yaw+Math.PI});avatar.root.updateMatrixWorld(true);
  for(const [type,model]of Object.entries(models))model.visible=type===weapon;
  const model=models[weapon];if(!model)return;
  const heading=new THREE.Quaternion().setFromEuler(new THREE.Euler(pitch,yaw,0,'YXZ')),head=position.clone().add(v(0,.05,0));
  let points,orientations;
  if(weapon==='knife'||weapon==='bow'){
   const name=weapon==='knife'?'Sword_Dash':bowMotionClip,phase=weapon==='knife'?Math.max(0,knifePhase):bowMotionPhase,samples=sampleWeaponMotion(name,phase);
   points=samples.map(p=>head.clone().add(p.position.applyQuaternion(heading)));orientations=[samples[2].quaternion,samples[5].quaternion].map(q=>heading.clone().multiply(q));
  }else{const reach=weapon==='chainsaw'?chainsawBlend*.22:0;points=[v(-.22,-.3,-.48-reach),v(-.45,-.5,-.1),v(-.14,-.3,-.65-reach),v(.22,-.3,-.45-reach),v(.45,-.5,-.1),v(.17,-.3,-.55-reach)].map(p=>head.clone().add(p.applyQuaternion(heading)));orientations=[heading.clone(),heading.clone()];}
  for(let side=0;side<2;side++){const arm=avatar.arms[side];armIK(arm,points[side*3+2],points[side*3+1]);arm.hand.quaternion.copy(arm.hand.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(orientations[side]));arm.hand.updateWorldMatrix(false,true);}
  model.position.set(0,0,0);model.quaternion.identity();
  if(weapon==='knife')model.quaternion.copy(baseWrist).multiply(bladeRest);
  if(weapon==='bow'){
   const hand=avatar.arms[0].hand,desired=heading.clone();model.quaternion.copy(hand.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(desired));model.position.copy(v(0,0,.43*.8/1.17).applyQuaternion(model.quaternion));model.updateWorldMatrix(true,true);
   const pull=bowDrawing?model.worldToLocal(avatar.arms[1].hand.getWorldPosition(new THREE.Vector3())):v(0,0,.14),pos=model.userData.string.geometry.attributes.position;pos.setXYZ(1,pull.x,pull.y,pull.z);pos.needsUpdate=true;model.userData.string.geometry.computeBoundingSphere();model.userData.nockedArrow.visible=bowDrawing;model.userData.nockedArrow.position.copy(pull).sub(v(0,0,.14));model.userData.nockedArrow.quaternion.setFromUnitVectors(v(0,0,-1),v(0,0,-.43).sub(pull).normalize());
  }
  if(weapon==='chainsaw')for(const tooth of model.userData.chainTeeth)tooth.position.z=tooth.userData.baseZ+((time*8)%1)*.065*chainsawBlend;
  model.userData.viewFlash.visible=flash&&!['knife','bow','chainsaw','laser','flame'].includes(weapon);if(weapon==='laser')for(const [i,ring]of model.userData.chargeRings.entries()){const lit=firing&&i<=Math.min(4,Math.floor(laserHeat+1e-7));ring.material.color.setHex(lit?0xff7398:0x37424c);ring.material.emissiveIntensity=lit?2.5:.08;}if(weapon==='rapid')model.userData.rotor.rotation.z=time*(firing?45:0);avatar.root.updateMatrixWorld(true);
 }
 function cameraPose(aimCamera,obstacles,targets=[]){
  camera.fov=aimCamera.fov;camera.aspect=aimCamera.aspect;camera.updateProjectionMatrix();const origin=aimCamera.position.clone(),forward=aimCamera.getWorldDirection(new THREE.Vector3()),aimRay=new THREE.Raycaster(origin,forward,0,90),hit=aimRay.intersectObjects([...obstacles,...targets],false)[0],aimPoint=origin.clone().addScaledVector(forward,hit?.distance??90),offset=v(1.05,.55,4.4).applyQuaternion(aimCamera.quaternion),distance=offset.length(),direction=offset.clone().normalize();
  let limit=distance;for(const side of[v(0,0,0),v(.2,0,0),v(-.2,0,0),v(0,.2,0),v(0,-.2,0)]){const ray=new THREE.Raycaster(origin.clone().add(side),direction,0,distance),wall=ray.intersectObjects(obstacles,false)[0];if(wall)limit=Math.min(limit,Math.max(.08,wall.distance-.25));}
  camera.position.copy(origin).addScaledVector(direction,limit);camera.lookAt(aimPoint);camera.updateMatrixWorld(true);return camera;
 }
 return {camera,models,pose,cameraPose};
}

import * as THREE from 'three';
import motionData from './weapon-motion-data.json' with {type:'json'};
// Baked arm joint positions and wrist rotations from the credited animation files.
// Head-relative sampling removes third-person root motion; gameplay owns the dash.
export function sampleWeaponMotion(name,phase){const clip=motionData[name],f=THREE.MathUtils.clamp(phase,0,1)*(clip.frames.length-1),i=Math.floor(f),j=Math.min(i+1,clip.frames.length-1),t=f-i;return clip.frames[i].map((a,k)=>({position:new THREE.Vector3(...a.slice(0,3)).lerp(new THREE.Vector3(...clip.frames[j][k].slice(0,3)),t),quaternion:new THREE.Quaternion(...a.slice(3)).slerp(new THREE.Quaternion(...clip.frames[j][k].slice(3)),t)}));}
export function createWeaponMotion(parent,models){
 const root=new THREE.Group();root.name='animated-weapon-arms';parent.add(root);
 const material=new THREE.MeshStandardMaterial({color:0x91aeba,metalness:.5,roughness:.45}),jointMaterial=new THREE.MeshStandardMaterial({color:0x152e3b,metalness:.3,roughness:.6}),arms=[];
 for(let side=0;side<2;side++){const parts=[];for(let i=0;i<2;i++){const mesh=new THREE.Mesh(new THREE.CylinderGeometry(i===0?.045:.038,i===0?.042:.045,1,8),material);root.add(mesh);parts.push(mesh);}const hand=new THREE.Mesh(new THREE.BoxGeometry(.08,.085,.12),jointMaterial);root.add(hand);arms.push({parts,hand});}
 const poses=sampleWeaponMotion('BowIdle',0),baseWrist=sampleWeaponMotion('Sword_Dash',0)[5].quaternion.clone().invert(),bladeRest=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,0,-1),new THREE.Vector3(.1,.9,-.4).normalize());
 let lastWeapon='',releaseAge=-1;
 function cancel(){releaseAge=-1;lastWeapon='';}
 function release(){releaseAge=0;}
 function update(dt,{weapon,bowDrawing=false,bowCharge=0,knifePhase=-1,ammo=0}){
  root.visible=weapon==='knife'||weapon==='bow';if(!root.visible){lastWeapon=weapon;return;}
  const changed=lastWeapon!==weapon;lastWeapon=weapon;let name,phase;
  if(weapon==='bow'){if(bowDrawing){releaseAge=-1;name=bowCharge>=2.2?'BowHold':'BowLoad';phase=bowCharge>=2.2?(bowCharge-2.2)%motionData.BowHold.duration/motionData.BowHold.duration:bowCharge/2.2;}else if(releaseAge>=0&&releaseAge<.65){name='BowRelease';phase=releaseAge/.65;releaseAge+=dt;}else{name='BowIdle';phase=0;}}
  else{releaseAge=-1;name='Sword_Dash';phase=knifePhase>=0?knifePhase:0;}
  const sampled=sampleWeaponMotion(name,phase),offset=weapon==='bow'?new THREE.Vector3(-.18,.03,-.75):new THREE.Vector3(.05,.12,-.85),blend=changed?1:1-Math.exp(-dt*35);
  for(let i=0;i<poses.length;i++){poses[i].position.lerp(sampled[i].position.clone().add(offset),blend);poses[i].quaternion.slerp(sampled[i].quaternion,blend);}
  for(let side=0;side<2;side++){const p=poses.slice(side*3,side*3+3),arm=arms[side];for(let i=0;i<2;i++){const delta=p[i+1].position.clone().sub(p[i].position),mesh=arm.parts[i];mesh.position.copy(p[i].position).add(p[i+1].position).multiplyScalar(.5);mesh.scale.y=delta.length()*.94;mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());}arm.hand.position.copy(p[2].position);arm.hand.quaternion.copy(p[2].quaternion);}
  const model=models[weapon];if(weapon==='knife'){model.position.copy(poses[5].position);model.quaternion.copy(poses[5].quaternion).multiply(baseWrist).multiply(bladeRest);}
  else{model.quaternion.identity();model.rotation.z=-.08;model.position.copy(poses[2].position).sub(new THREE.Vector3(0,0,-.43).multiplyScalar(.8).applyQuaternion(model.quaternion));model.updateMatrixWorld(true);const pull=model.worldToLocal(parent.localToWorld(poses[5].position.clone())),string=model.userData.string,positions=string.geometry.attributes.position;if(!bowDrawing)pull.set(0,0,.14);positions.setXYZ(1,pull.x,pull.y,pull.z);positions.needsUpdate=true;string.geometry.computeBoundingSphere();const arrow=model.userData.nockedArrow;arrow.visible=bowDrawing&&ammo>0;arrow.position.copy(pull).sub(new THREE.Vector3(0,0,.14));arrow.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,-1),new THREE.Vector3(0,0,-.43).sub(pull).normalize());for(const limb of model.userData.limbs)limb.rotation.x=limb.userData.side*Math.min(1,bowCharge/2.2)*.08;}
  root.userData.clip=name;root.userData.phase=phase;root.userData.weapon=weapon;
 }
 return {root,update,release,cancel,arms};
}

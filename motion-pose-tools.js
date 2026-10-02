import * as THREE from 'three';
import {armIK} from './sword-combat.js';
const v=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);
const world=o=>o.getWorldPosition(v());
const rotation=o=>o.getWorldQuaternion(new THREE.Quaternion());
export function soleLocal(foot){const mesh=foot.children.find(o=>o.isMesh);if(!mesh)return v(0,-.07,0);mesh.geometry.computeBoundingBox();const box=mesh.geometry.boundingBox;mesh.updateMatrix();return v((box.min.x+box.max.x)/2,box.min.y,(box.min.z+box.max.z)/2).applyMatrix4(mesh.matrix);}
export function footAnchors(avatar){avatar.root.updateMatrixWorld(true);return ['l','r'].map(side=>{const foot=avatar.bones.find(b=>b.name==='foot_'+side),local=soleLocal(foot),sole=foot.localToWorld(local.clone()),mesh=foot.children.find(o=>o.isMesh),forward=v(0,0,1).applyQuaternion(mesh?rotation(mesh):rotation(foot)),yaw=Math.atan2(forward.x,forward.z),q=new THREE.Quaternion().setFromAxisAngle(v(0,1,0),yaw);if(mesh)q.multiply(mesh.quaternion.clone().invert());sole.y=avatar.root.position.y;return {side,sole,q,local};});}
function setWorldPosition(object,point){object.position.copy(object.parent.worldToLocal(point.clone()));object.updateWorldMatrix(false,true);}
function setWorldRotation(object,q){object.quaternion.copy(rotation(object.parent).invert().multiply(q));object.updateWorldMatrix(false,true);}
export function plantFeet(avatar,anchors=footAnchors(avatar)){
 const bone=Object.fromEntries(avatar.bones.map(b=>[b.name,b]));
 // Bring the pelvis inside both leg reach spheres before solving knees.
 for(let iteration=0;iteration<8;iteration++)for(const anchor of anchors){const hip=bone['thigh_'+anchor.side],knee=bone['calf_'+anchor.side],foot=bone['foot_'+anchor.side],offset=anchor.local.clone().multiply(foot.getWorldScale(v())).applyQuaternion(anchor.q).negate(),target=anchor.sole.clone().add(offset),a=world(hip),length=a.distanceTo(world(knee))+world(knee).distanceTo(world(foot)),delta=target.clone().sub(a);if(delta.length()>length*.985){const correction=delta.normalize().multiplyScalar(a.distanceTo(target)-length*.985);setWorldPosition(bone.pelvis,world(bone.pelvis).add(correction));}}
 for(const anchor of anchors){const hip=bone['thigh_'+anchor.side],knee=bone['calf_'+anchor.side],foot=bone['foot_'+anchor.side],target=anchor.sole.clone().sub(anchor.local.clone().multiply(foot.getWorldScale(v())).applyQuaternion(anchor.q)),pole=avatar.root.localToWorld(v(anchor.side==='l'?.2:-.2,.65,.65));armIK({shoulder:hip,elbow:knee,hand:foot},target,pole);setWorldRotation(foot,anchor.q);}
 avatar.root.updateMatrixWorld(true);
}
export function connectedEdit(avatar,model,part,before,{ground=true,follow=true,control=model}={}){
 const bones=Object.fromEntries(avatar.bones.map(b=>[b.name,b])),current=part==='$weapon'?model:bones[part],anchors=before.feet;
 avatar.root.updateMatrixWorld(true);
 const requestedMatrix=control.matrixWorld.clone(),requestedHand=world(current),requestedRotation=rotation(current);
 if(follow&&(part==='$weapon'||/^(hand|foot)_[lr]$/.test(part))){for(const b of avatar.bones){const state=before.pose[b.name];b.position.fromArray(state.p);b.quaternion.fromArray(state.q);b.scale.fromArray(state.s);}avatar.root.updateMatrixWorld(true);}
 if(follow&&part==='$weapon'){
  const delta=requestedMatrix.multiply(before.weapon.clone().invert()),targets=avatar.arms.map((arm,i)=>before.hands[i].p.clone().applyMatrix4(delta)),main=model.parent===avatar.arms[0].hand?0:1,shift=targets[main].clone().sub(before.hands[main].p);
  // Feet remain the anchors. More distant joints participate less than the hand.
  const torso=shift.clone();torso.clampLength(0,.22);setWorldPosition(bones.pelvis,world(bones.pelvis).add(torso.clone().multiplyScalar(.18)));
  const tilt=THREE.MathUtils.clamp(shift.z*.55,-.32,.32),twist=THREE.MathUtils.clamp(-shift.x*.65,-.4,.4);for(const [n,w]of [['spine_01',.2],['spine_02',.35],['spine_03',.45]]){bones[n].rotateX(tilt*w);bones[n].rotateY(twist*w);}avatar.root.updateMatrixWorld(true);
  for(const i of model.userData.editorWeapon==='knife'?[main]:[0,1]){const arm=avatar.arms[i],pole=before.hands[i].elbow.clone();armIK(arm,targets[i],pole);setWorldRotation(arm.hand,new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().extractRotation(delta)).multiply(before.hands[i].q));}
  // Keep the attachment transform fixed; moving the weapon now moves its grip hand.
  model.position.copy(before.modelLocal.p);model.quaternion.copy(before.modelLocal.q);model.scale.copy(before.modelLocal.s).multiply(control.scale.clone().divide(before.local.s));
 }else if(follow&&/^(hand|foot)_[lr]$/.test(part)){
  const i=part.endsWith('l')?0:1,target=requestedHand,q=requestedRotation;current.position.copy(before.local.p);avatar.root.updateMatrixWorld(true);const leg=part.startsWith('foot_'),side=i===0?'l':'r';armIK(leg?{shoulder:bones['thigh_'+side],elbow:bones['calf_'+side],hand:current}:avatar.arms[i],target,leg?avatar.root.localToWorld(v(i===0?.2:-.2,.65,.65)):before.hands[i].elbow);setWorldRotation(current,q);
 }
 if(ground)plantFeet(avatar,/^foot_[lr]$/.test(part)?footAnchors(avatar):anchors);
 avatar.root.updateMatrixWorld(true);
}
export function editReference(avatar,model,object){avatar.root.updateMatrixWorld(true);return {pose:Object.fromEntries(avatar.bones.map(b=>[b.name,{p:b.position.toArray(),q:b.quaternion.toArray(),s:b.scale.toArray()}])),feet:footAnchors(avatar),weapon:model.matrixWorld.clone(),hands:avatar.arms.map(a=>({p:world(a.hand),q:rotation(a.hand),elbow:world(a.elbow)})),modelLocal:{p:model.position.clone(),q:model.quaternion.clone(),s:model.scale.clone()},local:{p:object.position.clone(),q:object.quaternion.clone(),s:object.scale.clone()}};}

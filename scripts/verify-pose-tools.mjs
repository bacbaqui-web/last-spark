import assert from 'node:assert/strict';
import * as T from 'three';
import {createRobot} from '../robot.js';
import {createThirdPersonView} from '../third-person.js';
import {actionState} from '../motion-settings.js';
import {plantFeet,footAnchors,soleLocal,editReference,connectedEdit} from '../motion-pose-tools.js';
const r=createRobot(),view=createThirdPersonView(r,['knife','bow']);
view.pose(actionState('knife','idle',0));const bone=n=>r.bones.find(b=>b.name===n),world=b=>b.getWorldPosition(new T.Vector3());
const anchors=footAnchors(r);plantFeet(r,anchors);for(const a of anchors){const sole=bone('foot_'+a.side).localToWorld(soleLocal(bone('foot_'+a.side)));assert(sole.distanceTo(a.sole)<.015,'sole remains anchored at floor');}
for(const side of ['l','r']){const mesh=bone('foot_'+side).children.find(o=>o.isMesh),box=new T.Box3().setFromObject(mesh);assert(Math.abs(box.min.y)<.015,'actual foot armor bottom touches floor');}
const original=world(bone('spine_03'));bone('spine_03').rotateZ(.3);plantFeet(r,anchors);for(const a of anchors)assert(bone('foot_'+a.side).localToWorld(soleLocal(bone('foot_'+a.side))).distanceTo(a.sole)<.015);
const model=view.models.knife;model.userData.editorWeapon='knife';const proxy=new T.Object3D();r.motion.add(proxy);proxy.position.copy(r.motion.worldToLocal(world(model)));proxy.quaternion.copy(r.motion.getWorldQuaternion(new T.Quaternion()).invert().multiply(model.getWorldQuaternion(new T.Quaternion())));proxy.scale.copy(model.getWorldScale(new T.Vector3()).divide(r.motion.getWorldScale(new T.Vector3())));r.root.updateMatrixWorld(true);
const before=editReference(r,model,proxy),hand=world(r.arms[1].hand);proxy.position.y+=.1;proxy.updateWorldMatrix(true,true);connectedEdit(r,model,'$weapon',before,{control:proxy});assert(world(r.arms[1].hand).y>hand.y+.06,'moving weapon moves grip hand');assert(model.position.distanceTo(before.modelLocal.p)<1e-8,'weapon remains attached at its grip');for(const a of before.feet)assert(bone('foot_'+a.side).localToWorld(soleLocal(bone('foot_'+a.side))).distanceTo(a.sole)<.015,'weapon follow keeps soles anchored');
const first=bone('spine_03').quaternion.clone();connectedEdit(r,model,'$weapon',before,{control:proxy});assert(first.angleTo(bone('spine_03').quaternion)<1e-6,'repeated drag solve does not accumulate torso twist');
const ref=editReference(r,model,bone('hand_l')),left=world(bone('hand_l'));bone('hand_l').position.x+=.05;connectedEdit(r,model,'hand_l',ref);assert(world(bone('hand_l')).distanceTo(left)>.02);assert(bone('hand_l').position.distanceTo(ref.local.p)<1e-8,'hand translation bends arm instead of separating wrist');
for(const b of r.bones)assert([...b.position.toArray(),...b.quaternion.toArray()].every(Number.isFinite));
console.log('PASS: sole grounding/anchor preservation, weapon-to-hand/body follow, fixed grip, stable repeated drag, hand IK');

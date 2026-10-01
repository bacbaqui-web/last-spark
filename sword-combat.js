import * as THREE from 'three';
const v=(x,y,z)=>new THREE.Vector3(x,y,z);
const poses={
 idle:{grip:v(-.12,1.48,.32),dir:v(-.12,.88,.46)},
 right:{grip:v(-.20,1.63,.22),dir:v(-.92,.38,.14)},
 left:{grip:v(.12,1.37,.35),dir:v(.96,-.12,.26)},
 back:{grip:v(.12,1.62,.23),dir:v(.92,.28,.1)},
 cut:{grip:v(-.18,1.38,.37),dir:v(-.96,-.10,.28)},
 spin:{grip:v(-.1,1.47,.35),dir:v(-.92,.08,.38)}
};
function rotateSegment(bone,end,target){const origin=bone.getWorldPosition(new THREE.Vector3()),current=end.getWorldPosition(new THREE.Vector3()).sub(origin).normalize(),wanted=target.clone().sub(origin).normalize();const rotation=new THREE.Quaternion().setFromUnitVectors(current,wanted).multiply(bone.getWorldQuaternion(new THREE.Quaternion()).normalize());bone.quaternion.copy(bone.parent.getWorldQuaternion(new THREE.Quaternion()).normalize().invert().multiply(rotation));bone.updateWorldMatrix(false,true);}
function armIK(arm,target,pole){const a=arm.shoulder.getWorldPosition(new THREE.Vector3()),b=arm.elbow.getWorldPosition(new THREE.Vector3()),c=arm.hand.getWorldPosition(new THREE.Vector3()),l1=a.distanceTo(b),l2=b.distanceTo(c),delta=target.clone().sub(a),distance=THREE.MathUtils.clamp(delta.length(),.04,(l1+l2)*.995),axis=delta.normalize(),along=(l1*l1-l2*l2+distance*distance)/(2*distance);const bend=pole.clone().sub(a);bend.addScaledVector(axis,-bend.dot(axis)).normalize();const elbow=a.clone().addScaledVector(axis,along).addScaledVector(bend,Math.sqrt(Math.max(0,l1*l1-along*along)));rotateSegment(arm.shoulder,arm.elbow,elbow);rotateSegment(arm.elbow,arm.hand,a.clone().addScaledVector(axis,distance));}
export function poseSword(r,sword,combo,progress,attacking){
 let from=poses.idle,to=poses.idle,t=0;if(attacking){const elapsed=r.swordElapsed??progress*.5,wind=combo===2?poses.back:combo===3?poses.back:poses.right,end=combo===2?poses.cut:combo===3?poses.spin:poses.left;from=to=elapsed<2/60?wind:end;}
 t=THREE.MathUtils.smoothstep(t,0,1);const grip=from.grip.clone().lerp(to.grip,t),q1=new THREE.Quaternion().setFromUnitVectors(v(0,1,0),from.dir.clone().normalize()),q2=new THREE.Quaternion().setFromUnitVectors(v(0,1,0),to.dir.clone().normalize()),localQ=q1.slerp(q2,t),bladeDir=v(0,1,0).applyQuaternion(localQ);
 r.root.updateMatrixWorld(true);const hand=r.arms[1].hand,rightTarget=r.root.localToWorld(grip.clone().addScaledVector(bladeDir,-.085)),leftTarget=r.root.localToWorld(grip.clone().addScaledVector(bladeDir,-.19));armIK(r.arms[1],rightTarget,r.root.localToWorld(v(-.8,1.15,.05)));armIK(r.arms[0],leftTarget,r.root.localToWorld(v(.8,1.15,.05)));
 const worldQ=r.root.getWorldQuaternion(new THREE.Quaternion()).normalize().multiply(localQ);hand.quaternion.copy(hand.parent.getWorldQuaternion(new THREE.Quaternion()).normalize().invert().multiply(worldQ));hand.updateWorldMatrix(false,true);sword.position.set(0,.085,0);sword.quaternion.identity();
 // Both wrists follow the hilt, instead of holding the blade or a world-aligned rod.
 const left=r.arms[0].hand;left.quaternion.copy(left.parent.getWorldQuaternion(new THREE.Quaternion()).normalize().invert().multiply(worldQ));left.updateWorldMatrix(false,true);r.root.updateMatrixWorld(true);
}

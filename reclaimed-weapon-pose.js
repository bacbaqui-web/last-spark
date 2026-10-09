import * as T from 'three';
import {armIK} from './sword-combat.js';
const V=(...v)=>new T.Vector3(...v),Q=()=>new T.Quaternion();
const fingers=['index','middle','ring','pinky'];
// Contact coordinates use the visible palm frame, not the imported wrist axes.
// X is palm thickness, -Y runs toward the knuckles and Z spans the fingers.
export const GUN_GRIPS={
 chainsaw:{left:'over',depth:.034,reach:.083,curl:.85},
 pistol:{left:'under',depth:.044,reach:.082,curl:.68},
 shotgun:{left:'under',depth:.049,reach:.094,curl:.57},
 sniper:{left:'under',depth:.043,reach:.083,curl:.67},
 rapid:{left:'over',depth:.039,reach:.105,curl:.91},
 flame:{left:'under',depth:.044,reach:.082,curl:.68},
 laser:{left:'under',depth:.044,reach:.082,curl:.68},
 rail:{left:'under',depth:.044,reach:.082,curl:.68},
 rocket:{left:'vertical',depth:.040,reach:.080,curl:.77},
};
const basis=(x,y,z)=>Q().setFromRotationMatrix(new T.Matrix4().makeBasis(V(...x),V(...y),V(...z)));
const frames={vertical:basis([-1,0,0],[0,0,1],[0,1,0]),under:basis([0,-1,0],[-1,0,0],[0,0,-1]),over:basis([0,1,0],[0,0,1],[1,0,0])};
function orient(bone,world){bone.quaternion.copy(bone.parent.getWorldQuaternion(Q()).invert().multiply(world));bone.updateWorldMatrix(false,true);}
function pointBone(bone,end,direction){const from=bone.getWorldPosition(V(0,0,0)),current=end.getWorldPosition(V(0,0,0)).sub(from).normalize();orient(bone,Q().setFromUnitVectors(current,direction).multiply(bone.getWorldQuaternion(Q())));}

export function createReclaimedWeaponPose(robot){
 if(!robot.salvageFrame)return null;
 const bones=Object.fromEntries(robot.bones.map(b=>[b.name,b])),anchors=robot.salvageFrame.anchors;
 const saved=robot.bones.map(b=>({b,p:b.position.clone(),q:b.quaternion.clone(),s:b.scale.clone()}));
 robot.skeleton.pose();robot.root.updateMatrixWorld(true);
 const pelvisRestHeight=robot.root.worldToLocal(bones.pelvis.getWorldPosition(V())).y;
 const pelvisRestQ=robot.root.getWorldQuaternion(Q()).invert().multiply(bones.pelvis.getWorldQuaternion(Q()));
 const bind=new Map(robot.bones.map(b=>[b.name,{p:b.position.clone(),q:b.quaternion.clone()}]));
 for(const {b,p,q,s}of saved){b.position.copy(p);b.quaternion.copy(q);b.scale.copy(s);}robot.root.updateMatrixWorld(true);
 const torso=['spine_01','spine_02','spine_03'];
 function stabilize(state){
  const rootQ=robot.root.getWorldQuaternion(Q()),phase=(state.motionPreview?.phase??robot.root.userData.stridePhase??0)*Math.PI*2;
  const moving=(state.speed||0)>.2,running=state.motionStudy==='sprint'||(!state.motionStudy&&robot.root.userData.sourceSprint&&moving);
  // Sprint contacts occur at the start of each half stride. Compress quickly,
  // then release over several frames instead of adding another airborne hop.
  const step=((phase/Math.PI)%1+1)%1,impact=running?Math.exp(-Math.pow((step-.10)/.11,2)):0;
  const crouched=['crouch','crouchWalk'].includes(state.motionStudy);
  const lean=state.weapon==='rapid'?-.18:crouched?(moving?.24:.20):running?.26+impact*.045:moving?.035:0,sway=moving?Math.sin(phase)*.004:0;
  robot.root.userData.runImpact=impact;
  // Reduce hip sway in character space, then solve the legs back onto their
  // authored ankle paths so a steadier pelvis does not drag planted feet.
  const feet=['l','r'].map(side=>({hip:bones['thigh_'+side],knee:bones['calf_'+side],foot:bones['foot_'+side],
   target:bones['foot_'+side].getWorldPosition(V()),rotation:bones['foot_'+side].getWorldQuaternion(Q()),pole:bones['calf_'+side].getWorldPosition(V())}));
  const pelvis=bones.pelvis,pelvisLocal=robot.root.worldToLocal(pelvis.getWorldPosition(V()));
  if(running)pelvisLocal.y=pelvisRestHeight+(pelvisLocal.y-pelvisRestHeight)*.55-.060*impact-.025;
  pelvisLocal.x*=.15;pelvis.position.copy(pelvis.parent.worldToLocal(robot.root.localToWorld(pelvisLocal)));
  const delta=rootQ.clone().invert().multiply(pelvis.getWorldQuaternion(Q())).multiply(pelvisRestQ.clone().invert());
  const hipAngles=new T.Euler().setFromQuaternion(delta,'YXZ');hipAngles.y*=.18;hipAngles.z*=.12;
  orient(pelvis,rootQ.clone().multiply(Q().setFromEuler(hipAngles)).multiply(pelvisRestQ));
  for(const f of feet){armIK({shoulder:f.hip,elbow:f.knee,hand:f.foot},f.target,f.pole,.9999);orient(f.foot,f.rotation);}
  robot.root.userData.gaitFootTargets=feet.map(f=>f.target.toArray());
  for(const name of [...torso,'neck_01','Head','clavicle_l','clavicle_r']){
   bones[name].position.copy(bind.get(name).p);bones[name].quaternion.copy(bind.get(name).q);
  }
  robot.root.updateMatrixWorld(true);
  // Pelvis and feet retain the authored gait. A small waist counter-shift keeps
  // the supported upper body centered without flattening the leg animation.
  const waist=bones.spine_01,target=robot.root.worldToLocal(waist.getWorldPosition(V(0,0,0)));
  target.x*=.13;robot.root.localToWorld(target);waist.position.copy(waist.parent.worldToLocal(target));waist.updateWorldMatrix(false,true);
  for(const name of torso){
   const pitch=lean-(state.pitch||0)*(name==='spine_01'?.08:name==='spine_02'?.16:.25);
   const desired=rootQ.clone().multiply(Q().setFromEuler(new T.Euler(pitch,(state.weapon==='rapid'?-Math.PI/4:['pistol','rifle','shotgun','sniper','laser'].includes(state.weapon)?-Math.PI/12*(state.weaponReady||0):0)+sway*.6,sway*.3,'YXZ')));
   orient(bones[name],desired.multiply(anchors[name].quaternion.clone().invert()));
  }
  robot.lookForward?.(state.pitch||0);robot.root.userData.upperBodyStabilized=true;
 }
 function curlHand(side,style,grip){
  const sign=side==='r'?1:-1,anchor=anchors['hand_'+side],rotation=anchor.getWorldQuaternion(Q());
  for(const finger of ['thumb',...fingers])for(let segment=1;segment<=3;segment++)bones[`${finger}_0${segment}_${side}`].quaternion.copy(bind.get(`${finger}_0${segment}_${side}`).q);
  robot.arms[side==='l'?0:1].hand.updateWorldMatrix(false,true);
  for(const [index,finger]of fingers.entries()){
   // Trigger finger follows the guard; the other three wrap the grip. A wider
   // pump fore-end uses a shallower curl than a narrow carrying handle.
   const first=(side==='r'&&finger==='index'?.83:grip.curl)+(index-1)*.035;
   const angles=style==='over'?[first,first+1.30,first+2.70]:[first,first+1.08,first+1.88];
   for(let segment=1;segment<=3;segment++){
    const b=bones[`${finger}_0${segment}_${side}`],end=bones[`${finger}_${segment===3?'04_leaf':'0'+(segment+1)}_${side}`];
    pointBone(b,end,V(sign*Math.sin(angles[segment-1]),-Math.cos(angles[segment-1]),0).applyQuaternion(rotation).normalize());
   }
  }
  const thumbDirections=style==='over'?[[sign*.45,-.80,.15],[sign*.30,-.50,-.80],[-sign*.60,-.40,-.60]]:[[sign*.62,-.68,.12],[sign*.65,-.68,-.30],[-sign*.08,-.88,-.46]];
  for(let segment=1;segment<=3;segment++){
   const b=bones[`thumb_0${segment}_${side}`],end=bones[`thumb_${segment===3?'04_leaf':'0'+(segment+1)}_${side}`];
   pointBone(b,end,V(...thumbDirections[segment-1]).normalize().applyQuaternion(rotation));
  }
 }
 function pose(model,state,aim){
  const type=state.weapon==='rifle'?'pistol':state.weapon,config=GUN_GRIPS[type],heavy=['rapid','flame','rail','chainsaw'].includes(type);
  const heading=Q().setFromEuler(new T.Euler(state.pitch||0,state.yaw,0,'YXZ'));
  const gunQ=heading.clone().multiply(Q().setFromEuler(new T.Euler((type==='rocket'?-.14:type==='rapid'?-.06:heavy?-.12:-.25)*(1-aim),type==='rapid'?-.18:(type==='rocket'?0:heavy?.35:.52)*(1-aim),type==='rapid'?Math.PI/4:0)));
  const chest=anchors.spine_03.getWorldPosition(V(0,0,0)),scale=model.getWorldScale(V(0,0,0)).x;
  const trigger=V(...model.userData.triggerGrip),support=V(...model.userData.supportGrip);
  if(config.left==='under')support.x=0;
  if(type==='sniper')support.z=-.20;
  if(type==='shotgun')support.z=-.235;
  if(type==='flame')support.z=-.135;
  if(type==='rail')support.z=-.13;
  const grip=chest.clone().add(V(type==='rapid'?.19:.115,type==='rapid'?-.27:heavy?-.25:-.20,type==='rapid'?-.06:heavy?-.16:-.20).applyQuaternion(heading));
  let origin=grip.sub(trigger.clone().multiplyScalar(scale).applyQuaternion(gunQ));
  if(model.userData.shoulderMount){
   const shoulder=robot.arms[1].shoulder.getWorldPosition(V(0,0,0));
   shoulder.add((type==='rocket'?V(.035,.045,.035):V(-.025,-.045,-.025)).applyQuaternion(heading));
   const mounted=shoulder.sub(V(...model.userData.shoulderMount).multiplyScalar(scale).applyQuaternion(gunQ));
   origin.lerp(mounted,type==='rocket'?1:aim);
  }
  if(type==='rocket'&&(state.adsBlend||0)>0){
   // Keep the tube on the shoulder; bring the right eye to the rear eyecup.
   const ocular=V(...model.userData.scopeEye).multiplyScalar(scale).applyQuaternion(gunQ).add(origin).add(V(0,0,model.userData.eyeRelief||.025).applyQuaternion(gunQ));
   const eye=anchors.Head.localToWorld(V(-.049,-.004,.075));
   const shift=ocular.sub(eye).multiplyScalar(state.adsBlend),head=bones.Head;
   head.position.copy(head.parent.worldToLocal(head.getWorldPosition(V()).add(shift)));head.updateWorldMatrix(false,true);
  }
  const contacts={right:{point:[type==='rapid'?.051:.040,-.083,0],grip:trigger.toArray(),style:model.userData.triggerGripStyle||'vertical',curl:.69},left:{point:[-config.depth,-config.reach,0],grip:support.toArray(),style:config.left,curl:config.curl}};
  let supportPalmQ=null;
  if(type==='rapid'){
   const arm=robot.arms[0],shoulder=arm.shoulder.getWorldPosition(V()),elbow=arm.elbow.getWorldPosition(V()),wrist=arm.hand.getWorldPosition(V());
   const length=shoulder.distanceTo(elbow)+elbow.distanceTo(wrist);
   const handleAxis=V(1,0,0).applyQuaternion(gunQ).normalize();
   const desired=V(...contacts.left.grip).multiplyScalar(scale).applyQuaternion(gunQ).add(origin).sub(shoulder);
   desired.addScaledVector(handleAxis,-desired.dot(handleAxis)).normalize();
   const palmY=desired.clone().negate(),palmX=palmY.clone().cross(handleAxis).normalize();
   supportPalmQ=Q().setFromRotationMatrix(new T.Matrix4().makeBasis(palmX,palmY,handleAxis));
   const straightWrist=shoulder.clone().addScaledVector(desired,length*.998);
   const contactOffset=V(...contacts.left.point).multiplyScalar(anchors.hand_l.getWorldScale(V()).x).applyQuaternion(supportPalmQ);
   origin.copy(straightWrist).add(contactOffset).sub(support.clone().multiplyScalar(scale).applyQuaternion(gunQ));
  }
  // Solve wrists outside the physical handles. The local palm contact—not the
  // wrist pivot—is placed on the requested gun anchor.
  for(const [i,side,key]of [[1,'r','right'],[0,'l','left']]){
   const hand=robot.arms[i].hand,anchor=anchors['hand_'+side],contact=contacts[key];
   const palmQ=(key==='left'&&supportPalmQ?supportPalmQ.clone():gunQ.clone().multiply(Q().setFromAxisAngle(V(0,0,1),key==='right'?(model.userData.triggerGripRoll||0):0)).multiply(frames[contact.style])),palmScale=anchor.getWorldScale(V(0,0,0)).x;
   const target=V(...contact.grip).multiplyScalar(scale).applyQuaternion(gunQ).add(origin).sub(V(...contact.point).multiplyScalar(palmScale).applyQuaternion(palmQ));
   const pole=robot.arms[i].shoulder.getWorldPosition(V(0,0,0)).add(V(side==='r'?.20:-.20,-.30,.12).applyQuaternion(heading));
   armIK(robot.arms[i],target,pole,type==='rapid'&&side==='l'?.998:.995);
   orient(hand,palmQ.multiply(anchor.quaternion.clone().invert()));
  }
  const hand=robot.arms[1].hand;
  model.position.copy(hand.worldToLocal(origin.clone()));model.quaternion.copy(hand.getWorldQuaternion(Q()).invert().multiply(gunQ));model.updateWorldMatrix(true,true);
  curlHand('r',contacts.right.style,contacts.right);curlHand('l',config.left,contacts.left);
  model.userData.handContacts=contacts;model.userData.gripRotation=model.quaternion.clone();model.userData.gripPosition=model.position.clone();
  robot.root.updateMatrixWorld(true);
 }
 function fitKnife(model,state){
  const heading=Q().setFromEuler(new T.Euler(state.pitch||0,state.yaw,0,'YXZ'));
  const attacking=(state.knifePhase??-1)>=0;
  const worldQ=attacking?model.getWorldQuaternion(Q()):heading.clone().multiply(Q().setFromEuler(new T.Euler(state.knifeGuard?1.1:.85,0,-.12)));
  const scale=model.getWorldScale(V()).x;
  const contact=attacking?model.localToWorld(V(...model.userData.triggerGrip)):anchors.spine_03.getWorldPosition(V()).add(V(0,state.knifeGuard?-.18:-.29,-.34).applyQuaternion(heading));
  const origin=contact.sub(V(...model.userData.triggerGrip).multiplyScalar(scale).applyQuaternion(worldQ));
  const contacts={};
  for(const [i,side,key]of [[1,'r','right'],[0,'l','left']]){
   const anchor=anchors['hand_'+side],hand=robot.arms[i].hand;
   const frame=side==='r'?basis([0,1,0],[1,0,0],[0,0,-1]):basis([0,-1,0],[-1,0,0],[0,0,-1]);
   const palmQ=worldQ.clone().multiply(frame),point=[side==='r'?.033:-.033,-.08,0],grip=side==='r'?model.userData.triggerGrip:model.userData.supportGrip;
   const target=V(...grip).multiplyScalar(scale).applyQuaternion(worldQ).add(origin).sub(V(...point).multiplyScalar(anchor.getWorldScale(V()).x).applyQuaternion(palmQ));
   const pole=robot.arms[i].shoulder.getWorldPosition(V()).add(V(side==='r'?.22:-.22,-.32,.08).applyQuaternion(heading));
   armIK(robot.arms[i],target,pole,.995);orient(hand,palmQ.multiply(anchor.quaternion.clone().invert()));
   contacts[key]={point,grip,style:'under',curl:.9};curlHand(side,'under',contacts[key]);
  }
  model.position.copy(model.parent.worldToLocal(origin));model.quaternion.copy(model.parent.getWorldQuaternion(Q()).invert().multiply(worldQ));
  model.userData.handContacts=contacts;robot.root.updateMatrixWorld(true);
 }
 function fitBow(model,state){
  const draw=!!state.bowDrawing,heading=Q().setFromEuler(new T.Euler(draw?(state.pitch||0):0,state.yaw,0,'YXZ'));
  const worldQ=heading.clone().multiply(Q().setFromEuler(new T.Euler(draw?0:-.16,0,draw?0:Math.PI/2)));
  const left=robot.arms[0],shoulder=left.shoulder.getWorldPosition(V()),elbow=left.elbow.getWorldPosition(V()),wrist=left.hand.getWorldPosition(V());
  const length=shoulder.distanceTo(elbow)+elbow.distanceTo(wrist);
  const direction=(draw?V(.31,0,-1):V(.45,-.8,-.6)).normalize().applyQuaternion(heading);
  const palmY=direction.clone().negate();
  const dorsal=V(0,1,0).addScaledVector(palmY,-palmY.y).normalize();
  const span=dorsal.clone().cross(palmY).normalize();
  const leftQ=draw?worldQ.clone().multiply(basis([1,0,0],[0,0,-1],[0,1,0])):Q().setFromRotationMatrix(new T.Matrix4().makeBasis(dorsal,palmY,span));
  const leftPoint=[-.033,-.08,0],leftAnchor=anchors.hand_l;
  const target=shoulder.clone().addScaledVector(direction,length*.997);
  armIK(left,target,shoulder.clone().add(V(-.3,-.2,.1).applyQuaternion(heading)),.997);
  orient(left.hand,leftQ.clone().multiply(leftAnchor.quaternion.clone().invert()));
  const scale=model.getWorldScale(V()).x,origin=leftAnchor.localToWorld(V(...leftPoint)).sub(V(...model.userData.triggerGrip).multiplyScalar(scale).applyQuaternion(worldQ));
  model.position.copy(model.parent.worldToLocal(origin.clone()));model.quaternion.copy(model.parent.getWorldQuaternion(Q()).invert().multiply(worldQ));model.updateWorldMatrix(true,true);
  const pull=V(0,0,draw?-.22+.72*Math.min(1,(state.bowCharge||0)/2.2):-.22);
  const right=robot.arms[1],rightAnchor=anchors.hand_r,rightPoint=[.017,-.08,0];
  const rightQ=heading.clone().multiply(draw?frames.vertical:basis([0,-1,0],[0,0,1],[-1,0,0]));
  const rightTarget=model.localToWorld(pull.clone()).sub(V(...rightPoint).multiplyScalar(rightAnchor.getWorldScale(V()).x).applyQuaternion(rightQ));
  armIK(right,rightTarget,right.shoulder.getWorldPosition(V()).add(V(.3,-.05,.3).applyQuaternion(heading)),.995);
  orient(right.hand,rightQ.multiply(rightAnchor.quaternion.clone().invert()));
  const actualPull=model.worldToLocal(rightAnchor.localToWorld(V(...rightPoint)));
  const positions=model.userData.string.geometry.attributes.position;
  // Undrawn string lies exactly between its limb tips; no resting draw offset.
  const stringPoint=draw?actualPull:pull;positions.setXYZ(1,...stringPoint.toArray());positions.needsUpdate=true;model.userData.string.geometry.computeBoundingSphere();
  model.userData.nockedArrow.visible=draw;model.userData.nockedArrow.position.copy(stringPoint).sub(V(0,0,.14));
  model.userData.handContacts={left:{point:leftPoint,grip:model.userData.triggerGrip,style:'vertical',curl:.85},right:{point:rightPoint,grip:stringPoint.toArray(),style:draw?'vertical':'over',curl:.6}};
  curlHand('l','vertical',model.userData.handContacts.left);curlHand('r',draw?'vertical':'over',model.userData.handContacts.right);robot.root.updateMatrixWorld(true);
 }
 function fitUtility(model,state){
  if(state.weapon==='bow'){fitBow(model,state);return;}

  if(state.weapon==='knife'){fitKnife(model,state);return;}

  const bow=state.weapon==='bow',knife=state.weapon==='knife',mainSide=bow?'l':'r',mainIndex=bow?0:1;
  const worldQ=model.getWorldQuaternion(Q()),scale=model.getWorldScale(V()).x;
  const style=bow?'vertical':'over',main=robot.arms[mainIndex].hand,anchor=anchors['hand_'+mainSide];
  const palmQ=worldQ.clone().multiply(frames[style]);
  orient(main,palmQ.clone().multiply(anchor.quaternion.clone().invert()));
  const mainPoint=[mainSide==='l'?-.033:.033,-.083,0];
  const origin=anchor.localToWorld(V(...mainPoint)).sub(V(...model.userData.triggerGrip).multiplyScalar(scale).applyQuaternion(worldQ));
  model.position.copy(model.parent.worldToLocal(origin.clone()));model.quaternion.copy(model.parent.getWorldQuaternion(Q()).invert().multiply(worldQ));model.updateWorldMatrix(true,true);
  const contacts={[bow?'left':'right']:{point:mainPoint,grip:model.userData.triggerGrip,style,curl:.85}};
  curlHand(mainSide,style,contacts[bow?'left':'right']);
  if(bow?state.bowDrawing:(!knife||state.knifeGuard)){
   const side=bow?'r':'l',index=bow?1:0,hand=robot.arms[index].hand,handAnchor=anchors['hand_'+side],handStyle=bow?'vertical':'over';
   let grip=bow?[0,0,state.bowDrawing?.14+.70*Math.min(1,(state.bowCharge||0)/2.2):.14]:model.userData.supportGrip;
   const point=[side==='l'?-.034:.023,-.083,0],q=worldQ.clone().multiply(frames[handStyle]);
   const target=model.localToWorld(V(...grip)).sub(V(...point).multiplyScalar(handAnchor.getWorldScale(V()).x).applyQuaternion(q));
   const heading=Q().setFromEuler(new T.Euler(0,state.yaw,0));
   const pole=robot.arms[index].shoulder.getWorldPosition(V()).add(V(side==='l'?-.25:.25,-.25,.12).applyQuaternion(heading));
   armIK(robot.arms[index],target,pole,.995);orient(hand,q.multiply(handAnchor.quaternion.clone().invert()));
   contacts[bow?'right':'left']={point,grip,style:handStyle,curl:bow?.65:.85};curlHand(side,handStyle,contacts[bow?'right':'left']);
   if(bow){
    const pull=state.bowDrawing?model.worldToLocal(handAnchor.localToWorld(V(...point))):V(0,0,.14);
    const positions=model.userData.string.geometry.attributes.position;positions.setXYZ(1,pull.x,pull.y,pull.z);positions.needsUpdate=true;model.userData.string.geometry.computeBoundingSphere();
    model.userData.nockedArrow.position.copy(pull).sub(V(0,0,.14));contacts.right.grip=pull.toArray();
   }
  }
  model.userData.handContacts=contacts;robot.root.updateMatrixWorld(true);
 }
 return {stabilize,pose,fitUtility};
}

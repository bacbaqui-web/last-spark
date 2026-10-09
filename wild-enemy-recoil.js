import {ConvexHull} from 'three/addons/math/ConvexHull.js';
import * as THREE from 'three';

const scratch=new THREE.Vector3();
export const WILD_RECOIL_SPEED=1.8;
// The surviving frame absorbs most of the impact, but never freezes in place.
const bodyResponse=.035,identity=new THREE.Quaternion(),up=new THREE.Vector3(0,1,0);
export const WILD_BODY_RELEASE=.75;
// The struck joint breaks away with any mechanically dependent limb below it.
export function wildRecoilBreakTime(depth){return (.14+depth/12)/WILD_RECOIL_SPEED;}

const step=1/120,deltaRotation=new THREE.Quaternion(),a=new THREE.Vector3(),b=new THREE.Vector3(),normal=new THREE.Vector3(),armA=new THREE.Vector3(),armB=new THREE.Vector3(),turnA=new THREE.Vector3(),turnB=new THREE.Vector3();
function turn(q,axis,amount){
  const length=axis.length();if(length<1e-8)return;
  deltaRotation.setFromAxisAngle(scratch.copy(axis).divideScalar(length),length*amount);q.premultiply(deltaRotation).normalize();
}

// Bake a short, fixed-step articulated response once per death. Rendering only
// interpolates the bake, so low frame rates and replay cannot change the result.
function simulate(recoil,hit,floor){
  const {parts,scale,source}=recoil;
  source.velocity.copy(hit.direction).multiplyScalar(12*scale*hit.strength);
  source.angular.crossVectors(hit.point.clone().sub(source.center),source.velocity).multiplyScalar(source.mass*source.invInertia);
  source.angular.clampLength(0,7);
  const end=.12;
  recoil.frames=[];recoil.step=step;
  const save=()=>recoil.frames.push(parts.map(p=>({position:p.position.clone(),rotation:p.rotation.clone()})));
  save();
  for(let time=step;time<=end+step;time+=step){
    for(const p of parts){
      p.previous.copy(p.position);p.previousRotation.copy(p.rotation);
      p.velocity.y-=6.6*step;p.velocity.multiplyScalar(Math.exp(-(p===source?.6:5)*step));
      p.position.addScaledVector(p.velocity,step);turn(p.rotation,p.angular,step);
    }
    for(let iteration=0;iteration<6;iteration++){
      for(const p of parts){
        const leader=p.leader;if(!leader||time>=Math.min(p.breakAt,leader.breakAt))continue;
        armA.copy(p.anchor).sub(leader.center).applyQuaternion(leader.rotation);
        armB.copy(p.anchor).sub(p.center).applyQuaternion(p.rotation);
        a.copy(leader.position).add(armA);b.copy(p.position).add(armB);normal.copy(b).sub(a);
        const gap=normal.length();if(gap<1e-7)continue;normal.divideScalar(gap);
        turnA.crossVectors(armA,normal);turnB.crossVectors(armB,normal);
        // The short impact pulse drives the struck part until separation.
        // Its neighbours respond through their own mass and joint leverage.
        const drive=leader===source?.02:1;
        const massA=leader.invMass*drive,inertiaA=leader.invInertia;
        const inverseMass=massA+p.invMass+inertiaA*turnA.lengthSq()+p.invInertia*turnB.lengthSq();
        const engagement=THREE.MathUtils.smoothstep(time,.009*p.depth,.009*p.depth+.042);
        const correction=gap*.72*engagement*engagement/(inverseMass+.25);
        leader.position.addScaledVector(normal,correction*massA);p.position.addScaledVector(normal,-correction*p.invMass);
        turn(leader.rotation,turnA,correction*inertiaA);turn(p.rotation,turnB,-correction*p.invInertia);
      }
      for(const p of parts){
        let bottom=Infinity;
        for(const corner of p.corners){scratch.copy(corner).applyQuaternion(p.rotation).add(p.position);bottom=Math.min(bottom,scratch.y);}
        if(bottom<floor){
          p.position.y+=floor-bottom;
          // Feet hold their ground until the impulse actually pulls them off it.
          const friction=.12/6;p.position.x=THREE.MathUtils.lerp(p.position.x,p.previous.x,friction);p.position.z=THREE.MathUtils.lerp(p.position.z,p.previous.z,friction);
        }
      }
    }
    for(const p of parts){
      p.velocity.copy(p.position).sub(p.previous).divideScalar(step);
      deltaRotation.copy(p.rotation).multiply(p.previousRotation.clone().invert());if(deltaRotation.w<0)deltaRotation.set(-deltaRotation.x,-deltaRotation.y,-deltaRotation.z,-deltaRotation.w);
      const sin=Math.hypot(deltaRotation.x,deltaRotation.y,deltaRotation.z);
      p.angular.set(deltaRotation.x,deltaRotation.y,deltaRotation.z).multiplyScalar(sin>1e-8?2*Math.atan2(sin,deltaRotation.w)/(sin*step):0).multiplyScalar(Math.exp(-2*step)).clampLength(0,7);
    }
    save();
  }
}

const supportHulls=new WeakMap();
function geometrySupport(geometry){
 let points=supportHulls.get(geometry);if(points)return points;
 const vertices=Array.from({length:geometry.attributes.position.count},(_,i)=>new THREE.Vector3().fromBufferAttribute(geometry.attributes.position,i));
 const hull=new ConvexHull().setFromPoints(vertices),unique=new Set();for(const face of hull.faces){let edge=face.edge;do{unique.add(edge.head().point);edge=edge.next;}while(edge!==face.edge);}
 points=unique.size?[...unique]:vertices;supportHulls.set(geometry,points);return points;
}

export function createWildRecoil(r,hit,inverse,scale){
  const parts=r.hitMeshes.map(mesh=>{
    let joint=mesh.parent;if(joint.name.endsWith('_Mesh'))joint=joint.parent;
    mesh.geometry.computeBoundingBox();const matrix=inverse.clone().multiply(mesh.matrixWorld);
    const bounds=mesh.geometry.boundingBox,partCenter=bounds.getCenter(new THREE.Vector3()).applyMatrix4(matrix),size=bounds.getSize(new THREE.Vector3()).multiplyScalar(scale);
    const mass=THREE.MathUtils.clamp(.35+size.x*size.y*size.z/(scale**3)*2,.4,5),corners=[];
    for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z])corners.push(new THREE.Vector3(x,y,z).applyMatrix4(matrix).sub(partCenter));
    return {mesh,joint,matrix,center:partCenter,position:partCenter.clone(),previous:partCenter.clone(),previousRotation:new THREE.Quaternion(),velocity:new THREE.Vector3(),angular:new THREE.Vector3(),
      supportVertices:geometrySupport(mesh.geometry).map(point=>point.clone().applyMatrix4(matrix).sub(partCenter)),
      mass,invMass:1/mass,invInertia:3/(mass*(size.lengthSq()+.12*scale*scale)),corners,
      neighbours:[],leader:null,depth:-1,offset:new THREE.Vector3(),rotation:new THREE.Quaternion(),pieces:[]};
  });
  const byJoint=new Map(parts.map(part=>[part.joint,part])),byMesh=new Map(parts.map(part=>[part.mesh,part]));
  const body=byJoint.get(r.body)||parts[0];
  for(const part of parts){
    let ancestor=part.joint.parent;while(ancestor&&!byJoint.has(ancestor))ancestor=ancestor.parent;
    // The authored pelvis is a sibling of the torso, but physically connected.
    const parent=byJoint.get(ancestor)||(part!==body?body:null);if(!parent||parent===part)continue;
    const anchor=part.joint.getWorldPosition(new THREE.Vector3()).applyMatrix4(inverse);
    part.parentPart=parent;part.jointAnchor=anchor;
    part.neighbours.push({part:parent,anchor});parent.neighbours.push({part,anchor});
  }
  let source=hit?byMesh.get(hit.mesh):body,nearest=Infinity;
  if(!source)for(const part of parts){
    scratch.copy(hit.point).applyMatrix4(part.matrix.clone().invert());
    const distance=part.mesh.geometry.boundingBox.distanceToPoint(scratch)*scale+.015*part.center.distanceTo(hit.point);
    if(distance<nearest){nearest=distance;source=part;}
  }
  const under=(node,parent)=>{for(let p=node;p;p=p.parent)if(p===parent)return true;return false;};
  const pelvis=byJoint.get(r.nodes.Pelvis),leg=r.legs.find(l=>under(source.joint,l.hip));
  const arm=r.arms.find(a=>a.shoulder!==r.body&&under(source.joint,a.shoulder));
  const failure=!hit?'generic':source.joint===r.head?'head':source===body?'torso':source===pelvis?'pelvis':leg?'leg':arm?'arm':'other';
  const detached=new Set(hit&&failure!=='head'?[source]:[]);
  if(hit&&failure!=='head'&&source!==body)for(const part of parts)if(under(part.joint,source.joint))detached.add(part);
  const falling=new Set();
  for(const part of parts)if(!detached.has(part)){
    const lower=(pelvis&&under(part.joint,pelvis.joint))||r.legs.some(l=>under(part.joint,l.hip));
    if(failure==='pelvis'||failure==='torso'&&!lower)falling.add(part);
    part.supported=!falling.has(part)&&failure!=='leg';
  }
  for(const part of detached)part.supported=false;
  source.depth=0;source.anchor=source.joint.getWorldPosition(new THREE.Vector3()).applyMatrix4(inverse);
  const ordered=[source];
  for(let i=0;i<ordered.length;i++)for(const edge of ordered[i].neighbours){
    const next=edge.part;if(next.depth>=0)continue;
    next.depth=ordered[i].depth+1;next.leader=ordered[i];next.anchor=edge.anchor;ordered.push(next);
  }
  for(const part of ordered)part.breakAt=hit&&part===source?wildRecoilBreakTime(0):Infinity;
  const floor=r.wallMounted?-r.root.getWorldPosition(new THREE.Vector3()).y:0;
  const leanDirection=hit?.direction.clone().setY(0)||new THREE.Vector3(0,0,-1);
  // Removing a support leg tips toward that leg. Losing an arm unloads that
  // side, so the remaining mass slowly tips toward the opposite side.
  if(failure==='leg')leanDirection.copy(leg.hip.getWorldPosition(new THREE.Vector3()).applyMatrix4(inverse)).sub((pelvis||body).center).setY(0);
  if(failure==='arm')leanDirection.copy(body.center).sub(arm.shoulder.getWorldPosition(new THREE.Vector3()).applyMatrix4(inverse)).setY(0);
  if(leanDirection.lengthSq()<1e-6)leanDirection.set(0,0,-1);leanDirection.normalize();
  const pivot=body.center.clone();
  if(failure==='leg'){
    const remaining=r.legs.filter(l=>l!==leg);
    if(remaining.length){pivot.set(0,0,0);for(const l of remaining)pivot.add(l.foot.getWorldPosition(new THREE.Vector3()).applyMatrix4(inverse));pivot.divideScalar(remaining.length);}
  }
  pivot.y=r.wallMounted?body.center.y:floor;
  let supportFloor=floor;
  for(const part of parts)if(!detached.has(part)&&!falling.has(part))for(const corner of part.corners)supportFloor=Math.min(supportFloor,part.center.y+corner.y);
  const recoil={parts:ordered,byMesh,source,body,detached,falling,failure,leanDirection,direction:hit?.direction,strength:hit?.strength,scale,pivot,supportFloor,leanAxis:up.clone().cross(leanDirection)};
  if(failure==='head')recoil.sampleHeadDeath=r.captureHeadDeath();
  recoil.inverse=inverse.clone();
  recoil.headAxis=new THREE.Vector3(1,0,0).applyQuaternion(r.head.getWorldQuaternion(new THREE.Quaternion())).transformDirection(inverse);
  if(hit&&failure!=='head')simulate(recoil,hit,r.wallMounted?-r.root.getWorldPosition(new THREE.Vector3()).y:0);
  else {recoil.step=step;recoil.frames=[ordered.map(p=>({position:p.position.clone(),rotation:p.rotation.clone()}))];}
  poseWildRecoil(recoil,0);return recoil;
}

export function poseWildRecoil(recoil,time){
  if(recoil.failure==='head'){
    recoil.sampleHeadDeath(Math.max(0,time),recoil.parts,recoil.inverse);
    let bottom=Infinity;
    for(const part of recoil.parts)for(const corner of part.supportVertices){
      scratch.copy(corner).applyQuaternion(part.rotation).add(part.center).add(part.offset);
      bottom=Math.min(bottom,scratch.y);
    }
    if(bottom<recoil.supportFloor)for(const part of recoil.parts)part.offset.y+=recoil.supportFloor-bottom;
    return;
  }

  const age=Math.max(0,Math.min(time,WILD_BODY_RELEASE+.002));
  // A continuously increasing, very small lean replaces the frozen hold. The
  // sampled local reaction keeps the hit-side joints involved as support fails.
  const lean=new THREE.Quaternion().setFromAxisAngle(recoil.leanAxis,recoil.failure==='leg'?.12*age+2*age*age:.02*age+.12*age*age);
  let bottom=Infinity;
  recoil.parts.forEach((part,i)=>{
    const severed=recoil.detached.has(part),free=recoil.falling.has(part),clock=severed||free||recoil.failure==='leg'?time:age*.12/WILD_BODY_RELEASE;
    const frame=THREE.MathUtils.clamp(clock/recoil.step,0,recoil.frames.length-1),index=Math.floor(frame),blend=frame-index;
    const current=recoil.frames[index][i],next=recoil.frames[Math.min(index+1,recoil.frames.length-1)][i];
    part.offset.copy(current.position).lerp(next.position,blend).sub(part.center);part.rotation.copy(current.rotation).slerp(next.rotation,blend);
    if(!severed){
      part.offset.multiplyScalar(bodyResponse);part.rotation.slerp(identity,1-bodyResponse);
      if(!free){
        part.rotation.premultiply(lean);part.offset.add(part.center).sub(recoil.pivot).applyQuaternion(lean).add(recoil.pivot).sub(part.center);
        for(const corner of part.corners){scratch.copy(corner).applyQuaternion(part.rotation).add(part.center).add(part.offset);bottom=Math.min(bottom,scratch.y);}
      }
    }
  });
  // Rock on the existing support instead of driving the planted soles through
  // the floor. Never shift the robot root or reset its captured walking pose.
  if(bottom<recoil.supportFloor)for(const part of recoil.parts)if(!recoil.detached.has(part)&&!recoil.falling.has(part))part.offset.y+=recoil.supportFloor-bottom;
}

export function applyWildRecoil(target,origin,part){
  return target.copy(origin).sub(part.center).applyQuaternion(part.rotation).add(part.center).add(part.offset);
}

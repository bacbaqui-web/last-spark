import * as T from 'three';
import {salvageMetal} from './salvage-metal.js';
// Character-local curve, rebuilt from the actual pack outlet and gun feed port.
export function createMinigunAmmoBelt(avatar,pack){
 const root=new T.Group();root.name='minigun-ammo-belt';avatar.root.add(root);root.visible=false;
 const count=36,links=new T.InstancedMesh(new T.BoxGeometry(.074,.020,.035),salvageMetal('dark'),count);
 const rounds=new T.InstancedMesh(new T.CylinderGeometry(.009,.009,.083,6),new T.MeshStandardMaterial({color:0x95835a,metalness:.72,roughness:.65}),count);
 for(const m of[links,rounds]){m.frustumCulled=false;m.castShadow=true;root.add(m);}
 const dummy=new T.Object3D(),axis=new T.Vector3(0,0,1),cross=new T.Quaternion().setFromAxisAngle(new T.Vector3(0,0,1),Math.PI/2);
 function update(model,enabled,state={}){
  root.visible=enabled;if(!enabled)return;
  avatar.root.updateMatrixWorld(true);
  const start=root.worldToLocal(pack.localToWorld(new T.Vector3(-.208,-.033,0)));
  const end=root.worldToLocal(model.localToWorld(new T.Vector3(...model.userData.beltFeed)));
  // Gravity-shaped hanging span, with a small pendulum response to gait.
  // Absolute phase keeps frame seeking deterministic instead of accumulating drift.
  const moving=(state.speed||0)>.2;
  const phase=(state.motionPreview?.phase??avatar.root.userData.stridePhase??0)*Math.PI*2;
  const swing=moving?Math.sin(phase-.65)*.045:0;
  const droop=.27+(moving?Math.sin(phase*2-.8)*.018:0);
  const side=Math.min(start.x,end.x,-.36)-.065;
  const points=[];
  for(let i=0;i<=16;i++){
   const t=i/16,hanging=Math.sin(Math.PI*t),p=start.clone().lerp(end,t);
   p.x+=(side-p.x)*hanging+Math.sin(Math.PI*t)*swing*.45;
   p.y-=droop*4*t*(1-t);
   p.z+=swing*hanging;
   points.push(p);
  }
  const curve=new T.CatmullRomCurve3(points);
  root.userData.gravitySag=droop;root.userData.swing=swing;
  const length=curve.getLength();
  for(let i=0;i<count;i++){
   const t=i/(count-1);dummy.position.copy(curve.getPointAt(t));dummy.quaternion.setFromUnitVectors(axis,curve.getTangentAt(t));dummy.scale.set(1,1,length/(count-1)/.035*1.1);dummy.updateMatrix();links.setMatrixAt(i,dummy.matrix);
   dummy.quaternion.multiply(cross);dummy.scale.set(1,1,1);dummy.updateMatrix();rounds.setMatrixAt(i,dummy.matrix);
  }
  links.instanceMatrix.needsUpdate=rounds.instanceMatrix.needsUpdate=true;
  root.userData.endpoints=[start.toArray(),end.toArray()];
 }
 return {root,update};
}

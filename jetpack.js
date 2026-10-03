import * as THREE from 'three';
const v=(x,y,z)=>new THREE.Vector3(x,y,z);
// The thrusters follow the torso; exhaust lives in world space so it also appears in FPS.
export function createJetpack(avatar){
 const root=new THREE.Group();root.name='player-jetpack';avatar.root.add(root);
 const metal=new THREE.MeshStandardMaterial({color:0x35454b,metalness:.75,roughness:.4}),rim=new THREE.MeshStandardMaterial({color:0x81969b,metalness:.8,roughness:.3});
 const box=new THREE.Mesh(new THREE.BoxGeometry(.30,.42,.15),metal);box.position.z=-.12;root.add(box);
 const nozzles=[];for(const x of[-.30,.30]){const pod=new THREE.Mesh(new THREE.CapsuleGeometry(.10,.30,4,8),metal);pod.position.set(x,0,-.12);root.add(pod);const nozzle=new THREE.Mesh(new THREE.CylinderGeometry(.08,.11,.12,10),rim);nozzle.position.set(x,-.25,-.12);root.add(nozzle);nozzles.push(nozzle);}
 const exhaust=new THREE.Group();exhaust.name='jetpack-exhaust';avatar.root.parent?.add(exhaust);
 const flames=[];for(let i=0;i<2;i++){const group=new THREE.Group();exhaust.add(group);for(const [r,h,color]of[[.14,1.2,0xff741e],[.075,.86,0xffe99a],[.035,.45,0xb7edff]]){const mesh=new THREE.Mesh(new THREE.ConeGeometry(r,h,9),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.85,blending:THREE.AdditiveBlending,depthWrite:false}));mesh.position.y=h/2;group.add(mesh);}flames.push(group);}
 const light=new THREE.PointLight(0xff9c43,0,4);exhaust.add(light);
 function update({boostPhase=-1,jetJump=0,boostDirection=v(0,0,-1),time=0,weapon}){
  const torso=avatar.bones.find(b=>b.name==='spine_03');avatar.root.updateMatrixWorld(true);root.position.copy(avatar.root.worldToLocal(torso.getWorldPosition(new THREE.Vector3()))).add(v(0,.03,['rapid','flame'].includes(weapon)?-.53:-.28));root.quaternion.copy(avatar.root.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(torso.getWorldQuaternion(new THREE.Quaternion())));root.updateMatrixWorld(true);
  const active=boostPhase>=0&&boostPhase<1||jetJump>0;exhaust.visible=active;light.intensity=active?9:0;if(!active)return;
  const direction=jetJump>0?v(0,-1,0):boostDirection.clone().negate().add(v(0,-.22,0)).normalize();const pulse=1+.12*Math.sin(time*91),power=jetJump>0?Math.min(1,jetJump/.1):Math.min(1,(1-boostPhase)*5);
  for(let i=0;i<2;i++){flames[i].position.copy(nozzles[i].getWorldPosition(new THREE.Vector3()));flames[i].quaternion.setFromUnitVectors(v(0,1,0),direction);flames[i].scale.set(pulse,pulse*(.5+power),pulse);}
  light.position.copy(flames[0].position).addScaledVector(direction,.25);
 }
 return {root,exhaust,update};
}

import * as THREE from 'three';
const v=(x,y,z)=>new THREE.Vector3(x,y,z);
export function createHeavyEquipment(avatar,jetpack){
 const root=new THREE.Group();root.name='heavy-equipment';avatar.root.add(root);
 const olive=new THREE.MeshStandardMaterial({color:0x555f3b,metalness:.45,roughness:.65}),dark=new THREE.MeshStandardMaterial({color:0x202a27,metalness:.4,roughness:.6}),steel=new THREE.MeshStandardMaterial({color:0x778383,metalness:.8,roughness:.35}),brass=new THREE.MeshStandardMaterial({color:0xb8a16a,metalness:.8,roughness:.35});
 const packs={},boxGeometry=new THREE.BoxGeometry(1,1,1),cylinder=new THREE.CylinderGeometry(1,1,1,8);
 function box(parent,size,pos,mat){const m=new THREE.Mesh(boxGeometry,mat);m.scale.set(...size);m.position.set(...pos);m.castShadow=true;parent.add(m);return m;}
 for(const type of ['rapid','flame']){
  const pack=new THREE.Group();pack.name=type+'-jetpack-module';jetpack.root.add(pack);pack.scale.setScalar(.85);packs[type]=pack;
  box(pack,[.50,.62,.12],[0,0,0],dark);
  if(type==='rapid'){
   box(pack,[.47,.66,.24],[0,.02,-.12],olive);box(pack,[.48,.09,.27],[0,.34,-.12],dark);
   for(const x of [-.19,.19])box(pack,[.035,.57,.035],[x,.02,-.255],steel);
   box(pack,[.16,.09,.045],[0,.12,-.265],brass);box(pack,[.17,.14,.08],[-.25,-.23,-.12],dark);
   for(let i=0;i<4;i++)box(pack,[.26,.015,.018],[0,-.06-i*.055,-.255],dark);
  }else{
   for(const x of [-.135,.135]){const tank=new THREE.Mesh(new THREE.CapsuleGeometry(.12,.43,4,10),olive);tank.position.set(x,.015,-.12);tank.castShadow=true;pack.add(tank);for(const y of [-.17,.17])box(pack,[.255,.045,.25],[x,y,-.12],dark);box(pack,[.055,.09,.055],[x,.36,-.12],steel);}
   box(pack,[.40,.06,.08],[0,.40,-.12],steel);const gauge=new THREE.Mesh(new THREE.CylinderGeometry(.045,.045,.025,12),brass);gauge.rotation.x=Math.PI/2;gauge.position.set(.14,.30,-.25);pack.add(gauge);
  }
  for(const x of[-.17,.17])box(pack,[.045,.50,.035],[x,.04,.065],dark);
 }
 const hose=new THREE.InstancedMesh(cylinder,dark,28),belt=new THREE.InstancedMesh(boxGeometry,steel,32),rounds=new THREE.InstancedMesh(cylinder,brass,32);root.add(hose,belt,rounds);hose.frustumCulled=belt.frustumCulled=rounds.frustumCulled=false;
 const dummy=new THREE.Object3D(),axis=v(0,1,0),tangent=v(0,0,1);
 function update(type,model,time){
  root.visible=type==='rapid'||type==='flame';for(const [key,pack]of Object.entries(packs))pack.visible=key===type;if(!root.visible)return;
  avatar.root.updateWorldMatrix(true,true);model.updateWorldMatrix(true,true);
  const torso=avatar.root.worldToLocal(avatar.body.getWorldPosition(new THREE.Vector3()));
  for(const pack of Object.values(packs))pack.position.set(0,0,-.08);
  root.updateWorldMatrix(true,true);const pack=packs[type],start=root.worldToLocal(pack.localToWorld(v(-.25,-.22,-.12))),end=root.worldToLocal(model.localToWorld(type==='rapid'?v(-.23,-.04,.12):v(0,-.18,.36)));
  // Route around the player's right hip (negative local X), leaving a hanging loop.
  const sway=Math.sin(time*5)*.025,curve=new THREE.CatmullRomCurve3([start,v(-.42,torso.y-.37,-.35),v(-.64-sway,torso.y-.63,-.03),v(-.61-sway,torso.y-.53,.32),end]);
  hose.visible=type==='flame';belt.visible=rounds.visible=type==='rapid';
  if(type==='flame')for(let i=0;i<28;i++){const a=curve.getPoint(i/28),b=curve.getPoint((i+1)/28),d=b.clone().sub(a);dummy.position.copy(a).add(b).multiplyScalar(.5);dummy.quaternion.setFromUnitVectors(axis,d.clone().normalize());dummy.scale.set(.027,d.length()*1.08,.027);dummy.updateMatrix();hose.setMatrixAt(i,dummy.matrix);}
  else for(let i=0;i<32;i++){const t=i/31,p=curve.getPoint(t),dir=curve.getTangent(t);dummy.position.copy(p);dummy.quaternion.setFromUnitVectors(tangent,dir);dummy.scale.set(.13,.035,.040);dummy.updateMatrix();belt.setMatrixAt(i,dummy.matrix);dummy.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(v(0,0,1),Math.PI/2));dummy.scale.set(.012,.135,.012);dummy.updateMatrix();rounds.setMatrixAt(i,dummy.matrix);}
  for(const mesh of [hose,belt,rounds])if(mesh.visible)mesh.instanceMatrix.needsUpdate=true;
 }
 return {root,packs,update};
}

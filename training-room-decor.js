import * as THREE from 'three';
// Static scenery stays outside the playable boundary and adds no collision work.
export function decorateTrainingRoom(scene){
 const root=new THREE.Group();root.name='training-room-shell';const batches=[[],[],[],[]];
 const add=(batch,w,h,d,x,y,z)=>batches[batch].push({w,h,d,x,y,z});
 for(const side of [-1,1]){
  add(0,88,22,.35,0,11,side*44);add(0,.35,22,88,side*44,11,0);
  for(let i=-3;i<=3;i++){
   const p=i*12;
   add(1,10,12,.16,p,10,side*43.75);add(1,.16,12,10,side*43.75,10,p);
   add(2,.26,21,.35,p-5.6,10.5,side*43.5);add(2,.35,21,.26,side*43.5,10.5,p-5.6);
   add(3,3,.065,.06,p,16.2,side*43.62);add(3,.06,.065,3,side*43.62,16.2,p);
   for(let j=0;j<3;j++){add(2,3,.1,.2,p,5+j*.4,side*43.58);add(2,.2,.1,3,side*43.58,5+j*.4,p);}
  }
  add(2,86,.18,.25,0,3.4,side*43.55);add(2,.25,.18,86,side*43.55,3.4,0);
 }
 add(0,88,.35,88,0,22.2,0);
 for(const p of[-36,-18,0,18,36]){
  add(2,87,.5,.45,0,21.65,p);add(2,.45,.5,87,p,21.65,0);
  for(const x of[-27,0,27])add(3,5,.06,.28,x,21.35,p);
 }
 const materials=[new THREE.MeshStandardMaterial({color:0x172631,roughness:.95}),new THREE.MeshStandardMaterial({color:0x253b49,roughness:.85}),new THREE.MeshStandardMaterial({color:0x304855,roughness:.7,metalness:.3}),new THREE.MeshBasicMaterial({color:0x527e8d,toneMapped:false})];
 const geometry=new THREE.BoxGeometry(),matrix=new THREE.Matrix4(),q=new THREE.Quaternion();
 batches.forEach((parts,i)=>{const mesh=new THREE.InstancedMesh(geometry,materials[i],parts.length);for(const [index,p]of parts.entries()){matrix.compose(new THREE.Vector3(p.x,p.y,p.z),q,new THREE.Vector3(p.w,p.h,p.d));mesh.setMatrixAt(index,matrix);}mesh.computeBoundingSphere();mesh.receiveShadow=true;root.add(mesh);});scene.add(root);return root;
}

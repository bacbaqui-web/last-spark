import * as THREE from 'three';

export const ENEMY_DEATH_DURATION=1.05;
// All deaths share an unlit, texture-free black material. Live materials and
// authored geometry are never modified or copied for the burst.
const black=new THREE.MeshBasicMaterial({color:0x080808,toneMapped:false,side:THREE.DoubleSide});
black.name='Black scattered robot parts';black.userData.sharedWeaponMaterial=true;
const rotation=new THREE.Quaternion(),instance=new THREE.Matrix4();

export function recordEnemyImpact(r,point,direction,strength=1,mesh=null){
 if(!point||!direction||![...point.toArray(),...direction.toArray(),strength].every(Number.isFinite)||direction.lengthSq()<1e-10)return;
 r.deathImpact={point:point.clone(),direction:direction.clone().normalize(),strength:THREE.MathUtils.clamp(strength,.65,1.35),mesh:r.hitMeshes.includes(mesh)?mesh:null};
}

function begin(r){
 r.mixer?.stopAllAction();r.flashTime=0;
 if(r.muzzleFlash)r.muzzleFlash.visible=false;
 if(r.muzzleGlow)r.muzzleGlow.visible=false;
 if(r.muzzleLight)r.muzzleLight.intensity=0;
 r.root.updateWorldMatrix(true,true);
 const sources=[];
 r.root.traverseVisible(o=>{
  if(!o.isMesh||o===r.muzzleFlash||o.userData.effect||![].concat(o.material||[]).some(m=>m.visible&&m.opacity>0))return;
  if(o.isInstancedMesh){for(let i=0;i<o.count;i++){o.getMatrixAt(i,instance);sources.push({source:o,transform:o.matrixWorld.clone().multiply(instance)});}}
  else sources.push({source:o,transform:o.matrixWorld.clone()});
 });
 const group=new THREE.Group();group.name='black-part-burst';
 // Counteract the frozen robot root so gravity and scatter use world axes,
 // including wall-mounted robots, small drones and scaled bosses.
 group.matrixAutoUpdate=false;group.matrix.copy(r.root.matrixWorld).invert();
 const hidden=r.root.children.map(node=>({node,visible:node.visible}));
 for(const {node}of hidden)node.visible=false;
 r.root.add(group);
 const pieces=[],limit=Math.max(0,Math.min(sources.length,r.deathPartLimit??Infinity));
 for(let i=0;i<limit;i++){
  const {source,transform}=sources[Math.floor(i*sources.length/limit)],geometry=source.geometry;
  if(!geometry.boundingBox)geometry.computeBoundingBox();
  const center=geometry.boundingBox.getCenter(new THREE.Vector3()),position=center.clone().applyMatrix4(transform),orientation=new THREE.Quaternion(),scale=new THREE.Vector3();
  transform.decompose(new THREE.Vector3(),orientation,scale);
  const node=new THREE.Group(),mesh=new THREE.Mesh(geometry,black);
  mesh.name=source.name+'-fragment';mesh.position.copy(center).negate();mesh.castShadow=mesh.receiveShadow=false;
  node.position.copy(position);node.quaternion.copy(orientation);node.scale.copy(scale);node.add(mesh);group.add(node);
  const angle=i*2.399963229728653,speed=3.4+(i*7%11)*.18;
  pieces.push({mesh,node,source,p:position,q:orientation,velocity:new THREE.Vector3(Math.cos(angle)*speed,3.2+(i*5%9)*.24,Math.sin(angle)*speed),axis:new THREE.Vector3(Math.sin(i+1),.5,Math.cos(i*1.7)).normalize(),spin:4+(i%5)*.7});
 }
 const state={group,pieces,hidden,hit:r.deathImpact,age:0};r.destruction=state;return state;
}

export function updateEnemyDeathBurst(r,time){
 const d=r.destruction||begin(r),t=Math.max(0,Math.min(ENEMY_DEATH_DURATION,Number.isFinite(time)?time:0));d.age=t;
 // Absolute-time ballistic motion: no physics world, collisions, pose history,
 // secondary explosion, lights, smoke, sparks, or per-frame allocations.
 for(const p of d.pieces){
  p.node.position.copy(p.p).addScaledVector(p.velocity,t);p.node.position.y-=9*t*t;
  rotation.setFromAxisAngle(p.axis,p.spin*t);p.node.quaternion.copy(rotation).multiply(p.q);
 }
 d.group.visible=t<ENEMY_DEATH_DURATION;
 return d;
}

export function resetEnemyDeathBurst(r){
 r.deathImpact=null;delete r.deathPartLimit;
 const d=r.destruction;if(!d)return;
 d.group.removeFromParent();d.group.clear();
 for(const {node,visible}of d.hidden)node.visible=visible;
 r.destruction=null;
}

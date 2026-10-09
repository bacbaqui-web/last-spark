import * as T from 'three';
import {brickHouseDetail} from './brick-house-variants.js';
import {streetDetailLevel} from './street-lod-policy.js';
import {staticMaterialKey} from './static-material-key.js';

// Call AFTER collision capture and BEFORE render batching/freezing. Collision
// retains the original geometry/matrices even when these render levels change.
export function prepareStreetModelLOD(root){
 root.updateMatrixWorld(true);
 const houses=[],rubble=[],nodes=[];
 root.traverse(node=>nodes.push(node));
 const blockOf=node=>{while(node.parent&&node.parent!==root)node=node.parent;return node;};
 for(const node of nodes){
  if(node.userData.collisionKind==='building'&&Number.isInteger(node.userData.variant)&&node.children.some(m=>Number.isInteger(m.userData.houseSurface))&&!node.children.some(m=>m.userData.ownedGeometry)){
   const bounds=new T.Box3().setFromObject(node),originals=node.children.slice(),materials=new Map(originals.filter(o=>o.isMesh).map(m=>[m.userData.houseSurface,m.material])),levels=[new T.Group(),new T.Group(),new T.Group()];
   levels[0].add(...originals);
   for(let level=1;level<=2;level++)brickHouseDetail(node.userData.variant,level).forEach((geometry,index)=>{
    if(!geometry.attributes.position.count||!materials.has(index))return;
    const original=materials.get(index),material=original.clone();material.side=T.DoubleSide;
    material.onBeforeCompile=original.onBeforeCompile;material.customProgramCacheKey=original.customProgramCacheKey;
    const mesh=new T.Mesh(geometry,material);mesh.castShadow=mesh.receiveShadow=true;mesh.userData.ownedMaterial=true;levels[level].add(mesh);
   });
   node.userData.streetLOD=true;node.userData.detailLevel=0;
   levels.forEach((group,i)=>{group.name='street-detail-'+i;group.visible=i===0;node.add(group);});
   houses.push({node,bounds,levels,level:0,block:blockOf(node)});
  }
  if(node.isInstancedMesh&&node.userData.collisionKind==='rubble'&&node.count>=40){
   const count=node.count,source=node.instanceMatrix.array.slice(),positions=new Float32Array(count*3),matrix=new T.Matrix4(),position=new T.Vector3();
   for(let i=0;i<count;i++){node.getMatrixAt(i,matrix);position.setFromMatrixPosition(matrix).applyMatrix4(node.matrixWorld);positions.set(position.toArray(),i*3);}
   node.computeBoundingBox();node.computeBoundingSphere();node.instanceMatrix.setUsage(T.DynamicDrawUsage);
   rubble.push({node,count,source,positions,levels:new Uint8Array(count),block:blockOf(node)});
  }
 }
 root.updateMatrixWorld(true);
 // Repeated variants keep their shared geometry. Compact the selected levels
 // into immutable per-block instance buckets only when a level changes.
 const buckets=new Map(),materialKeys=new WeakMap(),inverse=new T.Matrix4();
 function materialKey(material){
  if(!materialKeys.has(material)){
   materialKeys.set(material,staticMaterialKey(material)+'|'+material.customProgramCacheKey());
  }
  return materialKeys.get(material);
 }
 for(const item of houses){
  // Negative instance scales have different winding. Keep these rare authored
  // placements as ordinary meshes, as well as standalone catalogue previews.
  if(item.block===item.node||item.node.matrixWorld.determinant()<0)continue;
  inverse.copy(item.block.matrixWorld).invert();
  for(const [level,group] of item.levels.entries())for(const mesh of group.children){
   const key=[item.block.id,mesh.geometry.id,materialKey(mesh.material),+mesh.castShadow,+mesh.receiveShadow].join('|');
   let bucket=buckets.get(key);if(!bucket){bucket={sources:[],block:item.block,geometry:mesh.geometry,material:mesh.material,castShadow:mesh.castShadow,receiveShadow:mesh.receiveShadow};buckets.set(key,bucket);}
   bucket.sources.push({item,level,matrix:new T.Matrix4().multiplyMatrices(inverse,mesh.matrixWorld)});
  }
  item.node.visible=false;
 }
 for(const bucket of buckets.values()){
  const batch=new T.InstancedMesh(bucket.geometry,bucket.material,bucket.sources.length);
  batch.name='street-lod-instances';batch.castShadow=bucket.castShadow;batch.receiveShadow=bucket.receiveShadow;batch.userData.ownedInstances=true;batch.matrixAutoUpdate=false;batch.instanceMatrix.setUsage(T.DynamicDrawUsage);bucket.batch=batch;bucket.block.add(batch);
 }
 function updateBatches(){
  for(const bucket of buckets.values()){
   const batch=bucket.batch;let count=0;
   for(const source of bucket.sources)if(source.item.level===source.level)batch.setMatrixAt(count++,source.matrix);
   batch.count=count;batch.visible=count>0;
   if(count){batch.instanceMatrix.needsUpdate=true;batch.boundingSphere=null;batch.computeBoundingSphere();}
  }
 }
 updateBatches();root.updateMatrixWorld(true);
 const lastPosition=new T.Vector3(Infinity,Infinity,Infinity);let last=-Infinity;
 function update(time,camera){
  if(time>=last&&time-last<.12&&camera.position.distanceToSquared(lastPosition)<1)return false;
  last=time;lastPosition.copy(camera.position);let changed=false,levelsChanged=false;
  for(const item of houses){
   if(!item.block.visible)continue;
   const next=streetDetailLevel(item.bounds.distanceToPoint(camera.position),item.level);
   if(next===item.level)continue;
   item.level=next;item.node.userData.detailLevel=next;item.levels.forEach((group,i)=>group.visible=i===next);changed=true;levelsChanged=true;
  }
  for(const item of rubble){
   if(!item.block.visible)continue;
   let dirty=false;
   for(let i=0;i<item.count;i++){
    const dx=camera.position.x-item.positions[i*3],dz=camera.position.z-item.positions[i*3+2],next=streetDetailLevel(Math.hypot(dx,dz),item.levels[i]);
    if(next!==item.levels[i]){item.levels[i]=next;dirty=true;}
   }
   if(!dirty)continue;
   let visible=0;
   for(let i=0;i<item.count;i++){
    const stride=item.levels[i]===2?10:item.levels[i]===1?3:1;
    if(i%stride)continue;
    for(let k=0;k<16;k++)item.node.instanceMatrix.array[visible*16+k]=item.source[i*16+k];visible++;
   }
   item.node.count=visible;item.node.instanceMatrix.needsUpdate=true;changed=true;
  }
  if(levelsChanged)updateBatches();
  if(changed)root.userData.visibilityRevision=(root.userData.visibilityRevision||0)+1;
  return changed;
 }
 update.snapshot=()=>({houses:houses.length,houseLevels:[0,1,2].map(level=>houses.filter(h=>h.block.visible&&h.level===level).length),houseDrawBatches:[...buckets.values()].filter(b=>b.block.visible&&b.batch.visible).length,rubbleOriginal:rubble.reduce((n,r)=>n+r.count,0),rubbleVisible:rubble.reduce((n,r)=>n+(r.block.visible?r.node.count:0),0)});
 return update;
}

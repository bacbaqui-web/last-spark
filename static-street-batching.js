import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {staticMaterialKey} from './static-material-key.js';
const blockBounds=new WeakMap(),viewFrustum=new T.Frustum(),viewMatrix=new T.Matrix4();

// A generated street never changes transform after commit. Keep authored meshes
// for collision, but do not visit every brick/leaf on each scene matrix update.
// The transport drone and animated crash site retain their normal updates.
export function freezeStreetTransforms(root){
 root.updateMatrixWorld(true);const dynamic=[];let frozen=0;
 for(const block of root.children){
  blockBounds.set(block,new T.Box3().setFromObject(block).expandByScalar(1));
  if(block.userData.bossStage){dynamic.push({node:block,block});continue;}
  if(block.userData.recoveryDrone)dynamic.push({node:block.userData.recoveryDrone,block});
  block.traverse(node=>{for(let parent=node;parent&&parent!==block;parent=parent.parent)if(parent===block.userData.recoveryDrone)return;node.matrixAutoUpdate=false;node.matrixWorldAutoUpdate=false;frozen++;});
 }
 root.matrixAutoUpdate=false;root.matrixWorldAutoUpdate=false;
 root.updateMatrixWorld=function(){for(const {node,block} of dynamic)if(block.visible)node.updateMatrixWorld();};
 root.userData.frozenTransformCount=frozen;
 return frozen;
}
// Keep authored collision meshes. Merge only opaque, nonanimated render surfaces.
export function batchStreetStatics(root){
 let removedCalls=0;root.updateMatrixWorld(true);root.matrixAutoUpdate=false;root.traverse(mesh=>{if(!mesh.isMesh||!['ground','rubble'].includes(mesh.userData.collisionKind))return;mesh.geometry.computeBoundingBox();if(mesh.geometry.boundingBox.max.y-mesh.geometry.boundingBox.min.y<.5)mesh.castShadow=false;});
 for(const block of root.children){
  if(block.userData.bossStage)continue;
  block.traverse(node=>{for(let parent=node;parent&&parent!==block;parent=parent.parent)if(parent===block.userData.recoveryDrone)return;node.matrixAutoUpdate=false;});
  const buckets=new Map(),inverse=block.matrixWorld.clone().invert(),matrix=new T.Matrix4(),materialKeys=new Map();
  block.traverse(mesh=>{
   if(!mesh.isMesh||mesh.isInstancedMesh||mesh.isSkinnedMesh||!mesh.visible||mesh.userData.vegetation||Array.isArray(mesh.material)||mesh.children.length||mesh.geometry.morphAttributes.position||mesh.geometry.drawRange.start!==0||Number.isFinite(mesh.geometry.drawRange.count))return;
   for(let parent=mesh;parent&&parent!==block;parent=parent.parent)if(!parent.visible||parent.userData.lod||parent.userData.streetLOD||parent===block.userData.recoveryDrone||parent.userData.effect)return;
   const material=mesh.material,custom=material.onBeforeCompile!==T.Material.prototype.onBeforeCompile;
   if(material.transparent||custom&&!material.userData.staticWorldBatch)return;
   if(!materialKeys.has(material))materialKeys.set(material,custom?'world-shader:'+material.uuid:staticMaterialKey(material));
   const format=Object.entries(mesh.geometry.attributes).map(([name,a])=>[name,a.itemSize,a.normalized,a.array.constructor.name]).sort();
   const key=materialKeys.get(material)+':'+JSON.stringify(format)+':'+!!mesh.geometry.index+':'+mesh.castShadow+':'+mesh.receiveShadow;
   if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(mesh);
  });
  for(const meshes of buckets.values()){if(meshes.length<3)continue;const first=meshes[0];let batch;
   if(!first.material.userData.staticWorldBatch&&meshes.every(mesh=>mesh.geometry===first.geometry)){
    batch=new T.InstancedMesh(first.geometry,first.material,meshes.length);batch.userData.ownedInstances=true;
    meshes.forEach((mesh,i)=>{matrix.multiplyMatrices(inverse,mesh.matrixWorld);batch.setMatrixAt(i,matrix);});batch.computeBoundingSphere();
   }else{
    const sources=meshes.map(mesh=>{matrix.multiplyMatrices(inverse,mesh.matrixWorld);const geometry=mesh.geometry.clone().applyMatrix4(matrix);if(matrix.determinant()<0){if(geometry.index){const index=geometry.index;for(let i=0;i<index.count;i+=3){const b=index.getX(i+1);index.setX(i+1,index.getX(i+2));index.setX(i+2,b);}}else for(const attribute of Object.values(geometry.attributes))for(let i=0;i<attribute.count;i+=3)for(let k=0;k<attribute.itemSize;k++){const b=attribute.getComponent(i+1,k);attribute.setComponent(i+1,k,attribute.getComponent(i+2,k));attribute.setComponent(i+2,k,b);}}return geometry;}),geometry=mergeGeometries(sources);sources.forEach(g=>g.dispose());if(!geometry)continue;geometry.computeBoundingSphere();batch=new T.Mesh(geometry,first.material);batch.userData.ownedGeometry=true;
   }
   batch.name='static-street-batch';batch.castShadow=first.castShadow;batch.receiveShadow=first.receiveShadow;batch.matrixAutoUpdate=false;
   meshes.forEach(mesh=>{mesh.visible=false;mesh.userData.batchedSource=true;mesh.matrixAutoUpdate=false;mesh.matrixWorldAutoUpdate=false;});block.add(batch);removedCalls+=meshes.length-1;
  }
  // Fully batched hierarchies retain their collision/source data but no longer
  // need to be visited by either the color or shadow render traversal.
  function prune(node){if(node.userData.lod||node.userData.streetLOD||node===block.userData.recoveryDrone||node.userData.effect)return;for(const child of node.children)prune(child);if(node!==block&&node.isGroup&&node.children.length&&node.children.every(child=>!child.visible)){node.visible=false;root.userData.prunedBranches=(root.userData.prunedBranches||0)+1;}}
  prune(block);
 }
 return removedCalls;
}

// Release GPU allocations of distant blocks while retaining collision and game
// state. Three.js uploads these immutable buffers again when the block returns.
export function updateStreetResidency(root,camera,time){
 if(camera.isCamera){camera.updateWorldMatrix(true,false);viewMatrix.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);viewFrustum.setFromProjectionMatrix(viewMatrix);}
 for(const block of root.children){const distance=Math.hypot(block.position.x-camera.position.x,block.position.z-camera.position.z);
  if(!blockBounds.has(block))blockBounds.set(block,new T.Box3().setFromObject(block).expandByScalar(1));
  const visible=distance<110&&(!camera.isCamera||viewFrustum.intersectsBox(blockBounds.get(block)));
  if(block.visible!==visible)root.userData.visibilityRevision=(root.userData.visibilityRevision||0)+1;block.visible=visible;
  if(block.visible){block.userData.lastVisibleTime=time;block.userData.gpuReleased=false;continue;}
  block.userData.lastVisibleTime??=time;
  if(distance<160||time-block.userData.lastVisibleTime<20||block.userData.gpuReleased)continue;
  const disposed=new Set();block.traverse(o=>{if(o.userData.ownedGeometry&&o.geometry&&!disposed.has(o.geometry)){disposed.add(o.geometry);o.geometry.dispose();}if(o.userData.ownedInstances)o.dispose();});block.userData.gpuReleased=true;
 }
}

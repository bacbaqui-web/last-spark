import * as THREE from 'three';

// Only the render pass uses instances. Original articulated meshes remain the
// authority for ray hits, weak points, muzzle sockets and black-part deaths.
export function createEnemyRenderBatch(scene){
 const entries=new Map(),matrix=new THREE.Matrix4(),inverseScene=new THREE.Matrix4();
 const skipWorldUpdate=()=>{};
 let renderedMeshes=0,drawBatches=0;
 function visible(mesh,root){for(let node=mesh;node;node=node.parent){if(!node.visible)return false;if(node===root)return true;}return false;}
 function render(enemies,draw){
  const hidden=[],roots=[];renderedMeshes=0;drawBatches=0;
  for(const entry of entries.values()){entry.sources.length=0;entry.batch.visible=false;}
  try{
   scene.updateWorldMatrix(true,false);inverseScene.copy(scene.matrixWorld).invert();
   for(const enemy of enemies){
    const r=enemy.robot,root=enemy.group;
    if(!r.wildId||r.destruction||enemy.hp<=0||!root.visible||enemy.dormant)continue;
    root.updateWorldMatrix(true,true);
    let batched=false;
    for(const mesh of r.hitMeshes){
     if(!mesh.isMesh||mesh.isSkinnedMesh||mesh.isInstancedMesh||mesh.morphTargetInfluences?.length||!visible(mesh,root))continue;
     const key=[mesh.geometry.id,[].concat(mesh.material).map(m=>m.id).join(','),+mesh.castShadow,+mesh.receiveShadow,mesh.renderOrder,mesh.layers.mask].join(':');
     let entry=entries.get(key);
     if(!entry){entry={sources:[],batch:create(mesh,16)};entries.set(key,entry);}
     entry.sources.push(mesh);hidden.push(mesh);batched=true;
    }
    if(batched){roots.push([root,root.updateMatrixWorld]);root.updateMatrixWorld=skipWorldUpdate;}
   }
   for(const entry of entries.values()){
    const sources=entry.sources;if(!sources.length)continue;
    if(sources.length>entry.batch.instanceMatrix.count){const previous=entry.batch;entry.batch=create(sources[0],2**Math.ceil(Math.log2(sources.length)));previous.removeFromParent();previous.dispose();}
    const batch=entry.batch;batch.count=sources.length;batch.visible=true;
    for(let i=0;i<sources.length;i++)batch.setMatrixAt(i,matrix.multiplyMatrices(inverseScene,sources[i].matrixWorld));
    batch.instanceMatrix.needsUpdate=true;renderedMeshes+=sources.length;drawBatches++;
   }
   for(const mesh of hidden)mesh.visible=false;
   return draw();
  }finally{
   for(const mesh of hidden)mesh.visible=true;
   for(const [root,update]of roots)root.updateMatrixWorld=update;
   for(const entry of entries.values())entry.batch.visible=false;
  }
 }
 function create(source,capacity){
  const batch=new THREE.InstancedMesh(source.geometry,source.material,capacity);
  batch.name='enemy-render-instances';batch.castShadow=source.castShadow;batch.receiveShadow=source.receiveShadow;
  batch.renderOrder=source.renderOrder;batch.layers.mask=source.layers.mask;
  // Visibility is already decided per actor; avoid rebuilding per-part bounds.
  batch.frustumCulled=false;batch.matrixAutoUpdate=false;batch.visible=false;batch.count=0;
  batch.instanceMatrix.setUsage(THREE.DynamicDrawUsage);scene.add(batch);return batch;
 }
 return {render,snapshot:()=>({batchedEnemyMeshes:renderedMeshes,enemyDrawBatches:drawBatches}),dispose(){for(const {batch}of entries.values()){batch.removeFromParent();batch.dispose();}entries.clear();}};
}

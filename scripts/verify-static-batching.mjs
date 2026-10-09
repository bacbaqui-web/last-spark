import assert from 'node:assert/strict';
import * as T from 'three';
import {batchStreetStatics,updateStreetResidency,freezeStreetTransforms} from '../static-street-batching.js';
import {buildWalkCollision} from '../street-walk-collision.js';
import {mossMaterial} from '../street-moss-material.js';
const root=new T.Group(),block=new T.Group(),material=new T.MeshStandardMaterial({color:0x999999});root.add(block);root.userData={walkBounds:20,walkBoundsZ:20,groundBase:0};block.position.set(2,0,3);block.rotation.y=.6;
const before=new T.Box3();let triangles=0;
for(let i=0;i<6;i++){const geometry=new T.BoxGeometry(1+i*.1,2,1),mesh=new T.Mesh(geometry,material.clone());mesh.position.set(i-3,1,0);if(i===2)mesh.scale.x=-1;mesh.userData.collisionKind='building';block.add(mesh);triangles+=geometry.index.count/3;}
root.updateMatrixWorld(true);before.setFromObject(root);const collision=buildWalkCollision(root);assert.equal(batchStreetStatics(root),5);root.updateMatrixWorld(true);const visible=block.children.filter(o=>o.isMesh&&o.visible);assert.equal(visible.length,1);assert.equal(visible[0].geometry.index.count/3,triangles);const after=new T.Box3().setFromObject(visible[0]);assert(before.min.distanceTo(after.min)<1e-5&&before.max.distanceTo(after.max)<1e-5,'world geometry remains identical after merging');const first=collision.surfaces[0].matrix;assert(first.elements.every(Number.isFinite));assert(collision.blocked(2,3,0),'authored wall collision remains solid after rendering sources are hidden');console.log('PASS merged static materials preserve transformed bounds, triangles and authored collision');

let released=0;visible[0].geometry.addEventListener('dispose',()=>released++);updateStreetResidency(root,{position:new T.Vector3(900,0,900)},0);updateStreetResidency(root,{position:new T.Vector3(900,0,900)},21);assert.equal(released,1);assert(collision.blocked(2,3,0));updateStreetResidency(root,{position:new T.Vector3(2,0,3)},22);assert(block.visible&&!block.userData.gpuReleased);console.log('PASS distant GPU buffers are released once and retained geometry/collision can return');

const drone=new T.Group(),rotor=new T.Object3D();drone.add(rotor);block.add(drone);block.userData.recoveryDrone=drone;
const frozen=freezeStreetTransforms(root);let visits=0;
for(const mesh of visible){const update=mesh.updateMatrixWorld;mesh.updateMatrixWorld=function(force){visits++;update.call(this,force);};}
const worldBefore=visible[0].matrixWorld.clone();rotor.rotation.y=.7;
for(let i=0;i<120;i++)root.updateMatrixWorld(true);
assert(frozen>6);assert.equal(visits,0,'static bricks never visited by scene matrix sweep');assert(visible[0].matrixWorld.equals(worldBefore));
assert(Math.abs(new T.Euler().setFromRotationMatrix(rotor.matrix).y-.7)<1e-6,'transport animation stays live');assert(collision.blocked(2,3,0),'frozen hidden sources retain collision');
const camera=new T.PerspectiveCamera(60,1,.1,200);camera.position.set(2,2,20);updateStreetResidency(root,camera,23);assert(block.visible);
camera.rotation.y=Math.PI;updateStreetResidency(root,camera,24);assert(!block.visible,'block behind camera stops render traversal');
rotor.rotation.y=1;root.updateMatrixWorld(true);assert(Math.abs(new T.Euler().setFromRotationMatrix(rotor.matrix).y-.7)<1e-6,'hidden block also stops drone matrix updates');
camera.rotation.y=0;updateStreetResidency(root,camera,25);root.updateMatrixWorld(true);assert(Math.abs(new T.Euler().setFromRotationMatrix(rotor.matrix).y-1)<1e-6,'returning to block resumes animation');
console.log('PASS immutable world transforms skip traversal, hidden blocks cull, live drone and collision remain correct');

const mossRoot=new T.Group(),mossBlock=new T.Group(),wallGroup=new T.Group(),moss=mossMaterial(new T.MeshStandardMaterial(),.7),otherMoss=mossMaterial(new T.MeshStandardMaterial(),.2);
mossRoot.add(mossBlock);mossBlock.add(wallGroup);const mossBounds=new T.Box3();
for(let i=0;i<6;i++){const mesh=new T.Mesh(new T.BoxGeometry(1,2,.4),i<3?moss:otherMoss);mesh.position.set(i*2,1,0);mesh.rotation.y=i*.2;wallGroup.add(mesh);}
mossRoot.updateMatrixWorld(true);mossBounds.setFromObject(wallGroup);assert.equal(batchStreetStatics(mossRoot),4);
const mossBatches=mossBlock.children.filter(o=>o.isMesh&&o.visible);assert.equal(mossBatches.length,2);assert(!wallGroup.visible,'fully batched group is pruned from render traversal');
assert(mossBatches.every(o=>!o.isInstancedMesh),'world shader receives baked positions and normals');assert(mossBatches.some(o=>o.material===moss)&&mossBatches.some(o=>o.material===otherMoss),'different shader uniform strengths are never mixed');
mossRoot.updateMatrixWorld(true);const mergedBounds=new T.Box3();for(const mesh of mossBatches)mergedBounds.union(new T.Box3().setFromObject(mesh));assert(mossBounds.min.distanceTo(mergedBounds.min)<1e-5&&mossBounds.max.distanceTo(mergedBounds.max)<1e-5);
console.log('PASS moss batches preserve transforms/material uniforms and prune only fully hidden source groups');

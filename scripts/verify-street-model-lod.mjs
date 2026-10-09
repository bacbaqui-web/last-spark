import assert from 'node:assert/strict';
import * as T from 'three';
import {createBrickHouse,brickHouseDetail,houseVariants} from '../brick-house-variants.js';
import {createStreetTree,streetTreeDetail} from '../street-tree-variants.js';
import {prepareStreetModelLOD} from '../street-model-lod.js';
import {prepareVegetation} from '../street-vegetation-runtime.js';
import {streetDetailLevel} from '../street-lod-policy.js';
import {batchStreetStatics,freezeStreetTransforms} from '../static-street-batching.js';
import {buildWalkCollision} from '../street-walk-collision.js';
import {mossMaterial} from '../street-moss-material.js';
import {staticMaterialKey} from '../static-material-key.js';

const texture=new T.Texture();texture.source.toJSON=()=>{throw Error('Material comparison must not encode texture images');};
const textured=new T.MeshStandardMaterial({map:texture});assert.equal(staticMaterialKey(textured),staticMaterialKey(textured.clone()));
const different=textured.clone();different.roughness=.4;assert.notEqual(staticMaterialKey(textured),staticMaterialKey(different));

const triangles=g=>(g.index?.count??g.attributes.position.count)/3;
for(let i=0;i<houseVariants.length;i++){
 const house=createBrickHouse(i),near=house.userData.triangles,mid=brickHouseDetail(i,1),far=brickHouseDetail(i,2);
 assert(mid.reduce((n,g)=>n+triangles(g),0)<near*.2);
 assert(far.reduce((n,g)=>n+triangles(g),0)<near*.1,'far house loses over 90% of triangles');
 assert.equal(brickHouseDetail(i,2),far,'shared immutable geometry cache');
 for(const g of [...mid,...far]){assert(Object.values(g.attributes).every(a=>a.array.every(Number.isFinite)));if(g.attributes.position.count)assert(g.boundingSphere.radius>0);}
}
for(let i=0;i<10;i++){
 const near=createStreetTree(i,{lod:'far'}).userData.triangles,far=streetTreeDetail(i,2),mid=streetTreeDetail(i,1);
 assert(triangles(far.wood)+triangles(far.leaves)<near*.05,'far tree loses over 95%');
 assert(triangles(mid.wood)+triangles(mid.leaves)<near*.3);
 assert.equal(streetTreeDetail(i,2),far);
}
assert.equal(streetDetailLevel(66,0),2);assert.equal(streetDetailLevel(63,2),2);assert.equal(streetDetailLevel(61,2),1);assert.equal(streetDetailLevel(30,1),1);assert.equal(streetDetailLevel(28,1),0);

const root=new T.Group(),block=new T.Group();root.add(block);root.userData={walkBounds:200,walkBoundsZ:200,groundBase:0};
const house=createBrickHouse(2);house.position.set(12,0,-5);house.rotation.y=.4;house.scale.set(-1.1,1.2,.9);house.userData.collisionKind='building';block.add(house);
const sourceMeshes=house.children.slice(),sourceGeometry=sourceMeshes.map(m=>m.geometry);
const pieces=new T.InstancedMesh(new T.BoxGeometry(1,1,1),new T.MeshBasicMaterial(),100),dummy=new T.Object3D();
for(let i=0;i<100;i++){dummy.position.set(-10+(i%10)*.02,1,-5-Math.floor(i/10)*.02);dummy.updateMatrix();pieces.setMatrixAt(i,dummy.matrix);}
pieces.userData.collisionKind='rubble';block.add(pieces);
const tree=createStreetTree(0,{lod:'far'});tree.children[0].userData.collisionKind='tree';block.add(tree);
const broken=createStreetTree(1,{lod:'far'});broken.position.x=20;broken.userData.broken=true;broken.children[1].visible=false;const stump=new T.CylinderGeometry(.3,.4,1.5,8);broken.children[0].geometry=stump;block.add(broken);
root.updateMatrixWorld(true);const originalInstances=pieces.instanceMatrix.array.slice(),collision=buildWalkCollision(root);
const rays=[];
for(let x=-16;x<=24;x+=2)for(const y of [1,3,7])rays.push(new T.Raycaster(new T.Vector3(x,y,20),new T.Vector3(0,0,-1),0,120));
const hits=()=>rays.map(ray=>{ray.firstHitOnly=true;const hit=ray.intersectObject(collision.rayTarget)[0];return hit?{distance:hit.distance,object:hit.object.uuid}:null;});
const before=hits(),blocked=collision.blocked(0,0,0),vegetation=prepareVegetation(root),lod=prepareStreetModelLOD(root);
batchStreetStatics(root);freezeStreetTransforms(root);
assert.equal(sourceMeshes[0].parent,house.children[0]);
const nearTree=tree.children.map(m=>m.geometry),camera={position:new T.Vector3()};
for(const [time,z,level] of [[1,100,2],[2,50,1],[3,0,0],[4,100,2],[5,0,0]]){
 camera.position.set(0,2,z);lod(time,camera);vegetation(time,camera,true);
 assert.equal(tree.userData.detailLevel,level);
 assert.equal(house.userData.detailLevel,level);
 assert.equal(house.children.filter(o=>o.visible).length,1);
 assert.equal(house.children[level].visible,true);
 assert.deepEqual(hits(),before,'bullets retain original geometry and transforms at every LOD');
 assert.equal(collision.blocked(0,0,0),blocked);
 assert.equal(broken.children[0].geometry,stump);assert.equal(broken.children[1].visible,false,'broken trees never grow leaves again');
 if(level===2)assert.equal(pieces.count,10);if(level===0){assert.equal(pieces.count,100);assert.deepEqual(pieces.instanceMatrix.array,originalInstances);assert.deepEqual(tree.children.map(m=>m.geometry),nearTree);}
 assert.deepEqual(sourceMeshes.map(m=>m.geometry),sourceGeometry);
}
// Hidden blocks should not perform per-building/per-instance updates.
block.visible=false;camera.position.z=100;lod(6,camera);assert.equal(house.userData.detailLevel,0);block.visible=true;lod(7,camera);assert.equal(house.userData.detailLevel,2);
const batchRoot=new T.Group(),batchBlock=new T.Group();batchRoot.add(batchBlock);const placed=[];
for(let i=0;i<6;i++){
 const h=createBrickHouse(i%3);h.position.set((i%3)*12,0,Math.floor(i/3)*20);h.rotation.y=i*.2;h.scale.setScalar(.8+i*.03);h.userData.collisionKind='building';
 h.traverse(m=>{if(m.isMesh)m.material=mossMaterial(m.material.clone(),.78);});batchBlock.add(h);placed.push(h);
}
const batchUpdate=prepareStreetModelLOD(batchRoot);batchStreetStatics(batchRoot);freezeStreetTransforms(batchRoot);
for(const [time,z] of [[1,12],[2,55],[3,150],[4,12]]){
 batchUpdate(time,{position:new T.Vector3(0,2,z)});
 const actual=[],expected=[],proxyActual=[],proxyExpected=[],instance=new T.Matrix4(),world=new T.Matrix4(),point=new T.Vector3();let surfaceCount=0;
 const vertices=(mesh,target)=>{
  const g=mesh.geometry,start=g.drawRange.start,count=Math.min(g.index?.count??g.attributes.position.count,start+g.drawRange.count);
  for(let i=start;i<count;i++){point.fromBufferAttribute(g.attributes.position,g.index?g.index.getX(i):i).applyMatrix4(mesh.matrixWorld);target.push(point.toArray());}
 };
 for(const h of placed){assert.equal(h.visible,false);for(const m of h.children[h.userData.detailLevel].children){surfaceCount++;if(h.userData.detailLevel===0)expected.push({geometry:m.geometry.id,matrix:m.matrixWorld});else vertices(m,proxyExpected);}}
 for(const b of batchBlock.children.filter(n=>n.name==='street-lod-instances'&&n.visible))for(let i=0;i<b.count;i++){b.getMatrixAt(i,instance);world.multiplyMatrices(b.matrixWorld,instance);actual.push({geometry:b.geometry.id,matrix:world.clone()});}
 for(const b of batchBlock.children.filter(n=>n.name==='street-lod-proxies'&&n.visible))vertices(b,proxyActual);
 assert.equal(actual.length,expected.length);
 for(const source of expected){const match=actual.findIndex(a=>a.geometry===source.geometry&&a.matrix.elements.every((v,i)=>Math.abs(v-source.matrix.elements[i])<1e-5));assert(match>=0,'instance world matrix matches the selected original surface');actual.splice(match,1);}
 assert.equal(proxyActual.length,proxyExpected.length,'merged proxies retain exactly the selected triangle count');
 const points=new Map();for(const p of proxyActual){const key=p.map(v=>Math.floor(v*100)).join(',');if(!points.has(key))points.set(key,[]);points.get(key).push(p);}
 for(const p of proxyExpected){
  const cell=p.map(v=>Math.floor(v*100));let matched=false;
  for(let x=-1;x<=1&&!matched;x++)for(let y=-1;y<=1&&!matched;y++)for(let z=-1;z<=1&&!matched;z++){
   const candidates=points.get([cell[0]+x,cell[1]+y,cell[2]+z].join(','));if(!candidates)continue;
   const i=candidates.findIndex(q=>p.every((v,k)=>Math.abs(v-q[k])<1e-4));if(i>=0){candidates.splice(i,1);matched=true;}
  }
  assert(matched,'merged proxy world vertex matches a selected original within 0.1mm');
 }
 assert(batchUpdate.snapshot().houseDrawBatches<surfaceCount,'shared variants reduce draw submissions');
 if(z===150)assert(batchUpdate.snapshot().houseDrawBatches<surfaceCount/2,'different far variants share material draws');
}
console.log('PASS 20 house / 10 tree LOD budgets, cached geometry, hysteresis, frozen render levels, exact near restoration, 315 collision rays, rubble compaction and broken-tree preservation');
console.log('PASS instanced near surfaces and merged proxy triangles match every selected level across rotation, scale and near/far return; fewer draw submissions');

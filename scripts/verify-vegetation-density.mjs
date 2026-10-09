import assert from 'node:assert/strict';
import * as T from 'three';
import {addVegetationCells,vegetationDetailLevel,vineStrandRank,vineLeafRank} from '../vegetation-density.js';
import {prepareVegetation} from '../street-vegetation-runtime.js';
import {batchStreetStatics,freezeStreetTransforms,updateStreetResidency} from '../static-street-batching.js';
import {createRoadShapeBlock} from '../street-road-shapes.js';
import {disposeStreetBlock} from '../salvage-street-block.js';

assert.equal(vegetationDetailLevel(18,0),1);assert.equal(vegetationDetailLevel(17,1),1);assert.equal(vegetationDetailLevel(15,1),0);
assert.equal(vegetationDetailLevel(40,0),2);assert.equal(vegetationDetailLevel(39,2),2);assert.equal(vegetationDetailLevel(37,2),1);
for(let strand=0;strand<28;strand++)for(let leaf=0;leaf<22;leaf++)assert(vineLeafRank(strand,leaf)>=vineStrandRank(strand),'a retained vine leaf always retains its stem');

const root=new T.Group(),block=new T.Group();root.add(block);block.position.set(9,0,-3);block.rotation.y=.4;
const positions=[],uv=[];for(let i=0;i<24;i++){const x=i*.01;positions.push(x,0,0,x+.01,0,0,x+.1,1,.1);uv.push(0,0,1,0,.5,1);}
const material=new T.MeshStandardMaterial({side:T.DoubleSide});
const [grass]=addVegetationCells(block,{positions,uv,material,kind:'grass'});
assert.deepEqual(grass.userData.vegetationDensity,[72,24,6],'24 blades become 8 then 2');
const leafPositions=[11.9,0,0,12.1,0,0,12.1,1,0,11.9,0,0,12.1,1,0,11.9,1,0];
const leafCells=addVegetationCells(block,{positions:leafPositions,material,kind:'leaves'});
assert.equal(leafCells.length,1,'two triangles of a boundary-crossing leaf stay together');
const hidden=addVegetationCells(block,{positions,uv,material,kind:'grass'})[0];hidden.visible=false;
const original=grass.geometry,attributes=Object.fromEntries(Object.entries(original.attributes).map(([key,value])=>[key,value.array.slice()])),index=original.index.array.slice(),version=original.index.version;
const removedCalls=batchStreetStatics(root),update=prepareVegetation(root);freezeStreetTransforms(root);
assert.equal(removedCalls,0,'static batching cannot hide or merge density-controlled vegetation');
const bounds=new T.Box3().setFromObject(grass).expandByScalar(.25),camera={position:new T.Vector3()};
for(let repeat=0;repeat<3;repeat++)for(const [step,distance,level,count] of [[0,0,0,72],[1,25,1,24],[2,50,2,6],[3,75,2,6],[4,0,0,72]]){
 camera.position.set(bounds.max.x+distance,.5,bounds.getCenter(new T.Vector3()).z);update(repeat*10+step,camera,true);
 assert.equal(grass.userData.detailLevel,level);assert.equal(grass.geometry.drawRange.count,count);assert.equal(grass.visible,distance<70);
 assert.equal(hidden.visible,false);assert.equal(grass.geometry,original);assert.equal(original.index.version,version,'distance changes never upload/rebuild indices');
 assert.deepEqual(original.index.array,index);for(const [name,array] of Object.entries(attributes))assert.deepEqual(original.attributes[name].array,array);
}
camera.position.x=bounds.max.x+50;block.visible=false;update(40,camera,true);assert.equal(grass.userData.detailLevel,0,'hidden block skips density work');
block.visible=true;update(41,camera,true);assert.equal(grass.userData.detailLevel,2);
update(42,camera,false);assert.equal(grass.userData.detailLevel,0,'catalogue view restores full detail');
let disposals=0;original.addEventListener('dispose',()=>disposals++);camera.position.set(300,2,0);updateStreetResidency(root,camera,50);updateStreetResidency(root,camera,71);
assert.equal(disposals,1);camera.position.set(9,2,-3);updateStreetResidency(root,camera,72);update(72,camera,true);assert(block.visible&&grass.visible);assert.equal(original.drawRange.count,72);assert.deepEqual(original.index.array,index);

const results=[];
for(const shape of [0,1,3,5]){
 const street=createRoadShapeBlock(3040804531,shape,{backdrop:false,connected:true}),totals={grass:[0,0,0],leaves:[0,0,0],stems:[0,0,0]};let ruin=0,cells=0;
 street.traverse(mesh=>{
  const counts=mesh.userData.vegetationDensity;if(!counts)return;cells++;const kind=mesh.userData.vegetationKind;
  assert(counts[0]>=counts[1]&&counts[1]>=counts[2]);assert.equal(counts[0],mesh.geometry.index.count);
  if(kind!=='grass')for(const count of counts)assert.equal(count%6,0,'density cannot cut a leaf or stem segment in half');
  assert(Object.values(mesh.geometry.attributes).every(a=>a.array.every(Number.isFinite)));
  counts.forEach((n,i)=>totals[kind][i]+=n/3);if(mesh.userData.ruinVines)ruin++;
 });
 assert(totals.grass[1]<totals.grass[0]*.36);assert(totals.grass[2]<totals.grass[0]*.1);
 assert(totals.leaves[2]<totals.leaves[0]*.18);assert(totals.stems[2]<totals.stems[0]*.4);
 if(shape===0){assert.equal(totals.grass[0],40128);assert.equal(totals.leaves[0]+totals.stems[0],14638);}
 if(shape===5)assert(ruin>0,'collapsed-building vines now participate in density LOD');
 const live=prepareVegetation(street);assert.equal(live.snapshot().cells,cells);
 results.push({shape,cells,triangles:totals});disposeStreetBlock(street);
}
console.log(JSON.stringify(results,null,2));
console.log('PASS full-detail restoration, nested intact leaves/strands, 24/8/2 grass blades, no buffer uploads on distance change, frozen transforms, hidden blocks, hysteresis and GPU release/return');

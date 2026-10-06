import assert from 'node:assert/strict';
import {generateBrickBlock,validateBrickBlock,brickBuildingWidth,treeCanopyMask} from '../brick-street-layout.js';
for(let i=0;i<100;i++){const b=generateBrickBlock(i);assert.deepEqual(b,generateBrickBlock(i));assert.deepEqual(validateBrickBlock(b),b);const child=generateBrickBlock(i+200,b);assert.deepEqual(validateBrickBlock(child),child);assert.deepEqual(child.buildings.map(v=>[v.floors,v.columns,v.tone]),b.buildings.map(v=>[v.floors,v.columns,v.tone]));assert(b.vehicles.every(v=>Math.abs(v.z)<16));assert(b.buildings.every(v=>v.cells.filter(c=>c==='door').length===1));}assert.throws(()=>validateBrickBlock({version:2,seed:-1}));console.log('PASS 100 reproducible seeds, exact JSON restoration, inherited building structure, entrance placement and seam clearances');
import * as T from 'three';
import {buildBrickStreet,disposeBrickStreet} from '../brick-street-scene.js';
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>new Proxy({},{get:()=>()=>{}})})};
const library=new Map([['car',[2,1.5,5.2]],['wreck-bus',[2.4,3.1,10.5]],['wreck-truck',[2.4,3.1,7.5]]].map(([id,s])=>{const geometry=new T.BoxGeometry(...s);geometry.translate(0,s[1]/2,0);return [id,{maxSize:Math.max(...s),parts:[{geometry,material:new T.MeshStandardMaterial()}]}];}));
for(let seed=0;seed<30;seed++){const colliders=[],root=buildBrickStreet(generateBrickBlock(seed),library,{colliders});assert(root.children.length<40,'merged render batches');assert(colliders.length>12);disposeBrickStreet(root);}console.log('PASS 30 assembled scenes: height-field walk/jump passage, merged draw batches, shared vehicle geometry retained');

import {VEHICLE_TYPES,VEHICLE_PAINTS,getRuinedVehicle} from '../ruined-vehicles.js';
const types=new Set(),paints=new Set();for(let seed=0;seed<100;seed++){const b=generateBrickBlock(seed);assert.equal(new Set(b.vehicles.map(v=>v.id)).size,6);b.vehicles.forEach(v=>{types.add(v.id);paints.add(v.paint);});for(const version of [2,3]){const old=generateBrickBlock(seed,null,version);assert.deepEqual(validateBrickBlock(old),old);}}
assert.equal(types.size,VEHICLE_TYPES.length);assert.equal(paints.size,VEHICLE_PAINTS.length);for(const v of VEHICLE_TYPES.filter(v=>v.style)){const model=getRuinedVehicle(v.id,0);assert(model.size.x>1&&model.size.z>3);assert.equal(model.parts.find(p=>p.material.color.getHex()===0x262923).material,getRuinedVehicle(v.id,1).parts.find(p=>p.material.color.getHex()===0x262923).material);}
console.log('PASS 12 vehicle types, 8 paints, six distinct vehicles per candidate, legacy block restoration and shared materials');

let holes=0,joined=0,openRoofs=0;
for(let seed=0;seed<12;seed++){const b=generateBrickBlock(seed),root=buildBrickStreet(b,library);root.updateMatrixWorld(true);const opaque=root.children.filter(m=>[0x854b38,0x784333,0x92543c,0x6f3e31,0x929383,0x694635].includes(m.material.color.getHex())),ray=new T.Raycaster();for(const wall of b.buildings){const front=wall.side*8.6,cw=brickBuildingWidth(wall)/wall.columns,H=wall.floors*3.1;for(let f=0;f<wall.floors;f++)for(let c=0;c<wall.columns;c++){if(wall.cells[f*wall.columns+c]!=='collapsed')continue;const z=wall.z-brickBuildingWidth(wall)/2+(c+.5)*cw;ray.set(new T.Vector3(front-wall.side*.8,f*3.1+1.55,z),new T.Vector3(wall.side,0,0));assert(ray.intersectObjects(opaque)[0].distance>2,'facade hole must have real depth');holes++;if(c+1<wall.columns&&wall.cells[f*wall.columns+c+1]==='collapsed'){ray.set(new T.Vector3(front-wall.side*.8,f*3.1+1.55,z+cw/2),new T.Vector3(wall.side,0,0));assert(ray.intersectObjects(opaque)[0].distance>2,'joined holes must omit their shared wall');joined++;}if(f===wall.floors-1){ray.set(new T.Vector3(front+wall.side*1.2,H+1,z),new T.Vector3(0,-1,0));const hit=ray.intersectObjects(opaque)[0];assert(!hit||hit.point.y<H-.5,'top-floor hole must open through roof');openRoofs++;}}}disposeBrickStreet(root);}
assert(holes>30&&joined>10&&openRoofs>10);console.log('PASS real facade openings, merged neighboring holes and open top-floor roofs');

let irregular=0;
for(let seed=0;seed<6;seed++){const block=generateBrickBlock(seed),root=buildBrickStreet(block,library);root.updateMatrixWorld(true);const walls=root.children.filter(m=>[0x854b38,0x784333,0x92543c,0x6f3e31].includes(m.material.color.getHex()));for(const b of block.buildings)for(let f=1;f<b.floors;f++)for(let c=0;c<b.columns;c++){if(b.cells[f*b.columns+c]!=='collapsed'||c>0&&b.cells[f*b.columns+c-1]==='collapsed')continue;const z=b.z-brickBuildingWidth(b)/2+c*brickBuildingWidth(b)/b.columns+.27,ray=new T.Raycaster(),depths=[];for(let k=0;k<12;k++){ray.set(new T.Vector3(b.side*7.8,f*3.1+.6+k*.15,z),new T.Vector3(b.side,0,0));depths.push(ray.intersectObjects(walls)[0]?.distance||20);}if(Math.max(...depths)-Math.min(...depths)>1)irregular++;}disposeBrickStreet(root);}
assert(irregular>5,'broken perimeter must vary along its height');console.log('PASS irregular fracture silhouettes along opening edges');

const masks=new Set();for(let seed=0;seed<100;seed++){const mask=treeCanopyMask(seed);assert.equal(mask.length,12);assert.equal(new Set(mask).size,12);assert(mask.every(c=>c>=0&&c<16));assert.deepEqual(mask,treeCanopyMask(seed));masks.add(mask.join());}assert(masks.size>80);console.log("PASS reproducible 4x4 canopy masks with twelve occupied cells and varied silhouettes");

import {populateBrickRoute} from '../brick-street-world.js';
import {scaleCityWorld} from '../city-world-scale.js';
import {movePlayerWithSlide} from '../player-movement.js';
globalThis.localStorage={getItem:()=>null};
const city=new T.Group(),terrain=[],route=populateBrickRoute(123,library,city,terrain,{destination:'brick',blocks:1});
const oldLength=route.length,oldBounds=route.bounds.z,oldHeight=terrain.find(p=>p.walkable).h;
scaleCityWorld(city,terrain,route);
assert.equal(route.length,oldLength*1.2);assert.equal(route.width,12);assert.equal(route.bounds.z,oldBounds*1.2);
assert.equal(terrain.find(p=>p.walkable).h,oldHeight*1.2);
assert(Math.abs(route.progress(route.sample(route.length*.7))-route.length*.7)<1e-8);
for(const side of [-1,1])for(const fps of [30,144]){
 const pavement=terrain.find(p=>p.walkable&&p.x*side>0);let pos=new T.Vector3(side*4.8,1.703,0);
 for(const direction of [side,-side])for(let i=0;i<fps*.5;i++){
  const velocity=new T.Vector3(direction*6,-23/fps,0),step=movePlayerWithSlide(pos,pos.clone().addScaledVector(velocity,1/fps),velocity,[pavement]);
  assert(!step.blocked,'road/sidewalk crossing must not block');pos=step.position;
 }
 assert(Math.abs(pos.x-side*4.8)<.01,'crossing and returning preserves horizontal travel');
}
city.children.forEach(disposeBrickStreet);
console.log('PASS 1.2x geometry, collision, route distances/bounds and bidirectional sidewalk crossing at 30/144 FPS');

import {createBrickPath,bendBrickBlock} from '../brick-route-path.js';
import {rng} from '../brick-street-layout.js';
for(let seed=0;seed<100;seed++){
 const path=createBrickPath(12,rng(seed)),again=createBrickPath(12,rng(seed));assert.deepEqual(path.route.points,again.route.points);
 assert(path.route.points.some(p=>Math.abs(p.x)>10),'street bends sideways');
 for(let i=1;i<path.blocks.length;i++)assert.deepEqual(path.blocks[i-1].bottom,path.blocks[i].top,'adjacent blocks join without gaps');
 for(let s=0;s<path.route.length;s+=3)assert(Math.abs(path.route.progress(path.route.sample(s))-s)<1e-7,'distance and return progress follow bends');
 for(const block of path.blocks){const geometry=new T.BoxGeometry(10,.04,36),mesh=new T.Group();geometry.translate(0,0,(block.top.z+block.bottom.z)/2);mesh.add(new T.Mesh(geometry));const colliders=bendBrickBlock(mesh,[{x:6.8,z:(block.top.z+block.bottom.z)/2,w:3.6,d:36,h:.015,walkable:true}],block);assert.equal(colliders.length,18);assert(colliders.every(p=>p.w<4.4),'curved sidewalk cannot create a broad blocking box');geometry.dispose();}
}
console.log('PASS 100 bent routes: deterministic turns, joined block seams, arc-length progress and tight pavement collisions');

import assert from 'node:assert/strict';
import {generateBrickBlock,validateBrickBlock} from '../brick-street-layout.js';
for(let i=0;i<100;i++){const b=generateBrickBlock(i);assert.deepEqual(b,generateBrickBlock(i));assert.deepEqual(validateBrickBlock(b),b);const child=generateBrickBlock(i+200,b);assert.deepEqual(validateBrickBlock(child),child);assert.deepEqual(child.buildings.map(v=>[v.floors,v.columns,v.tone]),b.buildings.map(v=>[v.floors,v.columns,v.tone]));assert(b.vehicles.every(v=>Math.abs(v.z)<16));assert(b.buildings.every(v=>v.cells.filter(c=>c==='door').length===1));}assert.throws(()=>validateBrickBlock({version:2,seed:-1}));console.log('PASS 100 reproducible seeds, exact JSON restoration, inherited building structure, entrance placement and seam clearances');
import * as T from 'three';
import {buildBrickStreet,disposeBrickStreet} from '../brick-street-scene.js';
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>new Proxy({},{get:()=>()=>{}})})};
const library=new Map([['car',[2,1.5,5.2]],['wreck-bus',[2.4,3.1,10.5]],['wreck-truck',[2.4,3.1,7.5]]].map(([id,s])=>{const geometry=new T.BoxGeometry(...s);geometry.translate(0,s[1]/2,0);return [id,{maxSize:Math.max(...s),parts:[{geometry,material:new T.MeshStandardMaterial()}]}];}));
for(let seed=0;seed<30;seed++){const colliders=[],root=buildBrickStreet(generateBrickBlock(seed),library,{colliders});assert(root.children.length<40,'merged render batches');assert(colliders.length>12);disposeBrickStreet(root);}console.log('PASS 30 assembled scenes: height-field walk/jump passage, merged draw batches, shared vehicle geometry retained');

import {VEHICLE_TYPES,VEHICLE_PAINTS,getRuinedVehicle} from '../ruined-vehicles.js';
const types=new Set(),paints=new Set();for(let seed=0;seed<100;seed++){const b=generateBrickBlock(seed);assert.equal(new Set(b.vehicles.map(v=>v.id)).size,6);b.vehicles.forEach(v=>{types.add(v.id);paints.add(v.paint);});const old=generateBrickBlock(seed,null,2);assert.deepEqual(validateBrickBlock(old),old);}
assert.equal(types.size,VEHICLE_TYPES.length);assert.equal(paints.size,VEHICLE_PAINTS.length);for(const v of VEHICLE_TYPES.filter(v=>v.style)){const model=getRuinedVehicle(v.id,0);assert(model.size.x>1&&model.size.z>3);assert.equal(model.parts.find(p=>p.material.color.getHex()===0x262923).material,getRuinedVehicle(v.id,1).parts.find(p=>p.material.color.getHex()===0x262923).material);}
console.log('PASS 12 vehicle types, 8 paints, six distinct vehicles per candidate, legacy block restoration and shared materials');

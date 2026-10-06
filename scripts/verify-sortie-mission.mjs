import assert from 'node:assert/strict';
import * as T from 'three';
import {sortieMission} from '../sortie-mission.js';
import {populateBrickRoute} from '../brick-street-world.js';
import {generateBrickBlock} from '../brick-street-layout.js';
import {disposeBrickStreet} from '../brick-street-scene.js';
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>new Proxy({},{get:()=>()=>{}})})};
const saved=[generateBrickBlock(91),generateBrickBlock(92)];
globalThis.localStorage={getItem:()=>JSON.stringify(saved)};
assert.equal(sortieMission({blocks:99}).blocks,12);assert.equal(sortieMission({blocks:-3}).blocks,1);assert.equal(sortieMission({blocks:NaN}).blocks,4);
for(const blocks of [1,4,12]){
 const mission=sortieMission({destination:'saved',blocks}),root=new T.Group(),colliders=[];
 const route=populateBrickRoute(127,new Map(),root,colliders,mission);
 assert.equal(root.children.length,blocks);assert.equal(route.length,mission.length);
 assert.deepEqual(route.sample(route.length),route.end);assert.equal(route.progress(route.end),route.length);
 assert(root.userData.sequence.every(seed=>seed===91||seed===92));
 const boss={x:0,z:route.end.z+3};
 assert(!colliders.some(c=>Math.abs(boss.x-c.x)<c.w/2&&Math.abs(boss.z-c.z)<c.d/2&&c.h>1),'boss arena must have clear standing space');
 for(const street of root.children)disposeBrickStreet(street);
}
const root=new T.Group();populateBrickRoute(127,new Map(),root,[],sortieMission({destination:'brick',blocks:1}));assert(!saved.some(b=>b.seed===root.userData.sequence[0]));for(const street of root.children)disposeBrickStreet(street);
assert(sortieMission({blocks:12}).difficulty>sortieMission({blocks:4}).difficulty);assert(sortieMission({blocks:12}).enemyCount>sortieMission({blocks:4}).enemyCount);
console.log('PASS variable 1/4/12-block mission assembly, destination selection, route endpoints, clear final boss arena and difficulty scaling');

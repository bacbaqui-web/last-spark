import assert from 'node:assert/strict';
import * as T from 'three';
import {createCombatEffectPool} from '../combat-effects.js';
import {createDeathBudget} from '../death-budget.js';
import {createDropBudget} from '../combat-budget.js';
import {createCombatLightPool} from '../combat-lights.js';

const pool=createCombatEffectPool(),scene=new T.Scene(),a=new T.Vector3(1,2,3),b=new T.Vector3(-4,5,-6);
for(let round=0;round<200;round++){
 const objects=[];
 for(let i=0;i<48;i++){const casing=pool.acquire('casing');scene.add(casing);objects.push(casing);}
 assert.equal(pool.acquire('casing'),null,'cosmetic overload stays bounded');
 for(let i=0;i<100;i++){const spark=pool.acquire('spark',i%2);scene.add(spark);objects.push(spark);}
 for(let i=0;i<32;i++){const line=pool.tracer(a,b,0xff6633,.9);scene.add(line);objects.push(line);assert.deepEqual([...line.geometry.attributes.position.array],[1,2,3,-4,5,-6]);}
 for(const object of objects){assert(pool.release(object));assert(pool.release(object),'duplicate release is harmless');}
 assert.equal(scene.children.length,0);assert.equal(pool.snapshot().effectPoolActive,0);
}
assert.equal(pool.snapshot().effectPoolCreated,180,'200 volleys reuse the first allocation');
const line=pool.tracer(b,a,0x00ff00,.7);assert.equal(line.material.color.getHex(),0x00ff00);assert.equal(line.material.opacity,.7);assert.deepEqual([...line.geometry.attributes.position.array],[-4,5,-6,1,2,3]);
let disposed=0;line.geometry.addEventListener('dispose',()=>disposed++);pool.dispose();assert.equal(disposed,1);assert.equal(pool.snapshot().effectPoolActive,0);assert.equal(pool.snapshot().effectPoolRetained,0);
assert.equal(pool.release(new T.Object3D()),false);

const camera=new T.PerspectiveCamera(70,1,.1,200);camera.position.set(0,1.7,0);
const make=(z,wild=true)=>{const root=new T.Group();root.position.set(0,0,z);scene.add(root);return {group:root,robot:{root,wildId:wild?'test':null,deathDuration:5.5},deathTime:0};};
const dying=Array.from({length:9},()=>make(-15));dying.push(make(40),make(-150));
const budget=createDeathBudget(),animated=[],removed=[];
const animate=(robot,time)=>animated.push({robot,time}),dispose=robot=>{removed.push(robot);robot.root.removeFromParent();};
budget.update(dying,1/60,camera,animate,dispose);
assert.equal(removed.length,2,'offscreen and distant death effects is never initialized');assert.equal(animated.length,9,'all visible deaths scatter parts');assert.equal(dying.filter(e=>e.robot.deathPartLimit===12).length,3,'over-budget bursts limit their part count');assert.equal(budget.snapshot().simplifiedDeathEffects,3);
for(let i=0;i<40;i++)budget.update(dying,1/60,camera,animate,dispose);
assert.equal(dying.length,6,'over-budget cosmetic deaths finish promptly');
camera.rotation.y=Math.PI;budget.update(dying,1/60,camera,animate,dispose);assert.equal(dying.length,0,'turning away releases death resources instead of accumulating work');assert.equal(scene.children.length,0);
camera.rotation.set(0,0,0);
const drops=Array.from({length:200},(_,i)=>{const m=new T.Group(),beam=new T.Object3D();m.position.set((i%8-4)*.2,.5,-10-Math.floor(i/8)*.1);beam.position.copy(m.position);scene.add(m,beam);return {m,beam,base:.5,life:600,kind:'weapon'};});
const dropBudget=createDropBudget();dropBudget.update(drops,camera.position,1,camera);
assert.equal(drops.filter(d=>d.m.visible).length,32,'dense piles have a fixed detailed-model budget');assert.equal(drops.filter(d=>d.beam.visible).length,200,'all pickups retain their markers');assert(drops.every(d=>d.life===600&&d.kind==='weapon'));
const hidden=drops.find(d=>!d.m.visible),child=new T.Object3D();hidden.m.add(child);let traversals=0;child.updateMatrixWorld=()=>traversals++;scene.updateMatrixWorld(true);assert.equal(traversals,0,'hidden loot skips child transforms');
camera.rotation.y=Math.PI;dropBudget.update(drops,camera.position,2,camera);assert(drops.every(d=>!d.m.visible&&!d.beam.visible),'loot behind the camera is culled');
camera.rotation.y=0;dropBudget.update([hidden],camera.position,3,camera);scene.updateMatrixWorld(true);assert(hidden.m.visible&&traversals===1,'approaching a culled pickup restores its full model');dropBudget.clear();
const lights=createCombatLightPool(scene),actors=Array.from({length:12},(_,i)=>{const group=new T.Group(),muzzleLight=new T.PointLight(0xff3300,i+1,7,2);group.position.set(0,0,-5);group.add(muzzleLight);scene.add(group);return {group,robot:{muzzleLight}};});
lights.prepare(actors,[],camera);const slots=scene.getObjectByName('combat-light-pool').children;
assert.equal(slots.length,4);assert.equal(lights.snapshot().activeCombatLights,4);assert.equal(slots[0].intensity,12,'most influential lights retain world illumination');assert(slots.every(l=>l.visible));assert(actors.every(a=>!a.robot.muzzleLight.visible),'actor visibility no longer changes the shader light count');
actors[11].group.visible=false;lights.prepare(actors,[],camera);assert.equal(slots[0].intensity,11,'hidden actors do not illuminate the scene');
lights.prepare([],[],camera);assert(slots.every(l=>l.visible&&l.intensity===0),'empty slots stay in the shader layout with zero energy');lights.dispose();assert(!scene.getObjectByName('combat-light-pool'));
console.log('PASS 200 volleys: stable pool allocations, reset/dispose, tracer reuse, offscreen death cleanup and bounded death effects');

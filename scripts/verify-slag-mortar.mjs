import assert from 'node:assert/strict';
import * as THREE from 'three';
import {SLAG,mortarVelocity,advanceMortar,createSlagMortar} from '../slag-mortar.js';
const start=new THREE.Vector3(0,2,0),target=new THREE.Vector3(0,0,25),velocity=mortarVelocity(start,target);
const end=start.clone().addScaledVector(velocity,SLAG.flight);end.y-=SLAG.gravity*SLAG.flight**2/2;
assert(end.distanceTo(target)<1e-8,'ballistic landing matches locked target');
for(const fps of [30,60]){const state={},shots=[];for(let i=0;i<fps*7;i++)if(advanceMortar(state,1/fps,22).fire)shots.push(i/fps);assert(shots.length>=4);assert(Math.abs(shots[1]-shots[0]-.8)<.04);assert(Math.abs(shots[2]-shots[1]-.8)<.04);assert(shots[3]-shots[2]>=3.19);assert.equal(advanceMortar(state,.1,5).move,-1);assert.equal(advanceMortar(state,.1,40).move,1);}
const scene=new THREE.Scene(),system=createSlagMortar(scene);system.launch(start,target);
for(let i=0;i<120;i++)system.update(1/60);assert.equal(system.projectiles.length,0);assert.equal(system.pools.length,1);assert(system.pools[0].point.distanceTo(target)<.3);
system.clear();system.ignite(target);system.ignite(target);let damage=0;for(let i=0;i<60;i++)system.update(1/60,target,n=>damage+=n);assert.equal(damage,8,'overlapping pools never multiply DOT');
for(let i=0;i<60;i++)system.update(1/60,target.clone().setY(2),n=>damage+=n);assert.equal(damage,8,'jumping above pool avoids ground damage');
system.update(.5,new THREE.Vector3(10,0,25),n=>damage+=n);assert.equal(damage,8,'leaving stops damage');
for(let i=0;i<360;i++)system.update(1/60);assert.equal(system.pools.length,0,'fire expires after five seconds');system.clear();assert.equal(scene.children.length,0);
const blocked=createSlagMortar(scene,{collide:(a,b)=>b.z>=2?new THREE.Vector3(0,1,2):null});blocked.launch(start,target);for(let i=0;i<60;i++)blocked.update(1/60);assert.equal(blocked.projectiles.length,0);assert.equal(blocked.pools[0].point.z,2,'walls intercept projectiles');blocked.dispose();system.dispose();
console.log('PASS slag mortar: ballistics, 3-shot cadence, retreat, collision, non-stacking DOT, height, expiry and cleanup');

import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createUrbanGround} from '../urban-ground.js';
import {movePlayerWithSlide as move} from '../player-movement.js';
const platforms=[];createUrbanGround(new THREE.Scene(),platforms);
assert.equal(platforms.filter(p=>p.walkable).length,15);
for(const dt of[1/144,1/60,1/30]){
 let pos=new THREE.Vector3(-41,1.703,1),vy=0,peak=0;
 for(let i=0;i<8/dt;i++){
  const velocity=new THREE.Vector3(4,vy-23*dt,0),next=move(pos,pos.clone().addScaledVector(velocity,dt),velocity,platforms);
  assert(next.position.toArray().every(Number.isFinite));
  pos=next.position;vy=next.velocity.y;peak=Math.max(peak,pos.y);
 }
 assert(peak>2.7,'walk reaches the highest terrace without jumping');
 assert(pos.x>-10,'cross terrace without sticking');
 assert(pos.y<1.71,'descend back to street level');
}
console.log('PASS: 15 terrain steps, grounded ascent and descent at 30–144 FPS');

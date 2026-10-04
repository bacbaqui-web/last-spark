import assert from 'node:assert/strict';
import * as THREE from 'three';
import {moveDroneBoss} from '../boss-navigation.js';
for(const playerStart of [new THREE.Vector3(),new THREE.Vector3(38,1.7,38),new THREE.Vector3(-38,1.7,-38)]){
 const player=playerStart.clone(),drone=player.clone().setY(8);
 for(let i=0;i<600;i++){
  if(i>100){player.x=THREE.MathUtils.clamp(player.x+Math.sin(i*.03)*.18,-38,38);player.z=THREE.MathUtils.clamp(player.z+Math.cos(i*.03)*.18,-38,38);}
  moveDroneBoss(drone,player,1/60);
  assert(Math.hypot(drone.x-player.x,drone.z-player.z)>=8-1e-6,'boss never chases directly overhead');
  assert(Math.abs(drone.x)<=36&&Math.abs(drone.z)<=36,'boss remains in arena');
 }
}
const drone=new THREE.Vector3(0,8,35),player=new THREE.Vector3();for(let i=0;i<600;i++)moveDroneBoss(drone,player,1/60);assert(Math.hypot(drone.x,drone.z)<16,'far boss catches up to its preferred range');
console.log('PASS: drone stand-off pursuit, overhead recovery, moving player, arena corners and catch-up');

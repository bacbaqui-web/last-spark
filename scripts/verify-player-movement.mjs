import assert from 'node:assert/strict';
import * as THREE from 'three';
import {movePlayerWithSlide as move} from '../player-movement.js';
const v=(x,y,z)=>new THREE.Vector3(x,y,z);
let standing=v(0,1.703,0);for(let i=0;i<30;i++){const velocity=v(0,-23/144,0),step=move(standing,standing.clone().addScaledVector(velocity,1/144),velocity,[]);assert(step.grounded&&step.velocity.y===0,'stable support at 144 FPS without grounded flicker');standing=step.position;}
const wall={x:0,z:0,w:1,d:20,h:4};
const overlap=(p,b)=>p.x>b.x-b.w/2-.35+1e-7&&p.x<b.x+b.w/2+.35-1e-7&&p.z>b.z-b.d/2-.35+1e-7&&p.z<b.z+b.d/2+.35-1e-7&&p.y>(b.base||0)-.2+1e-7&&p.y<b.h+1.7-1e-7;
let r=move(v(-3,1.7,-4),v(3,1.6,2),v(30,-1,30),[wall],{dash:true});assert(r.position.x<-.85&&r.position.z>2,'glancing dash slides with full speed');assert(Math.abs(Math.hypot(r.velocity.x,r.velocity.z)-Math.hypot(30,30))<.001,'dash retains horizontal speed');assert(r.grounded&&!overlap(r.position,wall));
r=move(v(-3,1.7,0),v(8,1.6,0),v(140,-1,0),[wall],{dash:true});assert(r.blocked&&r.position.x<-.85&&r.velocity.x===0,'head-on fast dash stops outside wall');
r=move(v(-3,1.7,0),v(8,1.6,.03),v(140,-1,.4),[wall],{dash:true});assert(r.blocked,'near head-on does not invent sideways dash');
r=move(v(0,1.7,0),v(.3,1.6,.3),v(20,-1,20),[wall],{dash:true});assert(!overlap(r.position,wall),'embedded player is ejected safely');
const corner=[{x:0,z:0,w:1,d:20,h:4},{x:-4,z:3,w:10,d:1,h:4}];r=move(v(-3,1.7,0),v(7,1.6,10),v(150,-1,150),corner,{dash:true});assert(corner.every(b=>!overlap(r.position,b))&&r.blocked,'two wall corner stops without overlap');
r=move(v(40,1.7,0),v(45,1.6,5),v(30,-1,30),[],{dash:true});assert(r.position.x<41.5&&r.position.z>5&&r.velocity.x===0,'arena boundary also slides at speed');
const thin={x:0,z:0,w:.05,d:10,h:4};r=move(v(-12,1.7,0),v(12,1.6,0),v(300,-1,0),[thin],{dash:true});assert(r.position.x<-.375,'cannot tunnel across thin wall');
const platform={x:0,z:0,w:8,d:8,h:2};r=move(v(0,7,0),v(0,2,0),v(0,-80,0),[platform]);assert(r.grounded&&Math.abs(r.position.y-3.703)<.0001,'fast falling lands on platform');
r=move(v(0,3.703,0),v(7,3.7,0),v(100,-1,0),[platform],{dash:true});assert(r.position.x>6.9&&!overlap(r.position,platform),'dash can leave platform edge');
const ceiling={x:0,z:0,w:8,d:8,base:3,h:4};r=move(v(0,1.7,0),v(0,5,0),v(0,30,0),[ceiling]);assert(r.position.y<2.8&&r.velocity.y===0,'jump stops below ceiling');r=move(v(-6,1.7,0),v(6,1.7,0),v(100,0,0),[ceiling]);assert(r.position.x===6,'raised obstacle allows walking underneath');
for(const dt of[1/144,1/60,1/30,.04]){let pos=v(-2,1.703,-6),velocity=v(30,-.5,30);for(let i=0;i<Math.ceil(.25/dt);i++){const next=move(pos,pos.clone().addScaledVector(velocity,dt),velocity,corner,{dash:true});assert(corner.every(b=>!overlap(next.position,b)),`no overlap at dt ${dt}`);pos=next.position;velocity=next.velocity;}assert(pos.x<=-.85&&pos.z<=2.15,'consistent wall side and corner across frame rates');}
// Fixed seed: sweep long and short movements through neighboring/overlapping boxes.
let seed=9127;const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);const boxes=[...corner,platform,{x:1,z:-3,w:2,d:2,h:3}];for(let i=0;i<1000;i++){const start=v(random()*20-10,1.7+random()*6,random()*20-10),velocity=v(random()*300-150,random()*80-40,random()*300-150),next=move(start,start.clone().addScaledVector(velocity,.04),velocity,boxes,{dash:true});assert(boxes.every(b=>!overlap(next.position,b)),'random sweep/overlap recovery remains outside solid boxes');assert(next.position.toArray().every(Number.isFinite),'finite movement');}
console.log('PASS: smooth full-speed wall slide, frontal/corner stop, overlap recovery, thin wall tunneling, landing/ceiling/platform edge, 30–144 FPS, 1000 seeded sweeps');

const {vehicleColliders}=await import('../vehicle-collision.js');
const angle=Math.PI/4,along=v(Math.sin(angle),0,Math.cos(angle)),across=v(Math.cos(angle),0,-Math.sin(angle));
for(const roll of [0,.15]){
 const cars=[-1,1].map(side=>{const car=new THREE.Mesh(new THREE.BoxGeometry(2,1.5,6),new THREE.MeshBasicMaterial());car.position.copy(across.clone().multiplyScalar(side*1.7)).setY(.75);car.rotation.set(0,angle,roll);return car;});
 const carBoxes=cars.flatMap(car=>vehicleColliders(car));
 for(const fps of [30,144]){let pos=along.clone().multiplyScalar(-4).setY(1.703);for(let i=0;i<fps*2;i++){const velocity=along.clone().multiplyScalar(4).setY(-23/fps),step=move(pos,pos.clone().addScaledVector(velocity,1/fps),velocity,carBoxes);assert(!step.blocked,'body-width diagonal vehicle gap stays passable');pos=step.position;}assert(pos.dot(along)>3.9,'full travel through rotated vehicle gap');}
 for(const car of cars){car.geometry.dispose();car.material.dispose();}
}
console.log('PASS actual vehicle silhouettes allow diagonal gaps at 30/144 FPS, including tilted vehicles');

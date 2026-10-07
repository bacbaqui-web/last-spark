import assert from 'node:assert/strict';
import * as T from 'three';
import {buildWalkCollision} from '../street-walk-collision.js';
function cross(root, dx=0, dz=-.07, startX=0){
 const collision=buildWalkCollision(root),position=new T.Vector3(startX,1.7,2);let foot=.025;
 for(let i=0;i<65;i++)foot=collision.move(position,dx,dz,foot);
 return position.z< -1;
}
for(const [kind,height,pass] of [['rubble',1.1,true],['car',1.1,false],['ground',.6,true],['rubble',1.6,false],['building',2,false]]){
 const root=new T.Group(),mesh=new T.Mesh(new T.BoxGeometry(2,height,1));mesh.position.y=height/2;mesh.userData.collisionKind=kind;root.add(mesh);
 assert.equal(cross(root),pass,`${kind} ${height}m`);
}
// Regression: overlapping rotated debris stopped the lower capsule at a sloping edge.
for(let seed=0;seed<20;seed++){
 const root=new T.Group();
 for(let i=0;i<9;i++){
  const mesh=new T.Mesh(new T.BoxGeometry(.75,.3,.7));mesh.rotation.set(.35,(i+seed)*.43,.3);
  mesh.position.set((i%3-1)*.55,.2+Math.sin(i+seed)*.1,(Math.floor(i/3)-1)*.55);mesh.userData.collisionKind='rubble';root.add(mesh);
 }
 assert.equal(cross(root,.01,-.08,-.5),true,`rotated pile ${seed}`);
 assert.equal(cross(root,0,-.08,0),true,`straight crossing ${seed}`);
}
console.log('Street walking: 40 rotated pile crossings and 5 height/blocking checks passed.');
// Actual generated ground geometry: cracked asphalt, exposed roots, and narrow curb blocks.
const {addGroundDamage}=await import('../street-ground-damage.js');
let groundCrossings=0;
for(const seed of [2207,15,992,42,777]){
 const root=new T.Group();root.userData={seed,trees:[{x:4.4,z:0},{x:-4.4,z:3}]};
 for(const side of [-1,1])for(let z=-5;z<5;z+=1.2){
  const mesh=new T.Mesh(new T.BoxGeometry(.18,.18,1.16));mesh.position.set(side*3.55,.115,z);mesh.userData.collisionKind='ground';root.add(mesh);
 }
 addGroundDamage(root);const collision=buildWalkCollision(root);
 for(const side of [-1,1])for(const z of [-3,-2,-1,0,1,2,3]){
  const position=new T.Vector3(side*2.5,1.7,z);let foot=.025;
  for(let i=0;i<35;i++)foot=collision.move(position,side*.06,0,foot);
  assert.ok(Math.abs(position.x)>4.5,`ground/curb crossing ${seed} ${side} ${z}`);groundCrossings++;
 }
}
console.log(`Generated curb/cracked-ground crossings: ${groundCrossings} passed.`);

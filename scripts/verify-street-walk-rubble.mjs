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

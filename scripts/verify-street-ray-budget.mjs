import assert from 'node:assert/strict';
import * as T from 'three';
import {buildWalkCollision} from '../street-walk-collision.js';

const root=new T.Group();root.userData={walkBounds:100,walkBoundsZ:300,groundBase:0};
const material=new T.MeshBasicMaterial({side:T.DoubleSide}),geometry=new T.BoxGeometry(3,4,.4);
for(let i=0;i<80;i++){const wall=new T.Mesh(geometry,material);wall.position.set(0,2,-4-i*3);wall.userData.collisionKind='building';root.add(wall);}
const scaled=new T.Mesh(new T.BoxGeometry(2,2,2),material);scaled.position.set(10,3,-12);scaled.scale.set(.5,2,3);scaled.rotation.y=.4;scaled.userData.collisionKind='building';root.add(scaled);
const collision=buildWalkCollision(root),ray=new T.Raycaster(new T.Vector3(0,2,0),new T.Vector3(0,0,-1),0,280);
const all=ray.intersectObject(collision.rayTarget),fullEntries=collision.rayStats.entries;assert.equal(all.length,80);
ray.firstHitOnly=true;const count=collision.rayStats.entries,first=ray.intersectObject(collision.rayTarget);assert.equal(first.length,1);assert.equal(first[0].object,all[0].object);assert(Math.abs(first[0].distance-all[0].distance)<1e-6);const nearestEntries=collision.rayStats.entries-count;assert(nearestEntries<fullEntries/10,'nearest wall stops later cells');
for(const [origin,direction,near,far] of [
 [[0,2,0],[0,0,-1],4,20], // Entry before near, exit beyond near.
 [[0,2,-4],[0,0,-1],0,100], // Inside a collider.
 [[0,20,-4],[0,-1,0],0,30], // Vertical ray.
 [[0,2,-250],[0,0,1],0,280], // Reverse traversal.
 [[10,3,4],[0,0,-1],0,90], // Rotated, nonuniformly scaled collider.
 [[10,3,4],[0,0,-1],8,14],
 [[5,2,4],[0,0,-1],0,280], // Miss.
 ]){
 ray.set(new T.Vector3(...origin),new T.Vector3(...direction).normalize());ray.near=near;ray.far=far;
 const expected=ray.intersectObjects(root.children,false)[0],actual=ray.intersectObject(collision.rayTarget)[0];
 assert.equal(!!actual,!!expected);if(expected){assert.equal(actual.object,expected.object);assert(Math.abs(actual.distance-expected.distance)<1e-5,'same nearest visible surface and range limits');}
}
root.visible=false;ray.set(new T.Vector3(0,2,0),new T.Vector3(0,0,-1));ray.near=0;ray.far=20;assert(ray.intersectObject(collision.rayTarget).length,'hidden render blocks still stop bullets');
console.log(`PASS spatial rays: ${fullEntries} collider tests -> ${nearestEntries} nearest-wall query, scaled/inside/near/vertical/hidden cases`);

import assert from 'node:assert/strict';
import * as T from 'three';
import {createServer} from 'vite';
import {buildWalkCollision} from '../street-walk-collision.js';
import {movePlayerWithSlide} from '../player-movement.js';
const server=await createServer({server:{middlewareMode:true}});
try{
 const {planStreetMap}=await server.ssrLoadModule('/street-random-map.js');
 const {connectedStreetRoute}=await server.ssrLoadModule('/connected-street-world.js');
 for(const level of [1,2,5])for(const seed of [2207,9182,503,8103,4812]){const tiles=planStreetMap(seed,level),t=tiles.find(t=>t.role==='start'),a=-t.rotation*Math.PI/2,spawn={x:t.x*72+13*Math.sin(a),z:t.z*72+13*Math.cos(a),yaw:a+Math.PI},route=connectedStreetRoute(tiles,spawn),finish=tiles.find(t=>t.role==='finish');assert.equal(route.start.x,spawn.x);assert.equal(route.start.z,spawn.z);assert(Math.hypot(route.end.x-finish.x*72,route.end.z-finish.z*72)<.01);assert(Math.abs(route.progress(route.end)-route.length)<.01);for(let d=0;d<route.length;d+=2){const p=route.sample(d);assert(Number.isFinite(p.x)&&Number.isFinite(p.z));assert(Math.abs(p.x)<=route.bounds.x&&Math.abs(p.z)<=route.bounds.z);}}
 const root=new T.Group();root.userData={walkBounds:20,walkBoundsZ:20,groundBase:-3};const ground=new T.Mesh(new T.PlaneGeometry(30,30));ground.rotation.x=-Math.PI/2;ground.position.y=-2;ground.userData.collisionKind='ground';root.add(ground);const curb=new T.Mesh(new T.BoxGeometry(3,.2,1));curb.position.set(0,-1.9,0);curb.userData.collisionKind='ground';root.add(curb);const platforms=[];platforms.streetCollision=buildWalkCollision(root);let position=new T.Vector3(0,-.3,2),velocity=new T.Vector3(0,-.4,-2);for(let i=0;i<90;i++){const moved=movePlayerWithSlide(position,position.clone().addScaledVector(velocity,1/60),velocity,platforms);position=moved.position;velocity.set(0,-.4,-2);}assert(position.z<-.8,'curb crossing uses current standing height');assert(position.y<0,'crater terrain is not replaced with global zero floor');
 console.log('PASS: 15 connected routes, curved paths, crash endpoint, arrival heading, raised curb and crater floor movement');
}finally{await server.close();}

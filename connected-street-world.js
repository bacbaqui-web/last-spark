import * as T from 'three';
import {createRandomStreetMap,planStreetMap} from './street-random-map.js';
import {roadShapes} from './street-road-shapes.js';
import {buildWalkCollision} from './street-walk-collision.js';
import {disposeStreetBlock} from './salvage-street-block.js';
import {prepareVegetation} from './street-vegetation-runtime.js';
const directions=[[0,1],[-1,0],[0,-1],[1,0]],key=t=>`${t.x},${t.z}`;
export function connectedStreetRoute(tiles,spawn){
 const start=tiles.find(t=>t.role==='start'),end=tiles.find(t=>t.role==='finish'),lookup=new Map(tiles.map(t=>[key(t),t])),parents=new Map([[start,null]]),queue=[start];
 const ports=t=>(t.shape===6?[0]:roadShapes[t.shape].ports).map(p=>(p+t.rotation)%4);
 for(const t of queue)for(const p of ports(t)){const [x,z]=directions[p],next=lookup.get(`${t.x+x},${t.z+z}`);if(next&&!parents.has(next)&&ports(next).includes((p+2)%4)){parents.set(next,t);queue.push(next);}}
 const path=[];for(let t=end;t;t=parents.get(t))path.unshift(t);if(path[0]!==start)throw Error('추락지까지 연결되지 않은 맵');
 const points=[{x:spawn.x,z:spawn.z}],world=(t,x,z)=>{const a=-t.rotation*Math.PI/2;return {x:t.x*72+x*Math.cos(a)+z*Math.sin(a),z:t.z*72-x*Math.sin(a)+z*Math.cos(a)};};
 for(let i=0;i<path.length;i++){const t=path[i];if(t.shape===1||t.shape===2){const sign=t.shape===1?1:-1,curve=Array.from({length:17},(_,n)=>world(t,sign*(14-14*Math.cos(n*Math.PI/32)),14-14*Math.sin(n*Math.PI/32)));const previous=points.at(-1);if(Math.hypot(previous.x-curve[0].x,previous.z-curve[0].z)>Math.hypot(previous.x-curve.at(-1).x,previous.z-curve.at(-1).z))curve.reverse();points.push(...curve);}else if(i>0)points.push(world(t,0,0));if(i<path.length-1)points.push({x:(t.x+path[i+1].x)*36,z:(t.z+path[i+1].z)*36});}
 let length=0;const segments=points.slice(1).map((b,i)=>{const a=points[i],distance=Math.hypot(b.x-a.x,b.z-a.z),s=length;length+=distance;return {a,b,distance,s,dx:(b.x-a.x)/distance,dz:(b.z-a.z)/distance};}).filter(s=>s.distance>1e-6);
 const sample=(distance,offset=0)=>{const s=T.MathUtils.clamp(distance,0,length),seg=segments.find(v=>s<=v.s+v.distance)||segments.at(-1),t=(s-seg.s)/seg.distance;return {x:seg.a.x+seg.dx*t*seg.distance-seg.dz*offset,z:seg.a.z+seg.dz*t*seg.distance+seg.dx*offset,dx:seg.dx,dz:seg.dz};};
 const progress=p=>{let best=Infinity,result=0;for(const s of segments){const t=T.MathUtils.clamp(((p.x-s.a.x)*s.dx+(p.z-s.a.z)*s.dz)/s.distance,0,1),d=Math.hypot(p.x-s.a.x-s.dx*t*s.distance,p.z-s.a.z-s.dz*t*s.distance);if(d<best){best=d;result=s.s+t*s.distance;}}return result;};
 return {points,segments,length,width:7,bounds:{x:Math.max(...tiles.map(t=>Math.abs(t.x)*72+36)),z:Math.max(...tiles.map(t=>Math.abs(t.z)*72+36))},start:sample(0),end:sample(length),sample,progress,connectedStreets:true,spawnYaw:spawn.yaw,blockCount:tiles.length};
}
export function createConnectedStreetWorld(scene,platforms,mats){
 scene.background=new T.Color(0x2589df);scene.fog=new T.Fog(0xb5d8ed,100,240);
 const sun=scene.children.find(o=>o.isDirectionalLight);let shadowCell='';
 const ground=new T.Group();ground.name='connected-salvage-streets';scene.add(ground);const route={},extraction=new T.Group(),target=new T.Group();scene.add(extraction,target);
 const reward=new T.Mesh(new T.IcosahedronGeometry(.5,1),new T.MeshStandardMaterial({color:0xbc9cff,emissive:0x704ad3,emissiveIntensity:1}));reward.position.y=1;target.add(reward);
 let seed=2207,mission={blocks:4},root,collision,vegetation,unlocked=false;const obstacles=[];
 function regenerate(nextSeed=crypto.getRandomValues(new Uint32Array(1))[0]){seed=nextSeed;if(root){disposeStreetBlock(root);ground.remove(root);}platforms.length=0;obstacles.length=0;platforms.collisionRevision=(platforms.collisionRevision||0)+1;
  const level=Math.max(1,Math.min(5,Math.ceil(mission.blocks/3)));root=createRandomStreetMap(seed,level);ground.add(root);root.updateMatrixWorld(true);Object.assign(route,connectedStreetRoute(root.userData.tiles,root.userData.spawn));platforms.bounds=route.bounds;collision=buildWalkCollision(root);platforms.streetCollision=collision;
  const bounds=new T.Box3(),p=new T.Vector3();root.traverse(o=>{const kind=o.userData.collisionKind;if(!['building','car','tree'].includes(kind))return;bounds.setFromObject(o);const size=bounds.getSize(new T.Vector3()),center=bounds.getCenter(p);if(size.y<.2)return;platforms.push({x:center.x,z:center.z,w:size.x,d:size.z,h:bounds.max.y,vehicle:kind==='car'});});
  // Raycasts use the authored surfaces, including transformed instanced debris.
  const rayMeshes=new Set();root.traverse(o=>{if(o.userData.collisionKind)o.traverse(m=>{if(m.isMesh)rayMeshes.add(m);});});obstacles.push(...rayMeshes);
  vegetation=prepareVegetation(root);for(const block of root.children)block.visible=Math.hypot(block.position.x-route.start.x,block.position.z-route.start.z)<100;extraction.position.set(route.start.x,0,route.start.z);target.position.set(route.end.x,collision.height(route.end.x,route.end.z,0),route.end.z);ground.userData={...root.userData,seed,connectedStreets:true};world.reset();return seed;
 }
 const world={route,ground,extraction,target,obstacles,loaded:true,get seed(){return seed;},get unlocked(){return unlocked;},configureMission(value){mission=value;},regenerate,async regenerateAsync(value){await new Promise(resolve=>setTimeout(resolve,0));return regenerate(value);},reset(){unlocked=false;target.visible=true;reward.visible=false;},unlock(){unlocked=true;reward.visible=true;root.children.find(o=>o.userData.bossStage)?.userData.previewBossDefeat?.();},update(time){reward.rotation.y=time;root.userData.updateLife?.(time,scene.userData.gameCamera);root.userData.updateImpactFire?.(time);if(scene.userData.gameCamera){const camera=scene.userData.gameCamera;if(sun){const x=Math.round(camera.position.x/25)*25,z=Math.round(camera.position.z/25)*25,cell=x+':'+z;if(cell!==shadowCell){shadowCell=cell;sun.position.set(x-50,100,z+50);sun.target.position.set(x,0,z);scene.add(sun.target);Object.assign(sun.shadow.camera,{left:-65,right:65,top:65,bottom:-65,far:240});sun.shadow.camera.updateProjectionMatrix();}}for(const block of root.children)block.visible=Math.hypot(block.position.x-camera.position.x,block.position.z-camera.position.z)<110;vegetation(time,camera,true);}root.userData.recoveryDrone?.userData.updateDefense?.(time);}};
 // Build on first sortie, rather than freezing the hangar with a full map at startup.
 const tiles=planStreetMap(seed);Object.assign(route,connectedStreetRoute(tiles,{x:0,z:85,yaw:0}));world.ready=Promise.resolve(world);return world;
}

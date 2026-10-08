import * as T from 'three';
import {createSatelliteCrashBlock} from './satellite-crash-block.js';
import {createRoadShapeBlock,roadShapes} from './street-road-shapes.js';
const vectors=[[0,1],[-1,0],[0,-1],[1,0]],key=(x,z)=>`${x},${z}`;
export function planStreetMap(seed=2207){
 let state=seed>>>0;const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
 for(let attempt=0;attempt<100;attempt++){
  const tiles=[],used=new Set(),add=(x,z,shape,rotation,role)=>{used.add(key(x,z));tiles.push({x,z,shape,rotation,role,seed:(seed+tiles.length*37)>>>0});};
  add(0,1,5,2,'start');let x=0,z=0,incoming=0,failed=false;
  for(const shape of [random()<.5?1:2,3,4,random()<.5?1:2]){
   const candidates=[];
   for(let rotation=0;rotation<4;rotation++){
    const ports=roadShapes[shape].ports.map(p=>(p+rotation)%4);if(!ports.includes(incoming))continue;
    for(const outgoing of ports.filter(p=>p!==incoming)){
     const exits=ports.filter(p=>p!==incoming);if(exits.every(p=>{const [dx,dz]=vectors[p];return !used.has(key(x+dx,z+dz));}))candidates.push({rotation,outgoing,ports});
    }
   }
   if(!candidates.length){failed=true;break;}const c=candidates[Math.floor(random()*candidates.length)];
   add(x,z,shape,c.rotation,'main');
   for(const p of c.ports.filter(p=>p!==incoming&&p!==c.outgoing)){const [dx,dz]=vectors[p];add(x+dx,z+dz,5,(p+2)%4,'deadend');}
   const [dx,dz]=vectors[c.outgoing];x+=dx;z+=dz;incoming=(c.outgoing+2)%4;
  }
  if(!failed&&!used.has(key(x,z))){add(x,z,6,incoming,'finish');return tiles;}
 }
 throw new Error('거리 연결 배치를 생성하지 못했습니다.');
}
export function createRandomStreetMap(seed=2207){
 const root=new T.Group(),tiles=planStreetMap(seed),houses=[],trees=[],cars=[],smallRides=[];let debris=0;const updates=[];
 for(const tile of tiles){const block=tile.shape===6?createSatelliteCrashBlock(tile.seed,{backdrop:false}):createRoadShapeBlock(tile.seed,tile.role==='start'?0:tile.shape,{backdrop:false,connected:true});block.rotation.y=-tile.rotation*Math.PI/2;block.position.set(tile.x*72,0,tile.z*72);if(tile.role==='start'){const wrecks=[];block.traverse(o=>{if(o.userData.collisionKind==='car')wrecks.push(o);});wrecks.forEach(o=>o.parent.remove(o));block.userData.cars=[];const gate=new T.Mesh(new T.BoxGeometry(7,2.5,.4),new T.MeshStandardMaterial({color:0x434b49,roughness:1}));gate.position.set(0,1.25,-34);gate.userData={ownedGeometry:true,ownedMaterial:true,collisionKind:'building'};block.add(gate);}root.add(block);houses.push(...block.userData.houses);trees.push(...block.userData.trees);cars.push(...block.userData.cars);smallRides.push(...block.userData.smallRides);debris+=block.userData.debris;updates.push(block.userData.updateLife);if(tile.role==='finish')root.userData.updateImpactFire=block.userData.updateImpactFire;if(tile.role==='start'){const shelter=new T.Mesh(new T.BoxGeometry(3,2.5,5),new T.MeshStandardMaterial({color:0x465d50,roughness:1}));shelter.position.set(-5.8,1.45,-23);shelter.castShadow=shelter.receiveShadow=true;shelter.userData={ownedGeometry:true,ownedMaterial:true,collisionKind:'building'};block.add(shelter);}}
 root.userData={...root.userData,seed,tiles,spawn:{x:0,z:96},houses,trees,cars,smallRides,debris,walkBounds:600,walkBoundsZ:600,groundBase:-3,updateLife:(time,camera)=>updates.forEach(fn=>fn?.(time,camera))};return root;
}

import {disposeStreetBlock} from './salvage-street-block.js';
import {createRecoveryDrone} from './recovery-drone.js';
import * as T from 'three';
import {createSatelliteCrashBlock} from './satellite-crash-block.js';
import {createRoadShapeBlock,roadShapes} from './street-road-shapes.js';
const vectors=[[0,1],[-1,0],[0,-1],[1,0]],key=(x,z)=>`${x},${z}`;
export function planStreetMap(seed=2207,level=1){
 let state=seed>>>0;const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
 for(let attempt=0;attempt<1000;attempt++){
  const tiles=[],used=new Set(),add=(x,z,shape,rotation,role)=>{used.add(key(x,z));tiles.push({x,z,shape,rotation,role,seed:(seed+tiles.length*37)>>>0});};
  add(0,1,5,2,'start');let x=0,z=0,incoming=0,failed=false;
  const sequence=[random()<.5?1:2,3,4,random()<.5?1:2];for(let n=1;n<level;n++)sequence.push(random()<.5?1:2,3,random()<.5?1:2);
  for(const shape of sequence){
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
  if(!failed&&!used.has(key(x,z))){add(x,z,6,incoming,'finish');return chooseArrival(tiles,random);}
 }
 throw new Error('거리 연결 배치를 생성하지 못했습니다.');
}
// Connected road distance, rather than distance across buildings.
export function chooseArrival(tiles,random=Math.random){
 const finish=tiles.find(t=>t.role==='finish'),byKey=new Map(tiles.map(t=>[key(t.x,t.z),t])),distance=new Map([[finish,0]]),queue=[finish];
 for(const tile of queue)for(const port of (tile.shape===6?[0]:roadShapes[tile.shape].ports).map(p=>(p+tile.rotation)%4)){
  const [dx,dz]=vectors[port],next=byKey.get(key(tile.x+dx,tile.z+dz));
  if(next&&!distance.has(next)&&(next.shape===6?[0]:roadShapes[next.shape].ports).some(p=>(p+next.rotation)%4===(port+2)%4)){distance.set(next,distance.get(tile)+72);queue.push(next);}
 }
 const leaves=tiles.filter(t=>t.role==='start'||t.role==='deadend'),max=Math.max(...leaves.map(t=>distance.get(t)??-1)),candidates=leaves.filter(t=>distance.get(t)===max);
 const arrival=candidates[Math.floor(random()*candidates.length)];
 for(const t of leaves)t.role=t===arrival?'start':'deadend';arrival.routeDistance=max;
 return tiles;
}
function* buildMap(root,seed,level){
 const tiles=planStreetMap(seed,level),houses=[],trees=[],cars=[],smallRides=[];let debris=0;const updates=[];
 for(const tile of tiles){const block=tile.shape===6?createSatelliteCrashBlock(tile.seed,{backdrop:false}):createRoadShapeBlock(tile.seed,tile.shape,{backdrop:false,connected:true});block.rotation.y=-tile.rotation*Math.PI/2;block.position.set(tile.x*72,0,tile.z*72);if(tile.role==='start'){block.updateMatrixWorld(true);const clearTrees=[];block.traverse(o=>{if(o.userData.lod)clearTrees.push(o);});clearTrees.forEach(o=>{disposeStreetBlock(o);o.removeFromParent();});block.userData.trees=[];const wrecks=[];block.traverse(o=>{if(o.userData.collisionKind==='car')wrecks.push(o);});wrecks.forEach(o=>{disposeStreetBlock(o);o.removeFromParent();});block.userData.cars=[];}root.add(block);houses.push(...block.userData.houses);trees.push(...block.userData.trees);cars.push(...block.userData.cars);smallRides.push(...block.userData.smallRides);debris+=block.userData.debris;updates.push(block);if(tile.role==='finish')root.userData.updateImpactFire=block.userData.updateImpactFire;if(tile.role==='start'){decorateStart(block);root.userData.recoveryDrone=block.userData.recoveryDrone;}yield {completed:root.children.length,total:tiles.length};}
 const start=tiles.find(t=>t.role==='start'),angle=-start.rotation*Math.PI/2,spawn={x:start.x*72+13*Math.sin(angle),z:start.z*72+13*Math.cos(angle),yaw:angle+Math.PI};
 root.userData={...root.userData,seed,tiles,spawn,routeDistance:start.routeDistance,startVariant:((start.seed^0x389a)>>>0)%5,houses,trees,cars,smallRides,debris,walkBounds:Math.max(...tiles.map(t=>Math.abs(t.x)*72+40)),walkBoundsZ:Math.max(...tiles.map(t=>Math.abs(t.z)*72+40)),groundBase:-3,updateLife:(time,camera)=>updates.forEach(block=>{if(block.visible)block.userData.updateLife?.(time,camera);})};return root;
}

function decorateStart(block){
 const drone=createRecoveryDrone();block.add(drone);block.userData.recoveryDrone=drone;
}

export function createRandomStreetMap(seed=2207,level=1){const root=new T.Group();try{for(const _ of buildMap(root,seed,level)){}return root;}catch(error){disposeStreetBlock(root);throw error;}}
export async function createRandomStreetMapAsync(seed=2207,level=1,{signal,onProgress=()=>{}}={}){
 const root=new T.Group();try{for(const progress of buildMap(root,seed,level)){if(signal?.aborted)throw new DOMException('지도 생성을 취소했습니다.','AbortError');onProgress(progress);await new Promise(resolve=>setTimeout(resolve,0));}return root;}catch(error){disposeStreetBlock(root);throw error;}
}

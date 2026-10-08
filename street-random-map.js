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
  if(!failed&&!used.has(key(x,z))){add(x,z,6,incoming,'finish');return tiles;}
 }
 throw new Error('거리 연결 배치를 생성하지 못했습니다.');
}
export function createRandomStreetMap(seed=2207,level=1){
 const root=new T.Group(),tiles=planStreetMap(seed,level),houses=[],trees=[],cars=[],smallRides=[];let debris=0;const updates=[];
 for(const tile of tiles){const block=tile.shape===6?createSatelliteCrashBlock(tile.seed,{backdrop:false}):createRoadShapeBlock(tile.seed,tile.role==='start'?0:tile.shape,{backdrop:false,connected:true});block.rotation.y=-tile.rotation*Math.PI/2;block.position.set(tile.x*72,0,tile.z*72);if(tile.role==='start'){const wrecks=[];block.traverse(o=>{if(o.userData.collisionKind==='car')wrecks.push(o);});wrecks.forEach(o=>o.parent.remove(o));block.userData.cars=[];const gate=new T.Mesh(new T.BoxGeometry(7,2.5,.4),new T.MeshStandardMaterial({color:0x434b49,roughness:1}));gate.position.set(0,1.25,-34);gate.userData={ownedGeometry:true,ownedMaterial:true,collisionKind:'building'};block.add(gate);}root.add(block);houses.push(...block.userData.houses);trees.push(...block.userData.trees);cars.push(...block.userData.cars);smallRides.push(...block.userData.smallRides);debris+=block.userData.debris;updates.push(block.userData.updateLife);if(tile.role==='finish')root.userData.updateImpactFire=block.userData.updateImpactFire;if(tile.role==='start'){decorateStart(block);}}
 root.userData={...root.userData,seed,tiles,spawn:{x:0,z:96},houses,trees,cars,smallRides,debris,walkBounds:Math.max(...tiles.map(t=>Math.abs(t.x)*72+40)),walkBoundsZ:Math.max(...tiles.map(t=>Math.abs(t.z)*72+40)),groundBase:-3,updateLife:(time,camera)=>updates.forEach(fn=>fn?.(time,camera))};return root;
}

function decorateStart(block){
 const metal=new T.MeshStandardMaterial({color:0x596657,roughness:1}),wood=new T.MeshStandardMaterial({color:0x807059,roughness:1});if(typeof document!=='undefined'){const loader=new T.TextureLoader();metal.map=loader.load(new URL('./textures/street/nyc-prop-materials.jpg',document.baseURI).href);wood.map=loader.load(new URL('./textures/houses/aged-wood-floor.jpg',document.baseURI).href);metal.map.colorSpace=wood.map.colorSpace=T.SRGBColorSpace;}
 function box(x,y,z,w,h,d,mat){const o=new T.Mesh(new T.BoxGeometry(w,h,d),mat);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;o.userData={ownedGeometry:true,collisionKind:'building'};block.add(o);return o;}
 box(-5.6,.32,-23,4,.25,7,wood);box(-7.4,1.6,-23,.25,2.6,6.5,metal);box(-5.6,1.6,-26.1,4,2.6,.25,metal);box(-5.6,3,-23,4.5,.22,7,metal);for(const z of [-25.8,-20.2])box(-3.65,1.65,z,.12,2.7,.12,metal);for(let i=0;i<3;i++)box(5.5,.6,-22+i*1.1,1.4,.8,.9,wood);box(-6,.9,-23,2.4,.18,1,wood);block.userData.ownedMaterials=[metal,wood];
 if(typeof document!=='undefined'){const c=document.createElement('canvas');c.width=512;c.height=160;const ctx=c.getContext('2d');ctx.fillStyle='#27352d';ctx.fillRect(0,0,512,160);ctx.strokeStyle='#acb49c';ctx.lineWidth=8;ctx.strokeRect(8,8,496,144);ctx.fillStyle='#e3dfc7';ctx.textAlign='center';ctx.font='bold 48px sans-serif';ctx.fillText('SALVAGE OUTPOST',256,70);ctx.font='28px sans-serif';ctx.fillText('START / CITY EXIT ↑',256,120);const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;const sign=box(-5.6,2.35,-19.4,3.6,1.1,.08,new T.MeshStandardMaterial({map,roughness:1}));sign.userData.ownedMaterial=true;}
}

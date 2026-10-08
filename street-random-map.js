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
export function createRandomStreetMap(seed=2207,level=1){
 const root=new T.Group(),tiles=planStreetMap(seed,level),houses=[],trees=[],cars=[],smallRides=[];let debris=0;const updates=[];
 for(const tile of tiles){const block=tile.shape===6?createSatelliteCrashBlock(tile.seed,{backdrop:false}):createRoadShapeBlock(tile.seed,tile.shape,{backdrop:false,connected:true});block.rotation.y=-tile.rotation*Math.PI/2;block.position.set(tile.x*72,0,tile.z*72);if(tile.role==='start'){block.updateMatrixWorld(true);const clearTrees=[];block.traverse(o=>{if(o.userData.lod)clearTrees.push(o);});clearTrees.forEach(o=>o.parent.remove(o));block.userData.trees=[];const wrecks=[];block.traverse(o=>{if(o.userData.collisionKind==='car')wrecks.push(o);});wrecks.forEach(o=>o.parent.remove(o));block.userData.cars=[];}root.add(block);houses.push(...block.userData.houses);trees.push(...block.userData.trees);cars.push(...block.userData.cars);smallRides.push(...block.userData.smallRides);debris+=block.userData.debris;updates.push(block.userData.updateLife);if(tile.role==='finish')root.userData.updateImpactFire=block.userData.updateImpactFire;if(tile.role==='start'){decorateStart(block);}}
 const start=tiles.find(t=>t.role==='start'),angle=-start.rotation*Math.PI/2,spawn={x:start.x*72+13*Math.sin(angle),z:start.z*72+13*Math.cos(angle),yaw:angle+Math.PI};
 root.userData={...root.userData,seed,tiles,spawn,routeDistance:start.routeDistance,startVariant:((start.seed^0x389a)>>>0)%5,houses,trees,cars,smallRides,debris,walkBounds:Math.max(...tiles.map(t=>Math.abs(t.x)*72+40)),walkBoundsZ:Math.max(...tiles.map(t=>Math.abs(t.z)*72+40)),groundBase:-3,updateLife:(time,camera)=>updates.forEach(fn=>fn?.(time,camera))};return root;
}

function weatheredDronePaint(base,seed){
 if(typeof document==='undefined')return null;
 const canvas=document.createElement('canvas');canvas.width=canvas.height=512;const ctx=canvas.getContext('2d');
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 ctx.fillStyle=base;ctx.fillRect(0,0,512,512);
 // Uneven chipped paint exposes brown corrosion, with grime running from seams.
 for(let i=0;i<75;i++){
  const x=random()*512,y=random()*512,r=5+random()*24;
  for(let j=0;j<35;j++){const a=random()*Math.PI*2,d=random()*r;ctx.fillStyle=['#633b27','#a26434','#8b4825','#bd854b'][j%4];ctx.globalAlpha=.4+random()*.55;ctx.beginPath();ctx.ellipse(x+Math.cos(a)*d,y+Math.sin(a)*d,1+random()*5,1+random()*4,random()*3,0,Math.PI*2);ctx.fill();}
  ctx.strokeStyle='#72573a';ctx.globalAlpha=.18;ctx.lineWidth=1+random()*3;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+random()*5,y+15+random()*50);ctx.stroke();
 }
 for(let i=0;i<3500;i++){ctx.globalAlpha=random()*.17;ctx.fillStyle=i%2?'#2c2820':'#f3ecd5';ctx.fillRect(random()*512,random()*512,1+random()*3,1+random()*2);}
 ctx.globalAlpha=.35;ctx.strokeStyle='#48483e';ctx.lineWidth=2;ctx.strokeRect(5,5,502,502);ctx.globalAlpha=.5;
 for(let i=0;i<16;i++){const x=random()*512,y=random()*512;ctx.strokeStyle='#676b61';ctx.lineWidth=.8;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+15+random()*40,y-3-random()*12);ctx.stroke();}
 const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;return texture;
}
function decorateStart(block){
 const drone=new T.Group();drone.position.set(0,0,12);block.add(drone);
 const shell=new T.MeshStandardMaterial({color:0xe3ebda,metalness:.25,roughness:.7}),dark=new T.MeshStandardMaterial({color:0x596f75,metalness:.35,roughness:.8}),orange=new T.MeshStandardMaterial({color:0xffca46,metalness:.4,roughness:.75}),light=new T.MeshStandardMaterial({color:0x86eadb,emissive:0x3ea996,emissiveIntensity:1.4});

 shell.color.set(0xffffff);shell.map=weatheredDronePaint('#dde4d3',7123);dark.color.set(0xffffff);dark.map=weatheredDronePaint('#637a7f',1357);orange.color.set(0xffffff);orange.map=weatheredDronePaint('#edba46',4139);
 const exposed=new T.MeshStandardMaterial({color:0x4d3529,roughness:1,metalness:.3});
 function part(geo,x,y,z,mat,solid=true){const mesh=new T.Mesh(geo,mat);mesh.position.set(x,y,z);mesh.castShadow=mesh.receiveShadow=true;mesh.userData={ownedGeometry:true,...(solid?{collisionKind:'building'}:{})};drone.add(mesh);return mesh;}
 const box=(x,y,z,w,h,d,mat,solid=true)=>part(new T.BoxGeometry(w,h,d),x,y,z,mat,solid);
 // An open underslung cradle stays accessible from the street.
 const top=shell.clone();if(typeof document!=='undefined'){top.map=new T.TextureLoader().load(new URL('./textures/street/return-drone-top-v1.png',document.baseURI).href);top.map.colorSpace=T.SRGBColorSpace;}
 const casing=new T.BoxGeometry(2.6,.85,4.2),vertices=casing.attributes.position;
 for(let i=0;i<vertices.count;i++){if(vertices.getX(i)>.9&&vertices.getZ(i)>1.8){vertices.setX(i,vertices.getX(i)-.3);vertices.setZ(i,vertices.getZ(i)-.22);vertices.setY(i,vertices.getY(i)-.12);}}
 casing.computeVertexNormals();for(let i=8;i<12;i++)casing.attributes.uv.setXY(i,(vertices.getZ(i)+2.1)/4.2,(vertices.getX(i)+1.3)/2.6);part(casing,0,2.8,0,[shell,shell,top,shell,shell,shell]);
 // Torn side panel, exposed reinforcement and a hanging cable.
 box(1.025,2.88,1.58,.025,.4,.65,exposed);
 for(let i=0;i<3;i++)box(1.05,2.77+i*.11,1.58,.045,.035,.62,dark);
 const flap=box(1.2,2.94,1.7,.04,.35,.55,shell);flap.rotation.z=-.55;flap.rotation.y=.3;
 const cable=new T.CatmullRomCurve3([new T.Vector3(1.05,2.75,1.5),new T.Vector3(1.25,2.2,1.6),new T.Vector3(.95,1.85,1.8)]);part(new T.TubeGeometry(cable,8,.035,4,false),0,0,0,exposed,false);box(0,2.45,-.3,1.7,.3,2.7,dark);box(0,2.85,2.15,1.2,.32,.15,dark);
 for(const side of [-1,1]){
  box(side*1.25,1.4,0,.14,2.6,3.3,dark);box(side*1.4,.25,0,.26,.22,4.4,shell);
  box(side*.9,1.85,.5,.2,.65,.4,orange);box(side*.67,1.55,.5,.6,.18,.4,orange);
  for(const z of [-1.45,1.45]){
   const arm=box(side*1.9,2.9,z,1.8,.24,.3,shell);arm.rotation.y=side*z*.17;
   const damaged=side===1&&z>0;const rotor=part(new T.CylinderGeometry(.8,.8,.25,12,1,false,0,damaged?Math.PI*1.7:Math.PI*2),side*2.65,damaged?2.88:3,z,dark);rotor.rotation.z=damaged?-.16:0;const blade=box(side*2.65,damaged?3.02:3.15,z,damaged?.85:1.35,.06,.12,shell);blade.rotation.z=damaged?-.2:0;
   box(side*1.5,.43,z,.12,.15,.24,light,false);
  }
 }
 box(0,.045,.7,1.5,.06,2.8,dark,false);
 for(const x of [-.8,.8])box(x,.08,.7,.07,.05,2.8,orange,false);
 if(typeof document!=='undefined'){
  const c=document.createElement('canvas');c.width=512;c.height=128;const ctx=c.getContext('2d');ctx.fillStyle='#fff3b8';ctx.fillRect(0,0,512,128);ctx.fillStyle='#153d46';ctx.textAlign='center';ctx.font='bold 60px sans-serif';ctx.fillText('RETURN HERE',256,86);
  const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;const mat=new T.MeshBasicMaterial({map});const sign=box(0,3.38,2.12,2.3,.58,.04,mat,false);sign.userData.ownedMaterial=true;
 }
 block.userData.ownedMaterials=[shell,top,dark,orange,light,exposed];
}

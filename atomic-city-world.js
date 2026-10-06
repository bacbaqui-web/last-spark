import * as T from 'three';
import {scaleCityWorld,TREE_LOCAL_SCALE} from './city-world-scale.js';
import {populateBrickRoute,populateBrickRouteAsync} from './brick-street-world.js';
import {disposeBrickStreet} from './brick-street-scene.js';
import {loadPurchasedModels} from './purchased-model-library.js';
import {createStreetProps} from './street-props.js';
import {composeReferenceAssets} from './reference-buildings.js';

import {assembleStreetBlocks,validateBlock,SURFACES} from './street-blocks.js';
import {createCityLayout} from './random-city-layout.js';
export function createAtomicCityWorld(scene,platforms,mats){
 const root=new T.Group();root.name='atomic-random-city';scene.add(root);const templates=new Map(),obstacles=[],unitBox=new T.BoxGeometry(1,1,1),roadMaterial=new T.MeshStandardMaterial({color:0x454a46,roughness:1}),paint=new T.MeshStandardMaterial({color:0xc9bc91}),proxyMaterial=new T.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false});
 const route={},extraction=new T.Group(),target=new T.Group();scene.add(extraction,target);const ring=new T.Mesh(new T.RingGeometry(4,4.4,48),new T.MeshBasicMaterial({color:0x96e4ad,side:T.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.y=.11;extraction.add(ring);
 const pedestal=new T.Mesh(new T.BoxGeometry(3,1.2,3),mats.dark);pedestal.position.y=.6;target.add(pedestal);const lid=new T.Mesh(new T.BoxGeometry(3.2,.35,3.2),mats.wall);lid.position.y=1.4;target.add(lid);const orb=new T.Mesh(new T.IcosahedronGeometry(.7,1),new T.MeshStandardMaterial({color:0xa882ff,emissive:0x693fd9,emissiveIntensity:1.2}));orb.position.y=1.7;target.add(orb);
 let unlocked=false,layout,loaded=false,mission=null;
 function makeLayout(seed){
  if(loaded&&new URLSearchParams(window.location.search).has('streetBlocks')){
   const raw=localStorage.getItem('last-spark-test-blocks-v1');
   if(raw){try{return assembleStreetBlocks(seed,JSON.parse(raw).map(validateBlock),templates);}catch(e){console.error('Street block test:',e);world.error=e;throw e;}}
  }
  return createCityLayout(seed);
 }
 const freshSeed=()=>globalThis.crypto.getRandomValues(new Uint32Array(1))[0];
 function part(w,h,d,x,y,z,material,angle=0){const m=new T.Mesh(unitBox,material);m.scale.set(w,h,d);m.position.set(x,y,z);m.rotation.y=angle;m.receiveShadow=true;root.add(m);return m;}
 function populate(asyncBrick=false){for(const child of root.children){if(child.userData.blockSeed!==undefined)disposeBrickStreet(child);if(child.isInstancedMesh)child.dispose();if(child.userData.ownedMaterial)child.material.dispose();}root.clear();root.scale.setScalar(1);root.updateMatrixWorld(true);obstacles.length=0;platforms.length=0;platforms.collisionRevision=(platforms.collisionRevision||0)+1;Object.assign(route,layout.route);platforms.bounds=route.bounds;
  if(loaded&&(mission||new URLSearchParams(window.location.search).has('brickBlocks'))){const finish=value=>{Object.assign(route,value);for(const p of platforms){const proxy=part(p.w,p.h,p.d,p.x,p.h/2,p.z,proxyMaterial);proxy.visible=false;obstacles.push(proxy);}extraction.position.set(route.start.x,0,route.start.z);target.position.set(route.end.x,.1,route.end.z+8);scaleCityWorld(root,platforms,route,extraction,target);};if(asyncBrick)return populateBrickRouteAsync(layout.seed,templates,root,platforms,mission).then(finish);return finish(populateBrickRoute(layout.seed,templates,root,platforms,mission));}
  for(const f of layout.floors||[]){const material=new T.MeshStandardMaterial({color:SURFACES[f.surface].color,roughness:1});const m=part(f.size,.08,f.size,0,-.02,f.z,material);m.userData.ownedMaterial=true;}
  if(!layout.authored)for(const seg of route.segments)part(route.width,.08,seg.distance+2,(seg.a.x+seg.b.x)/2,.04,(seg.a.z+seg.b.z)/2,roadMaterial,Math.atan2(seg.dx,seg.dz));if(!layout.authored)for(const p of route.points)part(route.width,.08,route.width,p.x,.04,p.z,roadMaterial);
  for(const seg of route.segments){const angle=Math.atan2(seg.dx,seg.dz);for(const side of[-1,1]){const x=(seg.a.x+seg.b.x)/2-seg.dz*side*(route.width/2+(layout.authored?1:.6)),z=(seg.a.z+seg.b.z)/2+seg.dx*side*(route.width/2+(layout.authored?1:.6));part(layout.authored?2:1.2,layout.authored?.18:.12,seg.distance,x,.06,z,mats.wall,angle);}}
  for(let s=layout.authored?3:5;s<route.length;s+=layout.authored?6:7){const p=route.sample(s);part(.17,.012,layout.authored?2:3,p.x,.088,p.z,paint,Math.atan2(p.dx,p.dz));}
  const end=route.end;part(10,.08,12,end.x,.04,end.z-3,roadMaterial);
  const placements=new Map();let count=0;
  for(const item of layout.items){const template=templates.get(item.id);if(!template)continue;
   const scale=item.size/template.maxSize,sx=item.dimensions?item.dimensions[0]/template.size.x:scale,sy=item.dimensions?item.dimensions[1]/template.size.y:scale,sz=item.dimensions?item.dimensions[2]/template.size.z:scale,transform=new T.Matrix4().compose(new T.Vector3(item.x,item.y||0,item.z),new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),item.angle),new T.Vector3(sx,sy,sz).multiplyScalar(item.id==='lush-tree'?TREE_LOCAL_SCALE:1));
   if(!placements.has(item.id))placements.set(item.id,[]);placements.get(item.id).push(transform);count++;
   if(item.solid){const w=(Math.abs(Math.cos(item.angle))*template.size.x+Math.abs(Math.sin(item.angle))*template.size.z)*scale,d=(Math.abs(Math.sin(item.angle))*template.size.x+Math.abs(Math.cos(item.angle))*template.size.z)*scale,h=template.size.y*scale;
    // Reserve an unbroken three-metre corridor, including at bends; reject overlaps.
    let blocked=false;for(let s=0;s<=route.length;s+=.5){const p=route.sample(s);if(Math.abs(p.x-item.x)<w/2+1.5&&Math.abs(p.z-item.z)<d/2+1.5){blocked=true;break;}}
    if(!item.authored&&(blocked||!item.boundary&&platforms.some(p=>Math.abs(p.x-item.x)<(p.w+w)/2+.4&&Math.abs(p.z-item.z)<(p.d+d)/2+.4))){placements.get(item.id).pop();count--;continue;}
    platforms.push({x:item.x,z:item.z,w,d,h,assetId:item.id});const proxy=part(w,h,d,item.x,h/2,item.z,proxyMaterial);proxy.visible=false;obstacles.push(proxy);
   }
  }
  for(const[id,transforms]of placements){if(!transforms.length||id==='ruin-wall')continue;for(const {geometry,material}of templates.get(id).parts){const batch=new T.InstancedMesh(geometry,material,transforms.length);batch.name=id;transforms.forEach((m,i)=>batch.setMatrixAt(i,m));batch.instanceMatrix.needsUpdate=true;batch.receiveShadow=true;batch.castShadow=false;root.add(batch);}}
  extraction.position.set(route.start.x,0,route.start.z);target.position.set(end.x,.1,end.z-8);root.userData={seed:layout.seed,assetCount:count,types:[...placements].filter(([,v])=>v.length).map(([k])=>k)};scaleCityWorld(root,platforms,route,extraction,target);
 }
 const world={configureMission:value=>{mission=value;},route,ground:root,extraction,target,obstacles,get unlocked(){return unlocked;},get loaded(){return loaded;},get seed(){return layout.seed;},async regenerateAsync(seed=freshSeed()){layout=makeLayout(seed);await populate(true);world.reset();return layout.seed;},regenerate(seed=freshSeed()){layout=makeLayout(seed);populate();world.reset();return layout.seed;},reset(){unlocked=false;target.visible=true;orb.visible=false;lid.position.y=1.4;},unlock(){unlocked=true;orb.visible=true;},update(time){orb.rotation.y=time;orb.position.y=1.9+Math.sin(time*2)*.15;if(unlocked)lid.position.y=2.8;}};
 world.regenerate();
 world.ready=(async()=>{for(const [id,template]of await loadPurchasedModels())templates.set(id,template);for(const [id,template]of createStreetProps())templates.set(id,template);for(const [id,template]of composeReferenceAssets(templates))templates.set(id,template);loaded=true;layout=makeLayout(layout.seed);populate();return world;})();world.ready.catch(error=>{world.error=error;console.error('Atomic city loading failed',error);});return world;
}

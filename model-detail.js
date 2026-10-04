import {createOvergrownCity} from './overgrown-city.js';
import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
export const panelGeometry=new RoundedBoxGeometry(1,1,1,1,.065);
panelGeometry.userData.sharedModelGeometry=true;
const pixels=new Uint8Array(128*128*4);for(let y=0;y<128;y++)for(let x=0;x<128;x++){const seam=x%64<2||y%64<2,scuff=(x*17+y*43)%137<3,noise=((x*73+y*97)%13)-6,v=seam?185:scuff?208:242+noise,i=(y*128+x)*4;pixels[i]=pixels[i+1]=pixels[i+2]=v;pixels[i+3]=255;}
export const panelTexture=new THREE.DataTexture(pixels,128,128);panelTexture.wrapS=panelTexture.wrapT=THREE.RepeatWrapping;panelTexture.magFilter=THREE.LinearFilter;panelTexture.needsUpdate=true;panelTexture.colorSpace=THREE.SRGBColorSpace;
const steel=new THREE.MeshStandardMaterial({color:0xa59d88,metalness:.8,roughness:.35,map:panelTexture}),black=new THREE.MeshStandardMaterial({color:0x14262e,metalness:.6,roughness:.55}),indicator=new THREE.MeshBasicMaterial({color:0x82dbea});
for(const m of [steel,black,indicator])m.userData.sharedWeaponMaterial=true;
// Bake small decorative parts per bone/material into one draw, without changing hit volumes.
export function detailBatch(parent,parts){const groups=new Map();for(const [size,pos,material=steel]of parts){const geometry=panelGeometry.clone();geometry.scale(...size);geometry.translate(...pos);if(!groups.has(material))groups.set(material,[]);groups.get(material).push(geometry);}for(const [material,geometries]of groups){const geometry=mergeGeometries(geometries);for(const g of geometries)g.dispose();const mesh=new THREE.Mesh(geometry,material);mesh.userData.cosmetic=true;parent.add(mesh);}}
export function decorateRobot(r,boss=false,type='trooper'){
 const shell=new THREE.MeshStandardMaterial({color:boss?0x9b7152:0x958975,metalness:.55,roughness:.6,map:panelTexture});
 const identity=new THREE.MeshStandardMaterial({color:type==='player'?0x1465f4:boss?0xe99916:type==='sniper'?0xffc326:0xe92d24,metalness:.3,roughness:.45});r.identityMaterial=identity;
 // One clean helmet, chest plate and shoulder shell; no stacked ornament layers.
 r.head.geometry=new RoundedBoxGeometry(1,1,1,3,.18);
 const helmet=new THREE.Group();helmet.name='clean-helmet';helmet.position.copy(r.head.position);helmet.quaternion.copy(r.head.quaternion);r.head.parent.add(helmet);
 detailBatch(helmet,[[[.28,.035,.26],[0,.16,-.015],identity],[[.24,.045,.045],[0,-.11,.15],black]]);
 detailBatch(r.body,[[[.29,.25,.045],[0,.04,.15],shell],[[.26,.035,.02],[0,.14,.181],identity],[[.23,.035,.025],[0,.14,-.16],identity]]);
 const backpack=new THREE.Group();backpack.name='original-backpack';r.body.add(backpack);detailBatch(backpack,[[[.3,.32,.15],[0,.015,-.22],black]]);r.backpack=backpack;
 for(const arm of r.arms){
  detailBatch(arm.shoulder,[[[.18,.12,.19],[0,-.015,0],identity]]);
  detailBatch(arm.elbow,[[[.12,.20,.035],[0,-.11,.078],shell]]);
 }
 for(const leg of r.legs){
  detailBatch(leg.hip,[[[.12,.22,.025],[0,-.16,.10],shell]]);
  detailBatch(leg.knee,[[[.14,.10,.045],[0,-.015,.105],shell]]);
 }
 if(type==='sniper')detailBatch(helmet,[[[.06,.07,.07],[.14,.025,.16],indicator]]);
}
export function decorateArena(scene,platforms,mats){
 const root=new THREE.Group();root.name='arena-panel-detail';scene.add(root);const groups=new Map();const add=(mat,size,pos)=>{if(!groups.has(mat))groups.set(mat,[]);const matrix=new THREE.Matrix4().compose(new THREE.Vector3(...pos),new THREE.Quaternion(),new THREE.Vector3(...size));groups.get(mat).push(matrix);};
 for(const p of platforms){const base=p.base||0,h=p.h-base;if(h<.6)continue;const y=base+h/2;for(const side of[-1,1]){add(mats.dark,[.16,h,.22],[p.x+side*(p.w/2-.14),y,p.z+p.d/2+.035]);add(mats.dark,[p.w-.25,.1,.08],[p.x,base+.3,p.z+side*(p.d/2+.035)]);add(mats.wall,[Math.min(1.7,p.w-.45),Math.min(.8,h*.45),.065],[p.x,y,p.z+side*(p.d/2+.055)]);for(let i=0;i<3;i++)add(mats.lime,[.13,.06,.045],[p.x-.3+i*.3,base+h-.25,p.z+side*(p.d/2+.085)]);}add(mats.dark,[p.w+.15,.18,p.d+.15],[p.x,p.h+.13,p.z]);}
 // Flush floor panels and service lanes add scale cues without extra collision objects.
 for(let x=-36;x<=36;x+=12)for(let z=-36;z<=36;z+=12){add(mats.dark,[9.8,.018,.045],[x,.012,z-5]);add(mats.dark,[.045,.018,9.8],[x-5,.012,z]);for(const side of[-1,1])add(mats.lime,[.5,.025,.06],[x+side*4.5,.025,z+4.5]);}
 for(const [mat,matrices]of groups){const mesh=new THREE.InstancedMesh(panelGeometry,mat,matrices.length);matrices.forEach((m,i)=>mesh.setMatrixAt(i,m));mesh.instanceMatrix.needsUpdate=true;root.add(mesh);}
 createOvergrownCity(scene,platforms);
 return root;
}

export {applyFrameVisual,framePreview} from './frame-preview.js';
import * as THREE from 'three';
import {createCampaign,PARTS,frameStats,makePart,lootPart,tickBattery,spendBattery} from './salvage-campaign.js';
import {createBaseUI} from './salvage-ui.js';
export {createCampaign,PARTS,frameStats,makePart,lootPart,tickBattery,spendBattery,createBaseUI};
export function createSalvageWorld(scene,platforms,box,mats){
 // Retain the combat coordinate scale, but arrange it as a narrow 76m avenue.
 for(const side of[-1,1]){
  for(const z of[-30,-17,-4,9,22]){
   const x=side*16,w=8,d=9,h=5+((z+30)%3);const material=mats.wall;
   const wall=(ww,hh,dd,xx,yy,zz)=>box(ww,hh,dd,material,xx,yy,zz);
   wall(w,.4,d,x,.2,z);wall(w,.25,d,x,h,z);
   for(const edge of[-1,1]){wall(.5,h,d,x+edge*w/2,h/2,z);for(const off of[-2.8,0,2.8])wall(1,h,.45,x+off,h/2,z+edge*d/2);wall(w,.6,.45,x,h-.6,z+edge*d/2);wall(w,1,.45,x,.8,z+edge*d/2);}
   platforms.push({x,z,w,d,h:h+.125});
  }
  box(1,5,84,mats.dark,side*22,2.5,0);platforms.push({x:side*22,z:0,w:1,d:84,h:5});
 }
 for(const z of[-41,41])for(let i=0;i<8;i++){const x=-20+i*5.5,h=3+(i%3);const mesh=box(5.8,h,4,mats.wall,x,h/2,z);mesh.rotation.z=(i%2-.5)*.17;platforms.push({x,z,w:5.8,d:4,h});}
 const extraction=new THREE.Group();extraction.name='remote-extraction-beacon';scene.add(extraction);
 const ring=new THREE.Mesh(new THREE.RingGeometry(3,3.3,48),new THREE.MeshBasicMaterial({color:0x96e4ad,side:THREE.DoubleSide,transparent:true,opacity:.85}));ring.rotation.x=-Math.PI/2;ring.position.set(0,.08,35);extraction.add(ring);
 const target=new THREE.Group();target.name='salvage-core-cache';scene.add(target);target.position.set(0,.7,-33);const orb=new THREE.Mesh(new THREE.IcosahedronGeometry(.7,1),new THREE.MeshStandardMaterial({color:0xa882ff,emissive:0x693fd9,emissiveIntensity:1.2,metalness:.65,roughness:.3}));target.add(orb);target.visible=false;
 return {extraction,target,update(time){orb.rotation.y=time;orb.position.y=Math.sin(time*2)*.15;}};
}

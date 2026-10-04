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
 // Tapered armor follows the limb, with open gaps over the flexible dark frame.
 function plate(parent,points,depth,pos,material=shell){
  const shape=new THREE.Shape();points.forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));shape.closePath();
  const mesh=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelSize:.008,bevelThickness:.006,bevelSegments:2,steps:1}),material);mesh.position.set(...pos);mesh.castShadow=true;mesh.userData.cosmetic=true;parent.add(mesh);return mesh;
 }
 r.head.geometry=new RoundedBoxGeometry(1,1,1,3,.20);
 const helmet=new THREE.Group();helmet.name='tapered-helmet';helmet.position.copy(r.head.position);helmet.quaternion.copy(r.head.quaternion);r.head.parent.add(helmet);
 plate(helmet,[[-.13,.15],[-.08,.18],[.08,.18],[.13,.15],[.10,.055],[-.10,.055]],.055,[0,0,.06],identity);
 for(const side of[-1,1]){const cheek=plate(helmet,[[-.045,.09],[.025,.12],[.045,-.05],[.025,-.12],[-.025,-.105]],.035,[side*.11,-.025,.11],shell);cheek.rotation.y=side*.22;}
 detailBatch(helmet,[[[.12,.035,.045],[0,-.105,.13],black]]);
 // Two angled pectoral shells and a narrow abdomen leave space to bend at the waist.
 for(const side of[-1,1]){const chest=plate(r.body,[[-.075,.13],[.065,.16],[.095,.04],[.065,-.08],[-.055,-.06]],.045,[side*.09,.015,.105],identity);chest.rotation.y=side*.16;}
 plate(r.bones.find(b=>b.name==='spine_01'),[[-.065,.09],[.065,.09],[.055,-.06],[0,-.10],[-.055,-.06]],.028,[0,.04,.09]);
 detailBatch(r.body,[[[.23,.035,.025],[0,.14,-.13],identity]]);
 const backpack=new THREE.Group();backpack.name='original-backpack';r.body.add(backpack);detailBatch(backpack,[[[.3,.32,.15],[0,.015,-.22],black]]);r.backpack=backpack;
 for(const [index,arm]of r.arms.entries()){
  const shoulder=new THREE.Mesh(new THREE.SphereGeometry(.115,16,10,0,Math.PI*2,0,Math.PI*.66),identity);shoulder.scale.set(1,.78,1.04);shoulder.position.y=-.01;shoulder.userData.cosmetic=true;arm.shoulder.add(shoulder);
  plate(arm.shoulder,[[-.055,-.055],[.055,-.055],[.055,-.19],[.025,-.23],[-.04,-.21]],.024,[0,0,.065]);
  plate(arm.elbow,[[-.06,-.06],[.06,-.055],[.045,-.23],[-.04,-.25]],.03,[0,0,.06],identity);
  const joint=new THREE.Mesh(new THREE.SphereGeometry(.062,10,8),black);joint.userData.cosmetic=true;arm.elbow.add(joint);
 }
 for(const leg of r.legs){
  plate(leg.hip,[[-.065,-.07],[.065,-.06],[.055,-.27],[0,-.32],[-.05,-.27]],.025,[0,0,.075]);
  plate(leg.knee,[[-.065,.035],[.065,.035],[.06,-.04],[0,-.085],[-.06,-.04]],.032,[0,0,.07],identity);
  plate(leg.knee,[[-.045,-.11],[.045,-.11],[.035,-.33],[-.025,-.35]],.023,[0,0,.06]);
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

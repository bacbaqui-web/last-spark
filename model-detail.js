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
 const scale=boss?1.15:1;const helmet=new THREE.Group();helmet.position.copy(r.head.position);helmet.quaternion.copy(r.head.quaternion);r.head.parent.add(helmet);
 detailBatch(helmet,[[[.42,.065,.34],[0,.14,0],black],[[.065,.12,.10],[-.2,0,.04]],[[.065,.12,.10],[.2,0,.04]],[[.24,.045,.08],[0,-.11,.15]],[[.035,.22,.035],[.18,.23,-.1],black]]);
 detailBatch(r.body,[[[.30*scale,.16,.055],[0,.13,.17]],[[.12,.19,.08],[-.17,-.08,.16],black],[[.12,.19,.08],[.17,-.08,.16],black]]);
 const backpack=new THREE.Group();backpack.name='original-backpack';r.body.add(backpack);detailBatch(backpack,[[[.3,.32,.19],[0,.015,-.24],black],[[.05,.21,.025],[-.09,.02,-.345]],[[.05,.21,.025],[.09,.02,-.345]],[[.08,.035,.03],[0,.14,-.35],indicator]]);r.backpack=backpack;
 // Layered weathered shell over a dark mechanical frame, with exposed pivots.
 const shell=new THREE.MeshStandardMaterial({color:boss?0x9b7152:type==='sniper'?0x707b69:0x9c8a70,metalness:.65,roughness:.62,map:panelTexture});
 const jointGeometry=new THREE.CylinderGeometry(.072,.072,.045,12),boltGeometry=new THREE.SphereGeometry(.012,6,4);
 function pivot(parent,pos,radius=1){const m=new THREE.Mesh(jointGeometry,black);m.rotation.z=Math.PI/2;m.position.set(...pos);m.scale.setScalar(radius);parent.add(m);const cap=new THREE.Mesh(new THREE.CylinderGeometry(.045,.045,.048,10),steel);cap.rotation.z=Math.PI/2;cap.position.copy(m.position);cap.scale.setScalar(radius);parent.add(cap);}
 r.head.geometry=new RoundedBoxGeometry(1,1,1,3,.20);
 const crown=new THREE.Mesh(new THREE.SphereGeometry(.18,16,10,0,Math.PI*2,0,Math.PI/2),shell);crown.scale.set(1,.8,.88);crown.position.set(0,.105,-.015);helmet.add(crown);
 for(const x of[-.06,.06]){const piston=new THREE.Mesh(new THREE.CylinderGeometry(.018,.018,.18,8),steel);piston.position.set(x,-.02,.025);r.neck.add(piston);}

 detailBatch(helmet,[[[.26,.07,.24],[0,.16,-.02],shell],[[.08,.25,.25],[-.16,.015,0],shell],[[.08,.25,.25],[.16,.015,0],shell],[[.22,.10,.09],[0,-.12,.12],black],[[.09,.055,.03],[-.07,.035,.18],indicator],[[.035,.14,.04],[0,-.055,.18],steel]]);
 detailBatch(r.body,[[[.28,.22,.055],[0,.05,.17],shell],[[.055,.28,.06],[-.18,.025,.12],shell],[[.055,.28,.06],[.18,.025,.12],shell],[[.13,.075,.07],[0,-.16,.12],black]]);
 for(const x of[-.10,.10]){const b=new THREE.Mesh(boltGeometry,steel);b.position.set(x,.12,.21);r.body.add(b);}
 for(const [i,arm]of r.arms.entries()){
  const side=i===0?1:-1;pivot(arm.elbow,[side*.07,0,0]);pivot(arm.shoulder,[side*.075,0,0],1.25);
  const dome=new THREE.Mesh(new THREE.SphereGeometry(.115,12,8),shell);dome.scale.set(1,.65,1.15);dome.position.y=-.015;arm.shoulder.add(dome);
  detailBatch(arm.elbow,[[[.12,.20,.045],[0,-.10,.085],shell],[[.025,.20,.025],[-.06,-.1,.085],steel],[[.025,.20,.025],[.06,-.1,.085],steel]]);
  for(let j=0;j<3;j++)detailBatch(arm.elbow,[[[.09,.013,.015],[0,-.04-j*.045,.112],black]]);
 }
 for(const [i,leg]of r.legs.entries()){
  const side=i===0?1:-1;pivot(leg.hip,[side*.10,0,0],1.25);pivot(leg.knee,[side*.07,0,0],1.15);
  detailBatch(leg.hip,[[[.12,.24,.045],[0,-.15,.105],shell],[[.055,.25,.035],[side*.08,-.15,.025],black]]);
  detailBatch(leg.knee,[[[.14,.12,.07],[0,-.01,.12],shell],[[.09,.22,.05],[0,-.18,.10],shell],[[.025,.24,.025],[side*.07,-.17,.015],steel]]);
 }
 for(const arm of r.arms)if(!boss){detailBatch(arm.shoulder,[[[.21,.13,.23],[0,-.025,0]]]);detailBatch(arm.elbow,[[[.16,.09,.17],[0,-.02,0],black]]);}
 for(const leg of r.legs)detailBatch(leg.knee,[[[.18,.14,.08],[0,-.03,.095]],[[.045,.22,.035],[-.07,-.17,.085],black],[[.045,.22,.035],[.07,-.17,.085],black]]);
 if(type==='sniper'){detailBatch(helmet,[[[.1,.12,.18],[.18,.02,.12],black],[[.04,.12,.025],[-.14,.02,.17],indicator]]);detailBatch(r.blaster,[[[.10,.10,.33],[0,.2,.1],black],[[.11,.05,.05],[0,.24,.29]],[[.09,.06,.18],[0,-.1,.3]]]);}
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

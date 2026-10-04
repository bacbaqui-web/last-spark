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
 // Sculpt each armor shell as a convex surface, rather than a flat extruded panel.
 function sculpt(parent,width,height,depth,pos,material=shell,taper=.72){
  const vertices=[],indices=[],cols=12,rows=12;
  for(let j=0;j<=rows;j++){const v=j/rows,y=(v-.5)*height,edge=1-(1-taper)*Math.abs(v*2-1);for(let i=0;i<=cols;i++){const u=i/cols,x=(u-.5)*width*edge,z=depth*(.35+.65*Math.sin(Math.PI*u))*(.78+.22*Math.sin(Math.PI*v));vertices.push(x,y,z);}}
  for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){const a=j*(cols+1)+i,b=a+cols+1;indices.push(a,a+1,b,b,a+1,b+1);}
  const count=vertices.length/3;for(let i=0;i<count;i++)vertices.push(vertices[i*3],vertices[i*3+1],-.012);
  const front=indices.slice();for(let k=0;k<front.length;k+=3)indices.push(front[k]+count,front[k+2]+count,front[k+1]+count);
  const rim=[];for(let i=0;i<=cols;i++)rim.push(i);for(let j=1;j<=rows;j++)rim.push(j*(cols+1)+cols);for(let i=cols-1;i>=0;i--)rim.push(rows*(cols+1)+i);for(let j=rows-1;j>0;j--)rim.push(j*(cols+1));
  for(let k=0;k<rim.length;k++){const a=rim[k],b=rim[(k+1)%rim.length];indices.push(a,b,a+count,b,b+count,a+count);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setIndex(indices);g.computeVertexNormals();const mesh=new THREE.Mesh(g,material);mesh.position.set(...pos);mesh.castShadow=true;mesh.userData.cosmetic=true;parent.add(mesh);return mesh;
 }
 // Egg-shaped helmet narrows smoothly toward the chin.
 r.head.geometry=new THREE.SphereGeometry(.5,28,20);const hp=r.head.geometry.attributes.position;for(let i=0;i<hp.count;i++){const y=hp.getY(i),t=THREE.MathUtils.smoothstep(y,-.5,.12),width=.74+.26*t;hp.setX(i,hp.getX(i)*width);hp.setZ(i,hp.getZ(i)*(.84+.16*t));}r.head.geometry.computeVertexNormals();r.head.userData.cosmetic=true;
 const helmet=new THREE.Group();helmet.name='tapered-helmet';helmet.position.copy(r.head.position);helmet.quaternion.copy(r.head.quaternion);r.head.parent.add(helmet);
 sculpt(helmet,.19,.14,.024,[0,.085,.087],identity,.85);
 for(const side of[-1,1]){const cheek=sculpt(helmet,.055,.135,.018,[side*.084,-.055,.085],shell,.65);cheek.rotation.y=side*.30;}
 // Two angled pectoral shells and a narrow abdomen leave space to bend at the waist.
 for(const side of[-1,1]){const chest=sculpt(r.body,.17,.25,.055,[side*.09,.045,.095],identity,.72);chest.rotation.y=side*.16;}
 plate(r.bones.find(b=>b.name==='spine_01'),[[-.065,.09],[.065,.09],[.055,-.06],[0,-.10],[-.055,-.06]],.028,[0,.04,.09]);
 detailBatch(r.body,[[[.23,.035,.025],[0,.14,-.13],identity]]);
 const backpack=new THREE.Group();backpack.name='original-backpack';r.body.add(backpack);detailBatch(backpack,[[[.3,.32,.15],[0,.015,-.22],black]]);r.backpack=backpack;
 for(const [index,arm]of r.arms.entries()){
  const shoulder=new THREE.Mesh(new THREE.SphereGeometry(.10,24,16,0,Math.PI*2,0,Math.PI*.69),identity);shoulder.scale.set(1.02,1,1.02);shoulder.position.y=.005;shoulder.userData.cosmetic=true;arm.shoulder.add(shoulder);
  sculpt(arm.shoulder,.12,.18,.035,[0,-.145,.076]);
  sculpt(arm.elbow,.135,.22,.045,[0,-.15,.073],identity);
  detailBatch(arm.elbow,[[[.08,.015,.008],[0,-.085,.096],black],[[.07,.015,.008],[0,-.12,.099],black]]);
  const joint=new THREE.Mesh(new THREE.SphereGeometry(.088,20,14),black);joint.userData.cosmetic=true;arm.elbow.add(joint);
 }
 for(const leg of r.legs){
  const joint=new THREE.Mesh(new THREE.SphereGeometry(.099,20,14),black);joint.userData.cosmetic=true;leg.knee.add(joint);
  sculpt(leg.hip,.145,.27,.04,[0,-.195,.093]);
  sculpt(leg.knee,.145,.12,.05,[0,-.025,.06],identity);
  sculpt(leg.knee,.11,.26,.04,[0,-.23,.083]);
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

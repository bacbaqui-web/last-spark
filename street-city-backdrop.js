import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

export function addCityBackdrop(root){
 let seed=(root.userData.seed^0x74b921)>>>0;
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const pieces=[],buildings=[],flatPieces=[];
 const ground=new T.Mesh(new T.PlaneGeometry(700,700),new T.MeshStandardMaterial({color:0x65695b,roughness:1}));ground.rotation.x=-Math.PI/2;ground.position.y=-.12;ground.userData.ownedGeometry=ground.userData.ownedMaterial=true;root.add(ground);
 function block(x,y,z,w,h,d,color){const g=new T.BoxGeometry(w,h,d);g.translate(x,y+h/2,z);const colors=[];for(let i=0;i<g.attributes.position.count;i++)colors.push(color.r,color.g,color.b);g.setAttribute('color',new T.Float32BufferAttribute(colors,3));const uv=g.attributes.uv;for(let i=0;i<uv.count;i++){const face=Math.floor(i/4);uv.setXY(i,uv.getX(i)*(face<2?d:w)/3,uv.getY(i)*h/3);}pieces.push(g);}
 // A distant ring leaves the playable street open, including its northward sightline.
 for(let i=0;i<42;i++){
  const angle=i/42*Math.PI*2+(random()-.5)*.06,radius=135+random()*35;
  const x=Math.sin(angle)*radius,z=Math.cos(angle)*radius,w=9+random()*11,d=9+random()*10,height=38+random()*52;
  const color=new T.Color().setHSL(.56+random()*.04,.07+random()*.1,.39+random()*.14);
  block(x,0,z,w,height*.72,d,color);
  block(x,height*.72,z,w*.76,height*.18,d*.76,color);
  block(x,height*.9,z,w*.48,height*.1,d*.48,color);
  if(i%5===0){block(x,height,z,1.1,13+random()*12,1.1,color);block(x,height-3,z,w*.25,5,d*.25,color);}
  buildings.push({x,z,width:w,height});
 }
 // Two distant layers of facade cards fill gaps in the primary skyline.
 for(let layer=0;layer<2;layer++)for(let i=0;i<64;i++){
  const angle=(i+.5*layer)/64*Math.PI*2,radius=215+layer*38+random()*10,x=Math.sin(angle)*radius,z=Math.cos(angle)*radius,w=16+random()*14,height=45+random()*60;
  const g=new T.PlaneGeometry(w,height);g.rotateY(angle+Math.PI);g.translate(x,height/2,z);const uv=g.attributes.uv;for(let n=0;n<uv.count;n++)uv.setXY(n,uv.getX(n)*w/3,uv.getY(n)*height/3);
  const color=new T.Color().setHSL(.58,.08,.43+random()*.13),colors=[];for(let n=0;n<g.attributes.position.count;n++)colors.push(color.r,color.g,color.b);g.setAttribute('color',new T.Float32BufferAttribute(colors,3));flatPieces.push(g);
 }
 const geometry=mergeGeometries(pieces);pieces.forEach(g=>g.dispose());
 let map=null;if(typeof document!=='undefined'){
  const c=document.createElement('canvas');c.width=c.height=128;const ctx=c.getContext('2d');ctx.fillStyle='#b3b5b2';ctx.fillRect(0,0,128,128);ctx.fillStyle='#475f70';ctx.fillRect(25,19,32,75);ctx.fillRect(73,19,32,75);ctx.fillStyle='#9a9c98';ctx.fillRect(0,112,128,8);map=new T.CanvasTexture(c);map.wrapS=map.wrapT=T.RepeatWrapping;map.colorSpace=T.SRGBColorSpace;
 }
 const material=new T.MeshStandardMaterial({map,vertexColors:true,roughness:.9});material.addEventListener('dispose',()=>map?.dispose());const mesh=new T.Mesh(geometry,material);mesh.userData.ownedGeometry=mesh.userData.ownedMaterial=true;mesh.userData.skyline=true;root.add(mesh);
 const flatGeometry=mergeGeometries(flatPieces);flatPieces.forEach(g=>g.dispose());const flatMaterial=material.clone();flatMaterial.side=T.DoubleSide;const flat=new T.Mesh(flatGeometry,flatMaterial);flat.userData.ownedGeometry=flat.userData.ownedMaterial=true;root.add(flat);
 root.userData.backgroundBuildings=buildings;root.userData.backgroundFacades=128;
}

import * as T from 'three';
import {createBrickHouse,houseVariants} from './brick-house-variants.js';
import {addStreetOvergrowth} from './street-overgrowth.js';
import {windMaterial} from './street-vegetation-runtime.js';
import {mossMaterial} from './street-moss-material.js';

// A collapsed roadside apartment spans the former continuation of the road.
export function addCollapsedRoadBlockade(root,brick,seed){
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const plaster=new T.MeshStandardMaterial({color:0xc0b9a8,roughness:1});
 if(typeof document!=='undefined'){plaster.map=new T.TextureLoader().load(new URL('./textures/houses/aged-white-plaster.jpg',document.baseURI).href);plaster.map.colorSpace=T.SRGBColorSpace;plaster.map.wrapS=plaster.map.wrapT=T.RepeatWrapping;}
 mossMaterial(plaster,.5);
 const group=new T.Group();group.userData.collapsedRoadBlockade=true;root.add(group);
 function solid(g,mat,x,y,z,rx=0,ry=0,rz=0){const uv=g.attributes.uv,p=g.attributes.position;for(let i=0;i<uv.count;i++)uv.setXY(i,p.getX(i)/2+p.getZ(i)/2,p.getY(i)/2+p.getZ(i)/2);const mesh=new T.Mesh(g,mat);mesh.position.set(x,y,z);mesh.rotation.set(rx,ry,rz);mesh.castShadow=mesh.receiveShadow=true;mesh.userData={ownedGeometry:true,collisionKind:'rubble'};group.add(mesh);return mesh;}
 // Staggered layers of small masonry fill the entire width without a flat cut wall.
 const pileMaterial=mossMaterial(brick.clone(),.92),blocks=[],top=[];
 for(let row=0;row<7;row++)for(let col=0;col<23;col++){
  const x=(col-11)*.9+(row%2?.25:0),z=-4.5-row*.92;
  const levels=Math.max(row>=5?14:6,Math.floor((2.5+2.5*Math.exp(-x*x/45))*Math.sin((row+1)/8*Math.PI)/.58+random()*2));
  for(let layer=0;layer<levels;layer++)blocks.push({x:x+(random()-.5)*.3,y:.32+layer*.56,z:z+(random()-.5)*.15});
  top.push({x,z,y:levels*.56+.1});
 }
 // Dense inner rubble has no walk-through cavities between individual blocks.
 const core=solid(new T.BoxGeometry(19.8,3.15,4.1),pileMaterial,0,1.6,-6.3);core.userData.collisionKind='building';const rearCore=solid(new T.BoxGeometry(19.8,7.5,1.7),pileMaterial,0,3.78,-9.6);rearCore.userData.collisionKind='building';
 const pile=new T.InstancedMesh(new T.BoxGeometry(1.04,.64,1.08),pileMaterial,blocks.length),transform=new T.Object3D();
 blocks.forEach((b,i)=>{transform.position.set(b.x,b.y,b.z);transform.rotation.set((random()-.5)*.38,(random()-.5)*.8,(random()-.5)*.32);transform.scale.set(.9+random()*.3,.9+random()*.18,.9+random()*.3);transform.updateMatrix();pile.setMatrixAt(i,transform.matrix);});
 pile.castShadow=pile.receiveShadow=true;pile.userData={ownedGeometry:true,ownedInstances:true,ownedMaterials:[pileMaterial]};group.add(pile);
 for(let i=0;i<5;i++)solid(new T.BoxGeometry(1.3+random(),.25,1.5+random()),i%2?brick:plaster,(random()-.5)*15,.8+random(),-3-random()*3,(random()-.5),random()*2,(random()-.5)*.8);
 const gp=[],gu=[];
 for(const t of top.filter(()=>random()<.5))for(let j=0;j<14;j++){const x=t.x+(random()-.5)*.6,z=t.z+(random()-.5)*.6,h=.3+random()*.5;gp.push(x-.035,t.y,z,x+.035,t.y,z,x+.1,t.y+h,z+.08);gu.push(0,0,1,0,.5,1);}
 const grassMat=new T.MeshStandardMaterial({color:0x849957,side:T.DoubleSide,roughness:1});if(typeof document!=='undefined'){grassMat.map=new T.TextureLoader().load(new URL('./textures/street/grass-blade.jpg',document.baseURI).href);grassMat.map.colorSpace=T.SRGBColorSpace;}windMaterial(grassMat,'grass');const gg=new T.BufferGeometry();gg.setAttribute('position',new T.Float32BufferAttribute(gp,3));gg.setAttribute('uv',new T.Float32BufferAttribute(gu,2));gg.computeVertexNormals();const grass=new T.Mesh(gg,grassMat);grass.receiveShadow=true;grass.userData={ownedGeometry:true,ownedMaterial:true,vegetation:true,grass:true};group.add(grass);
 const body=createBrickHouse(19);body.scale.set(1.3,1.1,1.3);body.position.set(-15,.205,-12);body.rotation.y=Math.PI/2;body.userData.collisionKind='building';group.add(body);
 for(const x of [-13.5,-4.5,4.5,13.5]){const variant=10+Math.floor(random()*10),h=createBrickHouse(variant);h.scale.setScalar(8.86/houseVariants[variant].width);h.position.set(x,.205,-25);h.userData.collisionKind='building';group.add(h);}
 const undergrowth=new T.Group();undergrowth.userData={seed,houses:[],trees:[]};group.add(undergrowth);addStreetOvergrowth(undergrowth,{minZ:-16,maxZ:2,grassPatches:180,roadPatches:100});
 const pieces=new T.InstancedMesh(new T.BoxGeometry(1,1,1),brick,240),o=new T.Object3D();
 for(let i=0;i<240;i++){const x=(random()-.5)*20,z=-1-random()*12;o.position.set(x,.15+random()*1.1,z);o.scale.set(.3+random()*1.2,.2+random()*.6,.3+random()*1.3);o.rotation.set(random(),random()*6.28,random());o.updateMatrix();pieces.setMatrixAt(i,o.matrix);}
 pieces.castShadow=pieces.receiveShadow=true;pieces.userData={ownedGeometry:true,ownedInstances:true,collisionKind:'rubble',ownedMaterials:[plaster]};group.add(pieces);
 return {debris:245+blocks.length,building:body};
}

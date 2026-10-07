import * as T from 'three';
import {createBrickHouse,houseVariants} from './brick-house-variants.js';
import {addStreetOvergrowth} from './street-overgrowth.js';
import {mossMaterial} from './street-moss-material.js';

// A collapsed roadside apartment spans the former continuation of the road.
export function addCollapsedRoadBlockade(root,brick,seed){
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const plaster=new T.MeshStandardMaterial({color:0xc0b9a8,roughness:1});
 if(typeof document!=='undefined'){plaster.map=new T.TextureLoader().load(new URL('./textures/houses/aged-white-plaster.jpg',document.baseURI).href);plaster.map.colorSpace=T.SRGBColorSpace;plaster.map.wrapS=plaster.map.wrapT=T.RepeatWrapping;}
 mossMaterial(plaster,.5);
 const group=new T.Group();group.userData.collapsedRoadBlockade=true;root.add(group);
 function solid(g,mat,x,y,z,rx=0,ry=0,rz=0){const uv=g.attributes.uv,p=g.attributes.position;for(let i=0;i<uv.count;i++)uv.setXY(i,p.getX(i)/2+p.getZ(i)/2,p.getY(i)/2+p.getZ(i)/2);const mesh=new T.Mesh(g,mat);mesh.position.set(x,y,z);mesh.rotation.set(rx,ry,rz);mesh.castShadow=mesh.receiveShadow=true;mesh.userData={ownedGeometry:true,collisionKind:'rubble'};group.add(mesh);return mesh;}
 // Uneven broken masonry, rather than an intact facade at the end of the road.
 const outline=[[-10,0],[-10,2.5],[-8.5,3.2],[-7.7,2.7],[-6.6,4.3],[-5.4,3.7],[-4.2,5.3],[-3.1,4.6],[-1.7,5.7],[0,4.9],[1.1,5.8],[2.4,4.2],[3.5,4.7],[5.1,3.5],[6.4,4],[8,2.8],[10,2.3],[10,0]];
 const shape=new T.Shape();outline.forEach(([x,y],i)=>i?shape.lineTo(x,y>0?y+2:y):shape.moveTo(x,y));shape.closePath();
 const mass=solid(new T.ExtrudeGeometry(shape,{depth:4,bevelEnabled:false}),brick,0,.03,-9);mass.userData.collisionKind='building';
 // Large recognizable fallen wall and floor sections spill towards the player.
 for(let i=0;i<10;i++){const x=-8+i*1.8;solid(new T.BoxGeometry(3+random()*2,.4,4+random()*3),i%3?brick:plaster,x,1.1+random()*2,-4-random()*3,(random()-.5)*1.3,random()*2,(random()-.5)*.8);}
 const body=createBrickHouse(19);body.scale.set(1.3,1.1,1.3);body.position.set(-15,.205,-12);body.rotation.y=Math.PI/2;body.userData.collisionKind='building';group.add(body);
 for(const x of [-13.5,-4.5,4.5,13.5]){const variant=10+Math.floor(random()*10),h=createBrickHouse(variant);h.scale.setScalar(8.86/houseVariants[variant].width);h.position.set(x,.205,-25);h.userData.collisionKind='building';group.add(h);}
 const undergrowth=new T.Group();undergrowth.userData={seed,houses:[],trees:[]};group.add(undergrowth);addStreetOvergrowth(undergrowth,{minZ:-16,maxZ:2,grassPatches:180,roadPatches:100});
 const fallen=createBrickHouse(3);fallen.scale.set(1.1,.85,1.1);fallen.rotation.set(.12,-.3,-1.03);fallen.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(fallen);fallen.position.set(-3,.18-bounds.min.y,-8.5);fallen.userData.collisionKind='building';fallen.userData.fallenBuilding=true;group.add(fallen);
 const pieces=new T.InstancedMesh(new T.BoxGeometry(1,1,1),brick,240),o=new T.Object3D();
 for(let i=0;i<240;i++){const x=(random()-.5)*20,z=-1-random()*12;o.position.set(x,.15+random()*1.1,z);o.scale.set(.3+random()*1.2,.2+random()*.6,.3+random()*1.3);o.rotation.set(random(),random()*6.28,random());o.updateMatrix();pieces.setMatrixAt(i,o.matrix);}
 pieces.castShadow=pieces.receiveShadow=true;pieces.userData={ownedGeometry:true,ownedInstances:true,collisionKind:'rubble',ownedMaterials:[plaster]};group.add(pieces);
 return {debris:250,building:body};
}

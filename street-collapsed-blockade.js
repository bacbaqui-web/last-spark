import * as T from 'three';
import {createBrickHouse,houseVariants} from './brick-house-variants.js';
import {addStreetOvergrowth} from './street-overgrowth.js';
import {mossMaterial} from './street-moss-material.js';
import {addVegetationCells,vineStrandRank,vineLeafRank} from './vegetation-density.js';

// A collapsed roadside apartment spans the former continuation of the road.
export function addCollapsedRoadBlockade(root,brick,seed){
 const variant=(seed>>>0)%5,profiles=[{side:-1,tilt:1.03,stretch:1,height:1},{side:1,tilt:.85,stretch:1.2,height:1.15},{side:-1,tilt:1.3,stretch:.9,height:.85},{side:1,tilt:1.12,stretch:1.1,height:1.3},{side:-1,tilt:.7,stretch:1.25,height:1.05}],profile=profiles[variant];
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const plaster=new T.MeshStandardMaterial({color:0xc0b9a8,roughness:1});
 if(typeof document!=='undefined'){plaster.map=new T.TextureLoader().load(new URL('./textures/houses/aged-white-plaster.jpg',document.baseURI).href);plaster.map.colorSpace=T.SRGBColorSpace;plaster.map.wrapS=plaster.map.wrapT=T.RepeatWrapping;}
 mossMaterial(plaster,.85);brick=mossMaterial(brick.clone(),.95);
 const group=new T.Group();group.userData.collapsedRoadBlockade=true;group.userData.deadendVariant=variant;root.add(group);
 function solid(g,mat,x,y,z,rx=0,ry=0,rz=0){const uv=g.attributes.uv,p=g.attributes.position;for(let i=0;i<uv.count;i++)uv.setXY(i,p.getX(i)/2+p.getZ(i)/2,p.getY(i)/2+p.getZ(i)/2);const mesh=new T.Mesh(g,mat);mesh.position.set(x,y,z);mesh.rotation.set(rx,ry,rz);mesh.castShadow=mesh.receiveShadow=true;mesh.userData={ownedGeometry:true,collisionKind:'rubble'};group.add(mesh);return mesh;}
 // Uneven broken masonry, rather than an intact facade at the end of the road.
 const outline=[[-10,0],[-10,2.5],[-8.5,3.2],[-7.7,2.7],[-6.6,4.3],[-5.4,3.7],[-4.2,5.3],[-3.1,4.6],[-1.7,5.7],[0,4.9],[1.1,5.8],[2.4,4.2],[3.5,4.7],[5.1,3.5],[6.4,4],[8,2.8],[10,2.3],[10,0]];
 const shape=new T.Shape();outline.forEach(([x,y],i)=>i?shape.lineTo(x,y>0?(y+2)*profile.height:y):shape.moveTo(x,y));shape.closePath();
 const mass=solid(new T.ExtrudeGeometry(shape,{depth:4,bevelEnabled:false}),brick,0,.03,-9);mass.userData.collisionKind='building';mass.userData.ownedMaterials=[brick];
 // Large recognizable fallen wall and floor sections spill towards the player.
 for(let i=0;i<10;i++){const x=(-8+i*1.8)*profile.side;solid(new T.BoxGeometry(3+random()*2,.4,4+random()*3),i%3?brick:plaster,x,1.1+random()*2,-4-random()*3,(random()-.5)*1.3,random()*2,(random()-.5)*.8);}
 const body=createBrickHouse(19);body.scale.set(1.3,1.1,1.3);body.position.set(-15,.205,-12);body.rotation.y=Math.PI/2;body.userData.collisionKind='building';group.add(body);
 for(const x of [-13.5,-4.5,4.5,13.5]){const variant=10+Math.floor(random()*10),h=createBrickHouse(variant);h.scale.setScalar(8.86/houseVariants[variant].width);h.position.set(x,.205,-25);h.userData.collisionKind='building';group.add(h);}
 const undergrowth=new T.Group();undergrowth.userData={seed,houses:[],trees:[]};group.add(undergrowth);addStreetOvergrowth(undergrowth,{minZ:-16,maxZ:2,grassPatches:180,roadPatches:100});
 const fallen=createBrickHouse(3);fallen.scale.set(1.1*profile.stretch,.85,1.1);fallen.rotation.set(.12,profile.side*.3,profile.side*profile.tilt);fallen.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(fallen);fallen.position.set(profile.side*3,.18-bounds.min.y,-8.5);fallen.userData.collisionKind='building';fallen.userData.fallenBuilding=true;group.add(fallen);
 const pieces=new T.InstancedMesh(new T.BoxGeometry(1,1,1),brick,720),o=new T.Object3D();
 for(let i=0;i<720;i++){const x=(random()-.5)*20,z=10-random()*23;const size=.15+random()*.7;o.position.set(x,(Math.abs(x)>3.5?.205:.025)+size*.3,z);o.scale.set(size*(1+random()),size*.6,size*(.8+random()));o.rotation.set(random(),random()*6.28,random());o.updateMatrix();pieces.setMatrixAt(i,o.matrix);}
 pieces.castShadow=pieces.receiveShadow=true;pieces.userData={ownedGeometry:true,ownedInstances:true,collisionKind:'rubble',ownedMaterials:[plaster]};group.add(pieces);
 for(const h of [body,fallen])h.traverse(part=>{if(!part.material)return;const mats=(Array.isArray(part.material)?part.material:[part.material]).map(m=>mossMaterial(m.clone(),.95));part.material=Array.isArray(part.material)?mats:mats[0];part.userData.ownedMaterials=mats;});
 // Tendrils and small leaves follow the exposed tilted surfaces and front walls.
 group.updateMatrixWorld(true);const leafPos=[],leafUV=[],stemPos=[],leafRanks=[],stemRanks=[],ray=new T.Raycaster(),normal=new T.Vector3(),previous=new T.Vector3(),targets=[fallen,body,mass,...group.children.filter(o=>o.isMesh&&!o.isInstancedMesh)],fb=new T.Box3().setFromObject(fallen);
 for(let strand=0;strand<28;strand++){let connected=false,leafIndex=0;const wall=strand%2===0,base=fb.min.x+random()*(fb.max.x-fb.min.x);for(let k=0;k<44;k++){const t=k/43,x=base+Math.sin(t*7+strand)*.3;
  ray.set(wall?new T.Vector3(x,.4+t*(fb.max.y-.5),fb.max.z+2):new T.Vector3(x,fb.max.y+2,fb.min.z+t*(fb.max.z-fb.min.z)),wall?new T.Vector3(0,0,-1):new T.Vector3(0,-1,0));const hit=ray.intersectObjects(targets,true)[0];if(!hit){connected=false;continue;}normal.copy(hit.face.normal).transformDirection(hit.object.matrixWorld);const point=hit.point.clone().addScaledVector(normal,.026);
  if(connected&&point.distanceTo(previous)<.7){stemRanks.push(vineStrandRank(strand));const side=point.clone().sub(previous).cross(normal).normalize().multiplyScalar(.012);for(const v of [previous.clone().sub(side),previous.clone().add(side),point.clone().add(side),previous.clone().sub(side),point.clone().add(side),point.clone().sub(side)])stemPos.push(...v.toArray());}previous.copy(point);connected=true;
  if(k%2)continue;leafRanks.push(vineLeafRank(strand,leafIndex++));const q=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,0,1),normal),size=.09+random()*.08,tile=Math.floor(random()*4);for(const j of [0,1,2,0,2,3]){const [u,v]=[[0,0],[1,0],[1,1],[0,1]][j];const offset=new T.Vector3((u-.5)*size*2,(v-.5)*size*2,0).applyQuaternion(q).add(point);leafPos.push(...offset.toArray());leafUV.push(tile%2*.5+.012+u*.476,Math.floor(tile/2)*.5+.012+v*.476);}
 }}
 const leaves=new T.MeshStandardMaterial({color:0x819e58,side:T.DoubleSide,alphaTest:.48,roughness:1});if(typeof document!=='undefined'){leaves.map=new T.TextureLoader().load(new URL('./textures/trees/street-leaves.png',document.baseURI).href);leaves.map.colorSpace=T.SRGBColorSpace;}
 for(const [positions,material,uv,kind,ranks] of [[leafPos,leaves,leafUV,'leaves',leafRanks],[stemPos,new T.MeshStandardMaterial({color:0x3d4925,side:T.DoubleSide,roughness:1}),null,'stems',stemRanks]]){
  const cells=addVegetationCells(group,{positions,material,uv,kind,ranks});cells.forEach(mesh=>mesh.userData.ruinVines=true);
  if(cells.length)cells[0].userData.ownedMaterial=true;else material.dispose();
 }

 return {debris:730,building:body};
}

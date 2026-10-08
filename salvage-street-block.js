import * as T from 'three';
import {addNYCStreetProps} from './nyc-street-props.js';
import {createBrickHouse,houseVariants} from './brick-house-variants.js';
import {createStreetTree,treeVariants} from './street-tree-variants.js';
import {createFleetVehicle,fleet} from './vehicle-fleet-models.js';
import {createFleetVehicle as createRide,fleet as rides} from './ride-fleet-models.js';
import {addStreetOvergrowth} from './street-overgrowth.js';
import {mossMaterial} from './street-moss-material.js';
import {addGroundDamage} from './street-ground-damage.js';
import {addCityBackdrop} from './street-city-backdrop.js';
import {addStreetLife} from './street-life.js';
export const BLOCK_SIZE=72;
export const streetLayouts=[{name:'버려진 주거 거리',cars:15,trees:14,debris:30},{name:'붕괴 잔해가 많은 거리',cars:12,trees:10,debris:55},{name:'차량이 밀집한 상점 거리',cars:20,trees:12,debris:35}];
function rng(seed){return()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
let materials;
function mats(){if(materials)return materials;const textured=(file)=>{const m=new T.MeshStandardMaterial({color:0xffffff,roughness:1});if(typeof document!=='undefined'){m.map=new T.TextureLoader().load(new URL('./textures/'+file,document.baseURI).href);m.map.wrapS=m.map.wrapT=T.RepeatWrapping;m.map.colorSpace=T.SRGBColorSpace;m.map.anisotropy=4;}return m;};materials={wood:textured('houses/aged-wood-floor.jpg'),asphalt:textured('street/mossy-asphalt.jpg'),sidewalk:textured('street/overgrown-sidewalk.jpg'),brick:textured('houses/red-brick-weathered.jpg'),stone:new T.MeshStandardMaterial({color:0x898578,roughness:1}),curb:new T.MeshStandardMaterial({color:0x99978b,roughness:1}),soil:new T.MeshStandardMaterial({color:0x4d4b36,roughness:1}),paint:new T.MeshStandardMaterial({color:0xc8c6ab,roughness:1})};for(const name of ['brick','stone','curb','paint'])mossMaterial(materials[name],name==='paint'?1.0:.95);return materials;}
const boxGeo=new T.BoxGeometry(1,1,1),rockGeo=new T.IcosahedronGeometry(.5,0),soilGeo=new T.CylinderGeometry(.8,.8,.015,12),moundGeo=new T.ConeGeometry(1.8,.65,7);
function plane(w,d,repeat=3){const g=new T.PlaneGeometry(w,d);g.rotateX(-Math.PI/2);const uv=g.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*w/repeat,uv.getY(i)*d/repeat);return g;}
export function createSalvageStreetBlock(seed=2207,layoutIndex=0){
 const r=rng(seed),layout=streetLayouts[layoutIndex%streetLayouts.length],m=mats(),root=new T.Group(),obstacles=[],debris=[],cars=[],smallRides=[],houses=[],treeSlots=[];
 const surface=(w,d,x,y,z,material,scale)=>{const mesh=new T.Mesh(plane(w,d,scale),material);mesh.position.set(x,y,z);mesh.receiveShadow=true;root.add(mesh);mesh.userData.ownedGeometry=true;};
 surface(72,72,0,0,0,m.soil,4);surface(7,72,0,.025,0,m.asphalt,4);for(const side of [-1,1])surface(5,72,side*6,.205,0,m.sidewalk,3.2);
 function box(x,y,z,w,h,d,mat,rotation=0){const mesh=new T.Mesh(boxGeo,mat);mesh.position.set(x,y,z);mesh.scale.set(w,h,d);mesh.rotation.y=rotation;mesh.receiveShadow=true;root.add(mesh);return mesh;}
 for(const side of [-1,1])for(let z=-35.4;z<36;z+=1.2)box(side*3.55,.115,z,.18,.18,1.16,m.curb).userData.collisionKind='ground';
 for(const side of [-1,1]){box(side*6,.10,0,5,.20,72,m.curb);box(side*3.25,.03,0,.12,.008,72,m.paint);}
 for(let z=-34;z<36;z+=6){if(r()<.2)continue;box((r()-.5)*.035,.027,z,.10,.006,2.2+r()*.3,m.paint);}
 // Small alleys separate the buildings; facades follow the narrower single-lane road.
 for(const side of [-1,1]){
  const pool=layoutIndex===2?[1,5,6,9,13,14,15,16]:layoutIndex===1?[2,3,7,8,12,17,18,19]:[0,2,3,4,7,8,1,10,11,12,17,18,19],indices=Array.from({length:7},()=>pool[Math.floor(r()*pool.length)]),total=indices.reduce((n,i)=>n+houseVariants[i].width,0),gap=.14,scale=(72-gap*6)/total;let cursor=-36;
  for(let j=0;j<7;j++){
   const collapse=j===2||j===5;const i=indices[j],d=houseVariants[i],width=d.width*scale,z=cursor+width/2,depth=d.depth*scale,h=createBrickHouse(i);h.scale.setScalar(scale);h.rotation.y=-side*Math.PI/2;h.position.set(side*(8.5+depth/2),.205,z);h.traverse(o=>{if(o.material){const list=Array.isArray(o.material)?o.material:[o.material];const cloned=list.map(mat=>mossMaterial(mat.clone(),.78));o.material=Array.isArray(o.material)?cloned:cloned[0];o.userData.ownedMaterials=cloned;}});if(collapse){h.traverse(o=>{if(!o.geometry)return;const g=o.geometry,attrs={},p=g.attributes.position;for(const name of Object.keys(g.attributes))attrs[name]=[];for(let n=0;n<p.count;n+=3){const x=(p.getX(n)+p.getX(n+1)+p.getX(n+2))/3,y=(p.getY(n)+p.getY(n+1)+p.getY(n+2))/3,zz=(p.getZ(n)+p.getZ(n+1)+p.getZ(n+2))/3;if(zz>depth/scale/2-.7&&y>1.8+Math.abs(x)*.45&&Math.abs(x)<width/scale*.35)continue;for(const [name,a] of Object.entries(g.attributes))for(let k=0;k<3;k++)for(let c=0;c<a.itemSize;c++)attrs[name].push(a.array[(n+k)*a.itemSize+c]);}const next=new T.BufferGeometry();for(const [name,a] of Object.entries(g.attributes))next.setAttribute(name,new T.Float32BufferAttribute(attrs[name],a.itemSize));next.computeBoundingSphere();o.geometry=next;o.userData.ownedGeometry=true;});const wall=box(side*6.2,1.1,z, .34,3.8,width*.52,m.brick);wall.userData.collisionKind='rubble';wall.rotation.z=side*.95;const floor=box(side*4.8,.48,z+1,2.8,.25,2.6,m.stone,.25*side);floor.userData.collisionKind='rubble';floor.rotation.z=side*.19;for(let n=0;n<120;n++){const x=side*(2.4+r()*5.9),size=.3+r()*.8;debris.push({x,y:.12+size*.4,z:z+(r()-.5)*width*.7,sx:size*1.5,sy:size*.7,sz:size,rx:r()*.6,ry:r()*Math.PI,rz:r()*.6,stone:r()<.4});}}h.userData.collisionKind='building';root.add(h);houses.push({variant:i,x:h.position.x,z,width,depth,collapsed:collapse});cursor+=width+gap;
   obstacles.push({kind:'building',x:h.position.x,z,w:depth,d:width});
   for(let k=0;k<2;k++){
    const centerZ=z+(k-.5)*width*.45,count=layout.debris,heap=new T.Mesh(moundGeo,m.stone);heap.position.set(side*7.5,.53,centerZ);heap.receiveShadow=true;root.add(heap);
    for(let n=0;n<count;n++){
     const distance=r()*3.1,zz=centerZ+(r()-.5)*3.5,x=side*(8.35-distance),size=.16+r()*.56,mound=Math.max(0,1-Math.hypot(x-side*7.5,zz-centerZ)/1.8)*.65;
     debris.push({x,y:.22+size*.24+mound,z:zz,sx:size*(1+r()),sy:size*.5,sz:size*(.5+r()),rx:(r()-.5)*.6,ry:r()*Math.PI,rz:(r()-.5)*.5,stone:r()<.30});
    }
    if(r()<.7){const slab=box(side*(7.5-r()),.46+r()*.25,centerZ,.9+r(),.14,1.1+r(),m.stone,r()*Math.PI);slab.rotation.z=(r()-.5)*.55;}
   }
  }
 }
 // Second row uses full buildings, with staggered spacing and taller silhouettes.
 const rearRandom=rng(seed^0x512c87);
 for(const side of [-1,1]){let cursor=-40,rowIndex=0;while(cursor<36){
  const index=10+Math.floor(rearRandom()*10),d=houseVariants[index],scale=.85+rearRandom()*.18,width=d.width*scale,z=cursor+width/2;
  const nearby=houses.filter(h=>Math.sign(h.x)===side&&h.row!==2&&Math.abs(h.z-z)<h.width/2+width/2);
  const rear=Math.max(18,...nearby.map(h=>Math.abs(h.x)+h.depth/2)),h=createBrickHouse(index);
  h.scale.setScalar(scale);h.rotation.y=-side*Math.PI/2;h.position.set(side*(rear+(rowIndex%2?.35:.14)+d.depth*scale/2),.205,z);
  h.traverse(o=>{if(o.material){o.material=o.material.clone();mossMaterial(o.material,.65);o.userData.ownedMaterials=[o.material];}});
  h.userData.collisionKind='building';root.add(h);houses.push({variant:index,x:h.position.x,z,width,depth:d.depth*scale,row:2});cursor+=width+.14;rowIndex++;
 }}
 // Close the seams with weathered timber barricades.
 const seamRandom=rng(seed^0x731b21),seamWalls=[],seamTransform=new T.Object3D();
 for(const side of [-1,1]){const front=houses.filter(h=>Math.sign(h.x)===side&&h.row!==2).sort((a,b)=>a.z-b.z);
  for(let i=0;i<front.length-1;i++){const left=front[i],right=front[i+1],z=(left.z+left.width/2+right.z-right.width/2)/2,rear=Math.max(Math.abs(left.x)+left.depth/2,Math.abs(right.x)+right.depth/2);
   const wall=box(side*(rear+.4),1.8,z,.3,3.6,1.2,m.brick);wall.userData.collisionKind='building';
   // Thin overlapping horizontal planks, two posts and a diagonal brace.
   const span=Math.max(.7,right.z-right.width/2-(left.z+left.width/2)+.5);
   for(let row=0;row<11;row++)seamWalls.push({x:side*8.58,y:.34+row*.235,z,w:.11,h:.25,d:span,rx:(seamRandom()-.5)*.025});
   for(const offset of [-span*.36,span*.36])seamWalls.push({x:side*8.70,y:1.48,z:z+offset,w:.16,h:2.65,d:.16});
   seamWalls.push({x:side*8.49,y:1.48,z,w:.10,h:.16,d:Math.hypot(span*.8,1.8),rx:Math.atan2(1.8,span*.8)*side});
   for(let n=0;n<26;n++){
    const size=.16+seamRandom()*.3,x=side*(7.5+seamRandom()*1.3),zz=z+(seamRandom()-.5)*1.8;
    debris.push({x,y:.22+size*.3+seamRandom()*.3,z:zz,sx:size*1.4,sy:size*.6,sz:size,rx:seamRandom()*.5,ry:seamRandom()*Math.PI,rz:seamRandom()*.5,stone:seamRandom()<.25});
   }
  }
 }
 const seamMesh=new T.InstancedMesh(boxGeo,m.wood,seamWalls.length);
 seamWalls.forEach((p,i)=>{seamTransform.position.set(p.x,p.y,p.z);seamTransform.scale.set(p.w,p.h,p.d);seamTransform.rotation.set(p.rx||0,0,0);seamTransform.updateMatrix();seamMesh.setMatrixAt(i,seamTransform.matrix);seamMesh.setColorAt(i,new T.Color().setRGB(.65+seamRandom()*.25,.63+seamRandom()*.20,.57+seamRandom()*.18));});
 seamMesh.castShadow=seamMesh.receiveShadow=true;seamMesh.userData={collisionKind:'building',ownedInstances:true};root.add(seamMesh);root.userData.seamBlockers=seamWalls.length/14;
 // Trees are spread within planting strips; their crowns use the approved broad-canopy variants.
 for(const side of [-1,1])for(let j=0;j<layout.trees/2;j++){
  const z=-31+j*62/(layout.trees/2-1)+(r()-.5)*2,x=side*(4.25+r()*.25),variant=Math.floor(r()*10),tree=createStreetTree(variant,{lod:'far'});tree.scale.set(1.45,12.5/treeVariants[variant].height,1.45);const bark=tree.children[0];bark.material=mossMaterial(bark.material.clone(),.72);bark.userData.ownedMaterials=[bark.material];tree.position.set(x,.215,z);tree.rotation.y=r()*Math.PI*2;const broken=j===1||(j>2&&r()<.2);if(broken){const stump=new T.CylinderGeometry(.24,.34,1.6,10);stump.translate(0,.8,0);const pos=stump.attributes.position;for(let n=0;n<pos.count;n++)if(pos.getY(n)>1.5)pos.setY(n,pos.getY(n)+Math.sin(pos.getX(n)*31+pos.getZ(n)*23)*.12);stump.computeVertexNormals();bark.geometry=stump;bark.userData.ownedGeometry=true;tree.children[1].visible=false;const start=new T.Vector3(x,.46,z),end=new T.Vector3(side*(1.8+r()),.21,z+(r()-.5)*4),direction=end.clone().sub(start),log=new T.Mesh(new T.CylinderGeometry(.15,.38,direction.length(),10),bark.material);log.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),direction.clone().normalize());log.position.copy(start).lerp(end,.5);log.userData.ownedGeometry=true;log.castShadow=log.receiveShadow=true;log.userData.collisionKind='tree';root.add(log);tree.userData.broken=true;}bark.userData.collisionKind='tree';root.add(tree);treeSlots.push({x,z,variant,broken});const soil=new T.Mesh(soilGeo,m.soil);soil.position.set(x,.207,z);root.add(soil);obstacles.push({kind:'tree',x,z,w:.7,d:.7});
 }
 // Wrecks have full 3D attitudes. Grounding uses transformed geometry bounds.
 let attempts=0;while(cars.length<layout.cars&&attempts++<600){
  const d=fleet[Math.floor(r()*fleet.length)],side=r()<.5?-1:1,angle=r()*Math.PI*2,roll=r()<.45?(r()<.4?Math.PI:(r()<.5?-1:1)*Math.PI/2):(r()-.5)*.18,pitch=(r()-.5)*.25;
  const car=createFleetVehicle(d,{seed:`${seed}:${attempts}`});car.scale.setScalar(1.12);car.rotation.set(pitch,angle,roll);car.updateMatrixWorld(true);
  const bounds=new T.Box3().setFromObject(car),halfW=(bounds.max.x-bounds.min.x)/2,halfD=(bounds.max.z-bounds.min.z)/2;
  if(halfW>3.4||halfD>4.5){car.material.dispose();continue;}
  // Guarantee central wrecks and both sidewalk zones, then vary the rest.
  const placement=cars.length===0?'center':cars.length<3?'sidewalk':r()<.4?'center':r()<.5?'sidewalk':'edge';
  const placementSide=cars.length===1?-1:cars.length===2?1:side;
  const x=placement==='center'?(r()-.5)*1.6:placement==='sidewalk'?placementSide*(5.6+r()*.4):side*(2.6+r()*.6),z=(r()-.5)*(66-halfD*2);
  if(Math.abs(x)+halfW>8.3||treeSlots.some(t=>Math.abs(t.x-x)<halfW+.5&&Math.abs(t.z-z)<halfD+.5)){car.material.dispose();continue;}
  if(cars.some(c=>Math.abs(c.x-x)<c.halfW+halfW+.35&&Math.abs(c.z-z)<c.halfD+halfD+.5)){car.material.dispose();continue;}
  const ground=Math.abs(x)+halfW>3.65?.215:.04;
  car.position.set(x-(bounds.min.x+bounds.max.x)/2,ground-bounds.min.y,z-(bounds.min.z+bounds.max.z)/2);car.castShadow=car.receiveShadow=true;car.userData.ownedMaterial=true;mossMaterial(car.material,.72);car.userData.collisionKind='car';root.add(car);cars.push({id:d.id,paintId:car.userData.paintId,x,z,halfW,halfD,roll,pitch,angle,placement});obstacles.push({kind:'car',x,z,w:halfW*2,d:halfD*2});
 }
 // A few abandoned motorcycles, bicycles and scooters, grounded on the road or sidewalk.
 for(let attempts=0;smallRides.length<5&&attempts<150;attempts++){
  const d=rides[Math.floor(r()*rides.length)],side=r()<.5?-1:1,ride=createRide(d);ride.rotation.set((r()-.5)*.15,r()*Math.PI*2,r()<.65?(r()<.5?-1:1)*1.45:side*.12);ride.updateMatrixWorld(true);
  const bounds=new T.Box3().setFromObject(ride),halfW=(bounds.max.x-bounds.min.x)/2,halfD=(bounds.max.z-bounds.min.z)/2,x=side*(2.1+r()*3.6),z=(r()-.5)*64;
  if([...cars,...smallRides].some(c=>Math.abs(c.x-x)<c.halfW+halfW+.25&&Math.abs(c.z-z)<c.halfD+halfD+.35)||treeSlots.some(t=>Math.abs(t.x-x)<halfW+.6&&Math.abs(t.z-z)<halfD+.6)){ride.geometry.dispose();ride.material.dispose();continue;}
  const ground=Math.abs(x)-halfW>3.65?.205: .03;
  ride.position.set(x-(bounds.min.x+bounds.max.x)/2,ground-bounds.min.y,z-(bounds.min.z+bounds.max.z)/2);ride.castShadow=ride.receiveShadow=true;ride.userData.ownedGeometry=ride.userData.ownedMaterial=true;mossMaterial(ride.material,.65);root.add(ride);smallRides.push({id:d.id,x,z,halfW,halfD});
 }
 // Collapse tongues spill into alternating sides of the road, forcing a winding route.
 const blockages=[];
 for(let j=0;j<3;j++){
  const side=j%2?1:-1,z=-21+j*21+(r()-.5)*4,x=side*2.4,heap=box(x,.22,z,3.2,.4,3.4,m.stone,.12*side);heap.userData.collisionKind='rubble';blockages.push({x,z,w:3.2,d:3.4});obstacles.push({kind:'rubble',x,z,w:3.2,d:3.4});
  for(let n=0;n<85;n++){const xx=x+(r()-.5)*3.6,zz=z+(r()-.5)*4,size=.25+r()*.65;debris.push({x:xx,y:.13+size*.28+Math.max(0,1-Math.hypot(xx-x,zz-z)/2)*.55,z:zz,sx:size*(1+r()),sy:size*.6,sz:size,rx:r()*.7,ry:r()*Math.PI,rz:r()*.6,stone:r()<.55});}
 }
 for(const stone of [false,true]){
  const items=debris.filter(d=>d.stone===stone),mesh=new T.InstancedMesh(stone?rockGeo:boxGeo,stone?m.stone:m.brick,items.length),o=new T.Object3D();items.forEach((d,i)=>{o.position.set(d.x,d.y,d.z);o.scale.set(d.sx,d.sy,d.sz);o.rotation.set(d.rx,d.ry,d.rz);o.updateMatrix();mesh.setMatrixAt(i,o.matrix);});mesh.castShadow=mesh.receiveShadow=true;mesh.instanceMatrix.needsUpdate=true;root.add(mesh);mesh.userData.ownedInstances=true;mesh.userData.collisionKind='rubble';
 }
 root.userData={seamBlockers:seamWalls.length/14,seed,layout:layoutIndex,size:72,houses,cars,smallRides,trees:treeSlots,debris:debris.length,obstacles,blockages,connections:[{x:0,z:-36,width:7},{x:0,z:36,width:7}]};addNYCStreetProps(root);addCityBackdrop(root,m.brick);addGroundDamage(root);addStreetOvergrowth(root);addStreetLife(root);return root;
}
export function disposeStreetBlock(root){root.traverse(o=>{if(o.userData.ownedMaterial)o.material.dispose();if(o.userData.ownedMaterials)o.userData.ownedMaterials.forEach(m=>m.dispose());if(o.userData.ownedGeometry)o.geometry.dispose();if(o.userData.ownedInstances)o.dispose();});}

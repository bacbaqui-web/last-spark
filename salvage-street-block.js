import * as T from 'three';
import {createBrickHouse,houseVariants} from './brick-house-variants.js';
import {createStreetTree,treeVariants} from './street-tree-variants.js';
import {createFleetVehicle,fleet} from './vehicle-fleet-models.js';
import {createFleetVehicle as createRide,fleet as rides} from './ride-fleet-models.js';
import {addStreetOvergrowth} from './street-overgrowth.js';
import {mossMaterial} from './street-moss-material.js';
export const BLOCK_SIZE=72;
export const streetLayouts=[{name:'버려진 주거 거리',cars:9,trees:14,debris:30},{name:'붕괴 잔해가 많은 거리',cars:6,trees:10,debris:55},{name:'차량이 밀집한 상점 거리',cars:14,trees:12,debris:35}];
function rng(seed){return()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
let materials;
function mats(){if(materials)return materials;const textured=(file)=>{const m=new T.MeshStandardMaterial({color:0xffffff,roughness:1});if(typeof document!=='undefined'){m.map=new T.TextureLoader().load(new URL('./textures/'+file,document.baseURI).href);m.map.wrapS=m.map.wrapT=T.RepeatWrapping;m.map.colorSpace=T.SRGBColorSpace;m.map.anisotropy=4;}return m;};materials={asphalt:textured('street/mossy-asphalt.jpg'),sidewalk:textured('street/overgrown-sidewalk.jpg'),brick:textured('houses/red-brick-weathered.jpg'),stone:new T.MeshStandardMaterial({color:0x898578,roughness:1}),curb:new T.MeshStandardMaterial({color:0x99978b,roughness:1}),soil:new T.MeshStandardMaterial({color:0x4d4b36,roughness:1}),paint:new T.MeshStandardMaterial({color:0xc8c6ab,roughness:1})};for(const name of ['brick','stone','curb','paint'])mossMaterial(materials[name],name==='paint'?1.0:.95);return materials;}
const boxGeo=new T.BoxGeometry(1,1,1),rockGeo=new T.IcosahedronGeometry(.5,0),soilGeo=new T.CylinderGeometry(.8,.8,.015,12),moundGeo=new T.ConeGeometry(1.8,.65,7);
function plane(w,d,repeat=3){const g=new T.PlaneGeometry(w,d);g.rotateX(-Math.PI/2);const uv=g.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*w/repeat,uv.getY(i)*d/repeat);return g;}
export function createSalvageStreetBlock(seed=2207,layoutIndex=0){
 const r=rng(seed),layout=streetLayouts[layoutIndex%streetLayouts.length],m=mats(),root=new T.Group(),obstacles=[],debris=[],cars=[],smallRides=[],houses=[],treeSlots=[];
 const surface=(w,d,x,y,z,material,scale)=>{const mesh=new T.Mesh(plane(w,d,scale),material);mesh.position.set(x,y,z);mesh.receiveShadow=true;root.add(mesh);mesh.userData.ownedGeometry=true;};
 surface(72,72,0,0,0,m.soil,4);surface(7,72,0,.025,0,m.asphalt,4);for(const side of [-1,1])surface(5,72,side*6,.205,0,m.sidewalk,3.2);
 function box(x,y,z,w,h,d,mat,rotation=0){const mesh=new T.Mesh(boxGeo,mat);mesh.position.set(x,y,z);mesh.scale.set(w,h,d);mesh.rotation.y=rotation;mesh.receiveShadow=true;root.add(mesh);return mesh;}
 for(const side of [-1,1])for(let z=-35.4;z<36;z+=1.2)box(side*3.55,.115,z,.18,.18,1.16,m.curb);
 for(const side of [-1,1]){box(side*6,.10,0,5,.20,72,m.curb);box(side*3.25,.03,0,.12,.008,72,m.paint);}
 for(let z=-34;z<36;z+=6){if(r()<.2)continue;box((r()-.5)*.035,.027,z,.10,.006,2.2+r()*.3,m.paint);}
 // Small alleys separate the buildings; facades follow the narrower single-lane road.
 for(const side of [-1,1]){
  const pool=layoutIndex===2?[1,1,5,6,6,9,0,2]:layoutIndex===1?[2,3,6,7,8,9]:[0,2,3,4,7,8,1],indices=Array.from({length:7},()=>pool[Math.floor(r()*pool.length)]),total=indices.reduce((n,i)=>n+houseVariants[i].width,0),gap=.7+r()*.5,scale=(72-gap*6)/total;let cursor=-36;
  for(let j=0;j<7;j++){
   const i=indices[j],d=houseVariants[i],width=d.width*scale,z=cursor+width/2,depth=d.depth*scale,h=createBrickHouse(i);h.scale.setScalar(scale);h.rotation.y=-side*Math.PI/2;h.position.set(side*(8.5+depth/2),.205,z);h.traverse(o=>{if(o.material){const list=Array.isArray(o.material)?o.material:[o.material];const cloned=list.map(mat=>mossMaterial(mat.clone(),.78));o.material=Array.isArray(o.material)?cloned:cloned[0];o.userData.ownedMaterials=cloned;}});root.add(h);houses.push({variant:i,x:h.position.x,z,width,depth});cursor+=width+gap;
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
 // Trees are spread within planting strips; their crowns use the approved broad-canopy variants.
 for(const side of [-1,1])for(let j=0;j<layout.trees/2;j++){
  const z=-31+j*62/(layout.trees/2-1)+(r()-.5)*2,x=side*(4.25+r()*.25),variant=Math.floor(r()*10),tree=createStreetTree(variant,{lod:'far'});tree.scale.set(1.45,12.5/treeVariants[variant].height,1.45);tree.position.set(x,.215,z);tree.rotation.y=r()*Math.PI*2;root.add(tree);treeSlots.push({x,z,variant});const soil=new T.Mesh(soilGeo,m.soil);soil.position.set(x,.207,z);root.add(soil);obstacles.push({kind:'tree',x,z,w:.7,d:.7});
 }
 // Wrecks have full 3D attitudes. Grounding uses transformed geometry bounds.
 let attempts=0;while(cars.length<layout.cars&&attempts++<600){
  const d=fleet[Math.floor(r()*fleet.length)],side=r()<.5?-1:1,angle=r()*Math.PI*2,roll=r()<.45?(r()<.4?Math.PI:(r()<.5?-1:1)*Math.PI/2):(r()-.5)*.18,pitch=(r()-.5)*.25;
  const car=createFleetVehicle(d);car.scale.setScalar(1.12);car.rotation.set(pitch,angle,roll);car.updateMatrixWorld(true);
  const bounds=new T.Box3().setFromObject(car),halfW=(bounds.max.x-bounds.min.x)/2,halfD=(bounds.max.z-bounds.min.z)/2;
  if(halfW>3.4||halfD>4.5){car.material.dispose();continue;}
  const x=side*(.9+halfW+r()*.4),z=(r()-.5)*(66-halfD*2);
  if(cars.some(c=>Math.abs(c.x-x)<c.halfW+halfW+.35&&Math.abs(c.z-z)<c.halfD+halfD+.5)){car.material.dispose();continue;}
  car.position.set(x-(bounds.min.x+bounds.max.x)/2,.04-bounds.min.y,z-(bounds.min.z+bounds.max.z)/2);car.castShadow=car.receiveShadow=true;car.userData.ownedMaterial=true;mossMaterial(car.material,.72);root.add(car);cars.push({id:d.id,x,z,halfW,halfD,roll,pitch,angle});obstacles.push({kind:'car',x,z,w:halfW*2,d:halfD*2});
 }
 // A few abandoned motorcycles, bicycles and scooters, grounded on the road or sidewalk.
 for(let attempts=0;smallRides.length<5&&attempts<150;attempts++){
  const d=rides[Math.floor(r()*rides.length)],side=r()<.5?-1:1,ride=createRide(d);ride.rotation.set((r()-.5)*.15,r()*Math.PI*2,r()<.65?(r()<.5?-1:1)*1.45:side*.12);ride.updateMatrixWorld(true);
  const bounds=new T.Box3().setFromObject(ride),halfW=(bounds.max.x-bounds.min.x)/2,halfD=(bounds.max.z-bounds.min.z)/2,x=side*(2.1+r()*3.6),z=(r()-.5)*64;
  if([...cars,...smallRides].some(c=>Math.abs(c.x-x)<c.halfW+halfW+.25&&Math.abs(c.z-z)<c.halfD+halfD+.35)||treeSlots.some(t=>Math.abs(t.x-x)<halfW+.6&&Math.abs(t.z-z)<halfD+.6)){ride.geometry.dispose();ride.material.dispose();continue;}
  const ground=Math.abs(x)-halfW>3.65?.205: .03;
  ride.position.set(x-(bounds.min.x+bounds.max.x)/2,ground-bounds.min.y,z-(bounds.min.z+bounds.max.z)/2);ride.castShadow=ride.receiveShadow=true;ride.userData.ownedGeometry=ride.userData.ownedMaterial=true;mossMaterial(ride.material,.65);root.add(ride);smallRides.push({id:d.id,x,z,halfW,halfD});obstacles.push({kind:'ride',x,z,w:halfW*2,d:halfD*2});
 }
 // Collapse tongues spill into alternating sides of the road, forcing a winding route.
 const blockages=[];
 for(let j=0;j<3;j++){
  const side=j%2?1:-1,z=-21+j*21+(r()-.5)*4,x=side*2.4,heap=box(x,.22,z,3.2,.4,3.4,m.stone,.12*side);blockages.push({x,z,w:3.2,d:3.4});obstacles.push({kind:'rubble',x,z,w:3.2,d:3.4});
  for(let n=0;n<85;n++){const xx=x+(r()-.5)*3.6,zz=z+(r()-.5)*4,size=.25+r()*.65;debris.push({x:xx,y:.13+size*.28+Math.max(0,1-Math.hypot(xx-x,zz-z)/2)*.55,z:zz,sx:size*(1+r()),sy:size*.6,sz:size,rx:r()*.7,ry:r()*Math.PI,rz:r()*.6,stone:r()<.55});}
 }
 for(const stone of [false,true]){
  const items=debris.filter(d=>d.stone===stone),mesh=new T.InstancedMesh(stone?rockGeo:boxGeo,stone?m.stone:m.brick,items.length),o=new T.Object3D();items.forEach((d,i)=>{o.position.set(d.x,d.y,d.z);o.scale.set(d.sx,d.sy,d.sz);o.rotation.set(d.rx,d.ry,d.rz);o.updateMatrix();mesh.setMatrixAt(i,o.matrix);});mesh.castShadow=mesh.receiveShadow=true;mesh.instanceMatrix.needsUpdate=true;root.add(mesh);mesh.userData.ownedInstances=true;
 }
 root.userData={seed,layout:layoutIndex,size:72,houses,cars,smallRides,trees:treeSlots,debris:debris.length,obstacles,blockages,connections:[{x:0,z:-36,width:7},{x:0,z:36,width:7}]};addStreetOvergrowth(root);return root;
}
export function disposeStreetBlock(root){root.traverse(o=>{if(o.userData.ownedMaterial)o.material.dispose();if(o.userData.ownedMaterials)o.userData.ownedMaterials.forEach(m=>m.dispose());if(o.userData.ownedGeometry)o.geometry.dispose();if(o.userData.ownedInstances)o.dispose();});}

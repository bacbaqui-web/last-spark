import * as T from 'three';
import {createBrickHouse,houseVariants} from './brick-house-variants.js';
import {createStreetTree} from './street-tree-variants.js';
import {createFleetVehicle,fleet} from './vehicle-fleet-models.js';
export const BLOCK_SIZE=72;
export const streetLayouts=[{name:'버려진 주거 거리',cars:9,trees:14,debris:30},{name:'붕괴 잔해가 많은 거리',cars:6,trees:10,debris:55},{name:'차량이 밀집한 상점 거리',cars:14,trees:12,debris:35}];
function rng(seed){return()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
let materials;
function mats(){if(materials)return materials;const textured=(file)=>{const m=new T.MeshStandardMaterial({color:0xffffff,roughness:1});if(typeof document!=='undefined'){m.map=new T.TextureLoader().load(new URL('./textures/'+file,document.baseURI).href);m.map.wrapS=m.map.wrapT=T.RepeatWrapping;m.map.colorSpace=T.SRGBColorSpace;m.map.anisotropy=4;}return m;};return materials={asphalt:textured('street/abandoned-asphalt.jpg'),sidewalk:textured('street/aged-sidewalk.jpg'),brick:textured('houses/red-brick-weathered.jpg'),stone:new T.MeshStandardMaterial({color:0x898578,roughness:1}),curb:new T.MeshStandardMaterial({color:0x99978b,roughness:1}),soil:new T.MeshStandardMaterial({color:0x4d4b36,roughness:1}),paint:new T.MeshStandardMaterial({color:0xa9a58e,roughness:1})};}
const boxGeo=new T.BoxGeometry(1,1,1),rockGeo=new T.IcosahedronGeometry(.5,0),soilGeo=new T.CylinderGeometry(.8,.8,.015,12),moundGeo=new T.ConeGeometry(1.8,.65,7);
function plane(w,d,repeat=3){const g=new T.PlaneGeometry(w,d);g.rotateX(-Math.PI/2);const uv=g.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*w/repeat,uv.getY(i)*d/repeat);return g;}
export function createSalvageStreetBlock(seed=2207,layoutIndex=0){
 const r=rng(seed),layout=streetLayouts[layoutIndex%streetLayouts.length],m=mats(),root=new T.Group(),obstacles=[],debris=[],cars=[],houses=[],treeSlots=[];
 const surface=(w,d,x,y,z,material,scale)=>{const mesh=new T.Mesh(plane(w,d,scale),material);mesh.position.set(x,y,z);mesh.receiveShadow=true;root.add(mesh);mesh.userData.ownedGeometry=true;};
 surface(72,72,0,0,0,m.soil,4);surface(14,72,0,.025,0,m.asphalt,4);for(const side of [-1,1])surface(5,72,side*9.5,.045,0,m.sidewalk,3.2);
 function box(x,y,z,w,h,d,mat,rotation=0){const mesh=new T.Mesh(boxGeo,mat);mesh.position.set(x,y,z);mesh.scale.set(w,h,d);mesh.rotation.y=rotation;mesh.receiveShadow=true;root.add(mesh);return mesh;}
 for(const side of [-1,1])for(let z=-35.4;z<36;z+=1.2)box(side*7,.04,z,.16,.04,1.16,m.curb);
 for(let z=-34;z<36;z+=6){if(r()<.2)continue;box((r()-.5)*.035,.027,z,.10,.006,2.2+r()*.3,m.paint);}
 // Both row fronts stay on x = +/-12. Their widths fill the block edge without exits between buildings.
 for(const side of [-1,1]){
  const pool=layoutIndex===2?[1,1,5,6,6,9,0,2]:layoutIndex===1?[2,3,6,7,8,9]:[0,2,3,4,7,8,1],indices=Array.from({length:7},()=>pool[Math.floor(r()*pool.length)]),total=indices.reduce((n,i)=>n+houseVariants[i].width,0),scale=72/total;let cursor=-36;
  for(let j=0;j<7;j++){
   const i=indices[j],d=houseVariants[i],width=d.width*scale,z=cursor+width/2,depth=d.depth*scale,h=createBrickHouse(i);h.scale.setScalar(scale);h.rotation.y=-side*Math.PI/2;h.position.set(side*(12+depth/2),.045,z);root.add(h);houses.push({variant:i,x:h.position.x,z,width,depth});cursor+=width;
   obstacles.push({kind:'building',x:side*24,z,w:24,d:width});
   for(let k=0;k<2;k++){
    const centerZ=z+(k-.5)*width*.45,count=layout.debris,heap=new T.Mesh(moundGeo,m.stone);heap.position.set(side*11,.37,centerZ);heap.receiveShadow=true;root.add(heap);
    for(let n=0;n<count;n++){
     const distance=r()*3.1,zz=centerZ+(r()-.5)*3.5,x=side*(11.85-distance),size=.16+r()*.56,mound=Math.max(0,1-Math.hypot(x-side*11,zz-centerZ)/1.8)*.65;
     debris.push({x,y:.06+size*.24+mound,z:zz,sx:size*(1+r()),sy:size*.5,sz:size*(.5+r()),rx:(r()-.5)*.6,ry:r()*Math.PI,rz:(r()-.5)*.5,stone:r()<.30});
    }
    if(r()<.7){const slab=box(side*(11-r()),.30+r()*.25,centerZ,.9+r(),.14,1.1+r(),m.stone,r()*Math.PI);slab.rotation.z=(r()-.5)*.55;}
   }
  }
 }
 // Trees are spread within planting strips; their crowns use the approved broad-canopy variants.
 for(const side of [-1,1])for(let j=0;j<layout.trees/2;j++){
  const z=-31+j*62/(layout.trees/2-1)+(r()-.5)*2,x=side*(8.9+r()*.5),variant=Math.floor(r()*10),tree=createStreetTree(variant,{lod:'far'});tree.position.set(x,.055,z);tree.rotation.y=r()*Math.PI*2;root.add(tree);treeSlots.push({x,z,variant});const soil=new T.Mesh(soilGeo,m.soil);soil.position.set(x,.047,z);root.add(soil);obstacles.push({kind:'tree',x,z,w:.7,d:.7});
 }
 // Cars leave a continuous 3m central route. Reject overlaps using their rotated footprints.
 let attempts=0;while(cars.length<layout.cars&&attempts++<250){
  const d=fleet[Math.floor(r()*fleet.length)],side=r()<.5?-1:1,angle=(r()-.5)*.42+(side<0?Math.PI:0),halfW=Math.abs(Math.cos(angle))*d.width/2+Math.abs(Math.sin(angle))*d.length/2,halfD=Math.abs(Math.cos(angle))*d.length/2+Math.abs(Math.sin(angle))*d.width/2,x=side*(1.6+halfW+r()*Math.max(.1,4.8-2*halfW)),z=(r()-.5)*(65-d.length);
  if(cars.some(c=>Math.abs(c.x-x)<c.halfW+halfW+.65&&Math.abs(c.z-z)<c.halfD+halfD+.8))continue;
  const car=createFleetVehicle(d);car.position.set(x,.03,z);car.rotation.y=angle;car.castShadow=car.receiveShadow=true;car.userData.ownedMaterial=true;root.add(car);cars.push({id:d.id,x,z,halfW,halfD});obstacles.push({kind:'car',x,z,w:halfW*2,d:halfD*2});
 }
 for(const stone of [false,true]){
  const items=debris.filter(d=>d.stone===stone),mesh=new T.InstancedMesh(stone?rockGeo:boxGeo,stone?m.stone:m.brick,items.length),o=new T.Object3D();items.forEach((d,i)=>{o.position.set(d.x,d.y,d.z);o.scale.set(d.sx,d.sy,d.sz);o.rotation.set(d.rx,d.ry,d.rz);o.updateMatrix();mesh.setMatrixAt(i,o.matrix);});mesh.castShadow=mesh.receiveShadow=true;mesh.instanceMatrix.needsUpdate=true;root.add(mesh);mesh.userData.ownedInstances=true;
 }
 root.userData={seed,layout:layoutIndex,size:72,houses,cars,trees:treeSlots,debris:debris.length,obstacles,connections:[{x:0,z:-36,width:14},{x:0,z:36,width:14}]};return root;
}
export function disposeStreetBlock(root){root.traverse(o=>{if(o.userData.ownedMaterial)o.material.dispose();if(o.userData.ownedGeometry)o.geometry.dispose();if(o.userData.ownedInstances)o.dispose();});}

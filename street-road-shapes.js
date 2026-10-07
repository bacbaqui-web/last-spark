import * as T from 'three';
import {createBrickHouse,houseVariants} from './brick-house-variants.js';
import {createStreetTree,treeVariants} from './street-tree-variants.js';
import {createFleetVehicle,fleet} from './vehicle-fleet-models.js';
import {mossMaterial} from './street-moss-material.js';
import {addCityBackdrop} from './street-city-backdrop.js';
export const roadShapes=[{name:'직선 · I',ports:[0,2]},{name:'오른쪽 꺾임 · L',ports:[0,1]},{name:'왼쪽 꺾임 · L',ports:[0,3]},{name:'세 갈래 · T',ports:[0,1,3]},{name:'네 갈래 · +',ports:[0,1,2,3]},{name:'막다른 길',ports:[0]}];
let materials;
function mats(){if(materials)return materials;const tex=(file)=>{const m=new T.MeshStandardMaterial({roughness:1});if(typeof document!=='undefined'){m.map=new T.TextureLoader().load(new URL('./textures/'+file,document.baseURI).href);m.map.colorSpace=T.SRGBColorSpace;m.map.wrapS=m.map.wrapT=T.RepeatWrapping;}return m;};return materials={road:tex('street/mossy-asphalt.jpg'),walk:tex('street/overgrown-sidewalk.jpg'),brick:mossMaterial(tex('houses/red-brick-weathered.jpg'),.7),grass:tex('street/grass-blade.jpg'),soil:new T.MeshStandardMaterial({color:0x53604b,roughness:1})};}
export function createRoadShapeBlock(seed=2207,index=0){
 const shape=roadShapes[index%roadShapes.length],root=new T.Group(),m=mats(),houses=[],trees=[],cars=[],r=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;},originalSeed=seed;
 function surface(parent,w,d,x,z,y,mat){const g=new T.PlaneGeometry(w,d);g.rotateX(-Math.PI/2);const uv=g.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*w/3,uv.getY(i)*d/3);const mesh=new T.Mesh(g,mat);mesh.position.set(x,y,z);mesh.receiveShadow=true;mesh.userData={ownedGeometry:true,collisionKind:'ground'};parent.add(mesh);return mesh;}
 function box(parent,x,y,z,w,h,d,mat,kind='ground'){const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),mat);mesh.position.set(x,y,z);mesh.castShadow=mesh.receiveShadow=true;mesh.userData={ownedGeometry:true,collisionKind:kind};parent.add(mesh);return mesh;}
 surface(root,72,72,0,0,0,m.soil);surface(root,17,17,0,0,.025,m.road);
 const grassPositions=[],grassUV=[];
 for(const port of shape.ports){
  const arm=new T.Group();arm.rotation.y=-port*Math.PI/2;root.add(arm);
  surface(arm,7,27.5,0,22.25,.025,m.road);
  for(const side of [-1,1]){
   box(arm,side*6,.10,22.25,5,.20,27.5,m.walk);surface(arm,5,27.5,side*6,22.25,.205,m.walk);
   for(let z=9;z<36;z+=1.2)box(arm,side*3.55,.115,z,.18,.18,1.16,m.walk);
   for(let j=0;j<3;j++){
    const variant=Math.floor(r()*houseVariants.length),data=houseVariants[variant],h=createBrickHouse(variant),scale=8.65/data.width;h.scale.setScalar(scale);h.rotation.y=-side*Math.PI/2;h.position.set(side*(8.5+data.depth*scale/2),.205,13+j*9);h.userData.collisionKind='building';arm.add(h);houses.push({variant,x:h.position.x,z:h.position.z});
   }
   for(let j=0;j<2;j++){const variant=Math.floor(r()*10),tree=createStreetTree(variant,{lod:'far'});tree.scale.set(1.45,12.5/treeVariants[variant].height,1.45);tree.position.set(side*4.4,.205,15+j*14);tree.children[0].userData.collisionKind='tree';arm.add(tree);trees.push({variant});}
   for(let n=0;n<90;n++){const x=side*(3.9+r()*4),z=9+r()*26;for(let k=0;k<10;k++){const xx=x+(r()-.5)*.6,zz=z+(r()-.5)*.6,h=.4+r()*.7,w=.05;const verts=[[xx-w,.21,zz],[xx+w,.21,zz],[xx+.14,.21+h,zz+.1]];for(const v of verts){const p=new T.Vector3(...v).applyAxisAngle(new T.Vector3(0,1,0),-port*Math.PI/2);grassPositions.push(...p.toArray());}grassUV.push(0,0,1,0,.5,1);}}
  }
  for(let z=11;z<36;z+=6)box(arm,0,.03,z,.1,.006,2,m.walk);
  for(let j=0;j<2;j++){const d=fleet[Math.floor(r()*fleet.length)],car=createFleetVehicle(d);car.rotation.set(0,(r()-.5)*2,.08*(r()-.5));car.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(car);car.position.set((j?1:-1)*(1.5+r()),.03-bounds.min.y,14+j*14);car.userData={...car.userData,ownedMaterial:true,collisionKind:'car'};arm.add(car);cars.push({id:d.id});}
 }
 // Close unused ports with facades; corner blocks frame the junction without covering exits.
 for(let port=0;port<4;port++)if(!shape.ports.includes(port)){const h=createBrickHouse(10+Math.floor(r()*10));h.rotation.y=Math.PI-port*Math.PI/2;h.position.set(-Math.sin(port*Math.PI/2)*13,.205,Math.cos(port*Math.PI/2)*13);h.userData.collisionKind='building';root.add(h);houses.push({});}
 for(const x of [-1,1])for(const z of [-1,1]){surface(root,5,5,x*6,z*6,.205,m.walk);const h=createBrickHouse(Math.floor(r()*20));h.rotation.y=x>0?-Math.PI/2:Math.PI/2;h.position.set(x*14,.205,z*14);h.userData.collisionKind='building';root.add(h);houses.push({});}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(grassPositions,3));g.setAttribute('uv',new T.Float32BufferAttribute(grassUV,2));g.computeVertexNormals();m.grass.side=T.DoubleSide;const grass=new T.Mesh(g,m.grass);grass.userData.ownedGeometry=true;root.add(grass);
 root.userData={seed:originalSeed,shape:index,size:72,houses,trees,cars,smallRides:[],debris:0,walkBounds:35,groundBase:.025,connections:shape.ports.map(p=>({x:-Math.sin(p*Math.PI/2)*36,z:Math.cos(p*Math.PI/2)*36,width:7}))};addCityBackdrop(root,m.brick);return root;
}

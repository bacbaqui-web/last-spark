import * as T from 'three';
import {addCollapsedRoadBlockade} from './street-collapsed-blockade.js';
import {addNYCStreetProps} from './nyc-street-props.js';
import {createBrickHouse,houseVariants} from './brick-house-variants.js';
import {createStreetTree,treeVariants} from './street-tree-variants.js';
import {createFleetVehicle,fleet} from './vehicle-fleet-models.js';
import {mossMaterial} from './street-moss-material.js';
import {windMaterial} from './street-vegetation-runtime.js';
import {createFleetVehicle as createRide,fleet as rideFleet} from './ride-fleet-models.js';
import {addStreetOvergrowth} from './street-overgrowth.js';
import {addGroundDamage} from './street-ground-damage.js';
import {addStreetLife} from './street-life.js';
import {addCityBackdrop} from './street-city-backdrop.js';
export const roadShapes=[{name:'직선 · I',ports:[0,2]},{name:'오른쪽 꺾임 · L',ports:[0,3]},{name:'왼쪽 꺾임 · L',ports:[0,1]},{name:'세 갈래 · T',ports:[0,1,3]},{name:'네 갈래 · +',ports:[0,1,2,3]},{name:'막다른 길',ports:[0]}];
let materials;
function mats(){if(materials)return materials;const tex=(file)=>{const m=new T.MeshStandardMaterial({roughness:1});if(typeof document!=='undefined'){m.map=new T.TextureLoader().load(new URL('./textures/'+file,document.baseURI).href);m.map.colorSpace=T.SRGBColorSpace;m.map.wrapS=m.map.wrapT=T.RepeatWrapping;}return m;};return materials={road:mossMaterial(tex('street/mossy-asphalt.jpg'),.82),walk:mossMaterial(tex('street/overgrown-sidewalk.jpg'),.88),brick:mossMaterial(tex('houses/red-brick-weathered.jpg'),.7),paint:mossMaterial(new T.MeshStandardMaterial({color:0xd1cdb6,roughness:1}),.85),grass:tex('street/grass-blade.jpg'),soil:new T.MeshStandardMaterial({color:0x53604b,roughness:1})};}
export function createRoadShapeBlock(seed=2207,index=0){
 const shape=roadShapes[index%roadShapes.length],root=new T.Group(),m=mats(),houses=[],trees=[],cars=[],r=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;},originalSeed=seed;
 function surface(parent,w,d,x,z,y,mat){const g=new T.PlaneGeometry(w,d);g.rotateX(-Math.PI/2);const uv=g.attributes.uv,p=g.attributes.position,world=new T.Vector3();parent.updateWorldMatrix(true,false);for(let i=0;i<uv.count;i++){world.fromBufferAttribute(p,i).add(new T.Vector3(x,y,z)).applyMatrix4(parent.matrixWorld);uv.setXY(i,world.x/3,world.z/3);}const mesh=new T.Mesh(g,mat);mesh.position.set(x,y,z);mesh.receiveShadow=true;mesh.userData={ownedGeometry:true,collisionKind:'ground'};parent.add(mesh);return mesh;}
 function box(parent,x,y,z,w,h,d,mat,kind='ground'){const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),mat);mesh.position.set(x,y,z);mesh.castShadow=mesh.receiveShadow=true;mesh.userData={ownedGeometry:true,collisionKind:kind};parent.add(mesh);return mesh;}
 surface(root,72,72,0,0,0,m.soil);const bend=index===1||index===2,start=bend?14:8.5,armLength=36-start;let debrisCount=0;
 if(!bend)surface(root,17,17,0,0,.025,m.road);
 const grassPositions=[],grassUV=[];
 if(index===3||index===4){
  const paint=(x,z,w,d)=>{const o=box(root,x,.038,z,w,.008,d,m.paint);o.userData.junctionPaint=true;};
  // The through-road keeps its center dashes; the joining arm ends at its edge.
  for(let x=-7.5;x<8;x+=3)paint(x,0,1.7,.12);
  for(const port of shape.ports.filter(p=>p===0||p===2))for(const z of [5,8])paint(0,(port===0?1:-1)*z,.12,1.8);
  for(const side of [-1,1])for(let x=-7.5;x<8;x+=1.5){if(side===1&&Math.abs(x)<3.6)continue;if(side===-1&&index===4&&Math.abs(x)<3.6)continue;paint(x,side*3.45,1.1,.08);}
  // Textured grass clusters break up the bare junction without filling every lane.
  for(let i=0;i<125;i++){const side=i%2?1:-1,x=side*(3.8+r()*4.1),z=(r()-.5)*16;for(let j=0;j<16;j++){const xx=x+(r()-.5)*.6,zz=z+(r()-.5)*.6,h=.3+r()*.65;grassPositions.push(xx-.035,.04,zz,xx+.035,.04,zz,xx+.13,.04+h,zz+.1);grassUV.push(0,0,1,0,.5,1);}}
  for(let i=0;i<25;i++){const x=(r()-.5)*6,z=(r()-.5)*14;for(let j=0;j<8;j++){const xx=x+(r()-.5)*.35,zz=z+(r()-.5)*.35,h=.18+r()*.35;grassPositions.push(xx-.025,.04,zz,xx+.025,.04,zz,xx+.08,.04+h,zz+.05);grassUV.push(0,0,1,0,.5,1);}}
 }

 for(const port of shape.ports){
  const arm=new T.Group();arm.rotation.y=-port*Math.PI/2;root.add(arm);
  surface(arm,7,armLength,0,(36+start)/2,.025,m.road);
  for(const side of [-1,1]){
   box(arm,side*6,.10,(36+start)/2,5,.20,armLength,m.walk);surface(arm,5,armLength,side*6,(36+start)/2,.205,m.walk);
   for(let z=start+.5;z<36;z+=1.2)box(arm,side*3.55,.115,z,.18,.18,1.16,m.walk);
   for(let j=0;j<(bend?2:3);j++){
    const variant=Math.floor(r()*houseVariants.length),data=houseVariants[variant],h=createBrickHouse(variant),scale=8.86/data.width;h.scale.setScalar(scale);h.rotation.y=-side*Math.PI/2;h.position.set(side*(8.5+data.depth*scale/2),.205,start+4.5+j*9);h.traverse(o=>{if(o.material){const list=Array.isArray(o.material)?o.material:[o.material];const cloned=list.map(a=>mossMaterial(a.clone(),.78));o.material=Array.isArray(o.material)?cloned:cloned[0];o.userData.ownedMaterials=cloned;}});h.userData.collisionKind='building';arm.add(h);houses.push({variant,x:h.position.x,z:h.position.z,width:data.width*scale,depth:data.depth*scale,port});
   }
   for(let j=0;j<2;j++){const variant=Math.floor(r()*10),tree=createStreetTree(variant,{lod:'far'});tree.scale.set(1.45,12.5/treeVariants[variant].height,1.45);tree.position.set(side*4.4,.205,start+3+j*(armLength-6));tree.children[0].material=mossMaterial(tree.children[0].material.clone(),.72);tree.children[0].userData.ownedMaterials=[tree.children[0].material];tree.children[0].userData.collisionKind='tree';arm.add(tree);trees.push({variant,x:tree.position.x,z:tree.position.z,port});}

  }
  for(const side of [-1,1])for(let j=0;j<2;j++){const variant=10+Math.floor(r()*10),data=houseVariants[variant],h=createBrickHouse(variant),scale=9.86/data.width;h.scale.setScalar(scale);h.rotation.y=-side*Math.PI/2;h.position.set(side*(8.64+Math.max(...houses.filter(h=>h.port===port&&!h.back&&Math.sign(h.x)===side).map(h=>h.depth))+data.depth*scale/2),.205,start+5+j*10);h.userData.collisionKind='building';arm.add(h);houses.push({variant,x:h.position.x,z:h.position.z,width:9.86,depth:data.depth*scale,port,back:true});}
  for(let z=start+2;z<36;z+=6)box(arm,0,.03,z,.1,.006,2,m.paint);
  for(let j=0;j<2;j++){const d=fleet[Math.floor(r()*fleet.length)],car=createFleetVehicle(d);car.rotation.set((r()-.5)*.1,(r()-.5)*2,r()<.3?1.45:.08*(r()-.5));car.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(car);car.position.set((j?1:-1)*(1.5+r()),.03-bounds.min.y,start+4+j*(armLength-8));mossMaterial(car.material,.72);car.userData={...car.userData,ownedMaterial:true,collisionKind:'car'};arm.add(car);cars.push({id:d.id});}
  for(let j=0;j<2;j++){const ride=createRide(rideFleet[Math.floor(r()*rideFleet.length)]);ride.rotation.set(0,r()*6.28,1.4);ride.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(ride);ride.position.set((j?1:-1)*5,.21-bounds.min.y,start+7+j*9);mossMaterial(ride.material,.65);ride.userData={ownedGeometry:true,ownedMaterial:true};arm.add(ride);}
  addNYCStreetProps(arm,{junction:true,minZ:start,maxZ:36});
  arm.rotation.y=0;arm.updateMatrixWorld(true);
  arm.userData={seed:originalSeed+port*113,houses:houses.filter(h=>h.port===port&&!h.back),trees:trees.filter(t=>t.port===port)};
  addGroundDamage(arm,{minZ:start+1,maxZ:35});addStreetOvergrowth(arm,{minZ:start,maxZ:36,grassPatches:Math.round(480*armLength/72),roadPatches:Math.round(100*armLength/72)});
  const debrisGeo=new T.BoxGeometry(1,1,1),debris=new T.InstancedMesh(debrisGeo,m.brick,160),o=new T.Object3D();
  for(let i=0;i<160;i++){const side=i%2?1:-1;o.position.set(side*(5.8+r()*2.5),.3+r()*.3,start+r()*armLength);o.scale.set(.2+r()*.55,.15+r()*.25,.2+r()*.4);o.rotation.set(r()*.5,r()*6.28,r()*.5);o.updateMatrix();debris.setMatrixAt(i,o.matrix);}debris.castShadow=debris.receiveShadow=true;debris.userData={collisionKind:'rubble',ownedGeometry:true,ownedInstances:true};arm.add(debris);debrisCount+=160;arm.rotation.y=-port*Math.PI/2;
 }
 if(bend){
  const sign=shape.ports.includes(3)?1:-1;
  function band(inner,outer,y,mat,from=0,to=Math.PI/2){const pos=[],uv=[];for(let i=0;i<48;i++){const a=from+i/48*(to-from),b=from+(i+1)/48*(to-from),points=[[inner,a],[outer,a],[outer,b],[inner,b]].map(([radius,t])=>[sign*(14-radius*Math.cos(t)),y,14-radius*Math.sin(t)]);for(const k of (sign>0?[0,2,1,0,3,2]:[0,1,2,0,2,3])){pos.push(...points[k]);uv.push(points[k][0]/3,points[k][2]/3);}}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.computeVertexNormals();const mesh=new T.Mesh(g,mat);mesh.receiveShadow=true;mesh.userData={ownedGeometry:true,collisionKind:'ground',curvedSurface:true};root.add(mesh);}
  band(10.5,17.5,.025,m.road);band(5.5,10.5,.205,m.walk);band(17.5,22.5,.205,m.walk);
  for(let i=0;i<24;i++){const t=(i+.5)/24*Math.PI/2;for(const radius of [10.45,17.55]){const curb=box(root,sign*(14-radius*Math.cos(t)),.115,14-radius*Math.sin(t),.18,.18,radius*Math.PI/48,m.walk);curb.rotation.y=-sign*t;}}
  for(let i=0;i<7;i++){const a=i/7*Math.PI/2;band(13.95,14.05,.035,m.paint,a,a+.065);}
  for(let n=0;n<180;n++){const t=r()*Math.PI/2,rad=(n%2?19:8)+r()*2;for(let k=0;k<12;k++){const x=sign*(14-rad*Math.cos(t))+(r()-.5)*.6,z=14-rad*Math.sin(t)+(r()-.5)*.6,h=.5+r()*.9;grassPositions.push(x-.04,.21,z,x+.04,.21,z,x+.12,.21+h,z+.1);grassUV.push(0,0,1,0,.5,1);}}

  for(const degrees of [10,27.5,45,62.5,80]){const t=degrees*Math.PI/180,variant=Math.floor(r()*20),data=houseVariants[variant],corner=createBrickHouse(variant),scale=8.82/data.width;corner.scale.setScalar(scale);corner.rotation.y=sign*(Math.PI/2-t);corner.position.set(sign*(14-28.5*Math.cos(t)),.205,14-28.5*Math.sin(t));corner.traverse(o=>{if(o.material){o.material=mossMaterial(o.material.clone(),.78);o.userData.ownedMaterials=[o.material];}});corner.userData.collisionKind='building';root.add(corner);houses.push({});}
  const inner=createBrickHouse(4);inner.rotation.y=-sign*Math.PI*.75;inner.position.set(sign*19,.205,19);inner.userData.collisionKind='building';root.add(inner);houses.push({});

 }

 // Close unused ports with facades; corner blocks frame the junction without covering exits.
 for(let port=0;!bend&&port<4;port++)if(!shape.ports.includes(port)&&!(index===5&&port===2)){const h=createBrickHouse(10+Math.floor(r()*10));h.rotation.y=Math.PI-port*Math.PI/2;h.position.set(-Math.sin(port*Math.PI/2)*13,.205,Math.cos(port*Math.PI/2)*13);h.userData.collisionKind='building';root.add(h);houses.push({});}
 for(const x of (bend?[]:[-1,1]))for(const z of [-1,1]){surface(root,5,5,x*6,z*6,.205,m.walk);const variant=Math.floor(r()*20),data=houseVariants[variant],h=createBrickHouse(variant),scale=8.86/data.width;h.scale.setScalar(scale);h.rotation.y=x>0?-Math.PI/2:Math.PI/2;h.position.set(x*(8.5+data.depth*scale/2),.205,z*(index===5?4:8.07));h.userData.collisionKind='building';root.add(h);houses.push({});}
 if(index===5){surface(root,7,27.5,0,-22.25,.025,m.road);for(const side of [-1,1]){surface(root,5,27.5,side*6,-22.25,.205,m.walk);for(let z=-35;z<0;z+=1.2)box(root,side*3.55,.115,z,.18,.18,1.16,m.walk);}for(let z=-34;z<0;z+=6)box(root,0,.031,z,.1,.006,2,m.paint);const collapsed=addCollapsedRoadBlockade(root,m.brick,originalSeed^0x389a);debrisCount+=collapsed.debris;houses.push({collapsed:true},...Array.from({length:4},()=>({behindBlockade:true})));}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(grassPositions,3));g.setAttribute('uv',new T.Float32BufferAttribute(grassUV,2));g.computeVertexNormals();m.grass.side=T.DoubleSide;windMaterial(m.grass,'grass');const grass=new T.Mesh(g,m.grass);grass.userData.ownedGeometry=true;root.add(grass);
 root.userData={seed:originalSeed,shape:index,size:72,houses,trees,cars,smallRides:Array.from({length:shape.ports.length*2},()=>({})),debris:debrisCount,walkBounds:35,groundBase:.025,connections:shape.ports.map(p=>({x:-Math.sin(p*Math.PI/2)*36,z:Math.cos(p*Math.PI/2)*36,width:7}))};addCityBackdrop(root,m.brick);addStreetLife(root);return root;
}

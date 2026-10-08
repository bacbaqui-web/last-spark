import * as T from 'three';
import {addCollapsedRoadBlockade} from './street-collapsed-blockade.js';
import {addNYCStreetProps,createNYCStreetProp} from './nyc-street-props.js';
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
export function createRoadShapeBlock(seed=2207,index=0,options={}){
 const shape=roadShapes[index%roadShapes.length],root=new T.Group(),m=mats(),houses=[],trees=[],cars=[],r=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;},originalSeed=seed;
 function surface(parent,w,d,x,z,y,mat){const g=new T.PlaneGeometry(w,d);g.rotateX(-Math.PI/2);const uv=g.attributes.uv,p=g.attributes.position,world=new T.Vector3();parent.updateWorldMatrix(true,false);for(let i=0;i<uv.count;i++){world.fromBufferAttribute(p,i).add(new T.Vector3(x,y,z)).applyMatrix4(parent.matrixWorld);uv.setXY(i,world.x/3,world.z/3);}const mesh=new T.Mesh(g,mat);mesh.position.set(x,y,z);mesh.receiveShadow=true;mesh.userData={ownedGeometry:true,collisionKind:'ground'};parent.add(mesh);return mesh;}
 function box(parent,x,y,z,w,h,d,mat,kind='ground'){const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),mat);mesh.position.set(x,y,z);mesh.castShadow=mesh.receiveShadow=true;mesh.userData={ownedGeometry:true,collisionKind:kind};parent.add(mesh);return mesh;}
 surface(root,72,72,0,0,0,m.walk);const bend=index===1||index===2,start=index===0?0:bend?14:8.5,armLength=36-start;let debrisCount=0;
 if(!bend&&index!==0)surface(root,17,17,0,0,.025,m.road);
 // Straight roads use one marking sequence through the central join.
 if(index===0){
  for(let z=-34;z<=34;z+=6){const stripe=box(root,0,.039,z,.12,.008,2,m.paint);stripe.userData.straightRoadPaint=true;}
 }
 const grassPositions=[],grassUV=[];
 if(index===3||index===4){
  const paint=(x,z,w,d)=>{const o=box(root,x,.038,z,w,.008,d,m.paint);o.userData.junctionPaint=true;};
  // The through-road keeps its center dashes; the joining arm ends at its edge.
  for(let x=-7.5;x<8;x+=3)paint(x,0,1.7,.12);
  for(const port of shape.ports.filter(p=>p===0||p===2))for(const z of [5,8])paint(0,(port===0?1:-1)*z,.12,1.8);
  for(const side of [-1,1])for(let x=-7.5;x<8;x+=1.5){if(side===1&&Math.abs(x)<3.6)continue;if(side===-1&&index===4&&Math.abs(x)<3.6)continue;paint(x,side*3.45,1.1,.08);}
  // Zebra crossings and stop bars are oriented to each open road mouth.
  for(const port of shape.ports){
   const a=-port*Math.PI/2,c=Math.cos(a),s=Math.sin(a),rotate=(x,z)=>[x*c+z*s,-x*s+z*c];
   for(let x=-3;x<=3;x+=.75){const [xx,zz]=rotate(x,6.3);const stripe=box(root,xx,.043,zz,.42,.008,2.4,m.paint);stripe.rotation.y=a;stripe.userData.crosswalk=true;}
   const [xx,zz]=rotate(0,8.05),stop=box(root,xx,.045,zz,6.6,.008,.20,m.paint);stop.rotation.y=a;stop.userData.stopLine=true;
   for(const side of [-1,1]){const [px,pz]=rotate(side*4.05,7.85),signal=createNYCStreetProp(side===1?0:1);signal.position.set(px,.205,pz);signal.rotation.y=a+(side===1?Math.PI:0);signal.userData.junctionSignal=true;root.add(signal);}
  }
  // Dashed left-turn paths connect approach lanes instead of crossing the footpaths.
  if(index===3)for(const sign of [-1,1])for(let n=1;n<8;n+=2){const t=n/8*Math.PI/2,radius=4.4,x=sign*(radius-radius*Math.cos(t)),z=radius-radius*Math.sin(t);const guide=box(root,x,.046,z,.10,.008,.65,m.paint);guide.rotation.y=-sign*t;guide.userData.turnGuide=true;}
  // Textured grass clusters break up the bare junction without filling every lane.
  for(let i=0;i<125;i++){const side=i%2?1:-1,x=side*(3.8+r()*4.1),z=(r()-.5)*16;for(let j=0;j<16;j++){const xx=x+(r()-.5)*.6,zz=z+(r()-.5)*.6,h=.3+r()*.65,y=index===3&&zz< -3.5?.215:.04;grassPositions.push(xx-.035,y,zz,xx+.035,y,zz,xx+.13,y+h,zz+.1);grassUV.push(0,0,1,0,.5,1);}}
  for(let i=0;i<25;i++){const x=(r()-.5)*6,z=(r()-.5)*14;for(let j=0;j<8;j++){const xx=x+(r()-.5)*.35,zz=z+(r()-.5)*.35,h=.18+r()*.35,y=index===3&&zz< -3.5?.215:.04;grassPositions.push(xx-.025,y,zz,xx+.025,y,zz,xx+.08,y+h,zz+.05);grassUV.push(0,0,1,0,.5,1);}}
 }

 for(const port of shape.ports){
  const arm=new T.Group();arm.rotation.y=-port*Math.PI/2;root.add(arm);
  surface(arm,7,armLength,0,(36+start)/2,.025,m.road);
  for(const side of [-1,1]){
   box(arm,side*6,.10,(36+start)/2,5,.20,armLength,m.walk);surface(arm,5,armLength,side*6,(36+start)/2,.205,m.walk);
   for(let z=start+.5;z<36;z+=1.2)box(arm,side*3.55,.115,z,.18,.18,1.16,m.walk);
   for(let j=0;j<(index===0?4:bend?2:3);j++){
    const variant=Math.floor(r()*houseVariants.length),data=houseVariants[variant],h=createBrickHouse(variant),scale=8.86/data.width;h.scale.setScalar(scale);h.rotation.y=-side*Math.PI/2;h.position.set(side*(8.5+data.depth*scale/2),.205,start+4.5+j*9);h.traverse(o=>{if(o.material){const list=Array.isArray(o.material)?o.material:[o.material];const cloned=list.map(a=>mossMaterial(a.clone(),.78));o.material=Array.isArray(o.material)?cloned:cloned[0];o.userData.ownedMaterials=cloned;}});h.userData.collisionKind='building';arm.add(h);houses.push({variant,x:h.position.x,z:h.position.z,width:data.width*scale,depth:data.depth*scale,port});
   }
   for(let j=0;j<(index===0?3:2);j++){const variant=Math.floor(r()*10),tree=createStreetTree(variant,{lod:'far'});tree.scale.set(1.45,12.5/treeVariants[variant].height,1.45);tree.position.set(side*4.4,.205,(index===0?6+j*12:start+3+j*(armLength-6)));tree.children[0].material=mossMaterial(tree.children[0].material.clone(),.72);tree.children[0].userData.ownedMaterials=[tree.children[0].material];tree.children[0].userData.collisionKind='tree';const broken=j===1&&(index===0||side===1);if(broken){const bark=tree.children[0],stump=new T.CylinderGeometry(.24,.34,1.6,10);stump.translate(0,.8,0);const pos=stump.attributes.position;for(let n=0;n<pos.count;n++)if(pos.getY(n)>1.5)pos.setY(n,pos.getY(n)+Math.sin(pos.getX(n)*31+pos.getZ(n)*23)*.12);stump.computeVertexNormals();bark.geometry=stump;bark.userData.ownedGeometry=true;tree.children[1].visible=false;const from=new T.Vector3(side*4.4,.46,tree.position.z),to=new T.Vector3(side*2.8,.23,tree.position.z+(side===1?2.5:-2.5)),dir=to.clone().sub(from),log=new T.Mesh(new T.CylinderGeometry(.18,.42,dir.length(),10),bark.material);log.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),dir.clone().normalize());log.position.copy(from).lerp(to,.5);log.castShadow=log.receiveShadow=true;log.userData={ownedGeometry:true,collisionKind:'tree'};arm.add(log);tree.userData.broken=true;}arm.add(tree);trees.push({variant,x:tree.position.x,z:tree.position.z,port,broken});}

  }
  for(const side of [-1,1])for(let j=0;j<(index===0?4:2);j++){const variant=10+Math.floor(r()*10),data=houseVariants[variant],h=createBrickHouse(variant),scale=(index===0?8.86:9.86)/data.width;h.scale.setScalar(scale);h.rotation.y=-side*Math.PI/2;h.position.set(side*(8.64+Math.max(...houses.filter(h=>h.port===port&&!h.back&&Math.sign(h.x)===side).map(h=>h.depth))+data.depth*scale/2),.205,start+(index===0?4.5+j*9:5+j*10));h.userData.collisionKind='building';arm.add(h);houses.push({variant,x:h.position.x,z:h.position.z,width:data.width*scale,depth:data.depth*scale,port,back:true});}
  if(index!==0)for(let z=start+2;z<36;z+=6)box(arm,0,.039,z,.1,.008,2,m.paint);
  for(let j=0;j<4;j++){const pool=fleet.filter(v=>v.length<=4.7),d=pool[Math.floor(r()*pool.length)],car=createFleetVehicle(d);car.rotation.set((r()-.5)*.1,(r()-.5)*1.2,r()<.35?1.45:.08*(r()-.5));car.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(car);car.position.set([-2.2,2.2,0,2.6][j],.03-bounds.min.y,start+3+j*(armLength-6)/3);mossMaterial(car.material,.72);car.userData={...car.userData,ownedMaterial:true,collisionKind:'car'};arm.add(car);cars.push({id:d.id});}
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
  band(10.5,17.5,.025,m.road);band(0,10.5,.205,m.walk);band(17.5,23.3,.205,m.walk);
  for(let i=0;i<24;i++){const t=(i+.5)/24*Math.PI/2;for(const radius of [10.45,17.55]){const curb=box(root,sign*(14-radius*Math.cos(t)),.115,14-radius*Math.sin(t),.18,.18,radius*Math.PI/48,m.walk);curb.rotation.y=-sign*t;}}
  for(let i=0;i<7;i++){const a=i/7*Math.PI/2;band(13.95,14.05,.035,m.paint,a,a+.065);}
  for(let n=0;n<180;n++){const t=r()*Math.PI/2,rad=(n%2?19:8)+r()*2;for(let k=0;k<12;k++){const x=sign*(14-rad*Math.cos(t))+(r()-.5)*.6,z=14-rad*Math.sin(t)+(r()-.5)*.6,h=.5+r()*.9;grassPositions.push(x-.04,.21,z,x+.04,.21,z,x+.12,.21+h,z+.1);grassUV.push(0,0,1,0,.5,1);}}

  for(const degrees of [10,27.5,45,62.5,80]){const t=degrees*Math.PI/180,variant=Math.floor(r()*20),data=houseVariants[variant],corner=createBrickHouse(variant),scale=8.82/data.width;corner.scale.setScalar(scale);corner.rotation.y=sign*(Math.PI/2-t);corner.position.set(sign*(14-(22.48+data.depth*scale/2)*Math.cos(t)),.205,14-(22.48+data.depth*scale/2)*Math.sin(t));corner.traverse(o=>{if(o.material){o.material=mossMaterial(o.material.clone(),.78);o.userData.ownedMaterials=[o.material];}});corner.userData.collisionKind='building';root.add(corner);houses.push({});}
  const curveDebris=new T.InstancedMesh(new T.BoxGeometry(1,1,1),m.brick,260),fragment=new T.Object3D();
  for(let i=0;i<260;i++){const t=r()*Math.PI/2,rad=i%4===0?8+r()*1.8:20.2+r()*2.7,size=.16+r()*.48;fragment.position.set(sign*(14-rad*Math.cos(t)),.205+size*.3,14-rad*Math.sin(t));fragment.scale.set(size*1.5,size*.6,size);fragment.rotation.set(r()*.6,r()*6.28,r()*.6);fragment.updateMatrix();curveDebris.setMatrixAt(i,fragment.matrix);}
  curveDebris.castShadow=curveDebris.receiveShadow=true;curveDebris.userData={ownedGeometry:true,ownedInstances:true,collisionKind:'rubble',curveDebris:true};root.add(curveDebris);debrisCount+=260;
  const inner=createBrickHouse(4);inner.rotation.y=-sign*Math.PI*.75;inner.position.set(sign*19,.205,19);inner.userData.collisionKind='building';root.add(inner);houses.push({});

 }

 // Close unused ports with facades; corner blocks frame the junction without covering exits.
 for(let port=0;!bend&&index!==0&&port<4;port++)if(!shape.ports.includes(port)&&!(index===5&&port===2)){const variant=10+Math.floor(r()*10),data=houseVariants[variant],h=createBrickHouse(variant),scale=index===3&&port===2?17.14/data.width:1;h.scale.set(scale,1,scale);h.rotation.y=Math.PI-port*Math.PI/2;const distance=8.64+data.depth*scale/2;h.position.set(-Math.sin(port*Math.PI/2)*distance,.205,Math.cos(port*Math.PI/2)*distance);h.userData.junctionBuilding=true;h.userData.collisionKind='building';root.add(h);houses.push({});}
 for(const x of (bend||index===0?[]:[-1,1]))for(const z of [-1,1]){surface(root,5,5,x*6,z*6,.205,m.walk);if(index!==5&&shape.ports.includes(z>0?0:2))continue;const variant=Math.floor(r()*20),data=houseVariants[variant],h=createBrickHouse(variant),scale=8.86/data.width;h.scale.setScalar(scale);h.rotation.y=x>0?-Math.PI/2:Math.PI/2;h.position.set(x*(8.5+data.depth*scale/2),.205,z*(index===5?4:13.07));h.userData.collisionKind='building';root.add(h);houses.push({});}
 if(index===5){surface(root,7,27.5,0,-22.25,.025,m.road);for(const side of [-1,1]){surface(root,5,27.5,side*6,-22.25,.205,m.walk);for(let z=-35;z<0;z+=1.2)box(root,side*3.55,.115,z,.18,.18,1.16,m.walk);}for(let z=-34;z<0;z+=6)box(root,0,.031,z,.1,.006,2,m.paint);const collapsed=addCollapsedRoadBlockade(root,m.brick,originalSeed^0x389a);debrisCount+=collapsed.debris;houses.push({collapsed:true},...Array.from({length:5},()=>({behindBlockade:true})));}
 if(index===3){surface(root,17,5,0,-6,.205,m.walk);for(let x=-8;x<8.5;x+=1.2)box(root,x,.115,-3.55,1.16,.18,.18,m.walk);}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(grassPositions,3));g.setAttribute('uv',new T.Float32BufferAttribute(grassUV,2));g.computeVertexNormals();m.grass.side=T.DoubleSide;windMaterial(m.grass,'grass');const grass=new T.Mesh(g,m.grass);grass.userData.ownedGeometry=true;root.add(grass);
 root.userData={seed:originalSeed,shape:index,size:72,houses,trees,cars,smallRides:Array.from({length:shape.ports.length*2},()=>({})),debris:debrisCount,walkBounds:35,groundBase:.025,connections:shape.ports.map(p=>({x:-Math.sin(p*Math.PI/2)*36,z:Math.cos(p*Math.PI/2)*36,width:7}))};if(options.backdrop!==false)addCityBackdrop(root,m.brick);addStreetLife(root);return root;
}

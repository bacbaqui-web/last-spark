import * as T from 'three';
import {createRecoveryDrone} from './recovery-drone.js';

// Freeze only the visible, rigid frame meshes. No game bones, AI, textures or
// shared-resource ownership cross into the temporary flight renderer.
export function flightCargoSnapshot(root){
 root.updateWorldMatrix(true,true);
 const cargo=new T.Group(),inverse=root.matrixWorld.clone().invert(),materials=new Map(),geometries=new Map();
 function material(source){
  if(!materials.has(source))materials.set(source,new T.MeshStandardMaterial({
   color:source.color??0xffffff,emissive:source.emissive??0x000000,emissiveIntensity:source.emissiveIntensity??0,
   metalness:source.metalness??.2,roughness:source.roughness??.8,
   side:source.side,vertexColors:source.vertexColors,transparent:source.transparent,opacity:source.opacity
  }));
  return materials.get(source);
 }
 root.traverseVisible(object=>{
  if(!object.isMesh)return;
  if(!geometries.has(object.geometry))geometries.set(object.geometry,new T.BufferGeometry().copy(object.geometry));
  const transform=new T.Matrix4(),instance=new T.Matrix4();
  for(let i=0;i<(object.isInstancedMesh?object.count:1);i++){
   const mesh=new T.Mesh(geometries.get(object.geometry),Array.isArray(object.material)?object.material.map(material):material(object.material));
   transform.copy(inverse).multiply(object.matrixWorld);if(object.isInstancedMesh){object.getMatrixAt(i,instance);transform.multiply(instance);}
   mesh.matrix.copy(transform);mesh.matrixAutoUpdate=false;cargo.add(mesh);
  }
 });
 const json=cargo.toJSON();for(const value of [...materials.values(),...geometries.values()])value.dispose();return json;
}

export function createFlightScene(cargoJSON){
 const scene=new T.Scene();scene.background=new T.Color(0x84b9d5);scene.fog=new T.Fog(0xa5c8d7,65,250);
 scene.add(new T.HemisphereLight(0xe2f4ff,0x687259,2.5));
 const sun=new T.DirectionalLight(0xffefd8,3);sun.position.set(-12,25,18);scene.add(sun);
 const camera=new T.PerspectiveCamera(43,1,.1,450);
 const carrier=new T.Group(),drone=createRecoveryDrone({loadTextures:false});drone.position.set(0,0,0);carrier.add(drone);
 const cargo=new T.ObjectLoader().parse(cargoJSON);cargo.position.set(0,.09,.45);carrier.add(cargo);scene.add(carrier);
 // A tiny procedural facade keeps the overflight readable without loading a
 // second copy of the detailed destination city.
 const pixels=new Uint8Array(64*64*4);
 for(let y=0;y<64;y++)for(let x=0;x<64;x++){
  const window=x%16>=4&&x%16<12&&y%12>=3&&y%12<10,shade=window?65+(x*7+y*3)%15:159+(x*17+y*13)%23,offset=(y*64+x)*4;
  pixels.set([shade,shade+3,shade+2,255],offset);
 }
 const facade=new T.DataTexture(pixels,64,64);facade.colorSpace=T.SRGBColorSpace;facade.needsUpdate=true;
 const cube=new T.BoxGeometry(1,1,1),stone=new T.MeshStandardMaterial({roughness:1,map:facade}),roof=new T.MeshStandardMaterial({color:0x626b61,roughness:1}),dummy=new T.Object3D(),city=new T.Group();city.position.y=-38;scene.add(city);
 const ground=new T.Mesh(new T.PlaneGeometry(700,700),new T.MeshStandardMaterial({color:0x5d7065,roughness:1}));ground.rotation.x=-Math.PI/2;ground.position.y=-.2;city.add(ground);
 const tiles=[];
 for(let tile=0;tile<3;tile++){
  const batch=new T.InstancedMesh(cube,[stone,stone,roof,roof,stone,stone],96);batch.frustumCulled=false;
  for(let i=0;i<96;i++){
   const x=i%12,z=Math.floor(i/12),n=(i*73+tile*19)%101,h=5+n*.16;
   dummy.position.set((x-5.5)*21,h/2,(z-3.5)*21);dummy.scale.set(11+n%5,h,10+n%7);dummy.updateMatrix();batch.setMatrixAt(i,dummy.matrix);
   batch.setColorAt(i,new T.Color().setHSL(.13+n*.0007,.09,.34+n*.0018));
  }
  city.add(batch);tiles.push(batch);
 }
 const cloudMaterial=new T.MeshBasicMaterial({color:0xd7e5e6,transparent:true,opacity:.18,depthWrite:false});
 const clouds=new T.InstancedMesh(new T.IcosahedronGeometry(1,1),cloudMaterial,14);
 for(let i=0;i<14;i++){dummy.position.set((i%7-3)*48,-12-(i%3)*3,(i*97)%300-150);dummy.scale.set(18+i%4*5,2,9);dummy.updateMatrix();clouds.setMatrixAt(i,dummy.matrix);}scene.add(clouds);
 let paint=null;
 return {scene,camera,drone,cargo,
  resize(width,height){camera.aspect=width/height;camera.updateProjectionMatrix();},
  update(seconds){
   carrier.position.y=Math.sin(seconds*1.6)*.12;carrier.rotation.set(-.025+Math.sin(seconds*.6)*.012,0,Math.sin(seconds*.75)*.018);
   drone.userData.updateFlight(seconds);
   for(let i=0;i<tiles.length;i++)tiles[i].position.z=((i*168+seconds*17)%504)-252;
   const distance=Math.max(1,1/camera.aspect);camera.position.set(9.5*distance,1.25+5.35*distance,12.8*distance);camera.lookAt(0,1.25,0);
  },
  setPaint(image){paint?.image?.close?.();paint?.dispose();paint=new T.Texture(image);paint.colorSpace=T.SRGBColorSpace;paint.flipY=false;paint.needsUpdate=true;for(const mat of drone.userData.ownedMaterials.slice(0,2)){mat.map=paint;mat.needsUpdate=true;}},
  dispose(){const geometries=new Set(),materials=new Set();scene.traverse(o=>{if(o.geometry)geometries.add(o.geometry);for(const m of [].concat(o.material||[]))materials.add(m);if(o.isInstancedMesh)o.dispose();});for(const g of geometries)g.dispose();for(const m of materials)m.dispose();facade.dispose();paint?.image?.close?.();paint?.dispose();scene.clear();}
 };
}

import * as T from 'three';
import {createBrickHouse,houseVariants} from './brick-house-variants.js';
import {addCityBackdrop} from './street-city-backdrop.js';
import {mossMaterial} from './street-moss-material.js';
export function createSatelliteCrashBlock(seed=2207){
 const root=new T.Group(),houses=[],r=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 function tex(file,color=0xffffff){const m=new T.MeshStandardMaterial({color,roughness:.95});if(typeof document!=='undefined'){m.map=new T.TextureLoader().load(new URL('./textures/'+file,document.baseURI).href);m.map.colorSpace=T.SRGBColorSpace;m.map.wrapS=m.map.wrapT=T.RepeatWrapping;}return m;}
 const earth=tex('street/mossy-asphalt.jpg',0x80746a),brick=mossMaterial(tex('houses/red-brick-weathered.jpg'),.45),metal=tex('street/nyc-prop-materials.jpg',0x9d9890),dark=new T.MeshStandardMaterial({color:0x242b2d,roughness:.8,metalness:.4}),panel=new T.MeshStandardMaterial({color:0x273b4c,roughness:.7,metalness:.3}),core=new T.MeshStandardMaterial({color:0x72dee1,emissive:0x1f7779,emissiveIntensity:.7});
 function height(x,z){const rad=Math.hypot(x,z);return -2.6*(1-T.MathUtils.smoothstep(rad,8,23))+.65*Math.exp(-(((rad-24)/2.3)**2));}
 const floor=new T.PlaneGeometry(72,72,96,96);floor.rotateX(-Math.PI/2);const p=floor.attributes.position,uv=floor.attributes.uv;for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i);p.setY(i,height(x,z));uv.setXY(i,x/3,z/3);}floor.computeVertexNormals();const ground=new T.Mesh(floor,earth);ground.receiveShadow=true;ground.userData={ownedGeometry:true,collisionKind:'ground'};root.add(ground);
 function mesh(g,m,parent=root){if(m===metal){const uv=g.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,.515+uv.getX(i)*.47,.515+uv.getY(i)*.47);}const o=new T.Mesh(g,m);o.castShadow=o.receiveShadow=true;o.userData.ownedGeometry=true;parent.add(o);return o;}
 function box(x,y,z,w,h,d,m=metal,parent=root){const o=mesh(new T.BoxGeometry(w,h,d),m,parent);o.position.set(x,y,z);return o;}
 // Original orthogonal city blocks; the inward-facing portions are sheared down towards impact.
 const sources=[];
 for(const side of [-1,1])for(const x of [24,33])for(const z of [-30,-21,-12,-3,6,15,24,33]){
  const variant=2+Math.floor(r()*8),data=houseVariants[variant],h=createBrickHouse(variant),scale=8.86/data.width;
  h.scale.set(scale,1,scale);h.rotation.y=-side*Math.PI/2;h.position.set(side*x,.05,z);h.updateMatrixWorld(true);
  h.traverse(part=>{if(!part.geometry)return;const original=part.geometry,g=original.index?original.toNonIndexed():original,p=g.attributes.position,arrays=Object.fromEntries(Object.keys(g.attributes).map(k=>[k,[]]));
   for(let n=0;n<p.count;n+=3){const center=new T.Vector3();for(let k=0;k<3;k++)center.add(new T.Vector3().fromBufferAttribute(p,n+k).applyMatrix4(part.matrixWorld));center.multiplyScalar(1/3);const cut=.7+Math.max(0,Math.hypot(center.x,center.z)-20)*1.15;if(center.y>cut)continue;for(const [name,attr] of Object.entries(g.attributes))for(let k=0;k<3;k++)for(let j=0;j<attr.itemSize;j++)arrays[name].push(attr.array[(n+k)*attr.itemSize+j]);}
   const next=new T.BufferGeometry();for(const [name,attr] of Object.entries(g.attributes))next.setAttribute(name,new T.Float32BufferAttribute(arrays[name],attr.itemSize));next.computeBoundingSphere();part.geometry=next;part.userData.ownedGeometry=true;if(g!==original)g.dispose();
  });h.userData.collisionKind='building';h.userData.impactGridBuilding=true;root.add(h);houses.push({variant,x:side*x,z});if(x===24)sources.push({x:side*20,z});
 }
 for(const x of [-14,-5,5,14]){const h=createBrickHouse(3);h.scale.setScalar(8.86/houseVariants[3].width);h.position.set(x,.05,-32);h.userData.collisionKind='building';root.add(h);houses.push({variant:3,x,z:-32});sources.push({x,z:-27});}
 // Broken road and pavement strips descend with the crater instead of floating over it.
 const road=tex('street/mossy-asphalt.jpg'),walk=mossMaterial(tex('street/overgrown-sidewalk.jpg'),.65),paint=mossMaterial(new T.MeshStandardMaterial({color:0xc8c3ad,roughness:1}),.7);
 function strip(x,z,w,d,mat){const g=new T.PlaneGeometry(w,d,Math.ceil(w),Math.ceil(d));g.rotateX(-Math.PI/2);const pos=g.attributes.position,uv=g.attributes.uv;for(let i=0;i<pos.count;i++){const xx=pos.getX(i)+x,zz=pos.getZ(i)+z;pos.setXYZ(i,xx,height(xx,zz)+.035,zz);uv.setXY(i,xx/3,zz/3);}g.computeVertexNormals();const o=mesh(g,mat);o.castShadow=false;o.userData.collisionKind='ground';return o;}
 strip(0,23,7,26,road);strip(0,0,72,7,road);for(const side of [-1,1]){strip(side*5,26,3,20,walk);strip(0,side*5,72,3,walk);}
 for(let z=12;z<36;z+=5){const line=box(0,height(0,z)+.055,z,.12,.01,2,paint);line.userData.roadTrace=true;}
 for(let x=-34;x<35;x+=6)if(Math.abs(x)>9){const line=box(x,height(x,0)+.055,0,2,.01,.12,paint);line.userData.roadTrace=true;}
 const debris=new T.InstancedMesh(new T.BoxGeometry(1,1,1),brick,1100),o=new T.Object3D();
 for(let i=0;i<1100;i++){const source=sources[i%sources.length],length=Math.hypot(source.x,source.z),distance=14+r()*Math.max(1,length-14),spread=(r()-.5)*4,x=source.x/length*distance+source.z/length*spread,z=source.z/length*distance-source.x/length*spread;
  o.position.set(x,height(x,z)+.18+r()*.65,z);o.scale.set(.25+r()*1.5,.15+r()*.65,.25+r()*1.2);o.rotation.set(r()*.7,Math.atan2(source.x,source.z)+r()*.5,r()*.7);if(z>10&&Math.abs(x)<4.2)o.scale.set(0,0,0);o.updateMatrix();debris.setMatrixAt(i,o.matrix);
 }
 debris.castShadow=debris.receiveShadow=true;debris.userData={ownedGeometry:true,ownedInstances:true,collisionKind:'rubble',impactDebris:true};root.add(debris);
 for(const source of sources){if(Math.abs(source.z)>26)continue;const x=source.x*.85,z=source.z*.85,slab=box(x,height(x,z)+.65,z,3.5,.35,4,brick);slab.rotation.set(.55,Math.atan2(source.x,source.z),.25);slab.userData.collisionKind='rubble';}
 // Ruptured armored satellite, fractured solar wings and detached antenna.
 const satellite=new T.Group();satellite.position.set(-2,-2.1,-1);satellite.rotation.set(.16,.4,-.3);root.add(satellite);
 const hull=mesh(new T.CylinderGeometry(1.45,1.65,5.7,8),metal,satellite);hull.rotation.z=Math.PI/2;hull.userData.collisionKind='rubble';
 for(const s of [-1,1]){const wing=new T.Group();wing.position.set(0,.2,s*4);wing.rotation.set(s*.18,0,s*.1);satellite.add(wing);for(let row=0;row<3;row++)for(let col=0;col<5;col++){if(row===2&&col>2)continue;box((col-2)*.8,0,(row-1)*1.3,.76,.12,1.22,panel,wing);}box(0,-.1,0,4.6,.15,.12,metal,wing);}
 const hatch=box(1.2,1.35,0,1.6,.15,1.3,dark,satellite),reward=box(1.2,1.55,0,.65,.6,.65,core,satellite);reward.visible=false;
 const antenna=mesh(new T.ConeGeometry(1.3,.35,16),metal);antenna.position.set(5,-2.2,3);antenna.rotation.set(1.1,.4,.7);
 root.userData={bossStage:true,size:72,houses,trees:[],cars:[],smallRides:[],debris:1100,walkBounds:35,groundBase:-3,connections:[{x:0,z:36,width:7}],mission:'전쟁위성 회수 · 보스 토벌 후 희귀 모듈',bossDefeated:false,previewBossDefeat:()=>{hatch.rotation.z=-1.1;hatch.position.y=1.9;reward.visible=true;root.userData.bossDefeated=true;}};
 addCityBackdrop(root,{groundY:-4});ground.userData.ownedMaterials=[earth,brick,metal,dark,panel,core,road,walk,paint];return root;
}

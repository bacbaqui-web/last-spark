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
 // Dense ruined perimeter, with a single road-sized entrance on the south edge.
 for(let i=1;i<23;i++){const a=i/24*Math.PI*2,variant=2+Math.floor(r()*8),data=houseVariants[variant],h=createBrickHouse(variant),scale=8/data.width;h.scale.set(scale,.55+r()*.25,scale);h.rotation.y=a+Math.PI;h.position.set(Math.sin(a)*31,.05,Math.cos(a)*31);h.userData.collisionKind='building';root.add(h);houses.push({variant});}
 const wallPos=[],wallUV=[];
 for(let i=2;i<94;i++){const a=i/96*6.28,b=(i+1)/96*6.28,y=3.9+r()*1.1,pts=[[Math.sin(a)*27,0,Math.cos(a)*27],[Math.sin(b)*27,0,Math.cos(b)*27],[Math.sin(b)*27,y,Math.cos(b)*27],[Math.sin(a)*27,y+.2,Math.cos(a)*27]];for(const k of [0,1,2,0,2,3]){wallPos.push(...pts[k]);wallUV.push(i*.25+(k===1||k===2?.25:0),pts[k][1]/2);}}
 const wg=new T.BufferGeometry();wg.setAttribute('position',new T.Float32BufferAttribute(wallPos,3));wg.setAttribute('uv',new T.Float32BufferAttribute(wallUV,2));wg.computeVertexNormals();brick.side=T.DoubleSide;const wall=mesh(wg,brick);wall.userData.collisionKind='building';
 const debris=new T.InstancedMesh(new T.BoxGeometry(1,1,1),brick,800),o=new T.Object3D();for(let i=0;i<800;i++){const a=r()*6.28,rad=15+r()*13,x=Math.sin(a)*rad,z=Math.cos(a)*rad;if(z>24&&Math.abs(x)<4){o.scale.set(0,0,0);}else{o.position.set(x,height(x,z)+.2+r()*1.0,z);o.scale.set(.3+r()*2,.15+r()*.8,.3+r()*1.3);o.rotation.set(r()*.7,r()*6.28,r()*.7);}o.updateMatrix();debris.setMatrixAt(i,o.matrix);}debris.castShadow=debris.receiveShadow=true;debris.userData={ownedGeometry:true,ownedInstances:true,collisionKind:'rubble'};root.add(debris);
 // Ruptured armored satellite, fractured solar wings and detached antenna.
 const satellite=new T.Group();satellite.position.set(-2,-2.1,-1);satellite.rotation.set(.16,.4,-.3);root.add(satellite);
 const hull=mesh(new T.CylinderGeometry(1.45,1.65,5.7,8),metal,satellite);hull.rotation.z=Math.PI/2;hull.userData.collisionKind='rubble';
 for(const s of [-1,1]){const wing=new T.Group();wing.position.set(0,.2,s*4);wing.rotation.set(s*.18,0,s*.1);satellite.add(wing);for(let row=0;row<3;row++)for(let col=0;col<5;col++){if(row===2&&col>2)continue;box((col-2)*.8,0,(row-1)*1.3,.76,.12,1.22,panel,wing);}box(0,-.1,0,4.6,.15,.12,metal,wing);}
 const hatch=box(1.2,1.35,0,1.6,.15,1.3,dark,satellite),reward=box(1.2,1.55,0,.65,.6,.65,core,satellite);reward.visible=false;
 const antenna=mesh(new T.ConeGeometry(1.3,.35,16),metal);antenna.position.set(5,-2.2,3);antenna.rotation.set(1.1,.4,.7);
 function guardian(x,z,scale=1){const g=new T.Group();g.position.set(x,height(x,z),z);g.scale.setScalar(scale);root.add(g);g.userData.collisionKind='prop';box(0,1.05,0,1.4,.7,1.5,dark,g);const head=mesh(new T.SphereGeometry(.35,10,8),metal,g);head.position.set(0,1.65,.25);box(0,1.68,.55,.38,.08,.06,core,g);for(const sx of [-1,1])for(const sz of [-1,1]){const leg=box(sx*.9,.5,sz*.7,.22,.95,.24,metal,g);leg.rotation.z=sx*.42;box(sx*1.1,.08,sz*.8,.48,.16,.65,dark,g);}return g;}
 const boss=guardian(5,-4,2.2);for(const [x,z] of [[-9,6],[8,8],[-11,-7],[0,-13],[14,-2]])guardian(x,z,.8);
 root.userData={bossStage:true,size:72,houses,trees:[],cars:[],smallRides:[],debris:800,walkBounds:35,groundBase:-3,connections:[{x:0,z:36,width:7}],mission:'전쟁위성 회수 · 보스 토벌 후 희귀 모듈',bossDefeated:false,previewBossDefeat:()=>{boss.visible=false;hatch.rotation.z=-1.1;hatch.position.y=1.9;reward.visible=true;root.userData.bossDefeated=true;}};
 addCityBackdrop(root,{groundY:-4});ground.userData.ownedMaterials=[earth,brick,metal,dark,panel,core];return root;
}

import * as T from 'three';
import {createFleetVehicle,fleet} from './vehicle-fleet-models.js';
import {createImpactRuinBuilding} from './impact-ruin-buildings.js';
import {addCityBackdrop} from './street-city-backdrop.js';
import {mossMaterial} from './street-moss-material.js';
export function createSatelliteCrashBlock(seed=2207,options={}){
 const root=new T.Group(),houses=[],r=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 function tex(file,color=0xffffff){const m=new T.MeshStandardMaterial({color,roughness:.95});if(typeof document!=='undefined'){m.map=new T.TextureLoader().load(new URL('./textures/'+file,document.baseURI).href);m.map.colorSpace=T.SRGBColorSpace;m.map.wrapS=m.map.wrapT=T.RepeatWrapping;}return m;}
 const earth=tex('street/mossy-asphalt.jpg',0x80746a),brick=mossMaterial(tex('houses/red-brick-weathered.jpg'),.45),metal=tex('street/nyc-prop-materials.jpg',0x9d9890),dark=new T.MeshStandardMaterial({color:0x242b2d,roughness:.8,metalness:.4}),panel=new T.MeshStandardMaterial({color:0x273b4c,roughness:.7,metalness:.3}),core=new T.MeshStandardMaterial({color:0x72dee1,emissive:0x1f7779,emissiveIntensity:.7});
 function height(x,z){const rad=Math.hypot(x,z);return -2.6*(1-T.MathUtils.smoothstep(rad,8,23))+.65*Math.exp(-(((rad-24)/2.3)**2));}
 const floor=new T.PlaneGeometry(72,72,96,96);floor.rotateX(-Math.PI/2);const p=floor.attributes.position,uv=floor.attributes.uv;for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i);p.setY(i,height(x,z));uv.setXY(i,x/3,z/3);}const colors=[];for(let i=0;i<p.count;i++){const radius=Math.hypot(p.getX(i),p.getZ(i)),shade=.12+.7*T.MathUtils.smoothstep(radius,13,29);colors.push(shade,shade*.94,shade*.87);}floor.setAttribute('color',new T.Float32BufferAttribute(colors,3));earth.vertexColors=true;floor.computeVertexNormals();const ground=new T.Mesh(floor,earth);ground.receiveShadow=true;ground.userData={ownedGeometry:true,collisionKind:'ground'};root.add(ground);
 function mesh(g,m,parent=root){if(m===metal){const uv=g.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,.515+uv.getX(i)*.47,.515+uv.getY(i)*.47);}const o=new T.Mesh(g,m);o.castShadow=o.receiveShadow=true;o.userData.ownedGeometry=true;parent.add(o);return o;}
 function box(x,y,z,w,h,d,m=metal,parent=root){const o=mesh(new T.BoxGeometry(w,h,d),m,parent);o.position.set(x,y,z);return o;}
 // New shockwave-specific assets occupy the original rectangular city lots.
 const scorchedBrick=tex('houses/red-brick-weathered.jpg',0xada18f),scorchedFloor=tex('houses/aged-white-plaster.jpg',0x89827a),beam=new T.MeshStandardMaterial({color:0x201b18,roughness:1}),sources=[];
 function house(x,z,w=8.86,d=9){const h=createImpactRuinBuilding(x,z,w,d,seed++,[scorchedBrick,scorchedFloor,beam]);root.add(h);houses.push({x,z,width:w,depth:d});return h;}
 for(const side of [-1,1])for(const x of [24,33])for(const z of [-30,-21,-12,-3,6,15,24,33]){house(side*x,z);if(x===24)sources.push({x:side*20,z});}
 for(const x of [-14,-5,5,14]){house(x,-32);sources.push({x,z:-27});}
 // A normal street approach has buildings immediately behind both pavements.
 for(const side of [-1,1])for(const z of [22.5,31.5])house(side*13, z);
 // Broken road and pavement strips descend with the crater instead of floating over it.
 const road=tex('street/mossy-asphalt.jpg'),walk=mossMaterial(tex('street/overgrown-sidewalk.jpg'),.65),paint=mossMaterial(new T.MeshStandardMaterial({color:0xc8c3ad,roughness:1}),.7);
 function strip(x,z,w,d,mat){const g=new T.PlaneGeometry(w,d,Math.ceil(w),Math.ceil(d));g.rotateX(-Math.PI/2);const pos=g.attributes.position,uv=g.attributes.uv;for(let i=0;i<pos.count;i++){const xx=pos.getX(i)+x,zz=pos.getZ(i)+z;pos.setXYZ(i,xx,height(xx,zz)+.035,zz);uv.setXY(i,xx/3,zz/3);}const c=[];for(let i=0;i<pos.count;i++){const shade=.1+.9*T.MathUtils.smoothstep(Math.hypot(pos.getX(i),pos.getZ(i)),10,26);c.push(shade,shade,shade);}g.setAttribute('color',new T.Float32BufferAttribute(c,3));mat.vertexColors=true;g.computeVertexNormals();const o=mesh(g,mat);o.castShadow=false;o.userData.collisionKind='ground';return o;}
 strip(0,23,7,26,road);strip(-25,0,22,7,road);strip(25,0,22,7,road);for(const side of [-1,1]){strip(side*6,26,5,20,walk);strip(-26,side*5,20,3,walk);strip(26,side*5,20,3,walk);}
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
 function fireMaterial(hot){return new T.ShaderMaterial({uniforms:{time:{value:0},hot:{value:hot}},transparent:true,depthWrite:false,blending:T.AdditiveBlending,side:T.DoubleSide,vertexShader:'uniform float time; varying vec2 vUv; void main(){vUv=uv;vec3 p=position;p.x+=sin(p.y*5.0+time*8.0)*max(0.0,p.y+.85)*.12;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);}',fragmentShader:'uniform float time; uniform float hot; varying vec2 vUv; void main(){float wave=.65+.35*sin(vUv.x*28.0+vUv.y*19.0-time*9.0);float alpha=wave*(1.0-smoothstep(.55,1.0,vUv.y))*.8;vec3 color=mix(vec3(1.0,.16,.015),vec3(1.0,.85,.25),hot+(1.0-vUv.y)*.25);gl_FragColor=vec4(color,alpha);}'});}
 const cars=[],coverSlots=[[-5.4,31],[5.4,27],[-5.4,22],[5.4,17],[-10,8],[10,8],[-11,-6],[11,-7]],coverPool=fleet.filter(v=>v.length<=4.7);
 coverSlots.forEach(([x,z],i)=>{const d=coverPool[Math.floor(r()*coverPool.length)],car=createFleetVehicle(d,{seed:`crash-cover:${seed}:${i}`});car.rotation.set((r()-.5)*.12,(r()-.5)*1.5,i%3===0?1.45:.06);car.updateMatrixWorld(true);const b=new T.Box3().setFromObject(car);car.position.set(x,height(x,z)+.04-b.min.y,z);car.userData.ownedMaterial=true;car.userData.collisionKind='car';mossMaterial(car.material,.35);root.add(car);cars.push({id:d.id,x,z});});root.userData.cars=cars;
 const flames=new T.Group(),flameMat=fireMaterial(.1),innerMat=fireMaterial(.7),flameGeo=new T.ConeGeometry(.3,1.7,5);
 for(const [x,z] of [[-5,-3],[4,2],[-7,8],[9,-6],[-12,-3],[13,10],[0,-10]]){const fire=new T.Group();fire.position.set(x,height(x,z)+.5,z);for(let j=0;j<3;j++){const f=new T.Mesh(flameGeo,j===1?innerMat:flameMat);f.position.set((j-1)*.22,j===1?.35:.1,0);f.scale.setScalar(j===1?.65:1);fire.add(f);}fire.userData.phase=r()*6.28;flames.add(fire);}root.add(flames);flames.userData.ownedMaterials=[flameMat,innerMat];flames.children[0].children[0].userData.ownedGeometry=true;
 root.userData.updateImpactFire=time=>{flameMat.uniforms.time.value=innerMat.uniforms.time.value=time;for(const fire of flames.children){fire.scale.set(1,.8+Math.sin(time*7+fire.userData.phase)*.17,1);fire.rotation.y=time*.2+fire.userData.phase;}};
 if(options.backdrop!==false)addCityBackdrop(root,{groundY:-4});ground.userData.ownedMaterials=[earth,brick,metal,dark,panel,core,road,walk,paint,scorchedBrick,scorchedFloor,beam];return root;
}

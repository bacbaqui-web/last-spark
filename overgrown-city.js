import {terraceHeight} from './urban-ground.js';
import * as THREE from 'three';
// Seeded cosmetic scenery: arena movement/cover volumes remain gameplay-owned.
export function createOvergrownCity(scene,platforms,{avenue=false}={}){
 const root=new THREE.Group();root.name='sunlit-overgrown-city';scene.add(root);
 let seed=7319;const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
 const concrete=new THREE.MeshStandardMaterial({color:0x8b8775,roughness:.95}),broken=new THREE.MeshStandardMaterial({color:0x555e52,roughness:1}),glass=new THREE.MeshStandardMaterial({color:0x303f3c,roughness:.65,metalness:.25}),moss=new THREE.MeshStandardMaterial({color:0x61743d,roughness:1}),leaf=new THREE.MeshStandardMaterial({color:0x467044,roughness:1}),grass=new THREE.MeshStandardMaterial({color:0x7a914b,roughness:1,side:THREE.DoubleSide});
 const texels=new Uint8Array(128*128*4);for(let y=0;y<128;y++)for(let x=0;x<128;x++){
  const i=(y*128+x)*4,n=random()*34,stain=(Math.sin(x*.19+Math.sin(y*.08)*2)+Math.cos(y*.14))*.5;
  texels[i]=175+n-stain*18;texels[i+1]=171+n-stain*9;texels[i+2]=151+n-stain*22;texels[i+3]=255;
 }
 const weather=new THREE.DataTexture(texels,128,128);weather.wrapS=weather.wrapT=THREE.RepeatWrapping;weather.colorSpace=THREE.SRGBColorSpace;weather.magFilter=THREE.LinearFilter;weather.needsUpdate=true;concrete.map=broken.map=weather;
 const box=new THREE.BoxGeometry(1,1,1),dummy=new THREE.Object3D();
 function batch(name,geometry,mat,items){const mesh=new THREE.InstancedMesh(geometry,mat,items.length);mesh.name=name;for(let i=0;i<items.length;i++){const {p,s,r=0}=items[i];dummy.position.set(...p);dummy.scale.set(...s);dummy.rotation.set(0,r,0);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);if(['wild-grass','moss-and-hanging-vines','reclaimed-tree-canopies'].includes(name))mesh.setColorAt(i,new THREE.Color().setHSL(.22+random()*.09,.20+random()*.22,.35+random()*.18));}mesh.instanceMatrix.needsUpdate=true;mesh.castShadow=name==='ruined-towers';mesh.receiveShadow=true;root.add(mesh);return mesh;}
 const buildings=[],towers=[],windows=[],frames=[],growth=[],rubble=[];
 for(let i=0;i<82;i++){
  const a=i/82*Math.PI*2,r=60+random()*85,x=Math.sin(a)*r,z=Math.cos(a)*r,w=5+random()*7,d=5+random()*6,h=15+random()*42;
  const building={p:[x,h*.43,z],s:[w,h*.86,d]};buildings.push(building);towers.push(building);
  // Open damaged upper floors expose slabs and columns instead of a sealed box.
  for(let level=0;level<3;level++){
   const y=h*.86+level*1.4;frames.push({p:[x,y,z],s:[w,.18,d]});
   for(const side of[-1,1])for(const rear of[-1,1])frames.push({p:[x+side*(w/2-.25),y+.6,z+rear*(d/2-.25)],s:[.30,1.4,.30]});
   if(random()>.5)towers.push({p:[x+w*.25,y+.55,z+d/2],s:[w*.45,1.3,.35]});
  }
  const stories=Math.floor(h/2.8),columns=Math.floor(w/1.5);
  for(let floor=0;floor<stories;floor++)for(let col=0;col<columns;col++)for(const side of[-1,1]){
   if(random()<.16)continue;const px=x-w/2+.7+col*1.5,y=1.5+floor*2.8,pz=z+side*(d/2+.035);
   windows.push({p:[px,y,pz],s:[1.03,1.7,.07]});
   frames.push({p:[px,y-.92,pz],s:[1.35,.13,.13]});
   if(random()<.25)growth.push({p:[px,y+.15,pz+side*.09],s:[.6+random()*.6,2+random()*2,.11]});
  }
  for(let k=0;k<3;k++)towers.push({p:[x+(random()-.5)*w,h*.86+3.6+random()*.4,z+(random()-.5)*d],s:[.35,1+random()*3,.4]});
 }
 for(const p of platforms){
  if(p.walkable||p.car)continue;
  for(let i=0;i<5;i++){const x=p.x+(random()-.5)*p.w,z=p.z+(random()-.5)*p.d;growth.push({p:[x,p.h+.07,z],s:[.5+random()*1.5,.08,.4+random()]});}
  if(p.walkable||p.car)continue;const strips=Math.ceil(p.w/1.4);for(let i=0;i<strips;i++){frames.push({p:[p.x-p.w/2+(i+.5)*p.w/strips,p.h*.5,p.z+p.d/2+.055],s:[.07,p.h,.07]});if(random()<.6)growth.push({p:[p.x-p.w/2+(i+.5)*p.w/strips,p.h*.6,p.z+p.d/2+.11],s:[.24,p.h*.7,.08]});}
 }
 for(let i=0;i<180;i++){const a=random()*Math.PI*2,r=39+random()*4;rubble.push({p:[Math.sin(a)*r,.15+random()*.2,Math.cos(a)*r],s:[.3+random()*.9,.25+random()*.4,.3+random()*.7],r:random()*6.28});}

 // Side elevations, balconies and broken floor beams give the skyline depth.
 for(const tower of buildings){
  if(tower.s[1]<8)continue;const [x,y,z]=tower.p,[w,h,d]=tower.s;
  for(let floor=1;floor<h/3;floor++)for(const side of[-1,1]){
   frames.push({p:[x, floor*3,z+side*(d/2+.09)],s:[w+.25,.16,.24]});
   for(let col=0;col<d/1.8;col++)if(random()>.25)windows.push({p:[x+side*(w/2+.025),floor*3-1,z-d/2+.7+col*1.8],s:[.06,1.55,1.15]});
  }
 }
 const farGround=new THREE.Mesh(new THREE.PlaneGeometry(420,420),new THREE.MeshStandardMaterial({color:0x7e8c5a,roughness:1}));farGround.rotation.x=-Math.PI/2;farGround.position.y=-.09;farGround.receiveShadow=true;root.add(farGround);
 const hills=[];for(let i=0;i<22;i++){const a=i/22*Math.PI*2,r=165+random()*25;hills.push({p:[Math.sin(a)*r,-5,Math.cos(a)*r],s:[22+random()*18,10+random()*7,22+random()*18]});}
 batch('distant-green-hills',new THREE.SphereGeometry(1,14,8),moss,hills);
 batch('ruined-towers',box,concrete,towers);batch('empty-window-bays',box,glass,windows);batch('exposed-window-frames',box,broken,frames);batch('moss-and-hanging-vines',box,moss,growth);batch('collapsed-masonry',box,concrete,rubble);
 const blades=new THREE.BufferGeometry(),bladeVertices=[];
 for(let i=0;i<6;i++){const a=i*Math.PI/3,x=Math.cos(a),z=Math.sin(a),h=.35+(i%3)*.17;bladeVertices.push(-z*.025,0,x*.025,z*.025,0,-x*.025,x*.13,h,z*.13);}
 blades.setAttribute('position',new THREE.Float32BufferAttribute(bladeVertices,3));blades.computeVertexNormals();
 const tufts=[];for(let i=0;i<35000;i++){
  const x=random()*84-42,z=random()*84-42;
  if(platforms.some(p=>!p.walkable&&Math.abs(x-p.x)<p.w/2+.1&&Math.abs(z-p.z)<p.d/2+.1))continue;
  if((avenue?Math.abs(x)<9:(Math.abs(x)<4.5||Math.abs(z)<4.5))&&random()<.97)continue;
  const clump=(Math.sin(x*.32)*Math.cos(z*.26)+1)/2;if(clump<.32&&random()<.8)continue;
  const size=.5+random()*.9;tufts.push({p:[x,terraceHeight(platforms,x,z)+.025,z],s:[size,size,size],r:random()*6.28});
 }
 batch('wild-grass',blades,grass,tufts);
 const ivy=[];for(const p of platforms.filter(p=>!p.walkable&&!p.car))for(let i=0;i<24;i++){
  ivy.push({p:[p.x+(random()-.5)*p.w,p.h*random(),p.z+p.d/2+.14],s:[.12+random()*.22,.15+random()*.30,.1]});
 }
 batch('wall-ivy-leaves',new THREE.IcosahedronGeometry(1,0),leaf,ivy);
 const crowns=[],trunks=[];for(let i=0;i<130;i++){
  const a=random()*Math.PI*2,r=45+random()*55,x=Math.sin(a)*r,z=Math.cos(a)*r,h=4+random()*5;
  trunks.push({p:[x,h/2,z],s:[.25,h,.25]});
  for(let j=0;j<3;j++)crowns.push({p:[x+(random()-.5)*2,h+j*.7,z+(random()-.5)*2],s:[1.8+random(),1.4+random(),1.8+random()]});
 }
 batch('reclaimed-tree-trunks',box,broken,trunks);batch('reclaimed-tree-canopies',new THREE.IcosahedronGeometry(1,1),leaf,crowns);
 const sky=new THREE.Mesh(new THREE.SphereGeometry(260,32,16),new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,uniforms:{top:{value:new THREE.Color(0x68bff2)},horizon:{value:new THREE.Color(0xd9edf5)}},vertexShader:'varying vec3 localPosition;void main(){localPosition=position;gl_Position=projectionMatrix*mat4(mat3(viewMatrix))*vec4(position,1.0);}',fragmentShader:'varying vec3 localPosition;uniform vec3 top;uniform vec3 horizon;void main(){float h=clamp(normalize(localPosition).y,0.,1.);gl_FragColor=vec4(mix(horizon,top,pow(h,.6)),1.);}'}));sky.name='clear-blue-sky';sky.material.fog=false;root.add(sky);
 const clouds=[];for(let i=0;i<12;i++){const a=random()*6.28;for(let j=0;j<4;j++)clouds.push({p:[Math.sin(a)*100+j*4,70+random()*22,Math.cos(a)*100],s:[6+random()*5,1.3,3+random()*3]});}
 batch('high-sunlit-clouds',new THREE.SphereGeometry(1,24,12),new THREE.MeshBasicMaterial({color:0xf5f5e9,fog:false,transparent:true,opacity:.78,depthWrite:false}),clouds);
 root.userData.sceneryCounts={towers:towers.length,grass:tufts.length,trees:trunks.length,windows:windows.length};return root;
}

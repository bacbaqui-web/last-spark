import * as THREE from 'three';
export function createUrbanGround(scene,platforms,{avenue=false,route=null}={}){
 const root=new THREE.Group();root.name='broken-streets-and-terraces';scene.add(root);if(route)return root;
 const asphalt=new THREE.MeshStandardMaterial({color:0x555b5c,roughness:1}),concrete=new THREE.MeshStandardMaterial({color:0xaaa695,roughness:1}),earth=new THREE.MeshStandardMaterial({color:0x788259,roughness:1}),paint=new THREE.MeshStandardMaterial({color:0xe4d5a1,roughness:1}),metal=new THREE.MeshStandardMaterial({color:0x535e64,roughness:.85});
 const geometry=new THREE.BoxGeometry(1,1,1);
 function part(mat,p,s,rotation=0){const m=new THREE.Mesh(geometry,mat);m.position.set(...p);m.scale.set(...s);m.rotation.y=rotation;m.receiveShadow=true;root.add(m);return m;}
 for(const axis of (avenue?['z']:['x','z'])){
  part(asphalt,[0,.026,0],axis==='x'?[260,.045,8.6]:[avenue?18:8.6,.045,260]);
  for(let n=-39;n<=39;n+=5){if(Math.abs(n)<7)continue;part(paint,axis==='x'?[n,.057,0]:[0,.057,n],axis==='x'?[2,.01,.12]:[.12,.01,2]);}
  for(const side of[-1,1])for(let n=-40;n<41;n+=2){if(Math.abs(n)<5)continue;part(concrete,axis==='x'?[n,.11,side*(avenue?9.5:4.7)]:[side*(avenue?9.5:4.7),.11,n],axis==='x'?[1.92,.22,.35]:[.35,.22,1.92]);}
 }
 for(const x of[-6,6])for(let i=0;i<7;i++)part(paint,[x,.061,-3+i], [.65,.01,.45]);
 // Shallow concentric steps form raised, traversable reclaimed plazas.
 for(const [x,z,w,d,levels]of(avenue?[[16,7,8,13,3],[-16,-18,8,13,3]]:[[-31,1,17,21,6],[28,-19,20,18,5],[24,28,17,13,4]]))for(let i=0;i<levels;i++){
  const h=(i+1)*.18,tw=w-i*1.25,td=d-i*1.25,m=part(i===levels-1?earth:concrete,[x,h/2,z],[tw,h,td]);m.userData.worldObstacle=true;
  platforms.push({x,z,w:tw,d:td,h,walkable:true});
 }
 // Cracked asphalt, drains, lamp posts and abandoned cars make streets readable.
 for(let i=0;i<85;i++){const n=Math.sin(i*71.13)*38,side=Math.cos(i*29.7)*3.7;part(metal,i%2?[n,.063,side]:[side,.063,n],i%2?[.03,.01,.4+(i%5)*.15]:[.4+(i%5)*.15,.01,.03],i*.91);}
 for(const [x,z]of[[-5.8,-26],[5.8,23],[-26,5.8],[26,-5.8]]){
  part(metal,[x,2.1,z],[.10,4.2,.10]);part(metal,[x+.6,4.2,z],[1.3,.10,.12]);part(concrete,[x+1.15,4.12,z],[.45,.13,.22]);
  const drain=part(metal,[x*.8,.065,z],[.65,.018,.65]);for(let n=0;n<5;n++)part(concrete,[drain.position.x-.24+n*.12,.079,z],[.025,.01,.55]);
 }
 for(const [x,z,angle,color]of[[2.5,-26,.14,0x7a9ea8],[-2.7,28,-.2,0x947f63],[-22,-2.4,1.6,0x9a6654]]){
  const car=new THREE.Group();car.position.set(x,0,z);car.rotation.y=angle;root.add(car);
  const body=new THREE.MeshStandardMaterial({color,roughness:.92});
  const add=(mat,p,s)=>{const m=new THREE.Mesh(geometry,mat);m.position.set(...p);m.scale.set(...s);m.castShadow=true;car.add(m);};
  add(body,[0,.43,0],[1.6,.55,3.5]);add(metal,[0,.99,.3],[1.38,.63,1.75]);add(body,[0,1.34,.3],[1.44,.10,1.8]);for(const a of[-1,1])for(const b of[-1,1])add(metal,[a*.8,.30,b*1.05],[.24,.5,.6]);
  // Matching car cover makes the visible wreck a real obstacle.
  platforms.push({x,z,w:angle>1?3.7:1.9,d:angle>1?1.9:3.7,h:1.4,car:true});
  const proxy=part(new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false}),[x,.7,z],[angle>1?3.7:1.9,1.4,angle>1?1.9:3.7]);proxy.userData.worldObstacle=true;
 }
 return root;
}
export function terraceHeight(platforms,x,z){return platforms.reduce((height,p)=>p.walkable&&Math.abs(x-p.x)<p.w/2&&Math.abs(z-p.z)<p.d/2?Math.max(height,p.h):height,0);}

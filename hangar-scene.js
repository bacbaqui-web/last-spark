import * as THREE from 'three';
import {createRobot,animateRobot,disposeRobot} from './robot.js';
import {applyFrameVisual} from './frame-preview.js';
import {frameStats} from './salvage-campaign.js';
import {createWeaponModel} from './weapon-models.js';

// One persistent scene: selection rotates the whole suspended carousel.
export function createHangarScene(host){
 const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.shadowMap.enabled=true;renderer.setClearColor(0x070b10);host.appendChild(renderer.domElement);
 const scene=new THREE.Scene();scene.fog=new THREE.Fog(0x070b10,10,23);const camera=new THREE.PerspectiveCamera(42,1,.05,45);camera.position.set(0,2.55,8.5);camera.lookAt(0,1.8,0);
 const steel=new THREE.MeshStandardMaterial({color:0x252e38,metalness:.75,roughness:.45}),black=new THREE.MeshStandardMaterial({color:0x0d141c,roughness:.8}),edge=new THREE.MeshStandardMaterial({color:0x9abfc8,emissive:0x72d3e5,emissiveIntensity:1.2}),crate=new THREE.MeshStandardMaterial({color:0x39443b,metalness:.25,roughness:.8});
 const box=(parent,size,pos,mat=steel)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(...size),mat);m.position.set(...pos);m.castShadow=m.receiveShadow=true;parent.add(m);return m;};
 function cable(parent,points,r=.025,mat=black){const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),m=new THREE.Mesh(new THREE.TubeGeometry(curve,32,r,8,false),mat);parent.add(m);return m;}
 scene.add(new THREE.HemisphereLight(0xadc9de,0x151914,1.8));for(const x of[-4,0,4]){const l=new THREE.SpotLight(x===0?0xb6deef:0x50718d,x===0?65:30,16,.62,.65);l.position.set(x,5,3);l.target.position.set(x,1.5,0);l.castShadow=x===0;scene.add(l,l.target);}
 box(scene,[24,.15,22],[0,-.15,-5],black);box(scene,[24,7,.3],[0,3,-6],black);for(let x=-10;x<=10;x+=2){box(scene,[.16,6,.25],[x,3,-5.7]);box(scene,[.03,.02,14],[x,.001,-4]);}box(scene,[20,.3,.35],[0,4.25,0]);
 const wheel=new THREE.Group();wheel.position.z=-3;scene.add(wheel);let rigs=[],rack=new THREE.Group(),signature='',weaponCache=new Map(),target=0,angle=0,last=performance.now();scene.add(rack);
 for(let i=0;i<6;i++){const x=-3.8+(i%2)*.65,y=.27+Math.floor(i/2)*.48,z=1.2-Math.floor(i/2)*.15;box(scene,[.62,.45,.56],[x,y,z],crate);box(scene,[.65,.035,.58],[x,y+.15,z]);box(scene,[.13,.08,.015],[x,y,z+.29],edge);}
 box(scene,[1.8,1.45,.18],[3.25,.9,.8],black);for(const y of[.4,1,1.6])box(scene,[1.8,.04,.07],[3.25,y,.92]);
 function update(frames,selected){const key=JSON.stringify(frames)+selected;const n=Math.max(4,frames.length);const index=frames.findIndex(f=>f.id===selected);let desired=-index*Math.PI*2/n;desired+=Math.round((angle-desired)/(Math.PI*2))*Math.PI*2;target=desired;
  if(key===signature)return;signature=key;for(const r of rigs){if(r.robot){r.robot.root.removeFromParent();disposeRobot(r.robot);}r.group.traverse(o=>{if(o.isMesh)o.geometry.dispose();});r.group.removeFromParent();}rigs=[];
  for(let i=0;i<n;i++){const holder=new THREE.Group(),t=i*Math.PI*2/n;holder.position.set(Math.sin(t)*3,0,Math.cos(t)*3);holder.rotation.y=t;wheel.add(holder);box(holder,[1.35,.18,.32],[0,3.8,0]);box(holder,[.12,1.35,.12],[0,3.15,-.3]);box(holder,[.85,.1,.3],[0,2.7,-.12]);cable(holder,[[-.32,2.7,-.12],[-.32,2.48,0]],.02,steel);cable(holder,[[.32,2.7,-.12],[.32,2.48,0]],.02,steel);cable(holder,[[.5,3.8,0],[.85,3.25,.1],[.55,2.5,.08],[.25,2.1,-.1]],.035);box(holder,[.5,.035,.3],[0,.05,0],i===index?edge:steel);
   let robot=null;if(frames[i]){robot=createRobot(false,'player',1.25);animateRobot(robot,.1,{speed:0});robot.blaster.visible=false;if(robot.backpack)robot.backpack.visible=false;applyFrameVisual(robot,frameStats(frames[i]));holder.add(robot.root);robot.root.position.y=.65;
    for(const side of['l','r'])for(const [a,b]of[['upperarm_','lowerarm_'],['lowerarm_','hand_'],['thigh_','calf_'],['calf_','foot_']]){const bone=robot.bones.find(b=>b.name===a+side),end=robot.bones.find(node=>node.name===b+side);if(!bone||!end)continue;robot.root.updateMatrixWorld(true);const direction=end.getWorldPosition(new THREE.Vector3()).sub(bone.getWorldPosition(new THREE.Vector3())).normalize(),world=bone.getWorldQuaternion(new THREE.Quaternion());world.premultiply(new THREE.Quaternion().setFromUnitVectors(direction,new THREE.Vector3(side==='l'?-.08:.08,-1,.05).normalize()));bone.quaternion.copy(bone.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(world));}
    const head=robot.bones.find(b=>b.name==='Head');if(head)head.rotateX(.22);
   }rigs.push({group:holder,robot});
  }
  rack.clear();const f=frames[index];for(const [i,type]of(f?.loadout||[]).entries()){let gun=weaponCache.get(type);if(!gun){gun=createWeaponModel(type);weaponCache.set(type,gun);}gun.scale.setScalar(.8);gun.position.set(3.25,.65+i*.6,1.02);gun.rotation.set(0,Math.PI/2,-.15);rack.add(gun);}
 }
 let raf;function draw(now){raf=requestAnimationFrame(draw);if(!host.isConnected||host.closest('[hidden]')){last=now;return;}const dt=Math.min((now-last)/1000,.05);last=now;angle=THREE.MathUtils.damp(angle,target,6,dt);wheel.rotation.y=angle;const w=host.clientWidth,h=host.clientHeight;if(renderer.domElement.width!==Math.round(w*renderer.getPixelRatio())||renderer.domElement.height!==Math.round(h*renderer.getPixelRatio())){renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}renderer.render(scene,camera);}raf=requestAnimationFrame(draw);
 return {update,attach(next){host=next;host.appendChild(renderer.domElement);},dispose(){cancelAnimationFrame(raf);for(const r of rigs)if(r.robot)disposeRobot(r.robot);renderer.dispose();}};
}

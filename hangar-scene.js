import * as THREE from 'three';
import {createRobot,animateRobot,disposeRobot} from './robot.js';
import {applyFrameVisual} from './frame-preview.js';
import {frameStats} from './salvage-campaign.js';
import {createWeaponModel} from './weapon-models.js';

// One persistent scene: selection rotates the whole platform carousel.
export function createHangarScene(host,onAction=()=>{}){
 const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.shadowMap.enabled=true;renderer.setClearColor(0x070b10);host.appendChild(renderer.domElement);
 const scene=new THREE.Scene();scene.fog=new THREE.Fog(0x070b10,10,23);const camera=new THREE.PerspectiveCamera(42,1,.05,45);camera.position.set(0,3.1,7.5);camera.lookAt(0,1.65,0);
 const steel=new THREE.MeshStandardMaterial({color:0x252e38,metalness:.75,roughness:.45}),black=new THREE.MeshStandardMaterial({color:0x0d141c,roughness:.8}),edge=new THREE.MeshStandardMaterial({color:0x9abfc8,emissive:0x72d3e5,emissiveIntensity:1.2}),crate=new THREE.MeshStandardMaterial({color:0x39443b,metalness:.25,roughness:.8});
 const box=(parent,size,pos,mat=steel)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(...size),mat);m.position.set(...pos);m.castShadow=m.receiveShadow=true;parent.add(m);return m;};
 scene.add(new THREE.HemisphereLight(0xadc9de,0x151914,1.8));for(const x of[-4,0,4]){const l=new THREE.SpotLight(x===0?0xb6deef:0x50718d,x===0?65:30,16,.62,.65);l.position.set(x,5,3);l.target.position.set(x,1.5,0);l.castShadow=x===0;scene.add(l,l.target);}
 box(scene,[24,.15,22],[0,-.15,-5],black);box(scene,[24,7,.3],[0,3,-6],black);for(let x=-10;x<=10;x+=2){box(scene,[.16,6,.25],[x,3,-5.7]);box(scene,[.03,.02,14],[x,.001,-4]);}box(scene,[20,.3,.35],[0,4.25,0]);
 const wheel=new THREE.Group();wheel.position.z=-3;scene.add(wheel);let rigs=[],signature='',target=0,angle=0,last=performance.now();
 for(let i=0;i<16;i++){const stack=new THREE.Group();stack.userData.action='stash';scene.add(stack);stack.position.set(-3.2+(i%4)*.45,.22+Math.floor(i/4)*.34,.7+(i%3)*.28);stack.rotation.set((i%3-1)*.07,i*1.71,(i%4-1.5)*.07);box(stack,[.57,.35,.5],[0,0,0],crate);box(stack,[.6,.04,.52],[0,.18,0]);box(stack,[.13,.06,.02],[0,0,.26],edge);}
 // The loose weapon pile is warehouse stock; each unit's rack lives on its holder.
 const storage=new THREE.Group();storage.userData.action='guns';scene.add(storage);box(storage,[1.9,.35,.8],[3.3,.25,1],black);

 // Scene props are clickable as well as their labels.
 const pointer=new THREE.Vector2(),ray=new THREE.Raycaster();renderer.domElement.addEventListener('click',event=>{const rect=renderer.domElement.getBoundingClientRect();pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);ray.setFromCamera(pointer,camera);for(const hit of ray.intersectObjects(scene.children,true)){let o=hit.object;while(o&&!o.userData.action)o=o.parent;if(o){onAction(o.userData.action);break;}}});

 function update(frames,selected,stash=[]){const key=JSON.stringify([frames,selected,stash]);const n=Math.max(4,frames.length);const index=frames.findIndex(f=>f.id===selected);let desired=-index*Math.PI*2/n;desired+=Math.round((angle-desired)/(Math.PI*2))*Math.PI*2;target=desired;
  if(key===signature)return;signature=key;for(const gun of [...storage.children].filter(o=>o.userData.storedGun)){storage.remove(gun);gun.traverse(o=>{if(o.isMesh&&!o.geometry.userData.sharedModelGeometry)o.geometry.dispose();});}for(const [i,item]of stash.slice(0,24).entries()){const gun=createWeaponModel(item.type);gun.userData.storedGun=true;gun.scale.setScalar(.6);gun.position.set(2.6+(i%4)*.27,.48+Math.floor(i/4)*.15,.6+(i%3)*.3);gun.rotation.set((i%3-1)*.35,i*2.39,(i%2?1:-1)*(.25+(i%4)*.18));storage.add(gun);}for(const r of rigs){if(r.robot){r.robot.root.removeFromParent();for(const module of r.robot.frameModules||[])module.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.dispose();}});disposeRobot(r.robot);}r.group.traverse(o=>{if(o.isMesh&&!o.geometry.userData.sharedModelGeometry)o.geometry.dispose();});r.group.removeFromParent();}rigs=[];
  for(let i=0;i<n;i++){const holder=new THREE.Group(),t=i*Math.PI*2/n;holder.position.set(Math.sin(t)*3,0,Math.cos(t)*3);holder.rotation.y=t;wheel.add(holder);const plate=new THREE.Mesh(new THREE.CylinderGeometry(1.12,1.2,.18,48),steel);plate.position.y=.09;plate.receiveShadow=true;holder.add(plate);const rim=new THREE.Mesh(new THREE.TorusGeometry(1.12,.018,6,48),i===index?edge:steel);rim.rotation.x=Math.PI/2;rim.position.y=.19;holder.add(rim);
   let robot=null;if(frames[i]){robot=createRobot(false,'player',1.25);robot.mixer.stopAllAction();robot.skeleton.pose();robot.blaster.visible=false;if(robot.backpack)robot.backpack.visible=false;applyFrameVisual(robot,frameStats(frames[i]));holder.add(robot.root);robot.root.scale.multiplyScalar(1.5);robot.root.position.y=0;
    for(const side of['l','r'])for(const [a,b]of[['upperarm_','lowerarm_'],['lowerarm_','hand_'],['thigh_','calf_'],['calf_','foot_']]){const bone=robot.bones.find(b=>b.name===a+side),end=robot.bones.find(node=>node.name===b+side);if(!bone||!end)continue;robot.root.updateMatrixWorld(true);const direction=end.getWorldPosition(new THREE.Vector3()).sub(bone.getWorldPosition(new THREE.Vector3())).normalize(),world=bone.getWorldQuaternion(new THREE.Quaternion());world.premultiply(new THREE.Quaternion().setFromUnitVectors(direction,new THREE.Vector3((side==='l'?1:-1)*(a==='upperarm_'?.22:a==='lowerarm_'?.12:a==='thigh_'?.16:.08),-1,0).normalize()));bone.quaternion.copy(bone.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(world));}
    robot.root.updateMatrixWorld(true);const soles=robot.bones.filter(b=>b.name==='foot_l'||b.name==='foot_r');const footBounds=new THREE.Box3();for(const foot of soles)footBounds.union(new THREE.Box3().setFromObject(foot));robot.root.position.y+=.18-footBounds.min.y;robot.root.updateMatrixWorld(true);
    const terminal=new THREE.Group();terminal.userData.action='modules';holder.add(terminal);terminal.position.z=.8;box(terminal,[.09,1.5,.09],[-1.08,.8,.05]);box(terminal,[.72,.48,.13],[-1.08,1.95,.12]);box(terminal,[.62,.36,.018],[-1.08,1.95,.2],edge);box(terminal,[.65,.07,.25],[-1.08,1.65,.23]);
    const unitRack=new THREE.Group();unitRack.userData.action='mountWeapons';holder.add(unitRack);unitRack.position.set(-.35,0,.65);box(unitRack,[.7,.9,.1],[-1.15,.85,.18],black);
    for(let slot=0;slot<2;slot++){box(unitRack,[.06,.12,.15],[-1.15,1.1-slot*.4,.29]);const item=frames[i].weaponSlots?.[slot];if(item){const gun=createWeaponModel(item.type);gun.scale.setScalar(.42);gun.position.set(-1.15,1.1-slot*.4,.34);gun.rotation.set(0,Math.PI/2,0);unitRack.add(gun);}}
    const equipment=new THREE.Group();equipment.userData.action='equipment';equipment.position.set(1.25,0,.35);holder.add(equipment);box(equipment,[.55,.17,.65],[0,.25,0]);box(equipment,[.16,1.2,.16],[0,.85,0]);const arm=box(equipment,[.18,.7,.18],[0,1.62,0]);arm.rotation.z=-.45;box(equipment,[.7,.14,.16],[-.23,1.93,0]);for(const side of[-1,1]){const finger=box(equipment,[.08,.32,.1],[-.55,1.78,side*.16]);finger.rotation.x=side*.35;}box(equipment,[.38,.28,.06],[.15,1.1,.12],edge);


   }rigs.push({group:holder,robot});
  }

 }
 let raf;function draw(now){raf=requestAnimationFrame(draw);if(!host.isConnected||host.closest('[hidden]')){last=now;return;}const dt=Math.min((now-last)/1000,.05);last=now;angle=THREE.MathUtils.damp(angle,target,6,dt);wheel.rotation.y=angle;const w=host.clientWidth,h=host.clientHeight;if(renderer.domElement.width!==Math.round(w*renderer.getPixelRatio())||renderer.domElement.height!==Math.round(h*renderer.getPixelRatio())){renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}renderer.render(scene,camera);}raf=requestAnimationFrame(draw);
 return {update,attach(next){host=next;host.appendChild(renderer.domElement);},dispose(){cancelAnimationFrame(raf);for(const r of rigs)if(r.robot)disposeRobot(r.robot);renderer.dispose();}};
}

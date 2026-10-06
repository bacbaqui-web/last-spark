import * as THREE from 'three';
import {createRobot,animateRobot,disposeRobot} from './robot.js';
import {applyFrameVisual} from './frame-preview.js';
import {frameStats} from './salvage-campaign.js';
import {createWeaponModel} from './weapon-models.js';

// One persistent scene: selection rotates the whole suspended carousel.
export function createHangarScene(host,onAction=()=>{}){
 const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.shadowMap.enabled=true;renderer.setClearColor(0x070b10);host.appendChild(renderer.domElement);
 const scene=new THREE.Scene();scene.fog=new THREE.Fog(0x070b10,10,23);const camera=new THREE.PerspectiveCamera(42,1,.05,45);camera.position.set(0,2.55,8.5);camera.lookAt(0,1.8,0);
 const steel=new THREE.MeshStandardMaterial({color:0x252e38,metalness:.75,roughness:.45}),black=new THREE.MeshStandardMaterial({color:0x0d141c,roughness:.8}),edge=new THREE.MeshStandardMaterial({color:0x9abfc8,emissive:0x72d3e5,emissiveIntensity:1.2}),crate=new THREE.MeshStandardMaterial({color:0x39443b,metalness:.25,roughness:.8});
 const box=(parent,size,pos,mat=steel)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(...size),mat);m.position.set(...pos);m.castShadow=m.receiveShadow=true;parent.add(m);return m;};
 function cable(parent,points,r=.025,mat=black){const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),m=new THREE.Mesh(new THREE.TubeGeometry(curve,32,r,8,false),mat);parent.add(m);return m;}
 scene.add(new THREE.HemisphereLight(0xadc9de,0x151914,1.8));for(const x of[-4,0,4]){const l=new THREE.SpotLight(x===0?0xb6deef:0x50718d,x===0?65:30,16,.62,.65);l.position.set(x,5,3);l.target.position.set(x,1.5,0);l.castShadow=x===0;scene.add(l,l.target);}
 box(scene,[24,.15,22],[0,-.15,-5],black);box(scene,[24,7,.3],[0,3,-6],black);for(let x=-10;x<=10;x+=2){box(scene,[.16,6,.25],[x,3,-5.7]);box(scene,[.03,.02,14],[x,.001,-4]);}box(scene,[20,.3,.35],[0,4.25,0]);
 const wheel=new THREE.Group();wheel.position.z=-3;scene.add(wheel);let rigs=[],signature='',target=0,angle=0,last=performance.now();
 for(let i=0;i<6;i++){const x=-3.8+(i%2)*.65,y=.27+Math.floor(i/2)*.48,z=1.2-Math.floor(i/2)*.15;box(scene,[.62,.45,.56],[x,y,z],crate).userData.action='stash';box(scene,[.65,.035,.58],[x,y+.15,z]);box(scene,[.13,.08,.015],[x,y,z+.29],edge);}
 // The loose weapon pile is warehouse stock; each unit's rack lives on its holder.
 const storage=new THREE.Group();storage.userData.action='guns';scene.add(storage);box(storage,[1.9,.35,.8],[3.3,.25,1],black);

 // Scene props are clickable as well as their labels.
 const pointer=new THREE.Vector2(),ray=new THREE.Raycaster();renderer.domElement.addEventListener('click',event=>{const rect=renderer.domElement.getBoundingClientRect();pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);ray.setFromCamera(pointer,camera);for(const hit of ray.intersectObjects(scene.children,true)){let o=hit.object;while(o&&!o.userData.action)o=o.parent;if(o){onAction(o.userData.action);break;}}});

 function update(frames,selected,stash=[]){const key=JSON.stringify([frames,selected,stash]);const n=Math.max(4,frames.length);const index=frames.findIndex(f=>f.id===selected);let desired=-index*Math.PI*2/n;desired+=Math.round((angle-desired)/(Math.PI*2))*Math.PI*2;target=desired;
  if(key===signature)return;signature=key;for(const gun of [...storage.children].filter(o=>o.userData.storedGun)){storage.remove(gun);gun.traverse(o=>{if(o.isMesh&&!o.geometry.userData.sharedModelGeometry)o.geometry.dispose();});}for(const [i,item]of stash.slice(0,6).entries()){const gun=createWeaponModel(item.type);gun.userData.storedGun=true;gun.scale.setScalar(.5);gun.position.set(2.8+(i%3)*.25,.5+Math.floor(i/3)*.2,1);gun.rotation.set(0,Math.PI/2,(i%2?1:-1)*.15);storage.add(gun);}for(const r of rigs){if(r.robot){r.robot.root.removeFromParent();for(const module of r.robot.frameModules||[])module.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.dispose();}});disposeRobot(r.robot);}r.group.traverse(o=>{if(o.isMesh&&!o.geometry.userData.sharedModelGeometry)o.geometry.dispose();});r.group.removeFromParent();}rigs=[];
  for(let i=0;i<n;i++){const holder=new THREE.Group(),t=i*Math.PI*2/n;holder.position.set(Math.sin(t)*3,0,Math.cos(t)*3);holder.rotation.y=t;wheel.add(holder);box(holder,[1.35,.18,.32],[0,3.8,0]);box(holder,[.12,1.35,.12],[0,3.15,-.3]);box(holder,[.85,.1,.3],[0,2.7,-.12]);cable(holder,[[-.32,2.7,-.12],[-.32,2.48,0]],.02,steel);cable(holder,[[.32,2.7,-.12],[.32,2.48,0]],.02,steel);cable(holder,[[.5,3.8,0],[.85,3.25,.1],[.55,2.5,.08],[.25,2.1,-.1]],.035);box(holder,[.5,.035,.3],[0,.05,0],i===index?edge:steel);
   let robot=null;if(frames[i]){robot=createRobot(false,'player',1.25);animateRobot(robot,.1,{speed:0});robot.blaster.visible=false;if(robot.backpack)robot.backpack.visible=false;applyFrameVisual(robot,frameStats(frames[i]));holder.add(robot.root);robot.root.position.y=.65;
    for(const side of['l','r'])for(const [a,b]of[['upperarm_','lowerarm_'],['lowerarm_','hand_'],['thigh_','calf_'],['calf_','foot_']]){const bone=robot.bones.find(b=>b.name===a+side),end=robot.bones.find(node=>node.name===b+side);if(!bone||!end)continue;robot.root.updateMatrixWorld(true);const direction=end.getWorldPosition(new THREE.Vector3()).sub(bone.getWorldPosition(new THREE.Vector3())).normalize(),world=bone.getWorldQuaternion(new THREE.Quaternion());world.premultiply(new THREE.Quaternion().setFromUnitVectors(direction,new THREE.Vector3(side==='l'?-.08:.08,-1,.05).normalize()));bone.quaternion.copy(bone.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(world));}
    const head=robot.bones.find(b=>b.name==='Head');if(head)head.rotateX(.22);
    // Open service bay in the abdomen, with three live leads to this unit's terminal.
    const belly=robot.bones.find(b=>b.name==='spine_01');if(belly)for(const m of belly.children)if(m.isMesh&&!m.userData.cosmetic)m.visible=false;
    box(holder,[.3,.27,.16],[0,1.72,.16],black);for(const side of[-1,1]){const door=box(holder,[.14,.29,.035],[side*.23,1.72,.25]);door.rotation.y=side*.9;}
    const terminal=new THREE.Group();terminal.userData.action='modules';holder.add(terminal);box(terminal,[.09,1.5,.09],[-1.08,.8,.05]);box(terminal,[.72,.48,.13],[-1.08,1.95,.12]);box(terminal,[.62,.36,.018],[-1.08,1.95,.2],edge);box(terminal,[.65,.07,.25],[-1.08,1.65,.23]);
    for(let c=0;c<3;c++)cable(holder,[[-.12+c*.12,1.72,.3],[-.3-c*.1,1.25+c*.13,.45],[-.7,1.25+c*.13,.4],[-.85,1.85+c*.06,.17]],.018,c===1?edge:steel);
    const unitRack=new THREE.Group();unitRack.userData.action='mountWeapons';holder.add(unitRack);box(unitRack,[.7,.9,.1],[-1.15,.85,.18],black);
    for(let slot=0;slot<2;slot++){box(unitRack,[.06,.12,.15],[-1.15,1.1-slot*.4,.29]);const item=frames[i].weaponSlots?.[slot];if(item){const gun=createWeaponModel(item.type);gun.scale.setScalar(.42);gun.position.set(-1.15,1.1-slot*.4,.34);gun.rotation.set(0,Math.PI/2,0);unitRack.add(gun);}}

   }rigs.push({group:holder,robot});
  }

 }
 let raf;function draw(now){raf=requestAnimationFrame(draw);if(!host.isConnected||host.closest('[hidden]')){last=now;return;}const dt=Math.min((now-last)/1000,.05);last=now;angle=THREE.MathUtils.damp(angle,target,6,dt);wheel.rotation.y=angle;const w=host.clientWidth,h=host.clientHeight;if(renderer.domElement.width!==Math.round(w*renderer.getPixelRatio())||renderer.domElement.height!==Math.round(h*renderer.getPixelRatio())){renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}renderer.render(scene,camera);}raf=requestAnimationFrame(draw);
 return {update,attach(next){host=next;host.appendChild(renderer.domElement);},dispose(){cancelAnimationFrame(raf);for(const r of rigs)if(r.robot)disposeRobot(r.robot);renderer.dispose();}};
}

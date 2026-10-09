import {configureUpgradeLighting} from './asset-upgrades.js';
import * as THREE from 'three';
import {createRobot,disposeRobot} from './robot.js';
import {applyFrameVisual} from './frame-preview.js';
import {frameStats} from './salvage-campaign.js';
import {createWeaponModel} from './weapon-models.js';
import {CHEST_SLOTS} from './salvage-chest.js';
import {disposeObjectResources} from './runtime-resources.js';

// One persistent scene: selection rotates the whole platform carousel.
export function createHangarScene(host,onAction=()=>{},onHover=()=>{},onLayout=()=>{}){
 const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.shadowMap.enabled=true;renderer.setClearColor(0x070b10);host.appendChild(renderer.domElement);
 configureUpgradeLighting(renderer);
 const scene=new THREE.Scene();scene.fog=new THREE.Fog(0x070b10,10,23);const camera=new THREE.PerspectiveCamera(42,1,.05,45);camera.position.set(0,3.1,7.5);camera.lookAt(0,1.65,0);
 const steel=new THREE.MeshStandardMaterial({color:0x252e38,metalness:.75,roughness:.45}),black=new THREE.MeshStandardMaterial({color:0x0d141c,roughness:.8}),edge=new THREE.MeshStandardMaterial({color:0x9abfc8,emissive:0x72d3e5,emissiveIntensity:1.2}),crate=new THREE.MeshStandardMaterial({color:0x39443b,metalness:.25,roughness:.8});
 const box=(parent,size,pos,mat=steel)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(...size),mat);m.position.set(...pos);m.castShadow=m.receiveShadow=true;parent.add(m);return m;};
 scene.add(new THREE.HemisphereLight(0xadc9de,0x151914,1.8));for(const x of[-4,0,4]){const l=new THREE.SpotLight(x===0?0xb6deef:0x50718d,x===0?65:30,16,.62,.65);l.position.set(x,5,3);l.target.position.set(x,1.5,0);l.castShadow=x===0;scene.add(l,l.target);}
 box(scene,[24,.15,22],[0,-.15,-5],black);box(scene,[24,7,.3],[0,3,-6],black);for(let x=-10;x<=10;x+=2){box(scene,[.16,6,.25],[x,3,-5.7]);box(scene,[.03,.02,14],[x,.001,-4]);}box(scene,[20,.3,.35],[0,4.25,0]);
 const wheel=new THREE.Group();wheel.position.z=-3;scene.add(wheel);let inspection=null,openAmount=0,rigs=[],signature='',stockSignature='',target=0,angle=0,last=performance.now();
 const screen=new THREE.MeshStandardMaterial({color:0x063356,emissive:0x168cdd,emissiveIntensity:1.4,roughness:.35});const sharedMaterials=[steel,black,edge,crate,screen];
 function clearRigs(){for(const r of rigs){if(r.robot)disposeRobot(r.robot);disposeObjectResources(r.group,{sharedMaterials});}rigs=[];}
 for(let i=0;i<16;i++){const stack=new THREE.Group();stack.userData.action='stash';scene.add(stack);stack.position.set(-4.0+(i%4)*.45,.22+Math.floor(i/4)*.34,-1.7+(i%3)*.28);stack.rotation.set((i%3-1)*.07,i*1.71,(i%4-1.5)*.07);box(stack,[.57,.35,.5],[0,0,0],crate);box(stack,[.6,.04,.52],[0,.18,0]);box(stack,[.13,.06,.02],[0,0,.26],edge);}
 // The loose weapon pile is warehouse stock; each unit's rack lives on its holder.
 const storage=new THREE.Group();storage.userData.action='guns';scene.add(storage);box(storage,[1.9,.35,.8],[3.3,.25,-1.8],black);

 const monitorLeft=new THREE.Group();monitorLeft.position.set(-2.55,2.1,2);monitorLeft.rotation.y=.16;scene.add(monitorLeft);box(monitorLeft,[1.45,2.8,.2],[0,0,0],black);box(monitorLeft,[1.3,2.64,.03],[0,0,.12],screen);box(monitorLeft,[.13,1.5,.13],[0,-1.4,-.1]);
 const service=new THREE.Group();service.position.set(2.55,2.1,2);service.rotation.y=-.16;service.userData.action='supplies';scene.add(service);box(service,[1.45,2.8,.2],[0,0,0],black);box(service,[1.3,2.64,.03],[0,0,.12],screen);box(service,[.16,1.45,.16],[0,-1.3,-.15]);
 const clamp=new THREE.Group();clamp.position.set(1.8,.3,.2);clamp.userData.action='equipment';scene.add(clamp);box(clamp,[.6,.2,.7],[0,0,0]);box(clamp,[.16,1.5,.16],[0,.8,0]);const boom=box(clamp,[.85,.14,.16],[-.35,1.7,0]);boom.rotation.z=-.18;for(const side of[-1,1]){const finger=box(clamp,[.35,.08,.08],[-.9,1.6,side*.16]);finger.rotation.y=side*.35;}
 let highlighted=null;const outline=new THREE.Group();scene.add(outline);const outlineMaterial=new THREE.LineBasicMaterial({color:0x95edff,transparent:true,opacity:.7,depthTest:true});
 function highlight(node){if(node===highlighted)return;highlighted=node;for(const edge of [...outline.children]){edge.geometry.dispose();outline.remove(edge);}if(node){node.updateWorldMatrix(true,true);let count=0;node.traverse(o=>{if(o.isMesh&&o.visible&&count++<64){const edge=new THREE.LineSegments(new THREE.EdgesGeometry(o.geometry,35),outlineMaterial);edge.matrixAutoUpdate=false;edge.matrix.copy(o.matrixWorld);outline.add(edge);}});}requestDraw();}
 for(const x of [-2.55,2.55]){const light=new THREE.PointLight(0x2d9eff,5,4,2);light.position.set(x,1.9,2.4);scene.add(light);}
 let selectedRobot=null,drag=null,suppressClick=false;const rotations=new Map(),canvas=renderer.domElement;canvas.style.touchAction='none';
 function hitAction(hit){let node=hit?.object;while(node&&!node.userData.action)node=node.parent;if(inspection==='modules'&&hit&&selectedRobot){const robot=rigs.find(r=>r.robot?.root===selectedRobot)?.robot,chest=robot?.salvageFrame?.anchors.spine_03;if(chest){const p=chest.worldToLocal(hit.point.clone());for(const slot of CHEST_SLOTS){if(Math.abs(p.x-slot.position[0])<slot.size[0]*.7&&Math.abs(p.y-slot.position[1])<slot.size[1]*.7&&Math.abs(p.z-slot.position[2])<.08)return {node:hit.object,action:'module:'+slot.index};}}}return {node,action:node?.userData.action};}
 function hits(event){const rect=canvas.getBoundingClientRect();pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);scene.updateMatrixWorld(true);ray.setFromCamera(pointer,camera);return ray.intersectObjects(scene.children,true);}
 canvas.addEventListener('pointerdown',event=>{if(event.button!==0||!selectedRobot)return;const hit=hits(event)[0];if(!hit?.object.userData.rotateUnit||inspection==='modules')return;drag={id:event.pointerId,x:event.clientX,start:event.clientX};suppressClick=false;canvas.setPointerCapture(event.pointerId);canvas.style.cursor='grabbing';});
 canvas.addEventListener('pointermove',event=>{if(drag&&drag.id===event.pointerId){selectedRobot.rotation.y+=(event.clientX-drag.x)*.012;rotations.set(selectedRobot.userData.frameId,selectedRobot.rotation.y);drag.x=event.clientX;if(Math.abs(event.clientX-drag.start)>4)suppressClick=true;requestDraw();}else {const hit=hits(event)[0];const {node,action}=hitAction(hit);canvas.style.cursor=action?'pointer':hit?.object.userData.rotateUnit?'grab':'';highlight(node);onHover(action||null);}});
 function endDrag(event){if(!drag||drag.id!==event.pointerId)return;if(canvas.hasPointerCapture(event.pointerId))canvas.releasePointerCapture(event.pointerId);drag=null;canvas.style.cursor='';}
 canvas.addEventListener('pointerleave',()=>{if(!drag){highlight(null);onHover(null);}});canvas.addEventListener('pointerup',endDrag);canvas.addEventListener('pointercancel',endDrag);
 // Scene props are clickable as well as their labels.
 const pointer=new THREE.Vector2(),ray=new THREE.Raycaster();renderer.domElement.addEventListener('click',event=>{if(suppressClick){suppressClick=false;return;}for(const hit of hits(event)){const {action}=hitAction(hit);if(action){onAction(action);break;}}});

 function update(frames,selected,stash=[]){
  if(disposed)return;
  // Selection, HP, names and inventory IDs do not change mesh geometry.
  const key=JSON.stringify(frames.map(f=>[f.id,frameStats(f),f.weaponSlots?.map(w=>w?.type)])),stockKey=JSON.stringify(stash.slice(0,24).map(w=>w.type));
  const n=Math.max(4,frames.length),index=Math.max(0,frames.findIndex(f=>f.id===selected));let desired=-index*Math.PI*2/n;desired+=Math.round((angle-desired)/(Math.PI*2))*Math.PI*2;
  const selectionChanged=selectedRobot?.userData.frameId!==frames[index]?.id;
  if(target!==desired||selectionChanged)requestDraw();target=desired;
  if(stockKey!==stockSignature){stockSignature=stockKey;for(const gun of [...storage.children].filter(o=>o.userData.storedGun))disposeObjectResources(gun);for(const [i,item]of stash.slice(0,24).entries()){const gun=createWeaponModel(item.type);gun.userData.storedGun=true;gun.scale.setScalar(.6);gun.position.set(2.6+(i%4)*.27,.48+Math.floor(i/4)*.15,-2.2+(i%3)*.3);gun.rotation.set((i%3-1)*.35,i*2.39,(i%2?1:-1)*(.25+(i%4)*.18));storage.add(gun);}requestDraw();}
  if(key!==signature){selectedRobot=null;drag=null;signature=key;clearRigs();const ids=new Set(frames.map(f=>f.id));for(const id of rotations.keys())if(!ids.has(id))rotations.delete(id);
  for(let i=0;i<n;i++){const holder=new THREE.Group(),t=i*Math.PI*2/n;holder.position.set(Math.sin(t)*3,0,Math.cos(t)*3);holder.rotation.y=t;wheel.add(holder);const plate=new THREE.Mesh(new THREE.CylinderGeometry(1.12,1.2,.18,48),steel);plate.position.y=.09;plate.receiveShadow=true;plate.userData.rotateUnit=i===index&&!!frames[i];holder.add(plate);const rim=new THREE.Mesh(new THREE.TorusGeometry(1.12,.018,6,48),i===index?edge:steel);rim.rotation.x=Math.PI/2;rim.position.y=.19;rim.userData.rotateUnit=i===index&&!!frames[i];holder.add(rim);
   let robot=null;if(frames[i]){robot=createRobot(false,'player',1.25);robot.mixer.stopAllAction();robot.skeleton.pose();robot.root.updateMatrixWorld(true);const torso=robot.body.children.find(o=>o.isMesh&&!o.userData.cosmetic)||robot.body,sockets=robot.arms.map(a=>torso.worldToLocal(a.shoulder.getWorldPosition(new THREE.Vector3()))),socketX=(Math.abs(sockets[0].x)+Math.abs(sockets[1].x))/2,socketY=(sockets[0].y+sockets[1].y)/2;for(const [j,arm]of robot.arms.entries()){const target=torso.localToWorld(new THREE.Vector3(Math.sign(sockets[j].x)*socketX,socketY,0));arm.shoulder.position.copy(arm.shoulder.parent.worldToLocal(target));arm.shoulder.updateWorldMatrix(false,true);}robot.blaster.visible=false;if(robot.backpack)robot.backpack.visible=false;applyFrameVisual(robot,frameStats(frames[i]));holder.add(robot.root);robot.root.scale.multiplyScalar(1.5);robot.root.position.y=0;
    for(const side of['l','r'])for(const [a,b]of[['upperarm_','lowerarm_'],['lowerarm_','hand_'],['thigh_','calf_'],['calf_','foot_']]){const bone=robot.bones.find(b=>b.name===a+side),end=robot.bones.find(node=>node.name===b+side);if(!bone||!end)continue;robot.root.updateMatrixWorld(true);const direction=end.getWorldPosition(new THREE.Vector3()).sub(bone.getWorldPosition(new THREE.Vector3())).normalize(),world=bone.getWorldQuaternion(new THREE.Quaternion());world.premultiply(new THREE.Quaternion().setFromUnitVectors(direction,new THREE.Vector3((side==='l'?1:-1)*(a==='upperarm_'?.22:a==='lowerarm_'?.12:a==='thigh_'?.16:.08),-1,0).normalize().applyQuaternion(robot.root.getWorldQuaternion(new THREE.Quaternion()))));bone.quaternion.copy(bone.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(world));}
    robot.root.updateMatrixWorld(true);const soles=robot.bones.filter(b=>b.name==='foot_l'||b.name==='foot_r');const footBounds=new THREE.Box3();for(const foot of soles)footBounds.union(new THREE.Box3().setFromObject(foot));robot.root.position.y+=.18-footBounds.min.y;robot.root.updateMatrixWorld(true);
    robot.root.userData.frameId=frames[i].id;robot.root.rotation.y=rotations.get(frames[i].id)||0;if(i===index)selectedRobot=robot.root;
    const unitRack=new THREE.Group();holder.add(unitRack);
    for(let slot=0;slot<2;slot++){const rack=new THREE.Group();rack.userData.action='weapon:'+slot;rack.position.set(slot===0?-1.05:1.05,0,.15);unitRack.add(rack);box(rack,[.12,2.4,.12],[0,1.4,0],black);box(rack,[.5,.08,.4],[0,.2,0]);const item=frames[i].weaponSlots?.[slot];if(item){const gun=createWeaponModel(item.type);gun.scale.setScalar(1.1);gun.position.set(0,2,.15);gun.rotation.set(-Math.PI/2,Math.PI/2,0,'YXZ');rack.add(gun);}else box(rack,[.4,.2,.12],[0,2,.15],black);}
    for(const [boneName,key]of [['head','head'],['spine_03','chest'],['upperarm_l','arms'],['upperarm_r','arms'],['thigh_l','legs'],['thigh_r','legs']]){const bone=robot.salvageFrame?.anchors[boneName]||robot.bones.find(b=>b.name===boneName)|| (key==='head'?robot.head:null);if(bone)bone.traverse(o=>{if(o.isMesh)o.userData.action='gear:'+key;});}
    rigs.push({group:holder,robot,plate,rim,unitRack});continue;



   }rigs.push({group:holder,robot,plate,rim});
  }

   requestDraw();
  }
  if(selectionChanged)drag=null;
  for(const [i,r]of rigs.entries()){const selected=i===index;r.plate.userData.rotateUnit=r.rim.userData.rotateUnit=selected&&!!r.robot;r.rim.material=selected?edge:steel;}
  selectedRobot=rigs[index]?.robot?.root||null;
 }
 let raf=null,disposed=false;
 function requestDraw(){if(!disposed&&raf===null)raf=requestAnimationFrame(draw);}
 function draw(now){
  raf=null;if(document.hidden||!host.isConnected||host.closest('[hidden]')){last=now;return;}
  const w=host.clientWidth,h=host.clientHeight;if(!w||!h){last=now;return;}
  const dt=Math.min((now-last)/1000,.05);last=now;angle=THREE.MathUtils.damp(angle,target,6,dt);if(Math.abs(angle-target)<.0001)angle=target;wheel.rotation.y=angle;
  if(canvas.width!==Math.floor(w*renderer.getPixelRatio())||canvas.height!==Math.floor(h*renderer.getPixelRatio())){renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
  const robot=rigs.find(r=>r.robot?.root===selectedRobot)?.robot;const focused=inspection==='modules'&&robot;
  const desiredPosition=new THREE.Vector3(0,3.1,7.5),look=new THREE.Vector3(0,1.65,0);
  if(focused){robot.root.rotation.y=0;(robot.salvageFrame?.anchors.spine_03||robot.body).getWorldPosition(look);desiredPosition.copy(look).add(new THREE.Vector3(0,.08,1.6));}
  camera.position.lerp(desiredPosition,1-Math.exp(-7*dt));camera.lookAt(look);openAmount=THREE.MathUtils.damp(openAmount,focused?1:0,6,dt);robot?.salvageFrame?.chestMechanism.setOpen(openAmount);
  scene.updateMatrixWorld(true);const targets=[];const put=(key,world)=>{const p=world.clone().project(camera);if(p.z>-1&&p.z<1)targets.push({key,x:(p.x*.5+.5)*w,y:(-.5*p.y+.5)*h});};
  if(robot){if(focused){const chest=robot.salvageFrame?.anchors.spine_03||robot.body;for(const slot of CHEST_SLOTS)put('module:'+slot.index,chest.localToWorld(new THREE.Vector3(...slot.position).add(new THREE.Vector3(0,0,.04))));}
   else{for(const [name,key]of [['head','head'],['spine_03','chest'],['upperarm_l','arms'],['thigh_r','legs']]){const bone=robot.salvageFrame?.anchors[name]||robot.bones.find(b=>b.name===name)||(key==='head'?robot.head:null);if(bone)put('gear:'+key,bone.getWorldPosition(new THREE.Vector3()));}
   for(let slot=0;slot<2;slot++){const rack=rigs.find(r=>r.robot===robot).unitRack;put('weapon:'+slot,rack.localToWorld(new THREE.Vector3(slot===0?-1.05:1.05,2,.3)));}}
  }
  if(!focused){for(const [key,group,sx,sy]of [['monitor:left',monitorLeft,1.3,2.64],['monitor:right',service,1.3,2.64]]){const points=[[-sx/2,-sy/2],[sx/2,sy/2],[-sx/2,sy/2],[sx/2,-sy/2]].map(([x,y])=>group.localToWorld(new THREE.Vector3(x,y,.14)).project(camera));const xs=points.map(p=>(p.x*.5+.5)*w),ys=points.map(p=>(-.5*p.y+.5)*h);targets.push({key,x:Math.min(...xs),y:Math.min(...ys),width:Math.max(...xs)-Math.min(...xs),height:Math.max(...ys)-Math.min(...ys)});}}
  onLayout(targets);renderer.render(scene,camera);if(angle!==target||Math.abs(openAmount-(focused?1:0))>.001||camera.position.distanceTo(desiredPosition)>.001)requestDraw();
 }
 const resize=new ResizeObserver(requestDraw);resize.observe(host);document.addEventListener('visibilitychange',requestDraw);window.addEventListener('resize',requestDraw);canvas.addEventListener('webglcontextrestored',requestDraw);requestDraw();
 return {update,inspect(mode){inspection=mode;highlight(null);requestDraw();},attach(next){if(disposed)return;resize.unobserve(host);host=next;host.appendChild(canvas);resize.observe(host);requestDraw();},dispose(){if(disposed)return;disposed=true;cancelAnimationFrame(raf);resize.disconnect();document.removeEventListener('visibilitychange',requestDraw);window.removeEventListener('resize',requestDraw);canvas.removeEventListener('webglcontextrestored',requestDraw);drag=null;selectedRobot=null;rotations.clear();highlight(null);outlineMaterial.dispose();clearRigs();disposeObjectResources(scene,{sharedMaterials});sharedMaterials.forEach(m=>m.dispose());renderer.dispose();canvas.remove();}};
}

import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {createRobot,animateRobot,disposeRobot} from './robot.js';
let renderer;const cache=new Map();
function clearModules(robot){for(const group of robot.frameModules||[]){group.removeFromParent();group.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.dispose();}});}robot.frameModules=[];}
function addModules(robot,parts){
 const colors={armor:0x9ab78a,drive:0xe4ab63,reactor:0x70ced5,weapon:0x76aaf1,jet:0xe89962,core:0xaf85e4};
 function mount(boneName,type){const bone=robot.bones.find(b=>b.name===boneName),base=bone?.children.find(m=>m.isMesh&&!m.userData.cosmetic&&!m.userData.weakPoint);if(!bone||!base)return null;const group=new THREE.Group();group.name='installed-'+type+'-'+boneName;group.userData.frameModule=true;group.position.copy(base.position);group.quaternion.copy(base.quaternion);bone.add(group);robot.frameModules.push(group);return group;}
 function piece(parent,size,pos,color,shape='box'){if(!parent)return;const geometry=shape==='sphere'?new THREE.SphereGeometry(.5,16,12):shape==='ring'?new THREE.TorusGeometry(.085,.014,6,20):shape==='cylinder'?new THREE.CylinderGeometry(.5,.5,1,16):new RoundedBoxGeometry(1,1,1,3,.12);const material=new THREE.MeshStandardMaterial({color,metalness:.6,roughness:.4,emissive:color,emissiveIntensity:shape==='ring'?.55:.04});const mesh=new THREE.Mesh(geometry,material);mesh.userData.cosmetic=true;mesh.scale.set(...size);mesh.position.set(...pos);parent.add(mesh);return mesh;}
 for(const {type,level}of parts){const color=colors[type];if(!color)continue;const torso=mount('spine_03',type);
  if(type==='armor'){piece(torso,[.29,.23,.035],[0,0,.115],color);for(const side of['l','r']){const arm=mount('upperarm_'+side,type);piece(arm,[.19,.19,.19],[0,.03,0],color,'sphere');const shin=mount('calf_'+side,type);piece(shin,[.14,.18,.035],[0,0,.105],color);}}
  if(type==='drive')for(const side of['l','r']){for(const bone of['thigh_','calf_']){const joint=mount(bone+side,type);piece(joint,[1,1,1],[0,.05,.075],color,'ring');piece(joint,[.025,.19,.025],[side==='l'?-.09:.09,0,0],color);}}
  if(type==='weapon'){const wrist=mount('lowerarm_r',type);piece(wrist,[.11,.075,.035],[0,0,.095],color);piece(wrist,[.075,.04,.009],[0,0,.12],0xa5d5ff);piece(torso,[.055,.075,.025],[.08,.065,.115],color);}
  if(type==='reactor'){for(const side of[-1,1])piece(torso,[.085,.21,.085],[side*.06,0,-.15],color,'cylinder');piece(torso,[.16,.045,.03],[0,.1,-.2],0x33464b);}
  if(type==='core'){piece(torso,[.18,.18,.07],[0,0,-.145],0x37424c,'cylinder').rotation.x=Math.PI/2;piece(torso,[1,1,1],[0,0,-.19],color,'ring');piece(torso,[.1,.1,.07],[0,0,-.19],color,'sphere');}
  if(type==='jet'){for(const side of[-1,1]){piece(torso,[.075,.19,.085],[side*.11,-.025,-.14],0x49575c,'cylinder');piece(torso,[.09,.045,.09],[side*.11,-.12,-.14],color,'cylinder');}}
  // Small illuminated rank marks convey upgrades without bloating the silhouette.
  for(let i=0;i<Math.min(3,level);i++)piece(torso,[.035,.009,.009],[-.04+i*.04,.13,.12],color);
 }
}
export function applyFrameVisual(robot,stats){
 clearModules(robot);robot.setArmorLevel(0);const parts=stats.visualParts||[];addModules(robot,parts);const pack=robot.root.getObjectByName('player-jetpack');if(pack)pack.visible=false;
 for(const bone of robot.bones||[])for(const mesh of bone.children){
  if(!mesh.isMesh||mesh.userData.cosmetic||mesh===robot.head||mesh.userData.weakPoint)continue;
  mesh.userData.frameRestScale ||=mesh.scale.clone();mesh.scale.copy(mesh.userData.frameRestScale);
  const limb=/upperarm|lowerarm|thigh|calf/.test(bone.name),torso=/spine/.test(bone.name);
  if(limb||torso){const thickness=stats.armor?1:.76;mesh.scale.x*=thickness;mesh.scale.z*=thickness;}
 }
}
export function framePreview(stats){
 const key=JSON.stringify(stats.visualParts||[]) + [stats.armor,stats.jet,stats.battery,stats.speed,stats.damage].join(':');if(cache.has(key))return cache.get(key);
 renderer ||=new THREE.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});renderer.setSize(320,250);renderer.setPixelRatio(1);
 const scene=new THREE.Scene(),robot=createRobot(false,'player',.82);scene.add(robot.root);animateRobot(robot,.1,{speed:0});robot.blaster.visible=false;if(robot.backpack)robot.backpack.visible=false;applyFrameVisual(robot,stats);
 scene.add(new THREE.HemisphereLight(0xddeeff,0x435142,4));const light=new THREE.DirectionalLight(0xffffff,5);light.position.set(2,4,3);scene.add(light);
 const camera=new THREE.PerspectiveCamera(31,320/250,.01,30);camera.position.set(2.6,1.7,3.6);camera.lookAt(0,1,0);renderer.render(scene,camera);
 const image=renderer.domElement.toDataURL('image/png');scene.remove(robot.root);clearModules(robot);disposeRobot(robot);cache.set(key,image);return image;
}

import * as THREE from 'three';
import {createRobot,animateRobot,disposeRobot} from './robot.js';
let renderer;const cache=new Map();
export function applyFrameVisual(robot,stats){
 robot.setArmorLevel(stats.armor?3:0);
 for(const bone of robot.bones||[])for(const mesh of bone.children){
  if(!mesh.isMesh||mesh.userData.cosmetic||mesh===robot.head||mesh.userData.weakPoint)continue;
  mesh.userData.frameRestScale ||=mesh.scale.clone();mesh.scale.copy(mesh.userData.frameRestScale);
  const limb=/upperarm|lowerarm|thigh|calf/.test(bone.name),torso=/spine/.test(bone.name);
  if(limb||torso){const thickness=stats.armor?1:.76;mesh.scale.x*=thickness;mesh.scale.z*=thickness;}
 }
}
export function framePreview(stats){
 const key=[stats.armor,stats.jet,stats.battery,stats.speed,stats.damage].join(':');if(cache.has(key))return cache.get(key);
 renderer ||=new THREE.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});renderer.setSize(320,250);renderer.setPixelRatio(1);
 const scene=new THREE.Scene(),robot=createRobot(false,'player',.82);scene.add(robot.root);animateRobot(robot,.1,{speed:0});robot.blaster.visible=false;if(robot.backpack)robot.backpack.visible=false;applyFrameVisual(robot,stats);
 scene.add(new THREE.HemisphereLight(0xddeeff,0x435142,4));const light=new THREE.DirectionalLight(0xffffff,5);light.position.set(2,4,3);scene.add(light);
 const camera=new THREE.PerspectiveCamera(31,320/250,.01,30);camera.position.set(2.6,1.7,3.6);camera.lookAt(0,1,0);renderer.render(scene,camera);
 const image=renderer.domElement.toDataURL('image/png');scene.remove(robot.root);disposeRobot(robot);cache.set(key,image);return image;
}

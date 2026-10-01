import * as THREE from 'three';
import {createRobot} from './robot.js';
const cyan=new THREE.MeshStandardMaterial({color:0x16bdda,metalness:.65,roughness:.35}),purple=new THREE.MeshStandardMaterial({color:0xc327ce,metalness:.5,roughness:.4}),dark=new THREE.MeshStandardMaterial({color:0x152b39,metalness:.7,roughness:.4}),light=new THREE.MeshBasicMaterial({color:0x8df7ff}),bladeLight=new THREE.MeshBasicMaterial({color:0xffa1f7});
const cube=new THREE.BoxGeometry(1,1,1),ring=new THREE.TorusGeometry(.63,.13,8,20);
function part(parent,mat,size,pos){const m=new THREE.Mesh(cube,mat);m.scale.set(...size);m.position.set(...pos);m.castShadow=true;parent.add(m);return m;}
export function createBoss(kind){
 const r=createRobot(kind!=='blade');r.bossKind=kind;r.rotors=[];r.blades=[];const dronePorts=[];
 if(kind==='drone'){
  r.motion.visible=false;const body=new THREE.Group();r.root.add(body);r.droneBody=body;part(body,cyan,[1.9,1.1,1.5],[0,2,0]);r.head=part(body,light,[.7,.35,.25],[0,2.05,.82]);r.head.userData.weakPoint=true;
  for(const side of[-1,1]){part(body,dark,[1,.2,.28],[side*1.05,2,0]);const fan=new THREE.Mesh(ring,cyan);fan.rotation.x=Math.PI/2;fan.position.set(side*1.65,2,0);body.add(fan);const rotor=new THREE.Group();rotor.position.copy(fan.position);body.add(rotor);part(rotor,dark,[1.12,.06,.15],[0,0,0]);part(rotor,dark,[.15,.06,1.12],[0,0,0]);r.rotors.push(rotor);const pod=new THREE.Group();pod.position.set(side*.6,1.35,.15);body.add(pod);part(pod,cyan,[.4,.75,.45],[0,0,0]);const socket=new THREE.Group();socket.position.set(0,-.25,.3);pod.add(socket);dronePorts.push(socket);}
  r.root.scale.setScalar(1);r.muzzle=new THREE.Group();r.muzzle.position.set(0,1.5,.85);body.add(r.muzzle);r.aimEmitter=r.muzzle;r.missileMuzzles=dronePorts;r.hitMeshes=[];body.traverse(o=>{if(o.isMesh){o.userData.enemyPart=true;r.hitMeshes.push(o);}});
 }else if(kind==='blade'){
  r.root.scale.setScalar(2.2);r.blaster.visible=false;r.blaster.traverse(o=>{r.hitMeshes=r.hitMeshes.filter(m=>m!==o);});
  r.root.traverse(o=>{if(o.isMesh&&o.material?.color?.getHex()===0x94afb6)o.material=purple;});
  for(const arm of r.arms){const weapon=new THREE.Group();arm.hand.add(weapon);weapon.position.set(0,.04,0);part(weapon,dark,[.12,.3,.12],[0,.12,0]);part(weapon,purple,[.32,.07,.16],[0,.3,0]);const edge=part(weapon,bladeLight,[.12,1.05,.065],[0,.85,0]);edge.rotation.z=-.12;r.blades.push(weapon);}
 }
 return r;
}
export function animateBoss(r,dt,time,attack){
 if(r.bossKind==='drone'){for(const rotor of r.rotors)rotor.rotation.y+=dt*35;r.droneBody.rotation.z=Math.sin(time*2)*.08;r.droneBody.rotation.x=Math.sin(time*1.5)*.05;}
 if(r.bossKind==='blade'){for(const [i,arm]of r.arms.entries()){const swing=attack?Math.sin(Math.min(1,attack/.65)*Math.PI):0;arm.shoulder.rotateX(-.35-swing*2.1);arm.shoulder.rotateZ((i?1:-1)*(.3+swing*.8));arm.elbow.rotateX(-.3);}}
}

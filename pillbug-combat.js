import * as THREE from 'three';
import {createPillbug,pillbugDemoPose} from './pillbug-robot.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {recordEnemyImpact} from './enemy-death-burst.js';

const impactTime=3.4+(1.55+3.7)/18;
export function createCombatPillbug(){
 const bug=createPillbug(),root=new THREE.Group();root.name='iron-pillbug';root.add(bug.root);
 // Batch only direct mesh children: every articulated joint remains independent.
 const oldGeometry=new Set();bug.root.traverse(group=>{
  if(!group.isGroup)return;const byMaterial=new Map();
  for(const mesh of group.children.filter(o=>o.isMesh)){const list=byMaterial.get(mesh.material)||[];list.push(mesh);byMaterial.set(mesh.material,list);}
  for(const [material,meshes] of byMaterial){if(meshes.length<2)continue;const pieces=meshes.map(mesh=>{mesh.updateMatrix();return mesh.geometry.clone().applyMatrix4(mesh.matrix);});const geometry=mergeGeometries(pieces,false);for(const g of pieces)g.dispose();if(!geometry)continue;
   for(const mesh of meshes){oldGeometry.add(mesh.geometry);group.remove(mesh);}const batch=new THREE.Mesh(geometry,material);batch.castShadow=batch.receiveShadow=true;group.add(batch);
  }
 });
 const retained=new Set();bug.root.traverse(o=>{if(o.isMesh)retained.add(o.geometry);});for(const g of oldGeometry)if(!retained.has(g))g.dispose();
 const hitMeshes=[];bug.root.traverse(o=>{if(o.isMesh){o.userData.enemyPart=true;hitMeshes.push(o);}});
 const warning=new THREE.Group();root.add(warning);warning.visible=false;
 const material=new THREE.MeshBasicMaterial({color:0xff2339,transparent:true,opacity:.28,depthWrite:false,side:THREE.DoubleSide});
 const lane=new THREE.Mesh(new THREE.PlaneGeometry(2.2,24),material);lane.rotation.x=-Math.PI/2;lane.position.set(0,.055,12);warning.add(lane);
 for(let z=2;z<24;z+=2){const shape=new THREE.Shape();shape.moveTo(-.65,-.3);shape.lineTo(0,.35);shape.lineTo(.65,-.3);shape.lineTo(.65,-.05);shape.lineTo(0,.6);shape.lineTo(-.65,-.05);shape.closePath();const m=new THREE.Mesh(new THREE.ShapeGeometry(shape),material);m.rotation.x=Math.PI/2;m.position.set(0,.06,z);warning.add(m);}
 warning.traverse(o=>{o.userData.effect=true;});
 const r={root,motion:bug.root,body:bug.thorax,head:bug.head,neck:bug.head,hitMeshes,legs:bug.legs,arms:[],muzzle:new THREE.Group(),muzzleFlash:new THREE.Group(),pillbug:true,bug,warning,phase:'crawl',age:0,walk:0,wait:1.2,invulnerable:true,direction:new THREE.Vector3(0,0,1),deathPartLimit:45};
 r.recordImpact=(...args)=>recordEnemyImpact(r,...args);
 r.dispose=()=>{bug.dispose();warning.traverse(o=>o.geometry?.dispose());material.dispose();root.removeFromParent();};return r;
}
// Collision callback sweeps each short segment, returning 'wall' or 'player'.
export function updateCombatPillbug(r,dt,{target,canSee=true,speed=1,collide=()=>null,onHit=()=>{}}){
 r.age+=dt;r.walk+=dt*7;
 let p={curl:0,roll:0,hop:0,squash:1,flip:0,flail:false},moving=0;
 if(r.phase==='crawl'){
  const delta=target.clone().sub(r.root.position).setY(0),distance=delta.length();r.wait-=dt;
  if(distance>2){r.root.rotation.y=Math.atan2(delta.x,delta.z);const next=r.root.position.clone().addScaledVector(delta.normalize(),.65*speed*dt);if(!collide(r.root.position,next,false)){r.root.position.copy(next);moving=speed;}}
  if(canSee&&distance<26&&distance>1&&r.wait<=0){r.phase='windup';r.age=0;r.direction.copy(target).sub(r.root.position).setY(0).normalize();r.root.rotation.y=Math.atan2(r.direction.x,r.direction.z);}
 }else if(r.phase==='windup'){
  p=pillbugDemoPose(2+Math.min(r.age,1.399));if(r.age>=1.4){r.phase='roll';r.age=0;}
 }else if(r.phase==='roll'){
  p={...p,curl:1,roll:23.4+r.age*18*speed/1.15};const steps=Math.max(1,Math.ceil(18*speed*dt/.15));
  for(let i=0;i<steps;i++){const next=r.root.position.clone().addScaledVector(r.direction,18*speed*dt/steps),contact=collide(r.root.position,next,true);if(contact){r.phase='rebound';r.age=0;r.contact=r.root.position.clone();if(contact==='player')onHit(r.direction.clone());break;}r.root.position.copy(next);}
 }else{
  p=pillbugDemoPose(impactTime+r.age);const retreat=p.z-1.55,next=r.contact.clone().addScaledVector(r.direction,retreat);if(!collide(r.root.position,next,false))r.root.position.copy(next);
  if(r.age>=3.78){r.phase='crawl';r.age=0;r.wait=1.2;}
 }
 r.invulnerable=!p.flail;r.warning.visible=r.phase==='windup'||r.phase==='roll';
 r.bug.root.position.y=p.hop+p.flip*1.02;r.bug.root.rotation.z=p.flip*Math.PI;r.bug.root.scale.y=p.squash;
 r.bug.pose(p.curl,p.roll,r.walk,p.flail,moving);r.root.updateMatrixWorld(true);
 return {phase:r.phase,invulnerable:r.invulnerable};
}

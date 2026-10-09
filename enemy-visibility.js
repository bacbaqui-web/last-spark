import * as THREE from 'three';

// Screen tests are cheap and run every step. Wall tests are cached per actor;
// never cast rays through every robot bone or accumulate missed simulation time.
export function createEnemyVisibility(){
 const frustum=new THREE.Frustum(),matrix=new THREE.Matrix4(),sphere=new THREE.Sphere();
 const origin=new THREE.Vector3(),target=new THREE.Vector3(),direction=new THREE.Vector3(),right=new THREE.Vector3();
 const ray=new THREE.Raycaster(),hits=[],cache=new WeakMap();let obstacles=[],time=0,checks=0;
 ray.firstHitOnly=true;
 function begin(camera,worldObstacles,now){
  camera.updateWorldMatrix(true,false);matrix.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);
  frustum.setFromProjectionMatrix(matrix);origin.setFromMatrixPosition(camera.matrixWorld);right.setFromMatrixColumn(camera.matrixWorld,0);
  obstacles=worldObstacles;time=now;checks=0;
 }
 function visible(enemy){
  const p=enemy.group.position,height=enemy.boss?3:enemy.type==='spider'?.5:enemy.type==='scoutDrone'?.6:1.4;
  sphere.center.copy(p);sphere.center.y+=height;sphere.radius=enemy.boss?6:2.5;
  enemy.inView=frustum.intersectsSphere(sphere);
  if(!enemy.inView){cache.delete(enemy);enemy.occluded=false;return false;}
  let sample=cache.get(enemy);
  if(!sample||time>=sample.next||sample.origin.distanceToSquared(origin)>1||sample.position.distanceToSquared(p)>1){
   let clear=false;
   // Center, head and shoulder edges keep partially exposed actors visible.
   for(const [vertical,side] of [[0,0],[height*.65,0],[0,-.8],[0,.8]]){
    target.copy(sphere.center).addScaledVector(right,side*(enemy.boss?2:1));target.y+=vertical;
    direction.subVectors(target,origin);const distance=direction.length();
    if(distance<.5){clear=true;break;}
    ray.set(origin,direction.multiplyScalar(1/distance));ray.far=Math.max(0,distance-.35);hits.length=0;
    ray.intersectObjects(obstacles,false,hits);checks++;
    if(!hits.length){clear=true;break;}
   }
   sample={visible:clear,next:time+.2,origin:origin.clone(),position:p.clone()};cache.set(enemy,sample);
  }
  enemy.occluded=!sample.visible;return sample.visible;
 }
 return {begin,visible,get rayChecks(){return checks;}};
}

// Hiding an Object3D does not stop its matrix traversal in Three.js. Sleeping
// actors keep their last pose; waking/death restores the normal update path.
export function setEnemySleeping(enemy,sleeping){
 setObjectSleeping(enemy.group,sleeping);enemy.dormant=sleeping;
}

export function setObjectSleeping(root,sleeping){
 if(!root.userData.sleepTraversalInstalled){
  const update=root.updateMatrixWorld;
  root.updateMatrixWorld=function(force){if(!this.userData.simulationSleeping)update.call(this,force);};
  root.userData.sleepTraversalInstalled=true;
 }
 root.userData.simulationSleeping=sleeping;
}

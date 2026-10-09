import * as THREE from 'three';

// Death rewards are settled before this visual-only queue. Never defer unseen
// motion to a later frame: discard it so turning around cannot cause catch-up.
export function createDeathBudget({maxDetailed=6,maxDistance=90}={}){
 const frustum=new THREE.Frustum(),matrix=new THREE.Matrix4(),sphere=new THREE.Sphere(),origin=new THREE.Vector3();
 let culled=0,simplified=0;
 return {
  update(enemies,dt,camera,animate,dispose){
   camera.updateWorldMatrix(true,false);matrix.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);frustum.setFromProjectionMatrix(matrix);origin.setFromMatrixPosition(camera.matrixWorld);
   let detailed=enemies.filter(e=>e.deathDetail==='full').length;
   for(let i=enemies.length-1;i>=0;i--){
    const e=enemies[i];e.deathTime+=dt;
    sphere.center.copy(e.group.position);sphere.center.y+=e.boss?3:1.4;sphere.radius=e.boss?14:10;
    const visible=sphere.center.distanceToSquared(origin)<maxDistance*maxDistance&&frustum.intersectsSphere(sphere);
    const duration=(e.deathDetail==='simple'&&!e.robot.trainingData) ? .55 : (e.robot.deathDuration??.85);
    if(!visible||e.deathTime>duration){if(!visible)culled++;if(e.deathDetail==='full')detailed--;dispose(e.robot);enemies.splice(i,1);continue;}
    e.group.visible=true;
    if(!e.deathDetail){e.deathDetail=detailed<maxDetailed?'full':'simple';if(e.deathDetail==='full')detailed++;else{simplified++;e.robot.deathPartLimit=12;}}
    // Even overloaded deaths scatter black parts; limit their count and life
    // instead of switching back to a whole, colored robot shrinking away.
    animate(e.robot,e.deathTime,e.deathSide);
   }
  },
  snapshot:()=>({culledDeathEffects:culled,simplifiedDeathEffects:simplified})
 };
}

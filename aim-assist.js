import * as T from 'three';
// Bullet correction only: preserve camera input, existing hits and cover occlusion.
export function assistedDirection(origin,forward,enemies,strength,obstacles=[],range=90){
 if(strength<=0)return forward.clone();
 const cone=Math.min(.09,strength*.2),ray=new T.Raycaster(origin.clone(),forward.clone(),0,range),alive=enemies.filter(e=>e.hp>0),meshes=alive.flatMap(e=>e.robot.hitMeshes),direct=ray.intersectObjects(meshes,false)[0],wall=ray.intersectObjects(obstacles,false)[0];
 if(direct&&(!wall||direct.distance<wall.distance))return forward.clone();
 const candidates=[];
 for(const e of alive)for(const mesh of e.robot.hitMeshes){
  if(!mesh.geometry.boundingSphere)mesh.geometry.computeBoundingSphere();
  const point=mesh.localToWorld(mesh.geometry.boundingSphere.center.clone()),delta=point.sub(origin),distance=delta.length();if(distance<.5||distance>range)continue;
  const direction=delta.divideScalar(distance),angle=Math.acos(T.MathUtils.clamp(direction.dot(forward),-1,1));if(angle>=cone)continue;candidates.push({direction,distance,angle,e});
 }
 candidates.sort((a,b)=>a.angle-b.angle);
 for(const {direction,distance,e} of candidates){
  ray.set(origin,direction);ray.far=distance+.1;const hit=ray.intersectObjects(e.robot.hitMeshes,false)[0],cover=ray.intersectObjects(obstacles,false)[0];
  if(!hit||cover&&cover.distance<=hit.distance)continue;
  return direction;
 }
 return forward.clone();
}

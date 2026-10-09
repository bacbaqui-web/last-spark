import * as T from 'three';
import {MeshBVH} from 'three-mesh-bvh';

// Store one BVH per source geometry, not millions of world-space triangle copies.
const trees=new WeakMap();
function boundsTree(geometry){let tree=trees.get(geometry);if(!tree){tree=new MeshBVH(geometry,{indirect:true,targetLeafSize:12});trees.set(geometry,tree);}return tree;}
export function buildWalkCollision(root){
 const boundX=root.userData.walkBounds||9,boundZ=root.userData.walkBoundsZ??36;
 root.updateMatrixWorld(true);const entries=[],cells=new Map(),surfaces=[],seen=new Set();let triangleCount=0;
 const instance=new T.Matrix4(),world=new T.Matrix4();
 root.traverse(o=>{if(!o.userData.collisionKind)return;o.traverse(mesh=>{
  if(!mesh.isMesh||!mesh.visible||seen.has(mesh))return;seen.add(mesh);
  const geometry=mesh.geometry;if(!geometry.attributes.position)return;geometry.computeBoundingBox();const tree=boundsTree(geometry);
  for(let n=0;n<(mesh.isInstancedMesh?mesh.count:1);n++){
   if(mesh.isInstancedMesh){mesh.getMatrixAt(n,instance);world.multiplyMatrices(mesh.matrixWorld,instance);}else world.copy(mesh.matrixWorld);
   const bounds=geometry.boundingBox.clone().applyMatrix4(world);if(bounds.max.x< -boundX||bounds.min.x>boundX||bounds.max.z< -boundZ||bounds.min.z>boundZ)continue;
   const entry={geometry,tree,matrix:world.clone(),inverse:world.clone().invert(),normal:new T.Matrix3().getNormalMatrix(world),bounds,kind:o.userData.collisionKind,mesh,instanceId:mesh.isInstancedMesh?n:undefined};
   const id=entries.length;entries.push(entry);surfaces.push({geometry,matrix:entry.matrix,kind:entry.kind});triangleCount+=(geometry.index?.count??geometry.attributes.position.count)/3;
   for(let x=Math.floor(Math.max(-boundX,bounds.min.x)/2);x<=Math.floor(Math.min(boundX,bounds.max.x)/2);x++)for(let z=Math.floor(Math.max(-boundZ,bounds.min.z)/2);z<=Math.floor(Math.min(boundZ,bounds.max.z)/2);z++){const key=x+':'+z;let cell=cells.get(key);if(!cell)cells.set(key,cell=[]);cell.push(id);}
  }
 });});
 const ray=new T.Ray(),localRay=new T.Ray(),point=new T.Vector3(),normal=new T.Vector3(),center=new T.Vector3(),closest=new T.Vector3(),down=new T.Vector3(0,-1,0),triangle=new T.Triangle(),box=new T.Box3(),localBox=new T.Box3();
 const radius=.27,stepHeight=.7,rubbleStepHeight=1.3,probeRadius=radius+.08;
 const supportCache=new Map(),insideDirection=new T.Vector3(.742,.351,.571).normalize();
 const probes=[[0,0],...[probeRadius*.5,probeRadius].flatMap(r=>Array.from({length:16},(_,i)=>[Math.cos(i*Math.PI/8)*r,Math.sin(i*Math.PI/8)*r]))];
 function nearby(x,z){const ids=new Set();for(let xx=Math.floor((x-probeRadius)/2);xx<=Math.floor((x+probeRadius)/2);xx++)for(let zz=Math.floor((z-probeRadius)/2);zz<=Math.floor((z+probeRadius)/2);zz++)for(const id of cells.get(xx+':'+zz)||[])ids.add(id);return ids;}
 function support(x,z,foot,ids){const key=x+':'+z+':'+foot;if(supportCache.has(key))return supportCache.get(key);let height=root.userData.groundBase??(Math.abs(x)>3.65?.205:.025);
  for(const id of ids){const e=entries[id],soft=['rubble','ground','car'].includes(e.kind),limit=['rubble','car'].includes(e.kind)?rubbleStepHeight:stepHeight;
   if(e.bounds.min.y>foot+limit+.02||e.bounds.max.y<height-.08)continue;
   for(const [ox,oz] of probes){const px=x+ox,pz=z+oz;if(px<e.bounds.min.x||px>e.bounds.max.x||pz<e.bounds.min.z||pz>e.bounds.max.z)continue;
    ray.set(center.set(px,foot+limit+.02,pz),down);localRay.copy(ray).applyMatrix4(e.inverse);
    const hit=e.tree.raycastFirst(localRay,T.DoubleSide);if(!hit)continue;
    point.copy(hit.point).applyMatrix4(e.matrix);normal.copy(hit.face.normal).applyNormalMatrix(e.normal);
    if(Math.abs(normal.y)>=(soft?.15:.55)&&point.y<=foot+limit+.001)height=Math.max(height,point.y+(soft?.08:0));
   }
  }supportCache.set(key,height);if(supportCache.size>256)supportCache.delete(supportCache.keys().next().value);return height;
 }
 function blocked(x,z,foot,ids=nearby(x,z)){
  box.min.set(x-radius,foot+.035,z-radius);box.max.set(x+radius,foot+1.65,z+radius);
  for(const id of ids){const e=entries[id];if(!e.bounds.intersectsBox(box))continue;localBox.copy(box).applyMatrix4(e.inverse);
   if(e.tree.shapecast({intersectsBounds:b=>b.intersectsBox(localBox),intersectsTriangle:t=>{
    triangle.a.copy(t.a).applyMatrix4(e.matrix);triangle.b.copy(t.b).applyMatrix4(e.matrix);triangle.c.copy(t.c).applyMatrix4(e.matrix);
    for(let i=0;i<6;i++){center.set(x,foot+radius+i*(1.65-radius*2)/5,z);triangle.closestPointToPoint(center,closest);if(closest.y>foot+.035&&center.distanceToSquared(closest)<radius*radius-.0001)return true;}return false;
   }}))return true;
   center.set(x,foot+.8,z);if(e.bounds.containsPoint(center)){
    localRay.set(center,insideDirection).applyMatrix4(e.inverse);const hits=e.tree.raycast(localRay,T.DoubleSide).sort((a,b)=>a.distance-b.distance);let winding=0,previous=-Infinity;for(const hit of hits)if(hit.distance>1e-6&&hit.distance-previous>1e-5){winding+=Math.sign(hit.face.normal.dot(localRay.direction));previous=hit.distance;}if(winding>0)return true;
   }
  }return false;
 }
 function move(position,dx,dz,foot){if(![position.x,position.z,dx,dz,foot].every(Number.isFinite))return Number.isFinite(foot)?foot:0;
  // At most 12cm per sample: a dash cannot skip a wall thinner than one frame's travel.
  const steps=Math.ceil(Math.max(Math.abs(dx),Math.abs(dz))/.12);if(steps>512)return foot;let next=foot;
  for(let i=0;i<steps;i++)for(const axis of ['x','z']){const delta=(axis==='x'?dx:dz)/steps;if(Math.abs(delta)<1e-8)continue;const x=position.x+(axis==='x'?delta:0),z=position.z+(axis==='z'?delta:0);if(Math.abs(x)>boundX||Math.abs(z)>boundZ-1)continue;const ids=nearby(x,z),height=support(x,z,next,ids);if(height-next>rubbleStepHeight+.01||blocked(x,z,height,ids))continue;position.x=x;position.z=z;next=Math.max(height,next-.12);}return next;
 }
 // One spatially filtered ray target for bullets, line of sight, and the camera.
 const rayVisits=new Uint32Array(entries.length),localDirection=new T.Vector3();let rayStamp=0;
 const rayStats={queries:0,cells:0,entries:0};
 const rayTarget=new T.Object3D();rayTarget.name='street-spatial-collision';rayTarget.raycast=(caster,hits)=>{
  const range=Math.min(Number.isFinite(caster.far)?caster.far:2000,2000),origin=caster.ray.origin,dir=caster.ray.direction,first=!!caster.firstHitOnly;
  if(range<caster.near)return;
  if(++rayStamp===0xffffffff){rayVisits.fill(0);rayStamp=1;}rayStats.queries++;
  let nearest=range,best=null,x=Math.floor(origin.x/2),z=Math.floor(origin.z/2),distance=0;
  const sx=Math.sign(dir.x),sz=Math.sign(dir.z),stepX=sx?Math.abs(2/dir.x):Infinity,stepZ=sz?Math.abs(2/dir.z):Infinity;
  let nextX=sx?((x+(sx>0?1:0))*2-origin.x)/dir.x:Infinity,nextZ=sz?((z+(sz>0?1:0))*2-origin.z)/dir.z:Infinity;
  // Visit cells in travel order and stop behind the nearest wall. Each collider
  // is tested once even when it spans many cells; no per-ray Set is allocated.
  while(distance<=(first?nearest:range)){
   rayStats.cells++;
   for(const id of cells.get(x+':'+z)||[]){
    if(rayVisits[id]===rayStamp)continue;rayVisits[id]=rayStamp;
    const e=entries[id];if(!caster.ray.intersectsBox(e.bounds))continue;
    localRay.copy(caster.ray).applyMatrix4(e.inverse);
    // BVH limits are in local units, including nonuniformly scaled instances.
    const m=e.inverse.elements;localDirection.set(m[0]*dir.x+m[4]*dir.y+m[8]*dir.z,m[1]*dir.x+m[5]*dir.y+m[9]*dir.z,m[2]*dir.x+m[6]*dir.y+m[10]*dir.z);
    const scale=localDirection.length();rayStats.entries++;
    const hit=e.tree.raycastFirst(localRay,T.DoubleSide,caster.near*scale,(first?nearest:range)*scale);if(!hit)continue;
    point.copy(hit.point).applyMatrix4(e.matrix);const hitDistance=point.distanceTo(origin);
    if(hitDistance<caster.near-1e-7||hitDistance>range+1e-7)continue;
    const result={...hit,point:point.clone(),distance:hitDistance,object:e.mesh,instanceId:e.instanceId};
    if(first){if(!best||hitDistance<nearest){nearest=hitDistance;best=result;}}else hits.push(result);
   }
   if(nextX===Infinity&&nextZ===Infinity)break;
   if(nextX<nextZ){distance=nextX;nextX+=stepX;x+=sx;}else{distance=nextZ;nextZ+=stepZ;z+=sz;}
  }
  if(best)hits.push(best);
 };

 return {surfaces,move,blocked,rayTarget,rayStats,height:(x,z,foot)=>support(x,z,foot,nearby(x,z)),triangleCount,colliderCount:entries.length,geometryCount:new Set(entries.map(e=>e.geometry)).size,cellCount:cells.size,stepHeight,rubbleStepHeight};
}

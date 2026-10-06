import * as T from 'three';
// Sample the actual posed vehicle instead of enclosing a rotated car in one large box.
export function vehicleColliders(vehicle,cell=.2){
 vehicle.updateMatrixWorld(true);
 const bounds=new T.Box3().setFromObject(vehicle),size=bounds.getSize(new T.Vector3()),nx=Math.ceil(size.x/cell),nz=Math.ceil(size.z/cell),w=size.x/nx,d=size.z/nz,ray=new T.Raycaster(),down=new T.Vector3(0,-1,0),result=[],vehicleGroup={};
 for(let iz=0;iz<nz;iz++){
  let run=null;
  for(let ix=0;ix<nx;ix++){
   const x=bounds.min.x+(ix+.5)*w,z=bounds.min.z+(iz+.5)*d;let h=0;
   for(const [ox,oz] of [[0,0],[-.35,-.35],[.35,-.35],[-.35,.35],[.35,.35]]){ray.set(new T.Vector3(x+ox*w,bounds.max.y+1,z+oz*d),down);const hit=ray.intersectObject(vehicle,true)[0];if(hit)h=Math.max(h,hit.point.y);}
   if(h>0){const height=Math.ceil(h/.1)*.1;if(run&&run.h===height){run.w+=w;run.x+=w/2;}else{run={x,z,w,d,h:height,vehicle:true,vehicleGroup};result.push(run);}}
   else run=null;
  }
 }
 return result;
}

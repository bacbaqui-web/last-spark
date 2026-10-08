import {nearbyColliders} from './collision-broadphase.js';
import * as THREE from 'three';
const RADIUS=.35,HEIGHT=1.7,HEAD=.2,SKIN=.003,EPS=1e-8;
const axes=['x','y','z'];
function expanded(p){const radius=p.vehicle?.27:RADIUS;return {min:{x:p.x-p.w/2-radius,y:(p.base||0)-HEAD,z:p.z-p.d/2-radius},max:{x:p.x+p.w/2+radius,y:p.h+HEIGHT,z:p.z+p.d/2+radius}};}
function inside(p,b){return axes.every(a=>p[a]>b.min[a]+EPS&&p[a]<b.max[a]-EPS);}
function clip(v,n){const inward=v.dot(n);if(inward<0)v.addScaledVector(n,-inward);}
function sweep(start,delta,b){let enter=-Infinity,exit=Infinity,normal=new THREE.Vector3();for(const a of axes){if(Math.abs(delta[a])<EPS){if(start[a]<=b.min[a]+EPS||start[a]>=b.max[a]-EPS)return null;continue;}const t1=(b.min[a]-start[a])/delta[a],t2=(b.max[a]-start[a])/delta[a],near=Math.min(t1,t2),far=Math.max(t1,t2);if(near>enter){enter=near;normal.set(0,0,0);normal[a]=delta[a]>0?-1:1;}exit=Math.min(exit,far);if(enter>exit)return null;}if(enter<-EPS||enter>1||exit<0||delta.dot(normal)>=-EPS)return null;return {time:Math.max(0,enter),normal};}
// Continuous sweep of a player's expanded footprint, then consume the remaining
// movement along the contact plane. Vertical sweeps also handle landing/ceilings.
export function movePlayerWithSlide(start,desired,velocity,platforms,{dash=false,bounds=41.5,boundsX=bounds,boundsZ=bounds}={}){
 if(platforms.streetCollision){
  const collision=platforms.streetCollision,position=start.clone(),speed=velocity.clone(),contacts=[],foot=start.y-HEIGHT;
  const supported=Math.abs(collision.height(start.x,start.z,foot)-foot)<.15&&speed.y<=0;
  const nextFoot=collision.move(position,desired.x-start.x,desired.z-start.z,supported?foot:desired.y-HEIGHT);
  const floor=collision.height(position.x,position.z,supported?nextFoot:Math.min(foot,desired.y-HEIGHT));
  position.y=supported?nextFoot+HEIGHT:Math.max(desired.y,floor+HEIGHT);
  const grounded=supported||desired.y<=floor+HEIGHT+.003;
  if(grounded)speed.y=0;
  for(const axis of ['x','z'])if(Math.abs(position[axis]-desired[axis])>.001){const n=new THREE.Vector3();n[axis]=desired[axis]>start[axis]?-1:1;contacts.push(n);speed[axis]=0;}
  if(grounded)contacts.push(new THREE.Vector3(0,1,0));
  return {position,velocity:speed,grounded,contacts,path:[start.clone(),position.clone()]};
 }
 platforms=nearbyColliders(platforms,start,desired);
 const boxes=platforms.map(expanded);boxes.push({min:{x:-1000,y:-1000,z:-1000},max:{x:1000,y:HEIGHT,z:1000}});
 for(const a of['x','z'])for(const sign of[-1,1]){const b={min:{x:-1000,y:-1000,z:-1000},max:{x:1000,y:1000,z:1000}};if(sign<0)b.max[a]=-(a==='x'?boundsX:boundsZ);else b.min[a]=a==='x'?boundsX:boundsZ;boxes.push(b);}
 const position=start.clone(),speed=velocity.clone(),contacts=[],path=[];let grounded=false,stepped=false;
 // Only marked terrain terraces allow a small grounded step; cover remains solid.
 const supported=start.y<=HEIGHT+SKIN+.002||platforms.some(p=>Math.abs(start.y-(p.h+HEIGHT+SKIN))<.01&&Math.abs(start.x-p.x)<p.w/2+RADIUS&&Math.abs(start.z-p.z)<p.d/2+RADIUS);
 if(supported&&speed.y<=0&&speed.y>=-2){let floor=start.y-HEIGHT;for(const p of platforms)if(p.walkable&&p.h>floor&&p.h-(start.y-HEIGHT)<=.25&&Math.abs(desired.x-p.x)<p.w/2+RADIUS&&Math.abs(desired.z-p.z)<p.d/2+RADIUS)floor=Math.max(floor,p.h);if(floor>start.y-HEIGHT){position.y=floor+HEIGHT+SKIN;stepped=true;speed.y=0;}}

 // Repair an existing overlap rather than skipping its collider forever.
 for(let pass=0;pass<12;pass++){let best=null;for(const b of boxes){if(!inside(position,b))continue;for(const a of axes)for(const sign of[-1,1]){const distance=sign<0?position[a]-b.min[a]:b.max[a]-position[a];if(!best||distance<best.distance){const normal=new THREE.Vector3();normal[a]=sign;best={distance,normal};}}}if(!best)break;position.addScaledVector(best.normal,best.distance+SKIN);clip(speed,best.normal);contacts.push(best.normal);grounded||=best.normal.y>0;}
 let remaining=desired.clone().sub(start);if(stepped)remaining.y=0;path.push(position.clone());
 for(let pass=0;pass<6&&remaining.lengthSq()>EPS*EPS;pass++){
  let hit=null;for(const b of boxes){const candidate=sweep(position,remaining,b);if(candidate&&(!hit||candidate.time<hit.time))hit=candidate;}
  if(!hit){position.add(remaining);path.push(position.clone());remaining.set(0,0,0);break;}
  position.addScaledVector(remaining,hit.time).addScaledVector(hit.normal,SKIN);path.push(position.clone());remaining.multiplyScalar(1-hit.time);const horizontal=Math.hypot(remaining.x,remaining.z);clip(remaining,hit.normal);clip(speed,hit.normal);contacts.push(hit.normal);grounded||=hit.normal.y>0;
  // Glancing dashes keep their pace; head-on hits never invent a sideways direction.
  const tangent=Math.hypot(remaining.x,remaining.z);if(dash&&hit.normal.y===0){const horizontalSpeed=Math.hypot(velocity.x,velocity.z),tangentSpeed=Math.hypot(speed.x,speed.z);if(tangentSpeed>horizontalSpeed*.2&&tangent>EPS){remaining.x*=horizontal/tangent;remaining.z*=horizontal/tangent;speed.x*=horizontalSpeed/tangentSpeed;speed.z*=horizontalSpeed/tangentSpeed;}else if(tangentSpeed<=horizontalSpeed*.2){remaining.x=remaining.z=0;speed.x=speed.z=0;}}

 }
 // Resolve overlaps introduced by a recovery into an adjacent collider.
 if(boxes.some(b=>inside(position,b))){const xs=[position.x],zs=[position.z];for(const b of boxes){if(position.y<=b.min.y||position.y>=b.max.y)continue;xs.push(b.min.x-SKIN,b.max.x+SKIN);zs.push(b.min.z-SKIN,b.max.z+SKIN);}let best=null;for(const x of xs)for(const z of zs){if(Math.abs(x)>boundsX||Math.abs(z)>boundsZ)continue;const p=new THREE.Vector3(x,position.y,z);if(boxes.some(b=>inside(p,b)))continue;const distance=p.distanceToSquared(position);if(!best||distance<best.distance)best={p,distance};}if(best){position.copy(best.p);speed.x=speed.z=0;path.length=0;path.push(position.clone());}}
 for(const a of['x','z']){const limited=THREE.MathUtils.clamp(position[a],-(a==='x'?boundsX:boundsZ),a==='x'?boundsX:boundsZ);if(limited!==position[a]){position[a]=limited;speed[a]=0;}}
 grounded=false;if(speed.y<=0)for(const b of boxes){if(position.y>=b.max.y-EPS&&position.y<=b.max.y+SKIN+EPS&&position.x>b.min.x&&position.x<b.max.x&&position.z>b.min.z&&position.z<b.max.z){position.y=b.max.y+SKIN;speed.y=0;grounded=true;break;}}
 path.push(position.clone());return {position,velocity:speed,grounded,contacts,path,blocked:contacts.some(n=>n.y===0)&&Math.hypot(speed.x,speed.z)<.05};
}

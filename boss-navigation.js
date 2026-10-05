import * as THREE from 'three';
import {clearRoute,coverRoute} from './enemy-ai.js';
export const BLADE_RADIUS=1.05;
const layers=new WeakMap();
function obstaclesAt(platforms,y){let cache=layers.get(platforms);if(!cache){cache=new Map();layers.set(platforms,cache);}const indices=[];platforms.forEach((p,i)=>{if(!p.walkable&&p.h>y+.15&&(p.base||0)<y+4.2)indices.push(i);});const key=indices.join(',');if(!cache.has(key))cache.set(key,indices.map(i=>platforms[i]));return cache.get(key);}
function safePoint(point,obstacles,origin=point){point={x:THREE.MathUtils.clamp(point.x,-40,40),z:THREE.MathUtils.clamp(point.z,-40,40)};const valid=p=>Math.abs(p.x)<=40&&Math.abs(p.z)<=40&&clearRoute(p,p,obstacles,BLADE_RADIUS);if(valid(point))return {x:point.x,z:point.z};const candidates=[];for(const p of obstacles){const w=p.w/2+BLADE_RADIUS+.12,d=p.d/2+BLADE_RADIUS+.12;for(const side of[-1,1]){candidates.push({x:p.x+side*w,z:point.z},{x:point.x,z:p.z+side*d});for(const other of[-1,1])candidates.push({x:p.x+side*w,z:p.z+other*d});}}candidates.sort((a,b)=>(Math.hypot(a.x-point.x,a.z-point.z)+.001*Math.hypot(a.x-origin.x,a.z-origin.z))-(Math.hypot(b.x-point.x,b.z-point.z)+.001*Math.hypot(b.x-origin.x,b.z-origin.z)));return candidates.find(valid)||null;}
export function moveBladeBoss(e,target,platforms,dt,speed){
 if(dt<=0)return 0;const p=e.group.position,obstacles=obstaclesAt(platforms,p.y),safeStart=safePoint(p,obstacles);if(!safeStart)return 0;
 if(Math.hypot(p.x-safeStart.x,p.z-safeStart.z)>.001){p.x=safeStart.x;p.z=safeStart.z;e.navTimer=0;}
 const goal=safePoint(target,obstacles,p);if(!goal)return 0;
 if(Math.hypot(p.x-target.x,p.z-target.z)<=2.3&&clearRoute(p,target,obstacles,BLADE_RADIUS))return 0;
 e.navTimer=(e.navTimer||0)-dt;const movedGoal=!e.bladeGoal||Math.hypot(goal.x-e.bladeGoal.x,goal.z-e.bladeGoal.z)>1.8,route=e.travelPlan?.route;
 if(e.navTimer<=0||movedGoal||e.bladeObstacles!==obstacles||!route?.length||!clearRoute(p,route[0],obstacles,BLADE_RADIUS)){e.travelPlan=coverRoute(p,goal,obstacles,BLADE_RADIUS);e.bladeGoal=goal;e.bladeObstacles=obstacles;e.navTimer=.45;}
 // Stop rather than walking through cover when no route exists.
 const path=e.travelPlan?.route;if(!path?.length)return 0;const old=p.clone();let budget=speed*dt;
 while(path.length&&budget>1e-6){const waypoint=path[0],dx=waypoint.x-p.x,dz=waypoint.z-p.z,distance=Math.hypot(dx,dz);if(distance<.001){path.shift();continue;}const step=Math.min(budget,distance),next={x:p.x+dx/distance*step,z:p.z+dz/distance*step};if(!clearRoute(p,next,obstacles,BLADE_RADIUS)){e.navTimer=0;e.travelPlan=null;break;}p.x=next.x;p.z=next.z;budget-=step;if(step>=distance-.001)path.shift();}
 const traveled=Math.hypot(p.x-old.x,p.z-old.z);if(traveled>.001&&!e.bladeSwing){const angle=Math.atan2(p.x-old.x,p.z-old.z),turn=Math.atan2(Math.sin(angle-e.group.rotation.y),Math.cos(angle-e.group.rotation.y));e.group.rotation.y+=turn*(1-Math.exp(-dt*12));}return traveled/dt;
}
export function tryBladeLeap(e,target,platforms,dt){
 e.leapCheck=Math.max(0,(e.leapCheck||0)-dt);if(e.bladeLeap||e.leapCheck>0||target.y<=e.group.position.y+3||Math.hypot(target.x-e.group.position.x,target.z-e.group.position.z)>=10)return;
 e.leapCheck=.5;const end=target.clone().add(new THREE.Vector3(0,-1.7,0)),landing=safePoint(end,obstaclesAt(platforms,end.y),e.group.position);if(!landing)return;end.x=landing.x;end.z=landing.z;
 const start=e.group.position.clone();for(let i=1;i<=24;i++){const t=i/24,point=start.clone().lerp(end,t);point.y+=Math.sin(t*Math.PI)*4;if(!clearRoute(point,point,obstaclesAt(platforms,point.y),BLADE_RADIUS))return;}
 e.bladeLeap={start,end,t:0};e.navTimer=0;
}

// Orbit from the current bearing so pursuit cannot cut across the player's head.
export function moveDroneBoss(position,player,dt,speedScale=1){
 if(dt<=0)return;
 const minimum=8,preferred=14,offset=position.clone().sub(player).setY(0);
 let angle=offset.lengthSq()>.01?Math.atan2(offset.x,offset.z):Math.atan2(-player.x,-player.z);
 function ringPoint(radius,bearing){return new THREE.Vector3(player.x+Math.sin(bearing)*radius,position.y,player.z+Math.cos(bearing)*radius);}
 function valid(p){return Math.abs(p.x)<=36&&Math.abs(p.z)<=36;}
 function boundedRing(radius,bearing){const wanted=ringPoint(radius,bearing);if(valid(wanted))return wanted;for(let i=1;i<=32;i++)for(const side of[1,-1]){const candidate=ringPoint(radius,bearing+side*i*Math.PI/32);if(valid(candidate))return candidate;}return wanted;}
 const goal=boundedRing(preferred,angle+.35);
 position.x=THREE.MathUtils.damp(position.x,goal.x,.9*speedScale,dt);position.z=THREE.MathUtils.damp(position.z,goal.z,.9*speedScale,dt);
 const current=position.clone().sub(player).setY(0);
 if(current.length()<minimum){if(current.lengthSq()>.0001)angle=Math.atan2(current.x,current.z);const safe=boundedRing(minimum,angle);position.x=safe.x;position.z=safe.z;}
 position.x=THREE.MathUtils.clamp(position.x,-36,36);position.z=THREE.MathUtils.clamp(position.z,-36,36);
}

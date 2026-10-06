import {createRoadRoute} from './road-route.js';
export function seededRandom(seed){let n=seed>>>0;return()=>((n=(Math.imul(n,1664525)+1013904223)>>>0)/4294967296);}
export function createCityLayout(seed){
 const random=seededRandom(seed),route=createRoadRoute(seed),items=[],pick=a=>a[Math.floor(random()*a.length)];
 function place(id,s,offset,size,solid=true,extra={}){if(id==='wreck-bus')size=10.5;if(id==='wreck-truck')size=7.5;const p=route.sample(s,offset),angle=Math.atan2(p.dx,p.dz)+(random()-.5)*.65;items.push({id,x:p.x,z:p.z,angle,size,solid,s,offset,...extra});}
 // Each segment has a closed row at its street edge; blocks face inward.
 for(const seg of route.segments)for(const side of[-1,1]){
  for(let local=0;local<=seg.distance;local+=1.15)place('ruin-wall',seg.s+local,side*8.1,4.2,true,{boundary:true,angle:0});
  for(let local=5;local<seg.distance;local+=11){const s=seg.s+local;place(pick(['ref-brownstone','ref-office','ref-tower','ref-roofless','ref-colonnade']),s,side*12.4,25,false,{dimensions:[11.6,18+random()*19,8],angle:Math.atan2(seg.dx,seg.dz)+side*Math.PI/2});}
 }
 // Join the offset edges at each bend, so no side exit opens between blocks.
 for(let i=1;i<route.segments.length;i++){const prev=route.segments[i-1],next=route.segments[i],p=next.a;for(const side of[-1,1]){const a={x:p.x-prev.dz*side*8.1,z:p.z+prev.dx*side*8.1},b={x:p.x-next.dz*side*8.1,z:p.z+next.dx*side*8.1},steps=Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/1.05);for(let k=0;k<=steps;k++){const t=k/Math.max(1,steps);items.push({id:'ruin-wall',x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t,angle:0,size:4.2,solid:true,boundary:true,s:next.s,offset:side*8.1});}}}
 place('wreck-bus',24,4.5,10.5,true,{angle:Math.atan2(route.sample(24).dx,route.sample(24).dz)});
 for(let s=15;s<route.length-18;s+=8+random()*5)for(const side of[-1,1]){
  if(random()<.8)place(pick(['car','car','pickup_1','wreck-bus','wreck-truck']),s,side*(4.2+random()*.4),pick([4.6,5,5.2]),true);
  if(random()<.5)place('road_barrier',s+4,side*(3.7+random()),2.1,true);
  for(let i=0;i<5;i++)place(pick(['bush_1','grass_green_1','grass_green_1','rubble_1','rubble_2']),s+i*1.7,side*(2.3+random()*5),.7+random()*1.8,false);
  if(random()<.4)place(pick(['tree_2_a']),s,side*6.7,4+random()*2,false);
  if(random()<.45)place('street-lamp',s,side*6.1,5.6,false,{angle:Math.atan2(route.sample(s).dx,route.sample(s).dz)+side*Math.PI/2});
 }
 for(let s=6;s<route.length;s+=4)place('pavement-break',s,(random()-.5)*8,1+random()*2,false);
 for(let s=45;s<route.length-20;s+=55){for(const side of[-1,1])place('traffic-light',s,side*6,5.6,false,{angle:Math.atan2(route.sample(s).dx,route.sample(s).dz)+side*Math.PI/2});}
 // Keep the start and objective inside the same enclosed street.
 return {seed,route,items};
}

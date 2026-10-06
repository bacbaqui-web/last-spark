// Arc-length coordinates keep encounters and return estimates consistent through bends.
export function createRoadRoute(seed=null){
 let n=(seed??7319)>>>0;const random=()=>((n=(Math.imul(n,1664525)+1013904223)>>>0)/4294967296);
 const raw=seed===null?[[0,180],[0,115],[48,75],[48,5],[-38,-48],[-38,-112],[0,-174]]:[[0,180],[0,120],[20+random()*38,65],[random()*50-25,5],[-20-random()*38,-55],[random()*40-20,-115],[0,-174]];
 const rawLength=raw.slice(1).reduce((sum,p,i)=>sum+Math.hypot(p[0]-raw[i][0],p[1]-raw[i][1]),0),scale=380/rawLength;
 const points=raw.map(([x,z])=>({x:x*scale,z:z*scale}));let length=0;
 const segments=points.slice(1).map((b,i)=>{const a=points[i],distance=Math.hypot(b.x-a.x,b.z-a.z),s=length;length+=distance;return {a,b,distance,s,dx:(b.x-a.x)/distance,dz:(b.z-a.z)/distance};});
 const sample=(s,offset=0)=>{s=Math.max(0,Math.min(length,s));const seg=segments.find(v=>s<=v.s+v.distance)||segments.at(-1),t=(s-seg.s)/seg.distance;return {x:seg.a.x+(seg.b.x-seg.a.x)*t-seg.dz*offset,z:seg.a.z+(seg.b.z-seg.a.z)*t+seg.dx*offset,dx:seg.dx,dz:seg.dz};};
 const progress=p=>{let best=Infinity,result=0;for(const seg of segments){const t=Math.max(0,Math.min(1,((p.x-seg.a.x)*seg.dx+(p.z-seg.a.z)*seg.dz)/seg.distance)),x=seg.a.x+seg.dx*t*seg.distance,z=seg.a.z+seg.dz*t*seg.distance,d=Math.hypot(p.x-x,p.z-z);if(d<best){best=d;result=seg.s+t*seg.distance;}}return result;};
 return {points,segments,length,width:seed===null?36:10,bounds:{x:100,z:210},sample,progress,start:sample(0),end:sample(length)};
}
export function updateAwareness(e,dt,player,visible,allies){
 const a=e.awareness;if(!a||a.state==='combat')return true;
 const distance=Math.hypot(e.group.position.x-player.x,e.group.position.z-player.z);
 if(visible&&distance<(a.signal?38:25)||a.timer>=a.delay){
  a.state='combat';a.timer=0;
  for(const other of allies){if(other===e||!other.awareness||other.awareness.state==='combat')continue;if(other.group.position.distanceTo(e.group.position)<28)other.awareness.signal=true;}
  return true;
 }
 a.state=a.signal?'checking':'idle';return false;
}

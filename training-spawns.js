// Pick actual free locations, rather than cycling through the four tower tops.
export function pickTrainingSpawn({boss=false,type='trooper',platforms=[],occupied=[],player={x:0,z:14},index=0,wallCapable=false,random=Math.random}){
 const flying=type==='drone'||type==='scoutDrone',y=flying?(boss?8:2.5):0;
 if(boss)return {x:0,y,z:0};
 const free=(p,spacing=3)=>occupied.every(o=>Math.abs(p.y-o.y)>2.4||Math.hypot(p.x-o.x,p.z-o.z)>spacing)&&Math.hypot(p.x-player.x,p.z-player.z)>9;
 if(type==='sniper'){
  const candidates=[];
  for(const p of platforms){if(p.base||p.walkable||p.h<2.5||p.w<3||p.d<3)continue;
   for(let i=0;i<4;i++){
    const roof={x:p.x+(random()-.5)*Math.max(0,p.w-2),y:p.h+.1,z:p.z+(random()-.5)*Math.max(0,p.d-2)};
    if(free(roof)&&!platforms.some(o=>o!==p&&o.h>p.h+.1&&Math.abs(roof.x-o.x)<o.w/2+1&&Math.abs(roof.z-o.z)<o.d/2+1))candidates.push(roof);
   }
   if(!wallCapable||p.h<3.5)continue;
   for(const [nx,nz]of [[1,0],[-1,0],[0,1],[0,-1]]){
    const wall={x:p.x+nx*(p.w/2+.08)+(nz?(random()-.5)*Math.max(0,p.w-2):0),y:2+random()*Math.max(0,p.h-3.2),z:p.z+nz*(p.d/2+.08)+(nx?(random()-.5)*Math.max(0,p.d-2):0),nx,nz};
    if((player.x-wall.x)*nx+(player.z-wall.z)*nz<0)continue;
    if(free(wall)&&!platforms.some(o=>o!==p&&o.h>wall.y-.8&&Math.abs(wall.x+nx*.8-o.x)<o.w/2+.7&&Math.abs(wall.z+nz*.8-o.z)<o.d/2+.7))candidates.push(wall);
   }
  }
  const walls=candidates.filter(p=>p.nx!==undefined),roofs=candidates.filter(p=>p.nx===undefined),pool=walls.length&&random()<.6?walls:roofs.length?roofs:walls;
  if(pool.length)return pool[Math.floor(random()*pool.length)];
 }
 // Distribute successive actors across all quadrants, with random positions
 // inside each one. Reserve the center for the boss before it is created.
 const sector=index%4;
 for(let attempt=0;attempt<500;attempt++){
  const angle=(sector+random())*Math.PI/2,radius=13+random()*25,p={x:Math.cos(angle)*radius,y,z:Math.sin(angle)*radius};
  if(Math.abs(p.x)>38||Math.abs(p.z)>38||!free(p))continue;
  if(platforms.some(o=>o.h>y&&Math.abs(p.x-o.x)<o.w/2+1.4&&Math.abs(p.z-o.z)<o.d/2+1.4))continue;
  return p;
 }
 // Deterministic free-cell fallback, still respecting the player and occupancy.
 for(let x=-38;x<=38;x+=3)for(let z=-38;z<=38;z+=3){const p={x,y,z};if(Math.hypot(x,z)>12&&free(p,2)&&!platforms.some(o=>o.h>y&&Math.abs(x-o.x)<o.w/2+1.4&&Math.abs(z-o.z)<o.d/2+1.4))return p;}
 throw new Error('훈련소에 겹치지 않는 소환 위치를 찾지 못했습니다.');
}

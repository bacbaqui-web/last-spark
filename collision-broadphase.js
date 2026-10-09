const indexes=new WeakMap(),CELL=8;
// Keep precise vehicle boxes, but only visit cells touched by this movement.
function indexFor(platforms){
 const revision=platforms.collisionRevision||0;let index=indexes.get(platforms);
 if(!index||index.length!==platforms.length||index.revision!==revision){
  const cells=new Map();for(const p of platforms){for(let x=Math.floor((p.x-p.w/2)/CELL);x<=Math.floor((p.x+p.w/2)/CELL);x++)for(let z=Math.floor((p.z-p.d/2)/CELL);z<=Math.floor((p.z+p.d/2)/CELL);z++){const key=x+','+z;if(!cells.has(key))cells.set(key,[]);cells.get(key).push(p);}}
  index={cells,length:platforms.length,revision};indexes.set(platforms,index);
 }
 return index;
}
export function nearbyColliders(platforms,start,end,padding=1){
 const index=indexFor(platforms);
 const result=new Set();for(let x=Math.floor((Math.min(start.x,end.x)-padding)/CELL);x<=Math.floor((Math.max(start.x,end.x)+padding)/CELL);x++)for(let z=Math.floor((Math.min(start.z,end.z)-padding)/CELL);z<=Math.floor((Math.max(start.z,end.z)+padding)/CELL);z++)for(const p of index.cells.get(x+','+z)||[])result.add(p);
 return [...result];
}
export function navigationColliders(platforms){
 const groups=new Map(),result=[];
 for(const p of platforms){if(p.base||p.walkable)continue;if(!p.vehicleGroup){result.push(p);continue;}let g=groups.get(p.vehicleGroup);if(!g){g={minX:Infinity,maxX:-Infinity,minZ:Infinity,maxZ:-Infinity,h:0};groups.set(p.vehicleGroup,g);}g.minX=Math.min(g.minX,p.x-p.w/2);g.maxX=Math.max(g.maxX,p.x+p.w/2);g.minZ=Math.min(g.minZ,p.z-p.d/2);g.maxZ=Math.max(g.maxZ,p.z+p.d/2);g.h=Math.max(g.h,p.h);}
 for(const g of groups.values())result.push({x:(g.minX+g.maxX)/2,z:(g.minZ+g.maxZ)/2,w:g.maxX-g.minX,d:g.maxZ-g.minZ,h:g.h});return result;
}

// Boolean body checks need no result array or duplicate set. Stop at the first
// exact hit, retaining the original height/base/radius comparisons.
export function enemyBlocked(platforms,x,y,z,radius=.5,topMargin=.1){
 const index=indexFor(platforms);
 for(let cx=Math.floor((x-radius)/CELL);cx<=Math.floor((x+radius)/CELL);cx++)for(let cz=Math.floor((z-radius)/CELL);cz<=Math.floor((z+radius)/CELL);cz++){
  const cell=index.cells.get(cx+','+cz);if(!cell)continue;
  for(const p of cell)if(y<p.h-topMargin&&y>=(p.base||0)&&Math.abs(x-p.x)<p.w/2+radius&&Math.abs(z-p.z)<p.d/2+radius)return true;
 }
 return false;
}

import assert from 'node:assert/strict';
import {pickTrainingSpawn} from '../training-spawns.js';
const platforms=[{x:0,z:-19,w:12,d:6,h:5},{x:13,z:5,w:10,d:8,h:3.5},...[-34,34].flatMap(x=>[-34,34].map(z=>({x,z,w:3,d:3,h:8})))];
let walls=0,roofs=0;const heights=new Set();
for(let seed=1;seed<=100;seed++){
 let state=seed;const random=()=>((state=Math.imul(state,1664525)+1013904223>>>0)/2**32),occupied=[],sectors=new Set();
 for(let index=0;index<40;index++){
  const type=index%7===4?'sniper':'trooper';const p=pickTrainingSpawn({type,index,platforms,occupied,wallCapable:true,random});
  assert(occupied.every(o=>Math.abs(p.y-o.y)>2.4||Math.hypot(p.x-o.x,p.z-o.z)>2),'spawn positions never overlap');
  assert(Math.hypot(p.x,p.z-14)>9,'keep a safe distance from the player');
  if(type==='sniper'){if(p.nx!==undefined){walls++;assert(p.y>=2&&p.y<8);heights.add(Math.floor(p.y));}else{roofs++;assert(platforms.some(o=>Math.abs(p.y-o.h-.1)<.01));}}
  else{assert(Math.hypot(p.x,p.z)>12,'reserve center for the boss');assert(!platforms.some(o=>Math.abs(p.x-o.x)<o.w/2+1.4&&Math.abs(p.z-o.z)<o.d/2+1.4));sectors.add((p.x>=0?1:0)+(p.z>=0?2:0));}
  occupied.push(p);
 }
 assert.equal(sectors.size,4,'normal enemies cover all four sides');
 for(const type of ['missile','blade','drone']){const p=pickTrainingSpawn({boss:true,type,random});assert.equal(p.x,0);assert.equal(p.z,0);assert.equal(p.y,type==='drone'?8:0);}
}
assert(walls>0&&roofs>0&&heights.size>=2,'snipers use both roofs and walls at varying heights');
console.log(`PASS 100 seeded 40-enemy waves: centered bosses, four-sided free spawns, spacing; sniper walls ${walls}, roofs ${roofs}, varied heights`);

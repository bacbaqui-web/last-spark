import {createBrickPath,bendBrickBlock} from './brick-route-path.js';
import {generateBrickBlock,validateBrickBlock,BRICK_STORAGE,rng} from './brick-street-layout.js';
import {buildBrickStreet} from './brick-street-scene.js';
function* brickRouteParts(seed,templates,root,platforms,mission=null){
 let blocks;try{blocks=JSON.parse(localStorage.getItem(BRICK_STORAGE)||'[]').map(validateBrickBlock);}catch{blocks=[];}if(mission?.destination==='brick'||!blocks.length)blocks=Array.from({length:6},(_,i)=>generateBrickBlock((seed+i*7919)>>>0));
 const count=mission?.blocks||10,random=rng(seed),path=createBrickPath(count,random);

 let bag=[];const sequence=[];for(let i=0;i<count;i++){if(!bag.length){bag=[...blocks];for(let k=bag.length-1;k>0;k--){const j=Math.floor(random()*(k+1));[bag[k],bag[j]]=[bag[j],bag[k]];}}const source=bag.pop(),b={...source,vehicles:source.vehicles.filter(v=>(i!==0||v.z<8)&&(i!==count-1||v.z>2)),rubble:source.rubble.filter(v=>i!==count-1||v.z>2)},z=count*18-18-i*36;const local=[],mesh=buildBrickStreet(b,templates,{offset:z,colliders:local});platforms.push(...bendBrickBlock(mesh,local,path.blocks[i]));root.add(mesh);sequence.push(b.seed);yield;}platforms.bounds={x:100,z:count*18+30};root.userData={seed,sequence,brickBlocks:true};
 return {...path.route,brickBlocks:true,blockCount:count,bounds:platforms.bounds};
}

export function populateBrickRoute(...args){const iterator=brickRouteParts(...args);let step;do{step=iterator.next();}while(!step.done);return step.value;}
export async function populateBrickRouteAsync(...args){const iterator=brickRouteParts(...args);let step;do{step=iterator.next();if(!step.done)await new Promise(resolve=>setTimeout(resolve,0));}while(!step.done);return step.value;}

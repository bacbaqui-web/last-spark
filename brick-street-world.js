import {generateBrickBlock,validateBrickBlock,BRICK_STORAGE,rng} from './brick-street-layout.js';
import {buildBrickStreet} from './brick-street-scene.js';
export function populateBrickRoute(seed,templates,root,platforms,mission=null){
 let blocks;try{blocks=JSON.parse(localStorage.getItem(BRICK_STORAGE)||'[]').map(validateBrickBlock);}catch{blocks=[];}if(mission?.destination==='brick'||!blocks.length)blocks=Array.from({length:6},(_,i)=>generateBrickBlock((seed+i*7919)>>>0));
 const count=mission?.blocks||10,random=rng(seed),length=count*36-16,startZ=count*18-8,points=[{x:0,z:startZ},{x:0,z:-startZ}],segments=[{a:points[0],b:points[1],distance:length,s:0,dx:0,dz:-1}],sample=(s,offset=0)=>({x:offset,z:startZ-Math.max(0,Math.min(length,s)),dx:0,dz:-1});
 let bag=[];const sequence=[];for(let i=0;i<count;i++){if(!bag.length){bag=[...blocks];for(let k=bag.length-1;k>0;k--){const j=Math.floor(random()*(k+1));[bag[k],bag[j]]=[bag[j],bag[k]];}}const source=bag.pop(),b={...source,vehicles:source.vehicles.filter(v=>(i!==0||v.z<8)&&(i!==count-1||v.z>2)),rubble:source.rubble.filter(v=>i!==count-1||v.z>2)},z=count*18-18-i*36;root.add(buildBrickStreet(b,templates,{offset:z,colliders:platforms}));sequence.push(b.seed);}platforms.bounds={x:100,z:count*18+30};root.userData={seed,sequence,brickBlocks:true};
 return {points,segments,length,brickBlocks:true,blockCount:count,width:10,bounds:platforms.bounds,sample,progress:p=>Math.max(0,Math.min(length,startZ-p.z)),start:sample(0),end:sample(length)};
}

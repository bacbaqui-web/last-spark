import {generateBrickBlock,validateBrickBlock,BRICK_STORAGE,rng} from './brick-street-layout.js';
import {buildBrickStreet} from './brick-street-scene.js';
export function populateBrickRoute(seed,templates,root,platforms){
 let blocks;try{blocks=JSON.parse(localStorage.getItem(BRICK_STORAGE)||'[]').map(validateBrickBlock);}catch{blocks=[];}if(!blocks.length)blocks=[generateBrickBlock(7319),generateBrickBlock(9328),generateBrickBlock(24681)];
 const random=rng(seed),length=360,startZ=180,points=[{x:0,z:180},{x:0,z:-180}],segments=[{a:points[0],b:points[1],distance:length,s:0,dx:0,dz:-1}],sample=(s,offset=0)=>({x:offset,z:startZ-Math.max(0,Math.min(length,s)),dx:0,dz:-1});
 let bag=[];const sequence=[];for(let i=0;i<10;i++){if(!bag.length){bag=[...blocks];for(let k=bag.length-1;k>0;k--){const j=Math.floor(random()*(k+1));[bag[k],bag[j]]=[bag[j],bag[k]];}}const b=bag.pop(),z=162-i*36;root.add(buildBrickStreet(b,templates,{offset:z,colliders:platforms}));sequence.push(b.seed);}platforms.bounds={x:100,z:210};root.userData={seed,sequence,brickBlocks:true};
 return {points,segments,length,width:10,bounds:platforms.bounds,sample,progress:p=>Math.max(0,Math.min(length,startZ-p.z)),start:sample(0),end:sample(length)};
}

import {VEHICLE_TYPES,VEHICLE_PAINTS} from './ruined-vehicles.js';
export const BRICK_STORAGE='last-spark-brick-blocks-v1';
export function rng(seed){let n=seed>>>0;return()=>((n=(Math.imul(n,1664525)+1013904223)>>>0)/4294967296);}
export function generateBrickBlock(seed,parent=null,version=4){
 const r=rng(seed),buildings=[];
 for(const side of[-1,1])for(let i=0;i<4;i++){const old=parent?.buildings.find(b=>b.side===side&&b.index===i),sampleFloors=3+Math.floor(r()*4),sampleColumns=3+Math.floor(r()*3),floors=old?old.floors:sampleFloors,columns=old?old.columns:sampleColumns,cells=[];const damageColumn=Math.floor(r()*columns),damaged=r()<.6;
 for(let f=0;f<floors;f++)for(let c=0;c<columns;c++)cells.push(f===0&&c===Math.floor(columns/2)?'door':damaged&&f>=floors-2&&Math.abs(c-damageColumn)<1?'collapsed':r()<.22?'boarded':r()<.42?'broken':'window');
 if(version>=4&&damaged){const low=Math.max(1,floors-2-Math.floor(r()*2)),span=1+Math.floor(r()*Math.min(3,columns));for(let f=low;f<floors;f++)for(let c=damageColumn;c<Math.min(columns,damageColumn+span);c++)cells[f*columns+c]='collapsed';if(r()<.5&&low>1)cells[(low-1)*columns+damageColumn]='collapsed';}
 if(version>=4&&r()<.45){const f=1+Math.floor(r()*(floors-2)),c=Math.floor(r()*columns);cells[f*columns+c]='collapsed';}
 const sampleTone=Math.floor(r()*4);buildings.push({side,index:i,z:-13.5+i*9,floors,columns,cells,tone:old?old.tone:sampleTone,damageColumn,damaged,ivy:r()});}
 const available=VEHICLE_TYPES.map(v=>v.id),vehicles=[];for(let i=0;i<6;i++){const z=-12+i*4.8+(r()-.5)*2,side=i%2?1:-1;const id=version===2?(i===2?'wreck-bus':i===4?'wreck-truck':'car'):available.splice(Math.floor(r()*available.length),1)[0],paint=version===2?null:Math.floor(r()*VEHICLE_PAINTS.length);vehicles.push({id,...(version>=3?{paint}:{}),x:side*(2.8+r()),z,angle:r()*Math.PI*2,roll:r()<.35?Math.PI/2:r()<.15?Math.PI:0});}
 // One sidewalk remains clear at each obstacle zone. Entrances are always open.
 const rubble=buildings.filter(b=>b.damaged&&b.index>0&&b.index<3).map(b=>({side:b.side,z:b.z,height:1.1+r()*.65,reach:3+r()*1.5}));
 return {version,seed:seed>>>0,parentSeed:parent?.seed??null,size:36,roadWidth:10,buildings,vehicles,rubble};
}
export function validateBrickBlock(b){if(!b||![2,3,4].includes(b.version)||!Number.isInteger(b.seed)||b.seed<0||b.seed>4294967295)throw Error('벽돌 거리 블록 파일이 아닙니다.');const parent=b.buildings?.length===8?{buildings:b.buildings.map(o=>{if(![-1,1].includes(o.side)||!Number.isInteger(o.index)||o.index<0||o.index>3||!Number.isInteger(o.floors)||o.floors<3||o.floors>6||!Number.isInteger(o.columns)||o.columns<3||o.columns>5||!Number.isInteger(o.tone)||o.tone<0||o.tone>3)throw Error('건물 규격 오류');return o;})}:null;const out=generateBrickBlock(b.seed,parent,b.version);out.parentSeed=Number.isInteger(b.parentSeed)?b.parentSeed:null;return out;}
// Conservative height-field check: walking and short jumps, with the game's 0.35m body radius.
export function hasBrickPassage(colliders,offset=0){const cols=33,rows=73,step=.5,heights=new Float32Array(cols*rows);for(let z=0;z<rows;z++)for(let x=0;x<cols;x++){const px=-8+x*step,pz=18-z*step+offset;let h=0;for(const p of colliders)if(Math.abs(px-p.x)<p.w/2+.35&&Math.abs(pz-p.z)<p.d/2+.35)h=Math.max(h,p.h);heights[z*cols+x]=h;}const start=16,seen=new Uint8Array(heights.length),queue=[start];seen[start]=1;for(let i=0;i<queue.length;i++){const index=queue[i],x=index%cols,z=Math.floor(index/cols);if(z===rows-1)return true;for(const [dx,dz]of[[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,nz=z+dz;if(nx<0||nx>=cols||nz<0||nz>=rows)continue;const next=nz*cols+nx;if(seen[next]||heights[next]>3||heights[next]-heights[index]>1.35)continue;seen[next]=1;queue.push(next);}}return false;}

export const brickBuildingWidth=b=>7.4+(b.index%3)*.2;

export function treeCanopyMask(seed){const r=rng(seed),cells=Array.from({length:16},(_,i)=>i);for(let i=15;i>0;i--){const j=Math.floor(r()*(i+1));[cells[i],cells[j]]=[cells[j],cells[i]];}return cells.slice(0,12).sort((a,b)=>a-b);}

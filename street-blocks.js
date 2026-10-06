// Versioned placement data shared by the editor and the game; meshes stay in the licensed game bundle.
export const BLOCK_STORAGE='last-spark-street-blocks-v1';
export const SURFACES={asphalt:{name:'낡은 아스팔트',color:0x414941},concrete:{name:'콘크리트',color:0x878b7b},earth:{name:'흙과 이끼',color:0x58634a}};
export function validateBlock(raw){
 if(!raw||raw.version!==1||!Array.isArray(raw.objects)||raw.objects.length>600)throw Error('지원하지 않는 블록 파일입니다.');
 const size=Number(raw.size),roadWidth=Number(raw.roadWidth);if(![32,40,48].includes(size)||!Number.isFinite(roadWidth)||roadWidth<6||roadWidth>14)throw Error('블록 크기 또는 도로 폭이 잘못되었습니다.');
 const objects=raw.objects.map((o,i)=>{if(typeof o.asset!=='string'||o.asset.length>100)throw Error('에셋 이름이 잘못되었습니다.');const p=['x','y','z','rotation','scale'].map(k=>Number(o[k]));if(p.some(n=>!Number.isFinite(n))||Math.abs(p[0])>size/2||Math.abs(p[2])>size/2||p[1]<0||p[1]>60||p[4]<.05||p[4]>10)throw Error('물체 위치 또는 크기가 범위를 벗어났습니다.');return {uid:typeof o.uid==='string'?o.uid:'object-'+i,asset:o.asset,x:p[0],y:p[1],z:p[2],rotation:p[3],scale:p[4],solid:Boolean(o.solid)};});
 return {version:1,id:String(raw.id||'imported').slice(0,100),name:String(raw.name||'새 거리').slice(0,60),size,roadWidth,surface:raw.surface in SURFACES?raw.surface:'asphalt',objects};
}
export function objectBounds(o,template){const c=Math.abs(Math.cos(o.rotation)),s=Math.abs(Math.sin(o.rotation));return {x:o.x,z:o.z,w:(c*template.size.x+s*template.size.z)*o.scale,d:(s*template.size.x+c*template.size.z)*o.scale,h:template.size.y*o.scale,y:o.y};}
export function corridorIssues(block,library){return block.objects.filter(o=>{const t=library.get(o.asset);if(!t||!o.solid)return false;const b=objectBounds(o,t);return o.y<2&&o.y+b.h>.2&&Math.abs(o.x)<b.w/2+1.5&&Math.abs(o.z)<block.size/2+b.d/2;});}
export function assembleStreetBlocks(seed,blocks,library){
 if(!blocks.length)throw Error('저장된 거리 블록이 없습니다.');const size=blocks[0].size,width=blocks[0].roadWidth;
 if(blocks.some(b=>b.size!==size||b.roadWidth!==width||corridorIssues(b,library).length))throw Error('블록 크기·도로 폭을 맞추고 중앙 3m 통행로를 비워주세요.');
 let n=seed>>>0;const random=()=>((n=(Math.imul(n,1664525)+1013904223)>>>0)/4294967296),count=Math.floor(380/size),length=count*size,startZ=length/2,points=[{x:0,z:startZ},{x:0,z:-startZ}],segments=[{a:points[0],b:points[1],distance:length,s:0,dx:0,dz:-1}];
 const sample=(s,offset=0)=>({x:offset,z:startZ-Math.max(0,Math.min(length,s)),dx:0,dz:-1});const route={points,segments,length,width,bounds:{x:100,z:210},sample,progress:p=>Math.max(0,Math.min(length,startZ-p.z)),start:sample(0),end:sample(length)};
 const items=[],floors=[];for(let i=0;i<count;i++){const b=blocks[Math.floor(random()*blocks.length)],z=startZ-size/2-i*size;floors.push({z,size,surface:b.surface});for(const o of b.objects){const t=library.get(o.asset);if(!t)continue;items.push({id:o.asset,x:o.x,y:o.y,z:o.z+z,angle:o.rotation,size:t.maxSize*o.scale,solid:o.solid,authored:true});}}
 // Closed edges preserve the street route even where a facade is damaged.
 for(let z=-startZ;z<=startZ;z+=1.15)for(const x of[-(width/2+2),width/2+2])items.push({id:'ruin-wall',x,z,angle:0,size:4.2,solid:true,boundary:true});
 return {seed,route,items,floors,authored:true};
}

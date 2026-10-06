// Each street block is sheared as a whole, so adjoining road edges meet exactly.
export function createBrickPath(count,random){
 const top=count*18,nodes=[{x:0,z:top}];let direction=random()<.5?-1:1;
 for(let i=0;i<count;i++){if(i%2===0&&i>0)direction*=-1;const shift=count===1?0:direction*(9+random()*5);nodes.push({x:nodes.at(-1).x+shift,z:top-(i+1)*36});}
 const blocks=nodes.slice(1).map((b,i)=>({top:nodes[i],bottom:b,slope:(nodes[i].x-b.x)/36}));
 const points=[{x:nodes[0].x+(nodes[1].x-nodes[0].x)*8/36,z:top-8},...nodes.slice(1,-1),{x:nodes.at(-2).x+(nodes.at(-1).x-nodes.at(-2).x)*28/36,z:-top+8}];let length=0;
 const segments=points.slice(1).map((b,i)=>{const a=points[i],distance=Math.hypot(b.x-a.x,b.z-a.z),s=length;length+=distance;return {a,b,distance,s,dx:(b.x-a.x)/distance,dz:(b.z-a.z)/distance};});
 const sample=(s,offset=0)=>{s=Math.max(0,Math.min(length,s));const seg=segments.find(v=>s<=v.s+v.distance)||segments.at(-1),t=(s-seg.s)/seg.distance;return {x:seg.a.x+(seg.b.x-seg.a.x)*t-seg.dz*offset,z:seg.a.z+(seg.b.z-seg.a.z)*t+seg.dx*offset,dx:seg.dx,dz:seg.dz};};
 const progress=p=>{let best=Infinity,result=0;for(const seg of segments){const t=Math.max(0,Math.min(seg.distance,(p.x-seg.a.x)*seg.dx+(p.z-seg.a.z)*seg.dz)),d=Math.hypot(p.x-seg.a.x-seg.dx*t,p.z-seg.a.z-seg.dz*t);if(d<best){best=d;result=seg.s+t;}}return result;};
 return {blocks,route:{points,segments,length,width:10,sample,progress,start:sample(0),end:sample(length)}};
}
export function bendBrickBlock(mesh,colliders,block){
 const offset=z=>block.top.x+block.slope*(z-block.top.z);
 for(const child of mesh.children){const p=child.geometry.attributes.position;for(let i=0;i<p.count;i++)p.setX(i,p.getX(i)+offset(p.getZ(i)));p.needsUpdate=true;child.geometry.computeVertexNormals();child.geometry.computeBoundingBox();child.geometry.computeBoundingSphere();}
 const transformed=[];
 for(const p of colliders){const count=p.walkable?Math.ceil(p.d/2):1;for(let i=0;i<count;i++){const d=p.d/count,z=p.z-p.d/2+d*(i+.5);transformed.push({...p,x:p.x+offset(z),z,d,w:p.w+Math.abs(block.slope)*d});}}
 return transformed;
}

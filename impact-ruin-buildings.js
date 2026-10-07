import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// Purpose-built shockwave ruins. Original grid footprints stay rectangular;
// surviving wall heights and fractured floors fall away towards the impact centre.
export function createImpactRuinBuilding(x,z,w,d,seed,materials){
 const root=new T.Group(),parts=[[],[],[]],r=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const limit=(xx,zz)=>Math.min(14,Math.max(.25,(Math.hypot(xx,zz)-18.5)*1.12));
 function block(xx,y,zz,ww,h,dd,type=0,tilt=0){const g=new T.BoxGeometry(ww,h,dd);g.rotateZ(tilt);g.translate(xx,y,zz);const p=g.attributes.position,uv=g.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,(p.getX(i)+p.getZ(i))/2,p.getY(i)/2);parts[type].push(g);}
 // Brick-sized irregular edges, with actual openings where windows used to be.
 for(const axis of ['x','z'])for(const side of [-1,1]){const length=axis==='x'?w:d,count=Math.ceil(length/.85),step=length/count;
  for(let col=0;col<count;col++){const along=-length/2+(col+.5)*step,xx=x+(axis==='x'?along:side*w/2),zz=z+(axis==='x'?side*d/2:along),top=limit(xx,zz)-r()*.65;
   for(let y=.4;y<top;y+=.7){const floor=y%3.1,window=Math.abs(((along+length/2)%2.8)-1.4)<.75&&floor>.8&&floor<2.4;if(window&&y>1)continue;block(xx,y,zz,axis==='x'?step+.035:.32,.68,axis==='x'?.32:step+.035);}
  }
 }
 for(let y=3.05;y<13;y+=3.1)for(let xx=-w/2+.7;xx<w/2;xx+=1.4)for(let zz=-d/2+.7;zz<d/2;zz+=1.4){const wx=x+xx,wz=z+zz;if(y>limit(wx,wz)-.5)continue;const tilt=Math.atan2(-wx,-wz);const slab=new T.BoxGeometry(1.42,.17,1.42);slab.rotateX((r()-.5)*.08);slab.rotateZ((r()-.5)*.08);slab.translate(wx,y,wz);parts[1].push(slab);if(r()<.08)block(wx,y-1,wz,.18,2,.18,2,(r()-.5)*.45);}
 // A few torn structural beams point inward rather than forming a circular facade.
 for(let i=0;i<4;i++){const xx=x+(r()-.5)*w,zz=z+(r()-.5)*d,y=limit(xx,zz)*.6;block(xx,y,zz,.2,Math.max(1,y),.2,2,Math.sign(xx)*.35);}
 parts.forEach((list,i)=>{if(!list.length)return;const geometry=mergeGeometries(list);list.forEach(g=>g.dispose());const mesh=new T.Mesh(geometry,materials[i]);mesh.castShadow=mesh.receiveShadow=true;mesh.userData.ownedGeometry=true;root.add(mesh);});
 root.userData={collisionKind:'building',impactRuin:true,footprint:{x,z,w,d}};return root;
}

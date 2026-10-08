import * as T from 'three';
import fleet from './vehicle-fleet-data.json' with {type:'json'};
import {atlasLayouts} from './vehicle-fleet-atlas.js';
import {createRecolorableCarMaterial} from './car-paint-material.js';
import {resolveVehiclePaint} from './vehicle-paints.js';
export {fleet};
const cache=new Map();
export function createFleetVehicle(d,options={}){
 const paint=resolveVehiclePaint(d,options);
 const instance=g=>{const mesh=new T.Mesh(g,createRecolorableCarMaterial(paint.color,`fleet/${d.id}.jpg`,atlasLayouts[d.id]));mesh.name=d.id;mesh.userData.paintId=paint.id;return mesh;};
 if(cache.has(d.id))return instance(cache.get(d.id));
 const pos=[],uv=[],col=[];const L=d.length,W=d.width,H=d.height,bottom=.22;
 const p=(t,y,x)=>[x,y,(.5-t)*L];
 const at=atlasLayouts[d.id]||{rows:[[0,.25],[.25,.5],[.5,.75]],bottom:.75,columns:[0,.25,.5,.75,1]};
 const rowUv=(u,v,row)=>[.004+u*.992,1-(at.rows[row][0]+v*(at.rows[row][1]-at.rows[row][0]))];
 const suv=(v,row)=>{let u=row===1&&at.reverseRight? .5+v[2]/L:.5-v[2]/L;const range=at.sideX?.[row];if(range)u=range[0]+u*(range[1]-range[0]);const vv=d.kind==='jeep'?1-v[1]/1.22:1-v[1]/H;return rowUv(u,Math.max(0,vv),row);};
 // Cab-over fronts use the front elevation; the roof skips its atlas windshield.
 const tuv=v=>{const t=.5-v[2]/L,u=at.roofStart===undefined?t:at.roofStart+(t-at.frontEnd)/(1-at.frontEnd)*(1-at.roofStart);return rowUv(u,v[0]/W+.5,2);};
 const tileUv=(u,v,i)=>[at.columns[i]+.004+u*(at.columns[i+1]-at.columns[i]-.008),1-(at.bottom+.004+v*((at.end||.996)-at.bottom-.008))];
 const windowBand=at.frontWindow;
 const frontY=windowBand?[[0,1],[windowBand.lowerBlend,1-windowBand.lowerBlend/H],[windowBand.bottom,windowBand.uvBottom],[windowBand.top,windowBand.uvTop],[H,0]]:null;
 const enduv=(v,rear)=>{
  let y=1-v[1]/H;
  if(!rear&&frontY)for(let i=1;i<frontY.length;i++)if(v[1]<=frontY[i][0]){
   const [a,b]=[frontY[i-1],frontY[i]];y=T.MathUtils.lerp(a[1],b[1],(v[1]-a[0])/(b[0]-a[0]));break;
  }
  return tileUv(.5+v[0]/W,y,rear?1:0);
 };
 function tri(a,b,c,fn,color=1){for(const v of [a,b,c]){pos.push(...v);uv.push(...fn(v));col.push(color,color,color);}}
 function quad(a,b,c,e,fn,color=1){tri(a,b,c,fn,color);tri(a,c,e,fn,color);}
 const profile=d.profile;
 function height(t){for(let i=1;i<profile.length;i++)if(t<=profile[i][0]){const[a,b]=[profile[i-1],profile[i]];return a[1]+(b[1]-a[1])*(t-a[0])/(b[0]-a[0]);}return profile.at(-1)[1];}
 function halfwidth(t,y){const tapered=(t<.07||t>.94)? .94:1;const roof=y>H*.74?.83:1;return W/2*tapered*roof;}
 // Wheel cutouts are part of the body boundary, not floating decals.
 const samples=new Set(profile.map(a=>a[0]));for(const wt of d.wheels){const r=d.radius*1.06;for(let j=0;j<=16;j++)samples.add(wt-r/L+2*r/L*j/16);}const ts=[...samples].filter(t=>t>=0&&t<=1).sort((a,b)=>a-b);
 function low(t){let y=bottom;for(const wt of d.wheels){const dx=(t-wt)*L,r=d.radius*1.06;if(Math.abs(dx)<=r)y=Math.max(y,d.radius+Math.sqrt(Math.max(0,r*r-dx*dx)));}return y;}
 for(const sign of [-1,1])for(let i=1;i<ts.length;i++){
  const a=ts[i-1],b=ts[i],ha=height(a),hb=height(b),la=low(a),lb=low(b);const ya=Math.min(ha-.07,Math.max(la,H*.60)),yb=Math.min(hb-.07,Math.max(lb,H*.60));
  const row=sign===-1?0:1,fn=v=>suv(v,row);
  const A=p(a,la,sign*W/2*.97),B=p(b,lb,sign*W/2*.97),C=p(b,yb,sign*halfwidth(b,yb)),D=p(a,ya,sign*halfwidth(a,ya));quad(A,B,C,D,fn);
  quad(D,C,p(b,hb-.045,sign*(halfwidth(b,hb)-.035)),p(a,ha-.045,sign*(halfwidth(a,ha)-.035)),fn);
  quad(p(a,ha-.045,sign*(halfwidth(a,ha)-.035)),p(b,hb-.045,sign*(halfwidth(b,hb)-.035)),p(b,hb,sign*(halfwidth(b,hb)-.08)),p(a,ha,sign*(halfwidth(a,ha)-.08)),fn);
 }
 for(let i=1;i<profile.length;i++){
  const[a,b]=[profile[i-1],profile[i]];
  if((d.kind==='pickup'&&a[0]>=.64)||(d.kind==='jeep'&&a[0]>=.40))continue;
  const front=a[0]<(at.frontEnd??0),projection=front?v=>enduv(v,false):tuv;
  const A=p(a[0],a[1],-halfwidth(a[0],a[1])+.08),B=p(b[0],b[1],-halfwidth(b[0],b[1])+.08),C=p(b[0],b[1],halfwidth(b[0],b[1])-.08),D=p(a[0],a[1],halfwidth(a[0],a[1])-.08);
  if(front&&frontY){
   // Add UV seams at each height anchor without changing the original surface.
   const headerY=windowBand.top+.06;
   const cuts=[0,...[...frontY.map(([y])=>y),headerY].map(y=>(y-a[1])/(b[1]-a[1])).filter(t=>t>0&&t<1),1].sort((x,y)=>x-y);
   const lerp=(start,end,t)=>start.map((value,k)=>T.MathUtils.lerp(value,end[k],t));
   // Use actual roof paint above the frame instead of stretching its thin atlas border.
   const headerUv=v=>rowUv(at.roofStart+at.frontEnd-(.5-v[2]/L),v[0]/W+.5,2);
   for(let j=1;j<cuts.length;j++){
    const uv=T.MathUtils.lerp(a[1],b[1],(cuts[j-1]+cuts[j])/2)>headerY?headerUv:projection;
    quad(lerp(A,B,cuts[j-1]),lerp(A,B,cuts[j]),lerp(D,C,cuts[j]),lerp(D,C,cuts[j-1]),uv);
   }
  }else quad(A,B,C,D,projection);
 }
 for(const rear of [false,true]){const t=rear?1:0,h=height(t);quad(p(t,bottom,-W/2*.97),p(t,bottom,W/2*.97),p(t,h,halfwidth(t,h)-.08),p(t,h,-halfwidth(t,h)+.08),v=>enduv(v,rear));}
 // A closed charcoal core hides wheel wells and any interior seams.
 const dark=()=>[.99,.01];
 function box(t0,t1,y0,y1,x0,x1,fn=dark,color=.035){const a=p(t0,y0,x0),b=p(t1,y0,x0),c=p(t1,y1,x0),e=p(t0,y1,x0),f=p(t0,y0,x1),g=p(t1,y0,x1),h=p(t1,y1,x1),k=p(t0,y1,x1);for(const q of [[a,b,c,e],[f,k,h,g],[e,c,h,k],[a,f,g,b],[a,e,k,f],[b,g,h,c]])quad(...q,fn,color);}
 box(.025,.975,bottom,.70,-W*.41,W*.41);
 if(d.kind==='pickup'||d.kind==='jeep'){const start=d.kind==='pickup'?.64:.4,bed=d.kind==='pickup'?.78:.58;box(start,.98,.4,bed,-W*.43,W*.43,tuv,1);for(const s of [-1,1])box(start,.98,bed,height(.9)-.02,s<0?-W*.43:W*.38,s<0?-W*.38:W*.43,v=>suv(v,s<0?0:1),1);box(.965,.99,bed,height(.98)-.02,-W*.43,W*.43,v=>enduv(v,true),1);}
 if(d.kind==='jeep'){
  // Tilt only the windshield around its cowl hinge; keep the glass UVs rigid.
  const first=pos.length,hingeT=.405,hingeY=.94,hingeZ=(.5-hingeT)*L;
  box(hingeT-.01,hingeT+.01,hingeY,1.72,-W*.44,W*.44,v=>tileUv(.5+v[0]/W,(1.72-v[1])/.78*.30,0),1);
  const rake=T.MathUtils.degToRad(d.windshieldRake||0),cos=Math.cos(rake),sin=Math.sin(rake);
  for(let i=first;i<pos.length;i+=3){
   const y=pos[i+1]-hingeY,z=pos[i+2]-hingeZ;
   pos[i+1]=hingeY+y*cos+z*sin;
   pos[i+2]=hingeZ-y*sin+z*cos;
  }
  for(const x of [-W*.23,W*.23]){box(.48,.67,.56,.75,x-.22,x+.22);box(.65,.70,.72,1.12,x-.22,x+.22);}
 }
 function wheel(t,sign){const r=d.radius,c=[sign*(W/2-.11),r,(.5-t)*L],thick=.20,n=20;for(let i=0;i<n;i++){const a=2*Math.PI*i/n,b=2*Math.PI*(i+1)/n;const v=(ang,side)=>[c[0]+side*thick/2,c[1]+Math.cos(ang)*r,c[2]+Math.sin(ang)*r];const center=[c[0]+sign*thick/2,c[1],c[2]];tri(center,v(a,sign),v(b,sign),v=>tileUv(.5+(v[2]-c[2])/r*.49,.5-(v[1]-c[1])/r*.49,2));quad(v(a,-1),v(b,-1),v(b,1),v(a,1),v=>tileUv(i/n,(v[0]-c[0]+thick/2)/thick,3));tri([c[0]-sign*thick/2,c[1],c[2]],v(b,-sign),v(a,-sign),dark,.04);}}
 for(const t of d.wheels)for(const s of [-1,1])wheel(t,s);
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setAttribute('color',new T.Float32BufferAttribute(col,3));g.computeVertexNormals();g.computeBoundingBox();cache.set(d.id,g);
 return instance(g);
}

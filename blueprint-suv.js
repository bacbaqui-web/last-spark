import * as T from 'three';
import {mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';
import {createRecolorableCarMaterial} from './car-paint-material.js';
export function createBlueprintSUV({color=0xb8b6a0,rust=.35}={}){
 const positions=[],uvs=[],colors=[];
 const tileUV=(col,row,u,v)=>{const edges=[0,.268,.642,1];return [(col+T.MathUtils.clamp(u,.015,.985))/2,1-edges[row+1]+T.MathUtils.clamp(v,.015,.985)*(edges[row+1]-edges[row])];};
 function face(points,col,row,coords,shade=1){for(let i=1;i<points.length-1;i++)for(const j of [0,i,i+1]){positions.push(...points[j]);colors.push(shade,shade,shade);uvs.push(...tileUV(col,row,...coords[j]));}}
 // Sample the curved side silhouette instead of connecting six large flat panels.
 const sample=knots=>new T.CatmullRomCurve3(knots.map(([z,w,y])=>new T.Vector3(z,w,y)),false,'centripetal').getPoints(48).map(p=>[p.x,p.y,p.z]);
 const stations=sample([[-2.3,.78,.92],[-2.20,.87,1.00],[-1.98,.92,1.10],[-1.5,.94,1.14],[.65,.94,1.12],[1.10,.93,1.10],[1.8,.91,1.04],[2.18,.85,.94],[2.3,.78,.88]]);
 const section=z=>{const i=Math.max(0,stations.findIndex((p,k)=>k<stations.length-1&&z<=stations[k+1][0])),a=stations[i],b=stations[i+1],t=T.MathUtils.clamp((z-a[0])/(b[0]-a[0]),0,1);return [T.MathUtils.lerp(a[1],b[1],t),T.MathUtils.lerp(a[2],b[2],t)];};
 const topStops=[[-2.3,.98],[-2.02,.95],[-1.55,.85],[.55,.41],[1.05,.235],[2.3,.06]];
 const topU=z=>{const i=Math.max(0,topStops.findIndex((p,k)=>k<topStops.length-1&&z<=topStops[k+1][0])),a=topStops[i],b=topStops[i+1];return T.MathUtils.lerp(a[1],b[1],T.MathUtils.clamp((z-a[0])/(b[0]-a[0]),0,1));};
 const sideUV=([x,y,z])=>[(2.3-z)/4.6,.22+(y-.4)*.57/1.44],topUV=([x,y,z])=>[topU(z),T.MathUtils.lerp(.14,.80,(x+.93)/1.86)],endUV=([x,y,z])=>[(x+1.02)/2.04,.13+(y-.4)/.54*.48];
 // One continuous fender skin: true wheel openings, no floating decorative boxes.
 const outline=[...stations.map(([z,w,y])=>new T.Vector2(z,y)),new T.Vector2(2.3,.40)];
 for(const center of [1.4,-1.4]){outline.push(new T.Vector2(center+.51,.40));for(let i=0;i<=16;i++){const a=i/16*Math.PI;outline.push(new T.Vector2(center+Math.cos(a)*.51,.40+Math.sin(a)*.51));}outline.push(new T.Vector2(center-.51,.40));}outline.push(new T.Vector2(-2.3,.40));
 const triangles=T.ShapeUtils.triangulateShape(outline,[]);
 for(const side of [-1,1]){const points=outline.map(p=>[side*section(p.x)[0],p.y,p.x]);for(const triangle of triangles){const pts=triangle.map(i=>points[i]);face(pts,0,0,pts.map(sideUV));}}
 // Transverse curved strips make the hood and roof domed, with rounded shoulders.
 function capStrip(a,b,col,row,roof=false){
  const point=(ring,t)=>{const [z,w,y]=ring,q=t*2-1;return [q*w,y+(roof?.055:.035)*(1-q*q),z];};
  const uv=p=>{const base=topUV(p),blend=T.MathUtils.smoothstep(p[1],1.60,1.80);return [base[0],T.MathUtils.lerp(base[1],T.MathUtils.lerp(.32,.64,(p[0]+.76)/1.52),blend)];};
  for(let k=0;k<12;k++){const pts=[point(a,k/12),point(a,(k+1)/12),point(b,(k+1)/12),point(b,k/12)];face(pts,col,row,pts.map(uv));}
 }
 for(let i=0;i<stations.length-1;i++)capStrip(stations[i],stations[i+1],1,0);
 const cabin=sample([[-2.02,section(-2.02)[0],section(-2.02)[1]],[-1.82,.83,1.55],[-1.57,.76,1.78],[-1.25,.75,1.84],[-.6,.75,1.86],[.1,.75,1.85],[.40,.76,1.80],[.62,.80,1.61],[.85,.87,1.32],[1.05,section(1.05)[0],section(1.05)[1]]]);
 for(let i=0;i<cabin.length-1;i++){
  const a=cabin[i],b=cabin[i+1];
  for(const side of [-1,1]){
   const pts=[[side*section(a[0])[0],section(a[0])[1],a[0]],[side*a[1],a[2],a[0]],[side*b[1],b[2],b[0]],[side*section(b[0])[0],section(b[0])[1],b[0]]];
   // Keep the A pillar within the painted silhouette of the side atlas.
   face(pts,0,0,pts.map(p=>{const uv=sideUV(p);uv[0]+=.025*T.MathUtils.smoothstep(p[1],1.4,1.8)*T.MathUtils.smoothstep(p[2],-.4,.4);return uv;}));
  }
  capStrip(a,b,1,0,a[0]>-1.57&&b[0]<.4);
 }
 for(const [z,w,y]of [stations[0],stations.at(-1)]){const points=[[-w,.40,z],[w,.40,z],[w,y,z],[-w,y,z]];face(points,z>0?0:1,1,points.map(endUV));}
 // Solid dark inner body blocks sightlines through wheel wells and panel seams.
 const darkFace=points=>face(points,1,2,points.map(()=>[.1,.15]),.08);
 const innerRings=stations.map(([z,w,y])=>{const depth=z-Math.sign(z)*.035;return [[-.68,.30,depth],[.68,.30,depth],[.68,y-.035,depth],[-.68,y-.035,depth]];});
 for(let i=0;i<innerRings.length-1;i++)for(let k=0;k<4;k++)darkFace([innerRings[i][k],innerRings[i][(k+1)%4],innerRings[i+1][(k+1)%4],innerRings[i+1][k]]);
 darkFace(innerRings[0]);darkFace(innerRings.at(-1));
 // Dark curved wheel-well lining joins the outer fender to the inner body.
 for(const side of [-1,1])for(const center of [-1.4,1.4])for(let i=0;i<16;i++){
  const a=i/16*Math.PI,b=(i+1)/16*Math.PI,z1=center+Math.cos(a)*.51,z2=center+Math.cos(b)*.51,y1=.4+Math.sin(a)*.51,y2=.4+Math.sin(b)*.51;
  const points=[[side*section(z1)[0],y1,z1],[side*section(z2)[0],y2,z2],[side*.68,y2,z2],[side*.68,y1,z1]];
  face(points,1,2,points.map(()=>[.1,.15]),.08);
 }
 const bottom=[[-.82,.4,-2.3],[.82,.4,-2.3],[.82,.4,2.3],[-.82,.4,2.3]];face(bottom,1,2,bottom.map(()=>[.2,.2]));
 // Wheel discs meet the tire sidewall directly; wheels tuck into the wheel wells.
 for(const side of [-1,1])for(const z of [-1.4,1.4]){
  const rings=[[-.13,.34],[-.10,.45],[.10,.45],[.13,.34]],N=24,point=(k,i)=>{const [off,r]=rings[k],a=i/N*Math.PI*2;return [side*(.74+off),.46+Math.sin(a)*r,z+Math.cos(a)*r];};
  for(let k=0;k<3;k++)for(let i=0;i<N;i++){const points=[point(k,i),point(k,i+1),point(k+1,i+1),point(k+1,i)];face(points,1,2,[[i/N,k/3],[(i+1)/N,k/3],[(i+1)/N,(k+1)/3],[i/N,(k+1)/3]]);}
  for(const k of [0,3])for(let i=0;i<N;i++){const points=[[side*(.74+rings[k][0]),.46,z],point(k,i),point(k,i+1)];face(points,0,2,points.map(p=>[.5+(p[2]-z)/1.1,.5+(p[1]-.46)/1.1]));}
 }
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));const smooth=mergeVertices(geometry,1e-5);smooth.computeVertexNormals();smooth.computeBoundingBox();
 const material=createRecolorableCarMaterial(color,rust);
 const car=new T.Mesh(smooth,material);car.name='blueprint-suv';car.userData.setPaint=color=>material.userData.paint.value.set(color);car.userData.setRust=amount=>material.userData.rust.value=T.MathUtils.clamp(amount,0,1);car.castShadow=car.receiveShadow=true;return car;
}

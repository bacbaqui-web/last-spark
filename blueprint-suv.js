import * as T from 'three';
import {createRecolorableCarMaterial} from './car-paint-material.js';
// The mesh is assembled first from planar panels. Each panel owns one UV island.
export function createBlueprintSUV({color=0xb8b6a0,rust=.65}={}){
 const positions=[],uvs=[],colors=[];
 const tileUV=(tile,u,v)=>[((tile%4)*256+8+T.MathUtils.clamp(u,0,1)*240)/1024,1-(Math.floor(tile/4)*256+8+(1-T.MathUtils.clamp(v,0,1))*240)/1024];
 const face=(pts,tile,coords,shade=1)=>{for(let i=1;i<pts.length-1;i++)for(const j of [0,i,i+1]){positions.push(...pts[j]);colors.push(shade,shade,shade);uvs.push(...tileUV(tile,...coords[j]));}};
 // Split each side at the center seam so the front/rear UV islands do not stretch across it.
 for(const side of [-1,1])for(const front of [true,false]){
  const start=front?0:-2.3,end=front?2.3:0,center=front?1.4:-1.4;
  const outline=[new T.Vector2(start,1.13),new T.Vector2(end,1.13),new T.Vector2(end,.4),new T.Vector2(center+.51,.4)];
  for(let i=0;i<=16;i++){const a=i/16*Math.PI;outline.push(new T.Vector2(center+Math.cos(a)*.51,.4+Math.sin(a)*.51));}outline.push(new T.Vector2(center-.51,.4),new T.Vector2(start,.4));
  const uv=p=>{const z=p[2],u=front?(z>=1.4?(2.3-z)/.9*.22:.22+(1.4-z)/1.4*.78):(z>=-1.4?-z/1.4*.76:.76+(-z-1.4)/.9*.24);return [u,(p[1]-.4)/.73];};
  const pts=outline.map(p=>[side*.94,p.y,p.x]);for(const tri of T.ShapeUtils.triangulateShape(outline,[])){const p=tri.map(i=>pts[i]);face(p,front?0:1,p.map(uv));}
 }
 const cabin=[[-2.02,.94,1.13],[-1.55,.78,1.84],[.55,.78,1.84],[1.05,.94,1.13]];
 for(const side of [-1,1]){const pts=cabin.map(([z,w,y])=>[side*w,y,z]);face(pts,side<0?2:3,[[1,0],[.85,1],[.15,1],[0,0]]);}
 const cap=(a,b,tile)=>{const [z,w,y]=a,[z2,w2,y2]=b;face([[-w,y,z],[w,y,z],[w2,y2,z2],[-w2,y2,z2]],tile,[[0,1],[1,1],[1,0],[0,0]]);};
 cap(cabin[0],cabin[1],7);cap(cabin[1],cabin[2],5);cap(cabin[2],cabin[3],6);
 cap([-2.3,.94,1.13],cabin[0],14);cap(cabin[3],[2.3,.94,1.13],4);
 for(const z of [-2.3,2.3])face([[-.94,.4,z],[.94,.4,z],[.94,1.13,z],[-.94,1.13,z]],z>0?8:9,[[0,0],[1,0],[1,1],[0,1]]);
 const black=pts=>face(pts,13,pts.map(()=>[.5,.5]));
 // Closed inner box and wheel-well liners prevent holes behind the tire openings.
 const a=[[-.67,.3,-2.27],[.67,.3,-2.27],[.67,1.1,-2.27],[-.67,1.1,-2.27]],b=a.map(([x,y])=>[x,y,2.27]);
 black(a);black(b);for(let k=0;k<4;k++)black([a[k],a[(k+1)%4],b[(k+1)%4],b[k]]);
 for(const side of [-1,1])for(const center of [-1.4,1.4])for(let i=0;i<16;i++){const a=i/16*Math.PI,b=(i+1)/16*Math.PI,z1=center+Math.cos(a)*.51,z2=center+Math.cos(b)*.51,y1=.4+Math.sin(a)*.51,y2=.4+Math.sin(b)*.51;black([[side*.94,y1,z1],[side*.94,y2,z2],[side*.67,y2,z2],[side*.67,y1,z1]]);}
 for(const side of [-1,1])for(const z of [-1.4,1.4]){const rings=[[-.13,.34],[-.1,.45],[.1,.45],[.13,.34]],N=24,point=(k,i)=>{const [off,r]=rings[k],a=i/N*Math.PI*2;return [side*(.74+off),.46+Math.sin(a)*r,z+Math.cos(a)*r];};for(let k=0;k<3;k++)for(let i=0;i<N;i++)face([point(k,i),point(k,i+1),point(k+1,i+1),point(k+1,i)],11,[[i/N,k/3],[(i+1)/N,k/3],[(i+1)/N,(k+1)/3],[i/N,(k+1)/3]]);for(const k of [0,3])for(let i=0;i<N;i++){const pts=[[side*(.74+rings[k][0]),.46,z],point(k,i),point(k,i+1)];face(pts,12,pts.map(p=>[.5+(p[2]-z)/1.1,.5+(p[1]-.46)/1.1]));}}
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));geometry.computeVertexNormals();geometry.computeBoundingBox();
 const material=createRecolorableCarMaterial(color,rust),car=new T.Mesh(geometry,material);car.name='planar-unwrapped-suv';car.userData.setPaint=color=>material.userData.paint.value.set(color);car.userData.setRust=amount=>material.userData.rust.value=T.MathUtils.clamp(amount,0,1);car.castShadow=car.receiveShadow=true;return car;
}

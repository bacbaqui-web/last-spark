import * as T from 'three';
import {createRecolorableCarMaterial} from './car-paint-material.js';
// The mesh is assembled first from planar panels. Each panel owns one UV island.
export function createBlueprintSUV({color=0xb8b6a0}={}){
 const positions=[],uvs=[],colors=[];
 // Side silhouette: hood rises toward the windshield, rear deck falls toward the bumper.
 const bodyHeight=z=>z>1.05?1.13-(z-1.05)/1.25*.17:z< -2.02?1.13-(-z-2.02)/.28*.075:1.13;
 const tileUV=(tile,u,v)=>[((tile%4)*256+8+T.MathUtils.clamp(u,0,1)*240)/1024,1-(Math.floor(tile/4)*256+8+(1-T.MathUtils.clamp(v,0,1))*240)/1024];
 const face=(pts,tile,coords,shade=1)=>{for(let i=1;i<pts.length-1;i++)for(const j of [0,i,i+1]){positions.push(...pts[j]);colors.push(shade,shade,shade);uvs.push(...tileUV(tile,...coords[j]));}};
 // Split each side at the center seam so the front/rear UV islands do not stretch across it.
 for(const side of [-1,1])for(const front of [true,false]){
  const start=front?0:-2.18,end=front?2.18:0,center=front?1.4:-1.4;
  const outline=[new T.Vector2(start,bodyHeight(start)),...(start< -2.02&&end> -2.02?[new T.Vector2(-2.02,1.13)]:[]),...(start<1.05&&end>1.05?[new T.Vector2(1.05,1.13)]:[]),new T.Vector2(end,bodyHeight(end)),new T.Vector2(end,.4),new T.Vector2(center+.51,.4)];
  for(let i=0;i<=16;i++){const a=i/16*Math.PI;outline.push(new T.Vector2(center+Math.cos(a)*.51,.4+Math.sin(a)*.51));}outline.push(new T.Vector2(center-.51,.4),new T.Vector2(start,.4));
  const uv=p=>{const z=p[2],u=front?(z>=1.4?(2.3-z)/.9*.22:.22+(1.4-z)/1.4*.78):(z>=-1.4?-z/1.4*.76:.76+(-z-1.4)/.9*.24);return [u,(p[1]-.4)/.73];};
  const pts=outline.map(p=>[side*.94,p.y,p.x]);for(const tri of T.ShapeUtils.triangulateShape(outline,[])){const p=tri.map(i=>pts[i]);face(p,front?0:1,p.map(uv));}
 }
 // Narrow diagonal corner faces soften the outline without curved surfaces.
 for(const side of [-1,1])for(const zSign of [-1,1]){const z=zSign*2.18,z2=zSign*2.3,pts=[[side*.94,.4,z],[side*.82,.4,z2],[side*.82,bodyHeight(z2),z2],[side*.94,bodyHeight(z),z]];const front=zSign>0;face(pts,front?0:1,pts.map(p=>[front?(2.3-p[2])/.9*.22:.76+(-p[2]-1.4)/.9*.24,(p[1]-.4)/.73]));}
 const cabin=[[-2.02,.94,1.13],[-1.60,.78,1.79],[-1.48,.78,1.84],[.44,.78,1.84],[.58,.78,1.79],[1.05,.94,1.13]];
 for(const side of [-1,1]){const pts=cabin.map(([z,w,y])=>[side*w,y,z]);face(pts,side<0?2:3,pts.map(p=>[(1.05-p[2])/3.07,(p[1]-1.13)/.71]));}
 const cap=(a,b,tile)=>{const point=(r,t)=>{const [z,w,y]=r;return [(t*2-1)*w,y+(t===0||t===1?0:.04),z];};const v=r=>tile===5?(r[0]+1.60)/2.18:tile===4?(r[0]-1.05)/1.25:tile===14?(r[0]+2.3)/.28:undefined;const va=v(a)??1,vb=v(b)??0;const stops=[0,.055,.945,1];for(let k=0;k<3;k++)face([point(a,stops[k]),point(a,stops[k+1]),point(b,stops[k+1]),point(b,stops[k])],tile,[[stops[k],va],[stops[k+1],va],[stops[k+1],vb],[stops[k],vb]]);};
 cap(cabin[0],cabin[1],7);cap(cabin[1],cabin[2],5);cap(cabin[2],cabin[3],5);cap(cabin[3],cabin[4],5);cap(cabin[4],cabin[5],6);
 cap([-2.3,.82,bodyHeight(-2.3)],[-2.18,.94,bodyHeight(-2.18)],14);cap([-2.18,.94,bodyHeight(-2.18)],cabin[0],14);cap(cabin[5],[2.18,.94,bodyHeight(2.18)],4);cap([2.18,.94,bodyHeight(2.18)],[2.3,.82,bodyHeight(2.3)],4);
 for(const z of [-2.3,2.3]){const h=bodyHeight(z),pts=[[-.82,.4,z],[.82,.4,z],[.82,h,z],[.7298,h+.04,z],[-.7298,h+.04,z],[-.82,h,z]];face(pts,z>0?8:9,pts.map(p=>[(p[0]+.94)/1.88,(p[1]-.4)/.77]));}
 const black=pts=>face(pts,13,pts.map(()=>[.5,.5]));
 // Closed inner box and wheel-well liners prevent holes behind the tire openings.
 const a=[[-.67,.3,-2.27],[.67,.3,-2.27],[.67,bodyHeight(-2.27)-.035,-2.27],[-.67,bodyHeight(-2.27)-.035,-2.27]],b=a.map(([x,y])=>[x,y>.5?bodyHeight(2.27)-.035:y,2.27]);
 black(a);black(b);for(let k=0;k<4;k++)black([a[k],a[(k+1)%4],b[(k+1)%4],b[k]]);
 for(const side of [-1,1])for(const center of [-1.4,1.4])for(let i=0;i<16;i++){const a=i/16*Math.PI,b=(i+1)/16*Math.PI,z1=center+Math.cos(a)*.51,z2=center+Math.cos(b)*.51,y1=.4+Math.sin(a)*.51,y2=.4+Math.sin(b)*.51;black([[side*.94,y1,z1],[side*.94,y2,z2],[side*.67,y2,z2],[side*.67,y1,z1]]);}
 for(const side of [-1,1])for(const z of [-1.4,1.4]){const rings=[[-.13,.34],[-.1,.45],[.1,.45],[.13,.34]],N=24,point=(k,i)=>{const [off,r]=rings[k],a=i/N*Math.PI*2;return [side*(.74+off),.46+Math.sin(a)*r,z+Math.cos(a)*r];};for(let k=0;k<3;k++)for(let i=0;i<N;i++)face([point(k,i),point(k,i+1),point(k+1,i+1),point(k+1,i)],11,[[i/N,k/3],[(i+1)/N,k/3],[(i+1)/N,(k+1)/3],[i/N,(k+1)/3]]);for(const k of [0,3])for(let i=0;i<N;i++){const pts=[[side*(.74+rings[k][0]),.46,z],point(k,i),point(k,i+1)];face(pts,12,pts.map(p=>[.5+(p[2]-z)/1.1,.5+(p[1]-.46)/1.1]));}}
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));geometry.computeVertexNormals();geometry.computeBoundingBox();
 const material=createRecolorableCarMaterial(color),car=new T.Mesh(geometry,material);car.name='planar-unwrapped-suv';car.userData.setPaint=color=>material.userData.paint.value.set(color);car.castShadow=car.receiveShadow=true;return car;
}

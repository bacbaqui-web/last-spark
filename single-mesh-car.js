import * as T from 'three';
export function createSingleMeshCar(){
 const positions=[],uvs=[];
 const tileUV=(col,row,u,v)=>{const edges=[0,.254,.532,1];return [(col+T.MathUtils.clamp(u,.015,.985))/2,1-edges[row+1]+T.MathUtils.clamp(v,.015,.985)*(edges[row+1]-edges[row])];};
 function face(points,col,row,coords){for(let i=1;i<points.length-1;i++)for(const j of [0,i,i+1]){positions.push(...points[j]);uvs.push(...tileUV(col,row,...coords[j]));}}
 const stations=[[-2.4,.82,.83],[-2.05,.92,1.0],[-1.2,.92,1.07],[1.05,.92,1.07],[2.12,.88,.97],[2.4,.82,.82]];
 const section=z=>{const i=Math.max(0,stations.findIndex((p,k)=>k<stations.length-1&&z<=stations[k+1][0])),a=stations[i],b=stations[i+1],t=T.MathUtils.clamp((z-a[0])/(b[0]-a[0]),0,1);return [T.MathUtils.lerp(a[1],b[1],t),T.MathUtils.lerp(a[2],b[2],t)];};
 const sideUV=([x,y,z])=>[(2.4-z)/4.8,y/2.5],topUV=([x,y,z])=>[(2.4-z)/4.8,(x+1.02)/2.04],endUV=([x,y,z])=>[(x+1.02)/2.04,(y-.25)];
 // One continuous fender skin: true wheel openings, no floating decorative boxes.
 const outline=[...stations.map(([z,w,y])=>new T.Vector2(z,y)),new T.Vector2(2.4,.40)];
 for(const center of [1.38,-1.38]){outline.push(new T.Vector2(center+.51,.40));for(let i=0;i<=16;i++){const a=i/16*Math.PI;outline.push(new T.Vector2(center+Math.cos(a)*.51,.40+Math.sin(a)*.51));}outline.push(new T.Vector2(center-.51,.40));}outline.push(new T.Vector2(-2.4,.40));
 const triangles=T.ShapeUtils.triangulateShape(outline,[]);
 for(const side of [-1,1]){const points=outline.map(p=>[side*section(p.x)[0],p.y,p.x]);for(const triangle of triangles){const pts=triangle.map(i=>points[i]);face(pts,0,0,pts.map(sideUV));}}
 // The hood, trunk and cabin share exactly the same attachment edges.
 for(let i=0;i<stations.length-1;i++){const [z,w,y]=stations[i],[z2,w2,y2]=stations[i+1],points=[[-w,y,z],[w,y,z],[w2,y2,z2],[-w2,y2,z2]];face(points,1,0,points.map(topUV));}
 const cabin=[[-1.2,section(-1.2)[0],section(-1.2)[1]],[-.73,.72,1.63],[.38,.72,1.65],[1.05,section(1.05)[0],section(1.05)[1]]];
 for(const side of [-1,1]){const points=cabin.map(([z,w,y])=>[side*w,y,z]);face(points,0,0,points.map(sideUV));}
 for(let i=0;i<cabin.length-1;i++){const [z,w,y]=cabin[i],[z2,w2,y2]=cabin[i+1],points=[[-w,y,z],[w,y,z],[w2,y2,z2],[-w2,y2,z2]];face(points,1,0,points.map(topUV));}
 for(const [z,w,y]of [stations[0],stations.at(-1)]){const points=[[-w,.40,z],[w,.40,z],[w,y,z],[-w,y,z]];face(points,z>0?0:1,1,points.map(endUV));}
 const bottom=[[-.82,.4,-2.4],[.82,.4,-2.4],[.82,.4,2.4],[-.82,.4,2.4]];face(bottom,1,2,bottom.map(()=>[.2,.2]));
 // Wheel discs meet the tire sidewall directly; wheels tuck into the wheel wells.
 for(const side of [-1,1])for(const z of [-1.38,1.38]){
  const rings=[[-.13,.34],[-.10,.45],[.10,.45],[.13,.34]],N=24,point=(k,i)=>{const [off,r]=rings[k],a=i/N*Math.PI*2;return [side*(.87+off),.46+Math.sin(a)*r,z+Math.cos(a)*r];};
  for(let k=0;k<3;k++)for(let i=0;i<N;i++){const points=[point(k,i),point(k,i+1),point(k+1,i+1),point(k+1,i)];face(points,1,2,[[i/N,k/3],[(i+1)/N,k/3],[(i+1)/N,(k+1)/3],[i/N,(k+1)/3]]);}
  for(const k of [0,3])for(let i=0;i<N;i++){const points=[[side*(.87+rings[k][0]),.46,z],point(k,i),point(k,i+1)];face(points,0,2,points.map(p=>[.5+(p[2]-z)/1.1,.5+(p[1]-.46)/1.1]));}
 }
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));geometry.computeVertexNormals();geometry.computeBoundingBox();
 const material=new T.MeshStandardMaterial({color:0xffffff,roughness:.88,metalness:.12,side:T.DoubleSide});
 if(typeof document!=='undefined'){const map=new T.TextureLoader().load(new URL('./textures/vehicles/sedan-atlas-v1.png',document.baseURI).href);map.colorSpace=T.SRGBColorSpace;map.anisotropy=4;material.map=map;}
 const car=new T.Mesh(geometry,material);car.name='single-mesh-textured-sedan';car.castShadow=car.receiveShadow=true;return car;
}

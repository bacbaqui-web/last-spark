import * as T from 'three';
export function createThreeSedan(){
 const root=new T.Group();root.name='ThreeJS_Vertex_Sedan';
 const mats={paint:new T.MeshStandardMaterial({color:0x548b83,roughness:.72,metalness:.18,flatShading:true}),glass:new T.MeshStandardMaterial({color:0x263e49,roughness:.22,metalness:.28,side:T.DoubleSide}),trim:new T.MeshStandardMaterial({color:0x25302f,roughness:.85}),rim:new T.MeshStandardMaterial({color:0xb9b9a5,roughness:.5,metalness:.65}),lamp:new T.MeshStandardMaterial({color:0xf3d8a0,roughness:.3}),red:new T.MeshStandardMaterial({color:0x9e4935}),rust:new T.MeshStandardMaterial({color:0x965f43,roughness:1})};
 function mesh(name,verts,faces,material){const positions=[];for(const face of faces)for(let i=1;i<face.length-1;i++)for(const j of[face[0],face[i],face[i+1]])positions.push(...verts[j]);const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.computeVertexNormals();const m=new T.Mesh(geo,material);m.name=name;m.castShadow=m.receiveShadow=true;root.add(m);return m;}
 function panel(name,points,material){return mesh(name,points,[points.map((_,i)=>i)],material);}
 function loft(name,rings,material){const verts=rings.flatMap(([z,w,bottom,top])=>[[-w,bottom,z],[w,bottom,z],[w,top,z],[-w,top,z]]),faces=[[3,2,1,0]];for(let i=0;i<rings.length-1;i++)for(let k=0;k<4;k++)faces.push([i*4+k,i*4+(k+1)%4,(i+1)*4+(k+1)%4,(i+1)*4+k]);const n=(rings.length-1)*4;faces.push([n,n+1,n+2,n+3]);return mesh(name,verts,faces,material);}
 // Side skins are triangulated polygons with true wheel-arch openings.
 const outline=[[-2.35,.48],[-2.35,.85],[-2.15,1.04],[-1.05,1.08],[.8,1.07],[1.95,.98],[2.35,.78],[2.35,.48]];
 for(const center of[1.38,-1.38]){outline.push([center+.56,.48]);for(let i=0;i<=12;i++){const a=i/12*Math.PI;outline.push([center+Math.cos(a)*.56,.48+Math.sin(a)*.56]);}outline.push([center-.56,.48]);}
 for(const side of[-1,1]){const pts=outline.map(([z,y])=>new T.Vector2(z,y)),faces=T.ShapeUtils.triangulateShape(pts,[]);const verts=outline.map(([z,y])=>[side*.92,y,z]);mesh('Cutout_fender_'+side,verts,side<0?faces:faces.map(f=>f.toReversed()),mats.paint);}
 // Narrowing top deck, sloping hood and trunk: no box primitives.
 loft('Sculpted_deck',[[-2.35,.84,.79,.85],[-2.15,.92,.88,1.04],[-1.05,.92,1.01,1.08],[.8,.92,1,1.07],[1.95,.86,.87,.98],[2.35,.78,.7,.78]],mats.paint);
 loft('Sloping_cabin',[[-1.25,.78,1.075,1.09],[-.75,.72,1.08,1.65],[.38,.71,1.075,1.68],[1.05,.8,1.06,1.1]],mats.paint);
 for(const side of[-1,1]){
  panel('Rear_side_window',[[side*.786,1.16,-1.1],[side*.727,1.57,-.72],[side*.722,1.58,-.25],[side*.794,1.15,-.25]],mats.glass);
  panel('Front_side_window',[[side*.795,1.15,-.15],[side*.722,1.58,-.15],[side*.722,1.60,.34],[side*.786,1.15,.88]],mats.glass);
  panel('Door_seam',[[side*.925,.57,-.2],[side*.925,1.055,-.2],[side*.925,1.055,-.185],[side*.925,.57,-.185]],mats.trim);
  panel('Door_handle',[[side*.929,1.0,.02],[side*.929,1.0,.19],[side*.929,.96,.19],[side*.929,.96,.02]],mats.rim);
  loft('Side_mirror_'+side,[[.65,.13,.04,.15],[.84,.17,.02,.16]],mats.paint).position.set(side*1.0,1.15,0);
 }
 panel('Windshield',[[-.67,1.66,.435],[.67,1.66,.435],[.745,1.19,.99],[-.745,1.19,.99]],mats.glass);
 panel('Rear_window',[[.67,1.63,-.8],[-.67,1.63,-.8],[-.73,1.2,-1.2],[.73,1.2,-1.2]],mats.glass);
 loft('Front_bumper',[[2.25,.84,.43,.59],[2.4,.78,.46,.58]],mats.trim);loft('Rear_bumper',[[-2.4,.86,.43,.59],[-2.28,.9,.43,.59]],mats.trim);
 for(const side of[-1,1]){
  panel('Headlight_'+side,[[side*.24,.7,2.365],[side*.71,.7,2.365],[side*.71,.82,2.315],[side*.24,.87,2.315]],mats.lamp);
  panel('Taillight_'+side,[[side*.32,.69,-2.356],[side*.8,.69,-2.356],[side*.8,.82,-2.356],[side*.32,.82,-2.356]],mats.red);
 }
 panel('Grille',[[-.22,.62,2.405],[.22,.62,2.405],[.22,.74,2.405],[-.22,.74,2.405]],mats.trim);
 panel('Hood_rust',[[-.69,1.014,1.84],[-.36,1.03,1.65],[-.12,1.024,1.77],[-.38,.995,1.98]],mats.rust);
 for(const x of[-.94,.94])for(const z of[-1.38,1.38]){
  const verts=[],faces=[],rings=[[-.16,.34],[-.13,.45],[.13,.45],[.16,.34]],N=20;
  for(const[off,r]of rings)for(let i=0;i<N;i++){const a=i/N*Math.PI*2;verts.push([x+off,.47+Math.sin(a)*r,z+Math.cos(a)*r]);}
  for(let r=0;r<3;r++)for(let i=0;i<N;i++)faces.push([r*N+i,r*N+(i+1)%N,(r+1)*N+(i+1)%N,(r+1)*N+i]);faces.push(Array.from({length:N},(_,i)=>N-1-i),Array.from({length:N},(_,i)=>3*N+i));mesh('Profiled_tire',verts,faces,mats.trim);
  const outer=x+Math.sign(x)*.165,vs=[[outer,.47,z]],fs=[];for(let i=0;i<N;i++){const a=i/N*Math.PI*2;vs.push([outer,.47+Math.sin(a)*.275,z+Math.cos(a)*.275]);}for(let i=0;i<N;i++)fs.push([0,i+1,(i+1)%N+1]);mesh('Wheel_disc',vs,fs,mats.rim);
  for(let i=0;i<5;i++){const a=i*Math.PI*2/5;const points=[];for(let j=0;j<6;j++){const b=j*Math.PI/3;points.push([outer+Math.sign(x)*.002,.47+Math.sin(a)*.15+Math.sin(b)*.055,z+Math.cos(a)*.15+Math.cos(b)*.055]);}panel('Rim_cutout',points,mats.trim);}
 }
 // All custom faces are visible from either side, including thin fender skins.
 mats.paint.side=T.DoubleSide;mats.rim.side=T.DoubleSide;mats.trim.side=T.DoubleSide;
 return root;
}

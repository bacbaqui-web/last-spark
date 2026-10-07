import * as T from 'three';

// Only street-facing and short side walls: no rooms or hidden back surfaces.
export function addCityBackdrop(root,brickMaterial){
 let seed=(root.userData.seed^0x74b921)>>>0;
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const wallPositions=[],wallUvs=[],windowPositions=[],windowUvs=[],buildings=[];
 function quad(points,positions,uvs,w,h){for(const i of [0,1,2,0,2,3]){positions.push(...points[i]);uvs.push(...[[0,0],[w,0],[w,h],[0,h]][i]);}}
 for(const side of [-1,1]){let z=-38;while(z<38){
  const width=6+random()*7,height=13+random()*13,center=z+width/2;
  const nearby=root.userData.houses.filter(h=>Math.sign(h.x)===side&&Math.abs(h.z-center)<h.width/2+width/2);
  const rear=Math.max(19,...nearby.map(h=>Math.abs(h.x)+h.depth/2));
  const x=side*(rear+1.8+random()*2.5),depth=2+random()*3;
  quad([[x,0,z],[x,0,z+width],[x,height,z+width],[x,height,z]],wallPositions,wallUvs,width/2,height/2);
  for(const end of [z,z+width])quad([[x,0,end],[x+side*depth,0,end],[x+side*depth,height,end],[x,height,end]],wallPositions,wallUvs,depth/2,height/2);
  for(let y=2;y<height-1;y+=3)for(let zz=z+1.1;zz<z+width-.8;zz+=2){if(random()<.12)continue;const wx=x-side*.018;
   quad([[wx,y,zz],[wx,y,zz+1],[wx,y+1.65,zz+1],[wx,y+1.65,zz]],windowPositions,windowUvs,1,1);
  }
  buildings.push({x,z:center,width,height});z+=width+.4+random()*1.1;
 }}
 const make=(positions,uvs,material)=>{const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));g.computeVertexNormals();const mesh=new T.Mesh(g,material);mesh.receiveShadow=true;mesh.userData.ownedGeometry=true;mesh.userData.ownedMaterial=true;root.add(mesh);};
 const brick=brickMaterial.clone();brick.side=T.DoubleSide;brick.color.setHex(0x96918a);make(wallPositions,wallUvs,brick);
 make(windowPositions,windowUvs,new T.MeshStandardMaterial({color:0x252c2b,roughness:1,side:T.DoubleSide}));
 root.userData.backgroundBuildings=buildings;
}

import * as T from 'three';

// Ranks are nested: far (0) is a subset of middle (1), which is a subset of near (2).
// These choices never consume the map RNG or change any authored vertex/UV.
export function vegetationRank(unit,kind='grass'){
 const far=kind==='grass'?12:8;
 return unit%far===0?0:unit%(kind==='grass'?3:2)===0?1:2;
}
export function vineStrandRank(strand){return strand%4===0?0:strand%2===0?1:2;}
export function vineLeafRank(strand,leaf){return Math.max(vineStrandRank(strand),leaf%4===0?0:leaf%2===0?1:2);}
export function vegetationDetailLevel(distance,previous=0){
 if(distance>=40)return 2;
 if(previous===2&&distance>=38)return 2;
 if(distance>=18)return 1;
 if(previous>0&&distance>=16)return 1;
 return 0;
}

// Keep whole leaf quads in 12m cells; thin stems share one batch per street arm
// so entire strands switch together without multiplying draw submissions.
// Index prefixes select density without geometry copies or buffer uploads.
export function addVegetationCells(root,{positions,colors,uv,material,kind,ranks,cellSize=kind==='stems'?Infinity:12,receiveShadow=true}){
 const unitVertices=kind==='grass'?3:6,stride=unitVertices*3,cells=new Map(),meshes=[];
 for(let i=0,unit=0;i<positions.length;i+=stride,unit++){
  let x=0,z=0;for(let j=0;j<stride;j+=3){x+=positions[i+j];z+=positions[i+j+2];}
  const key=Math.floor(x/unitVertices/cellSize)+':'+Math.floor(z/unitVertices/cellSize);
  let cell=cells.get(key);if(!cell){cell={p:[],c:[],uv:[],indices:[[],[],[]]};cells.set(key,cell);}
  const start=cell.p.length/3,rank=ranks?.[unit]??vegetationRank(unit,kind);
  cell.p.push(...positions.slice(i,i+stride));if(colors)cell.c.push(...colors.slice(i,i+stride));
  if(uv)cell.uv.push(...uv.slice(i/3*2,(i+stride)/3*2));
  for(let j=0;j<unitVertices;j++)cell.indices[rank].push(start+j);
 }
 for(const cell of cells.values()){
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(cell.p,3));
  if(colors)g.setAttribute('color',new T.Float32BufferAttribute(cell.c,3));
  if(uv)g.setAttribute('uv',new T.Float32BufferAttribute(cell.uv,2));
  g.computeVertexNormals();g.setIndex(cell.indices.flat());g.computeBoundingBox();g.computeBoundingSphere();g.boundingSphere.radius+=.25;
  const counts=[g.index.count,cell.indices[0].length+cell.indices[1].length,cell.indices[0].length];g.setDrawRange(0,counts[0]);
  const mesh=new T.Mesh(g,material);mesh.name='street-vegetation-'+kind;mesh.receiveShadow=receiveShadow;
  mesh.userData={ownedGeometry:true,vegetation:true,grass:kind==='grass',vegetationKind:kind,vegetationDensity:counts,detailLevel:0};root.add(mesh);meshes.push(mesh);
 }
 return meshes;
}

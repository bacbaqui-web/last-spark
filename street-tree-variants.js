import * as T from 'three';

export const treeVariants=[
 {name:'균형형',height:7.2,width:5.0,base:3.0,seed:103,branches:8},
 {name:'키 큰 형',height:8.7,width:3.7,base:3.7,seed:217,branches:7},
 {name:'넓은 수관형',height:6.6,width:6.6,base:2.8,seed:331,branches:9},
 {name:'기울어진 줄기형',height:7.3,width:4.7,base:3.1,seed:449,branches:8,lean:.65},
 {name:'쌍줄기형',height:7.7,width:5.5,base:2.8,seed:563,branches:9,fork:true},
 {name:'낮게 퍼진 형',height:6.0,width:5.5,base:2.3,seed:677,branches:9},
 {name:'높은 수관형',height:8.4,width:4.6,base:4.5,seed:787,branches:7},
 {name:'바람에 치우친 형',height:7.4,width:5.3,base:3.1,seed:899,branches:8,bias:1.0},
 {name:'가지가 비어 있는 형',height:7.0,width:4.9,base:3.0,seed:1013,branches:8,gap:true},
 {name:'작은 어린 나무형',height:5.4,width:3.2,base:2.4,seed:1127,branches:7,young:true},
];
const geometryCache=new Map();let materials;
function rng(seed){return ()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};}
function getMaterials(){if(materials)return materials;const bark=new T.MeshStandardMaterial({color:0xb9aa90,roughness:1,vertexColors:true});const leaves=new T.MeshStandardMaterial({color:0xffffff,roughness:1,side:T.DoubleSide,alphaTest:.48,vertexColors:true});if(typeof document!=='undefined'){const loader=new T.TextureLoader();bark.map=loader.load(new URL('./textures/trees/street-bark.jpg',document.baseURI).href);bark.map.colorSpace=T.SRGBColorSpace;bark.map.wrapS=bark.map.wrapT=T.RepeatWrapping;bark.map.anisotropy=4;leaves.map=loader.load(new URL('./textures/trees/street-leaves.png',document.baseURI).href);leaves.map.colorSpace=T.SRGBColorSpace;leaves.map.anisotropy=4;}materials={bark,leaves};return materials;}
class Surface{
 constructor(){this.p=[];this.uv=[];this.c=[];}
 tri(a,b,c,uv,col){for(const [i,p] of [a,b,c].entries()){this.p.push(...p);this.uv.push(...uv[i]);this.c.push(...col);}}
 quad(a,b,c,d,uv,col){this.tri(a,b,c,[uv[0],uv[1],uv[2]],col);this.tri(a,c,d,[uv[0],uv[2],uv[3]],col);}
 tube(a,b,r1,r2,sides=7){const axis=b.clone().sub(a),len=axis.length();axis.normalize();const u=new T.Vector3(Math.abs(axis.y)<.9?0:1,Math.abs(axis.y)<.9?1:0,0).cross(axis).normalize(),v=axis.clone().cross(u);const rings=[a,b].map((p,k)=>Array.from({length:sides},(_,i)=>p.clone().addScaledVector(u,Math.cos(i/sides*Math.PI*2)*(k?r2:r1)).addScaledVector(v,Math.sin(i/sides*Math.PI*2)*(k?r2:r1)).toArray()));for(let i=0;i<sides;i++){const j=(i+1)%sides;this.quad(rings[0][i],rings[0][j],rings[1][j],rings[1][i],[[i/sides,a.y*.8],[(i+1)/sides,a.y*.8],[(i+1)/sides,a.y*.8+len*.8],[i/sides,a.y*.8+len*.8]],[1,1,1]);this.tri(b.toArray(),rings[1][i],rings[1][j],[[.5,.5],[0,0],[1,0]],[1,1,1]);this.tri(a.toArray(),rings[0][j],rings[0][i],[[.5,.5],[1,0],[0,0]],[1,1,1]);}}
 leaf(center,size,q,tile,color){const points=[[-1,-1],[1,-1],[1,1],[-1,1]].map(([x,y])=>new T.Vector3(x*size*.55,y*size*.55,0).applyQuaternion(q).add(center).toArray());const x=tile%2*.5,y=Math.floor(tile/2)*.5,pad=.012;this.quad(...points,[[x+pad,1-y-.5+pad],[x+.5-pad,1-y-.5+pad],[x+.5-pad,1-y-pad],[x+pad,1-y-pad]],color);}
 geometry(){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(this.p,3));g.setAttribute('uv',new T.Float32BufferAttribute(this.uv,2));g.setAttribute('color',new T.Float32BufferAttribute(this.c,3));g.computeVertexNormals();g.computeBoundingBox();g.computeBoundingSphere();return g;}
}
function build(index,lod){const d=treeVariants[index],random=rng(d.seed),wood=new Surface(),green=new Surface(),rx=d.width/2,ry=(d.height-d.base)/2,cy=d.base+ry,lean=d.lean||0,bias=d.bias||0,centers=[];
 const trunk=y=>new T.Vector3(lean*(y/d.height)**1.4+Math.sin(y*1.5)*.035,y,Math.sin(y*.9)*.05),thick=d.young?.105:.19+(d.width-4)*.017;
 const knots=[0,.35,d.base*.57,d.base,d.base+ry*.65];for(let i=0;i<knots.length-1;i++)wood.tube(trunk(knots[i]),trunk(knots[i+1]),thick*(1-knots[i]/d.height*.8),thick*(1-knots[i+1]/d.height*.8));
 for(let i=0;i<5;i++){const a=i/5*Math.PI*2;wood.tube(new T.Vector3(Math.cos(a)*thick*2.5,.04,Math.sin(a)*thick*2.5),trunk(.45),thick*.43,thick*.62);}
 if(d.fork)wood.tube(trunk(1.55),new T.Vector3(-.62,d.base+ry*.4,.08),thick*.75,.065);
 for(let i=0;i<d.branches;i++){const angle=i/d.branches*Math.PI*2+random()*.35;if(d.gap&&angle>.60&&angle<1.55)continue;const start=trunk(d.base+random()*.7),sweep=random()*.5-.25,branchY=cy+(random()-.45)*ry*.9,end=new T.Vector3(Math.cos(angle)*rx*.63+bias*.7+lean,branchY,Math.sin(angle)*rx*.58),mid=start.clone().lerp(end,.55);mid.y-=.25;wood.tube(start,mid,thick*.55,.045);wood.tube(mid,end,.045,.020);centers.push({p:end.clone(),scale:.75});
   for(let j=0;j<4;j++){const a=angle+(j-1.5)*.27+sweep,rad=rx*(.70+random()*.25),h=cy+Math.sin(j*1.85+i*.7)*ry*.43+(random()-.5)*.35,tip=new T.Vector3(Math.cos(a)*rad+bias+lean*.9,h,Math.sin(a)*rad*.85),split=mid.clone().lerp(end,.55);wood.tube(split,tip,.024,.007,5);centers.push({p:tip,scale:.75+random()*.25});}
 }
 // Fill the apex with irregular leafy branches; leave the trunk readable below.
 for(let i=0;i<5;i++){const a=random()*Math.PI*2,tip=new T.Vector3(Math.cos(a)*rx*.35+bias*.5+lean,cy+ry*.64+random()*ry*.1,Math.sin(a)*rx*.35);wood.tube(trunk(d.base+ry*.6),tip,.026,.008,5);centers.push({p:tip,scale:.85});}
 const near=lod==='near',cards=near?13:5;
 for(const cl of centers)for(let i=0;i<cards;i++){const a=random()*Math.PI*2,rad=Math.sqrt(random())*(d.young?.55:.72)*cl.scale,dy=(random()-.5)*(near?1.25:1.0),p=cl.p.clone().add(new T.Vector3(Math.cos(a)*rad,dy,Math.sin(a)*rad));const normal=new T.Vector3(Math.cos(a)*(.35+random()),.35+random()*.8,Math.sin(a)*(.35+random())).normalize(),q=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,0,1),normal);q.multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(0,0,1),random()*Math.PI*2));const tint=.82+random()*.18;green.leaf(p,(near?.72:1.04)*(d.young?.78:1)*(.8+random()*.35),q,Math.floor(random()*4),[tint*.92,tint,tint*.88]);}
 return {wood:wood.geometry(),leaves:green.geometry()};
}
/** Reuse cached geometry/materials. Only the returned placement group is new. */
export function createStreetTree(index=0,{lod='near'}={}){index=((index%10)+10)%10;const key=index+':'+lod;if(!geometryCache.has(key))geometryCache.set(key,build(index,lod));const g=geometryCache.get(key),m=getMaterials(),root=new T.Group();root.name=treeVariants[index].name;const trunk=new T.Mesh(g.wood,m.bark),leaves=new T.Mesh(g.leaves,m.leaves);trunk.castShadow=trunk.receiveShadow=true;leaves.castShadow=lod==='near';leaves.receiveShadow=true;root.add(trunk,leaves);root.userData={variant:index,lod,triangles:(g.wood.attributes.position.count+g.leaves.attributes.position.count)/3};return root;}

/** Stable placement choice without allocating fresh mesh geometry. */
export function streetTreeVariantAt(x,z){const n=Math.imul(Math.round(x*10),73856093)^Math.imul(Math.round(z*10),19349663);return (n>>>0)%10;}

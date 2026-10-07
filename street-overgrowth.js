import * as T from 'three';
import {windMaterial} from './street-vegetation-runtime.js';
let leafMat;
let grassLoaded=false;
function grassMaterial(){if(!grassLoaded&&typeof document!=='undefined'){grassMat.map=new T.TextureLoader().load(new URL('./textures/street/grass-blade.jpg',document.baseURI).href);grassMat.map.colorSpace=T.SRGBColorSpace;grassLoaded=true;}return grassMat;}
const grassMat=new T.MeshStandardMaterial({color:0xffffff,vertexColors:true,side:T.DoubleSide,roughness:1});
function leaves(){if(leafMat)return leafMat;leafMat=new T.MeshStandardMaterial({color:0x87965b,vertexColors:true,side:T.DoubleSide,roughness:1,alphaTest:.48});if(typeof document!=='undefined'){leafMat.map=new T.TextureLoader().load(new URL('./textures/trees/street-leaves.png',document.baseURI).href);leafMat.map.colorSpace=T.SRGBColorSpace;}return leafMat;}
export function addStreetOvergrowth(root,options={}){
 const minZ=options.minZ??-35.5,maxZ=options.maxZ??35.5,span=maxZ-minZ,randomZ=()=>minZ+r()*span;
 let seed=(root.userData.seed^0x91eb5387)>>>0;const r=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const sp=[],sc=[],gp=[],gc=[],gu=[],lp=[],lc=[],uv=[];let patches=0,vines=0;
 function tri(dst,colors,a,b,c,tint){dst.push(...a,...b,...c);if(dst===gp)gu.push(0,0,1,0,.5,1);for(let k=0;k<3;k++)colors.push(...tint);}
 function leaf(x,y,z,size,wall=false,normal=null){const angle=r()*Math.PI*2,s=Math.sin(angle),c=Math.cos(angle),tile=Math.floor(r()*4),u=(tile%2)*.5,v=Math.floor(tile/2)*.5,q=normal?new T.Quaternion().setFromUnitVectors(new T.Vector3(0,0,1),normal):null;const points=[[-1,-1],[1,-1],[1,1],[-1,1]].map(([a,b])=>{a*=size;b*=size;const aa=a*c-b*s,bb=a*s+b*c;if(q)return new T.Vector3(aa,bb,0).applyQuaternion(q).add(new T.Vector3(x,y,z)).toArray();return wall?[x,y+bb,z+aa]:[x+aa,y,z+bb];});const tint=.65+r()*.35;for(const i of [0,1,2,0,2,3]){lp.push(...points[i]);lc.push(tint*.93,tint,tint*.83);const [a,b]=[[0,0],[1,0],[1,1],[0,1]][i];uv.push(u+.012+a*.476,v+.012+b*.476);}}
 function grass(x,z,y=.21,strength=1){patches++;const h=(.60+r()*.85)*strength;for(let j=0;j<24;j++){const a=r()*Math.PI*2,xx=x+(r()-.5)*.7,zz=z+(r()-.5)*.7,w=.035+r()*.055,hh=h*(.4+r()*.6),lean=.12+r()*.2,tint=[.72+r()*.18,.8+r()*.18,.65+r()*.2];tri(gp,gc,[xx-Math.cos(a)*w,y,zz-Math.sin(a)*w],[xx+Math.cos(a)*w,y,zz+Math.sin(a)*w],[xx+Math.sin(a)*lean,y+hh,zz+Math.cos(a)*lean],tint);}}
 for(const side of [-1,1]){
  for(let i=0;i<(options.grassPatches??480);i++){const x=side*(3.85+r()*4.4),z=randomZ();grass(x,z,.21);if(r()<.55)for(let k=0;k<5;k++)leaf(x+(r()-.5)*.55,.218,z+(r()-.5)*.6,.11+r()*.1);}
  for(let i=0;i<(options.roadPatches??100);i++)grass(side*(2.75+r()*.6),randomZ(),.034,.55);
 }
 // Slender decorative tendrils: more paths, smaller spaced leaves and visible stems.
 function stem(a,b){const dir=b.clone().sub(a);if(dir.length()>.6)return;dir.normalize();let side=dir.clone().cross(new T.Vector3(1,0,0));if(side.length()<.1)side=dir.clone().cross(new T.Vector3(0,1,0));side.normalize().multiplyScalar(.009);const p=a.clone().sub(side),q=a.clone().add(side),u=b.clone().add(side),v=b.clone().sub(side);tri(sp,sc,p.toArray(),q.toArray(),u.toArray(),[.20,.25,.10]);tri(sp,sc,p.toArray(),u.toArray(),v.toArray(),[.20,.25,.10]);}
 const buildings=root.children.filter(o=>o.children.some(c=>c.userData.ownedMaterials));root.updateMatrixWorld(true);
 const vineRay=new T.Raycaster();
 for(const [idx,h] of root.userData.houses.entries()){const side=Math.sign(h.x),height=3+r()*3,building=buildings[idx];
  for(let j=0;j<7;j++){vines++;const baseZ=h.z+(j-3)*h.width/8+(r()-.5)*.3,length=height*(.55+r()*.45);let previous=null;
   for(let k=0;k<38;k++){const t=k/37,y=.27+t*length,z=baseZ+Math.sin(t*5+j)*.25+Math.sin(t*12)*.06;vineRay.set(new T.Vector3(side*7.5,y,z),new T.Vector3(side,0,0));vineRay.far=2;const hit=vineRay.intersectObject(building,true)[0];if(!hit){previous=null;continue;}const normal=hit.face.normal.clone().transformDirection(hit.object.matrixWorld),p=hit.point.clone().addScaledVector(normal,.018);if(previous)stem(previous,p);previous=p;if(k%2===0)leaf(p.x-side*.016,p.y,p.z+(k%4?.055:-.055),.07+r()*.045,true);}
  }
  for(let i=0;i<20;i++)grass(side*(7.65+r()*.6),h.z+(r()-.5)*h.width,.23,1.2);
 }
 for(const tree of root.children.filter(o=>o.userData.lod)){
  const trunk=tree.children[0],center=tree.position;
  for(let strand=0;strand<2;strand++){vines++;let previous=null;const start=r()*Math.PI*2,height=3.2+r()*1.8;
   for(let k=0;k<42;k++){const t=k/41,a=start+t*Math.PI*3,y=center.y+.08+t*height,normal=new T.Vector3(Math.cos(a),0,Math.sin(a));vineRay.set(new T.Vector3(center.x+normal.x*2,y,center.z+normal.z*2),normal.clone().negate());vineRay.far=3;const hit=vineRay.intersectObject(trunk,false)[0];if(!hit){previous=null;continue;}const n=hit.face.normal.clone().transformDirection(trunk.matrixWorld),p=hit.point.clone().addScaledVector(n,.02);if(previous)stem(previous,p);previous=p;if(k%2===0)leaf(p.x,p.y,p.z,.065+r()*.04,false,n);}
  }
 }
 // Project creepers onto actual triangles, including tilted and overturned wrecks.
 const ray=new T.Raycaster(),down=new T.Vector3(0,-1,0),normalMatrix=new T.Matrix3();
 for(const object of root.children.filter(o=>o.userData.ownedMaterial)){
  const b=new T.Box3().setFromObject(object),size=b.getSize(new T.Vector3());
  for(let j=0;j<35;j++){const x=b.min.x+r()*size.x,z=b.min.z+r()*size.z;ray.set(new T.Vector3(x,b.max.y+1,z),down);const hit=ray.intersectObject(object,false)[0];if(!hit)continue;normalMatrix.getNormalMatrix(object.matrixWorld);const normal=hit.face.normal.clone().applyMatrix3(normalMatrix).normalize(),p=hit.point.clone().addScaledVector(normal,.012);leaf(p.x,p.y,p.z,.06+r()*.09,false,normal);}
  for(let j=0;j<16;j++){const x=(j%2?b.min.x:b.max.x)+(r()-.5)*.16,z=b.min.z+r()*size.z;grass(x,z,Math.abs(x)>3.65?.21:.035,.75);}
 }
 function mesh(p,c,material,tex,kind){
  const cells=new Map();for(let i=0;i<p.length;i+=9){const x=(p[i]+p[i+3]+p[i+6])/3,z=(p[i+2]+p[i+5]+p[i+8])/3,key=Math.floor(x/12)+':'+Math.floor(z/12);if(!cells.has(key))cells.set(key,{p:[],c:[],uv:[]});const cell=cells.get(key);cell.p.push(...p.slice(i,i+9));cell.c.push(...c.slice(i,i+9));if(tex)cell.uv.push(...tex.slice(i/3*2,i/3*2+6));}
  if(kind)windMaterial(material,kind);
  for(const cell of cells.values()){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(cell.p,3));g.setAttribute('color',new T.Float32BufferAttribute(cell.c,3));if(tex)g.setAttribute('uv',new T.Float32BufferAttribute(cell.uv,2));g.computeVertexNormals();g.computeBoundingSphere();g.boundingSphere.radius+=.25;const o=new T.Mesh(g,material);o.receiveShadow=true;o.userData.ownedGeometry=true;o.userData.vegetation=true;o.userData.grass=kind==='grass';root.add(o);}
 }
 const stemsMaterial=new T.MeshStandardMaterial({color:0xffffff,vertexColors:true,side:T.DoubleSide,roughness:1});if(sp.length){mesh(sp,sc,stemsMaterial);root.children.at(-1).userData.ownedMaterial=true;}else stemsMaterial.dispose();mesh(gp,gc,grassMaterial(),gu,'grass');mesh(lp,lc,leaves(),uv,'leaves');root.userData.overgrowth={patches,vines,triangles:(gp.length+lp.length)/9};
}

import * as T from 'three';
let leafMat;
const grassMat=new T.MeshStandardMaterial({color:0xffffff,vertexColors:true,side:T.DoubleSide,roughness:1});
function leaves(){if(leafMat)return leafMat;leafMat=new T.MeshStandardMaterial({color:0x87965b,vertexColors:true,side:T.DoubleSide,roughness:1,alphaTest:.48});if(typeof document!=='undefined'){leafMat.map=new T.TextureLoader().load(new URL('./textures/trees/street-leaves.png',document.baseURI).href);leafMat.map.colorSpace=T.SRGBColorSpace;}return leafMat;}
export function addStreetOvergrowth(root){
 let seed=(root.userData.seed^0x91eb5387)>>>0;const r=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const gp=[],gc=[],lp=[],lc=[],uv=[];let patches=0,vines=0;
 function tri(dst,colors,a,b,c,tint){dst.push(...a,...b,...c);for(let k=0;k<3;k++)colors.push(...tint);}
 function leaf(x,y,z,size,wall=false){const angle=r()*Math.PI*2,s=Math.sin(angle),c=Math.cos(angle),tile=Math.floor(r()*4),u=(tile%2)*.5,v=Math.floor(tile/2)*.5;const points=[[-1,-1],[1,-1],[1,1],[-1,1]].map(([a,b])=>{a*=size;b*=size;return wall?[x+(r()-.5)*.025,y+a*s+b*c,z+a*c-b*s]:[x+a*c,y+b*.65,z+a*s+b*.25];});const tint=.65+r()*.35;for(const i of [0,1,2,0,2,3]){lp.push(...points[i]);lc.push(tint*.93,tint,tint*.83);const [a,b]=[[0,0],[1,0],[1,1],[0,1]][i];uv.push(u+.012+a*.476,v+.012+b*.476);}}
 function grass(x,z,y=.21,strength=1){patches++;const h=(.40+r()*.65)*strength;for(let j=0;j<18;j++){const a=r()*Math.PI*2,xx=x+(r()-.5)*.7,zz=z+(r()-.5)*.7,w=.025+r()*.04,hh=h*(.4+r()*.6),lean=.12+r()*.2,tint=[.19+r()*.09,.28+r()*.16,.09+r()*.07];tri(gp,gc,[xx-Math.cos(a)*w,y,zz-Math.sin(a)*w],[xx+Math.cos(a)*w,y,zz+Math.sin(a)*w],[xx+Math.sin(a)*lean,y+hh,zz+Math.cos(a)*lean],tint);}}
 for(const side of [-1,1]){
  for(let i=0;i<310;i++){const x=side*(3.85+r()*4.4),z=(r()-.5)*71;grass(x,z,.21);if(r()<.55)for(let k=0;k<5;k++)leaf(x+(r()-.5)*.55,.3+r()*.3,z+(r()-.5)*.6,.11+r()*.1);}
  for(let i=0;i<65;i++)grass(side*(2.75+r()*.6),(r()-.5)*70,.034,.55);
 }
 for(const h of root.userData.houses){const side=Math.sign(h.x),front=side*8.43,height=3+r()*3;
  for(let j=0;j<4;j++){vines++;const baseZ=h.z+(r()-.5)*h.width*.85,length=height*(.55+r()*.45),width=.9+r()*1.1;
   for(let k=0;k<18;k++){const y0=.23+k*length/18,y1=.23+(k+1)*length/18,z0=baseZ+Math.sin(k/18*8+j)*.3,z1=baseZ+Math.sin((k+1)/18*8+j)*.3,x=front+side*.015;tri(gp,gc,[x,y0,z0-.022],[x,y0,z0+.022],[x,y1,z1+.022],[.16,.22,.08]);tri(gp,gc,[x,y0,z0-.022],[x,y1,z1+.022],[x,y1,z1-.022],[.16,.22,.08]);}
   for(let k=0;k<250;k++){const t=r(),y=.23+t*length,z=baseZ+Math.sin(t*8+j)*.3+(r()-.5)*width;leaf(front-side*r()*.09,y,z,.14+r()*.15,true);}
  }
  for(let i=0;i<20;i++)grass(side*(7.65+r()*.6),h.z+(r()-.5)*h.width,.23,1.2);
 }
 // Low creeping growth hugs the bounding surface of wrecks and small rides.
 for(const object of root.children.filter(o=>o.userData.ownedMaterial)){
  const b=new T.Box3().setFromObject(object),size=b.getSize(new T.Vector3());
  for(let j=0;j<35;j++){const x=b.min.x+r()*size.x,z=b.min.z+r()*size.z;leaf(x,b.max.y+.018+(r()-.5)*.04,z,.08+r()*.13);}
  for(let j=0;j<16;j++){const x=(j%2?b.min.x:b.max.x)+(r()-.5)*.16,z=b.min.z+r()*size.z;grass(x,z,Math.abs(x)>3.65?.21:.035,.75);}
 }
 function mesh(p,c,material,tex){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('color',new T.Float32BufferAttribute(c,3));if(tex)g.setAttribute('uv',new T.Float32BufferAttribute(tex,2));g.computeVertexNormals();g.computeBoundingSphere();const o=new T.Mesh(g,material);o.receiveShadow=true;o.userData.ownedGeometry=true;root.add(o);}
 mesh(gp,gc,grassMat);mesh(lp,lc,leaves(),uv);root.userData.overgrowth={patches,vines,triangles:(gp.length+lp.length)/9};
}

import * as THREE from 'three';
import {roundedHeadShell} from './robot-head-geometry.js';
import {shell} from './exoskeleton-concepts.js';
import {salvageRubber} from './salvage-metal.js';
import {EQUIPMENT_PAINTS} from './exoskeleton-surface.js';

const visorMaterial=new THREE.MeshPhysicalMaterial({name:'clear-road-visor',color:0xb7d0d4,metalness:0,roughness:.10,transparent:true,opacity:.24,depthWrite:false,side:THREE.DoubleSide,clearcoat:1,clearcoatRoughness:.08});
visorMaterial.userData.sharedSalvageMaterial=true;
const paints=new Map(),foam=salvageRubber.clone();
foam.name='helmet-energy-absorbing-foam';foam.side=THREE.DoubleSide;foam.userData.sharedSalvageMaterial=true;
export function helmetPaint(source,type,{color=null}={}){
 const paint=source.userData.paint||'steel',key=type+'-'+paint+'-'+color;if(paints.has(key))return paints.get(key);
 const size=256,pixels=new Uint8Array(size*size*4),rough=new Uint8Array(size*size*4),normal=new Uint8Array(size*size*4);
 const rgb=new THREE.Color(color||EQUIPMENT_PAINTS[paint].color).convertLinearToSRGB().toArray().map(c=>c*255);
 const hash=(x,y)=>{const n=Math.sin(x*127.1+y*311.7)*43758.5453;return n-Math.floor(n);};
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const i=(y*size+x)*4,n=hash(x,y),cloud=hash(Math.floor(x/6),Math.floor(y/5));
  const scuff=cloud>.965&&n>.65,chip=cloud>.989&&n>.32;
  for(let c=0;c<3;c++)pixels[i+c]=chip?[111,69,43][c]:scuff?rgb[c]*.78+48:rgb[c]*(.965+n*.045);
  pixels[i+3]=255;rough[i]=rough[i+2]=rough[i+3]=255;rough[i+1]=chip?239:scuff?192:159+n*17;
  normal[i]=128+(n-.5)*4;normal[i+1]=128+(hash(y,x)-.5)*4;normal[i+2]=normal[i+3]=255;
  if(type==='tactical'){
   const u=x/size,v=y/size,d=Math.min(Math.abs(u-.25),Math.abs(u-.75));
   const patch=v>.64&&v<.86&&d<.071-Math.max(0,.68-v)*.5||Math.abs(u-.5)<.047&&v>.69;
   if(patch){const weave=((x+y*2)%5<2?1:0)*5;for(let c=0;c<3;c++)pixels[i+c]=22+weave+n*7;rough[i+1]=248;normal[i]=128+weave;}
  }
 }
 // Subtle molded paint stripes, not repeated mechanical panels on every piece.
 if(type==='cycle')for(let y=12;y<244;y++)for(const x of[125,130]){const i=(y*size+x)*4;for(let c=0;c<3;c++)pixels[i+c]=rgb[c]*.42;}
 const texture=(data,color=false)=>{const t=new THREE.DataTexture(data,size,size);if(color)t.colorSpace=THREE.SRGBColorSpace;t.generateMipmaps=true;t.minFilter=THREE.LinearMipmapLinearFilter;t.needsUpdate=true;return t;};
 // Share the packed texture so GLB export can use the DataTexture directly.
 const packed=texture(rough);
 const tactical=type.startsWith('tactical');
 const m=new THREE.MeshPhysicalMaterial({name:'road-helmet-'+key,map:texture(pixels,true),roughnessMap:packed,metalnessMap:packed,normalMap:texture(normal),normalScale:new THREE.Vector2(.18,.18),metalness:tactical?.08:.16,roughness:tactical?.96:.76,clearcoat:tactical?.06:.30,clearcoatRoughness:.36});
 m.userData={sharedSalvageMaterial:true,textureDetail:'worn-helmet-paint',paint,salvageColor:new THREE.Color(color||EQUIPMENT_PAINTS[paint].color)};paints.set(key,m);return m;
}

// Closed curved strips: silhouette and real openings use geometry, surface wear
// stays in the item's shared PBR maps. `point` takes two normalized coordinates.
function patch(point,columns,rows,thickness=0){
 const p=[],uv=[],ix=[],span=(columns+1)*(rows+1),layers=thickness?2:1;
 for(let layer=0;layer<layers;layer++)for(let row=0;row<=rows;row++)for(let col=0;col<=columns;col++){
  const u=col/columns,v=row/rows,a=point(u,v,layer*thickness);p.push(...a);uv.push(.08+.84*u,.06+.88*v);
 }
 for(let layer=0;layer<layers;layer++)for(let row=0;row<rows;row++)for(let col=0;col<columns;col++){
  const a=layer*span+row*(columns+1)+col,b=a+1,c=a+columns+1,d=c+1;
  if(layer===0)ix.push(a,b,c,b,d,c);else ix.push(a,c,b,b,c,d);
 }
 if(thickness){
  const edge=(a,b)=>ix.push(a,a+span,b,b,a+span,b+span);
  for(let col=0;col<columns;col++){edge(col+1,col);edge(rows*(columns+1)+col,rows*(columns+1)+col+1);}
  for(let row=0;row<rows;row++){edge(row*(columns+1),(row+1)*(columns+1));edge((row+1)*(columns+1)+columns,row*(columns+1)+columns);}
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(ix);g.computeVertexNormals();return g;
}
function builder(group){return (name,geometry,material)=>{
 const m=new THREE.Mesh(geometry,material);m.name=name;m.userData.cosmetic=true;m.userData.itemStudy=true;m.castShadow=m.receiveShadow=true;group.add(m);return m;
};}

export function cycleHelmet(group,surface){
 const add=builder(group);surface=helmetPaint(surface,'cycle');
 // A single continuous aero shell, pierced by six long front vents and six
 // shorter rear vents. The openings taper to points instead of separate bars.
 const outline=new THREE.Shape();outline.moveTo(-1.51,.04);outline.lineTo(1.51,.04);outline.lineTo(1.51,3.23);outline.lineTo(-1.51,3.23);outline.closePath();
 for(const center of[-1.10,-.66,-.22,.22,.66,1.10])for(const [start,end]of[[.43,1.94],[2.16,2.89]]){
  const width=Math.abs(center)>1?.115:.120,hole=new THREE.Path(),mid=(start+end)/2;
  hole.moveTo(center,start);hole.bezierCurveTo(center+width,start+.13,center+width,mid,center+width*.72,end-.15);
  hole.quadraticCurveTo(center+width*.35,end-.02,center,end);
  hole.bezierCurveTo(center-width,end-.11,center-width,mid,center-width*.72,start+.15);
  hole.quadraticCurveTo(center-width*.35,start+.02,center,start);outline.holes.push(hole);
 }
 const planar=new THREE.ShapeGeometry(outline,4),pos=planar.attributes.position,index=planar.index,points=[];
 function refine(a,b,c,depth=0){
  const edges=[[a,b,c],[b,c,a],[c,a,b]].sort((x,y)=>y[0].distanceToSquared(y[1])-x[0].distanceToSquared(x[1]));
  const [u,v,w]=edges[0];
  if(depth<12&&u.distanceToSquared(v)>.34**2){const mid=u.clone().lerp(v,.5);refine(u,mid,w,depth+1);refine(mid,v,w,depth+1);}else points.push(a,b,c);
 }
 for(let i=0;i<index.count;i+=3)refine(...[0,1,2].map(n=>new THREE.Vector2().fromBufferAttribute(pos,index.getX(i+n))));
 const point=(phi,theta,inset)=>new THREE.Vector3((.143-inset)*Math.sin(phi),.026+(.137-inset)*Math.cos(phi)*Math.sin(theta),-.014+(.153-inset)*Math.cos(phi)*Math.cos(theta));
 function face(inset,inside){
  const p=[],uv=[],normals=[];
  for(let i=0;i<points.length;i+=3)for(const j of(inside?[0,2,1]:[0,1,2])){
   const {x:phi,y:theta}=points[i+j],n=new THREE.Vector3(Math.sin(phi)/(.143-inset),Math.cos(phi)*Math.sin(theta)/(.137-inset),Math.cos(phi)*Math.cos(theta)/(.153-inset)).normalize();
   p.push(...point(phi,theta,inset).toArray());normals.push(...n.multiplyScalar(inside?-1:1).toArray());uv.push((phi+1.51)/3.02,(theta-.04)/3.19);
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));return g;
 }
 add('cycle-vented-aero-shell',face(0,false),surface);add('cycle-inner-foam',face(.020,true),foam);planar.dispose();
 const walls=[];
 for(const boundary of[outline,...outline.holes]){
  const path=boundary.getPoints(4);if(boundary!==outline)path.reverse();
  for(let i=0;i<path.length-1;i++){
   const steps=Math.ceil(path[i].distanceTo(path[i+1])/.25);
   for(let n=0;n<steps;n++){
    const a=path[i].clone().lerp(path[i+1],n/steps),b=path[i].clone().lerp(path[i+1],(n+1)/steps);
    const outerA=point(a.x,a.y,0),outerB=point(b.x,b.y,0),innerA=point(a.x,a.y,.020),innerB=point(b.x,b.y,.020);
    for(const p of[outerA,innerA,outerB,outerB,innerA,innerB])walls.push(...p.toArray());
   }
  }
 }
 const wallGeometry=new THREE.BufferGeometry();wallGeometry.setAttribute('position',new THREE.Float32BufferAttribute(walls,3));wallGeometry.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(walls.length/3*2),2));wallGeometry.computeVertexNormals();add('cycle-vent-foam-walls',wallGeometry,foam);
 // Y-shaped retention straps tuck below the jawless skull and keep the face free.
 function strap(a,b,width){
  const from=new THREE.Vector3(...a),to=new THREE.Vector3(...b),delta=to.clone().sub(from);
  const g=new THREE.BoxGeometry(width,delta.length(),.004);g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize()));g.translate(...from.add(to).multiplyScalar(.5).toArray());add('cycle-retention-strap',g,salvageRubber);
 }
 for(const sign of[-1,1]){
  strap([sign*.125,.041,.043],[sign*.088,-.093,-.004],.009);
  strap([sign*.125,.029,-.086],[sign*.088,-.093,-.004],.009);
  strap([sign*.088,-.093,-.004],[sign*.036,-.116,.025],.010);
 }
 strap([-.036,-.116,.025],[.036,-.116,.025],.011);
}

const motoEdge=phi=>{
 const angle=Math.acos(Math.cos(phi));
 if(angle<=1.32)return .057-.019*(angle/1.32)**2;
 return THREE.MathUtils.lerp(.038,-.110,THREE.MathUtils.smoothstep(angle,1.32,1.68));
};
export function motoHelmet(group,surface){
 surface=helmetPaint(surface,'moto');
 const add=builder(group),shape={rx:.143,ry:.146,rz:.151,cy:.020,cz:.005,segments:32,rows:8,thickness:.012,edgeY:motoEdge};
 add('moto-full-face-crown',roundedHeadShell(shape),surface);
 const chin=shell([[-.048,.143,.156,.005],[-.079,.143,.161,.005],[-.123,.123,.142,.005]],{start:-Math.PI,end:Math.PI,segments:32,thickness:.013});
 // Raise the sides and rear to join the crown; the front lip frames the visor.
 const p=chin.attributes.position;
 for(let i=0;i<p.count;i++)if(p.getY(i)>-.055){const phi=Math.atan2(p.getX(i),p.getZ(i)-.005);p.setY(i,-.048+.055*THREE.MathUtils.smoothstep(Math.abs(phi),.65,1.65));}
 chin.computeVertexNormals();add('moto-continuous-chin-guard',chin,surface);
 add('moto-padded-bottom-rim',shell([[-.121,.124,.143,.005],[-.130,.120,.139,.005]],{start:-Math.PI,end:Math.PI,segments:32,thickness:.016}),salvageRubber);
 const pane=(u,v,inset=0)=>{
  const phi=(u-.5)*2.64,y0=motoEdge(phi),theta=Math.acos((y0-.020)/.146);
  const top=new THREE.Vector3(.143*Math.sin(phi)*Math.sin(theta),y0,.005+.151*Math.cos(phi)*Math.sin(theta));
  const bottom=new THREE.Vector3(.143*Math.sin(phi),-.048+.055*THREE.MathUtils.smoothstep(Math.abs(phi),.65,1.65),.005+.156*Math.cos(phi));
  const q=top.lerp(bottom,v);q.x+=Math.sin(phi)*(.002-inset);q.z+=Math.cos(phi)*(.002+.004*Math.sin(v*Math.PI)-inset);return q.toArray();
 };
 // patch winding faces outward when vertical samples run from bottom to top.
 const visor=add('moto-curved-clear-visor',patch((u,v)=>pane(u,1-v),20,4),visorMaterial);visor.castShadow=false;visor.renderOrder=2;
 for(const [start,end]of[[0,.038],[.962,1]])add('moto-visor-gasket',patch((u,v)=>pane(u,1-THREE.MathUtils.lerp(start,end,v)),20,1),salvageRubber);
 for(const [start,end]of[[0,.018],[.982,1]])add('moto-visor-side-seal',patch((u,v)=>pane(THREE.MathUtils.lerp(start,end,u),1-v),1,4),salvageRubber);
 for(const sign of[-1,1]){
  const g=new THREE.CylinderGeometry(.018,.018,.007,12);g.rotateZ(Math.PI/2);g.translate(sign*.143,.020,.032);add('moto-visor-pivot',g,salvageRubber);
  const cap=new THREE.CylinderGeometry(.011,.011,.009,12);cap.rotateZ(Math.PI/2);cap.translate(sign*.146,.020,.032);add('moto-visor-pivot-cap',cap,surface);
 }
 // Shallow graphic slits follow the chin, without inset bolts or grilles.
 for(const y of[-.081,-.100])add('moto-chin-vent',patch((u,v)=>{
  const phi=(u-.5)*.66,yy=y+(v-.5)*.004,rz=.161+(.142-.161)*((-yy-.079)/.044);
  return [.143*Math.sin(phi),yy,.006+rz*Math.cos(phi)];
 },8,1),salvageRubber);
}

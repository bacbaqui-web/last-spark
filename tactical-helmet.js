import * as THREE from 'three';
import {mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';
import {roundedHeadShell} from './robot-head-geometry.js';
import {helmetPaint} from './road-helmets.js';
import {shell,plate} from './exoskeleton-concepts.js';
import {salvageRubber} from './salvage-metal.js';

const glass=new THREE.MeshPhysicalMaterial({name:'tactical-smoked-goggles',color:0x111a20,metalness:.28,roughness:.14,clearcoat:1,clearcoatRoughness:.07,transparent:true,opacity:.90,depthWrite:false,side:THREE.DoubleSide});
glass.userData.sharedSalvageMaterial=true;
const lensPixels=new Uint8Array(64*64*4);
for(let y=0;y<64;y++)for(let x=0;x<64;x++){
 const u=x/63*2-1,v=y/63*2-1,r=Math.min(1,Math.hypot(u,v)),reflection=Math.exp(-((u+.29)**2/.065+(v-.34)**2/.045));
 lensPixels.set([13+r*15+reflection*40,25+r*24+reflection*42,25+r*17+reflection*38,255],(y*64+x)*4);
}
const lensMap=new THREE.DataTexture(lensPixels,64,64);lensMap.colorSpace=THREE.SRGBColorSpace;lensMap.generateMipmaps=true;lensMap.minFilter=THREE.LinearMipmapLinearFilter;lensMap.needsUpdate=true;
const opticGlass=new THREE.MeshPhysicalMaterial({name:'tactical-targeting-optics',map:lensMap,metalness:.30,roughness:.10,clearcoat:1,clearcoatRoughness:.06});
opticGlass.userData.sharedSalvageMaterial=true;
const lensRim=new THREE.MeshStandardMaterial({name:'tactical-optic-retainer',color:0x817b4c,metalness:.55,roughness:.57});
lensRim.userData.sharedSalvageMaterial=true;
const detailCache=new Map();
// Rail slots, screw recesses and cup seams are pixels, never individual bolts.
function details(kind){
 if(detailCache.has(kind))return detailCache.get(kind);
 const size=128,pixels=new Uint8Array(size*size*4),packed=new Uint8Array(size*size*4),normals=new Uint8Array(size*size*4),height=new Float32Array(size*size);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const i=y*size+x,u=x/size,v=y/size,grain=((x*17+y*31)%23)/23;
  let value=46+grain*8,h=.5;
  if(kind==='rail'){
   if(v>.35&&v<.70&&u>.14&&u<.87&&((u-.14)*8%1)<.55){value=15;h=.14;}
   if(v>.79&&v<.82&&u>.14&&u<.86){value=85;h=.66;}
  }else{
   const edge=Math.min(Math.abs(u-.19),Math.abs(u-.81),Math.abs(v-.18),Math.abs(v-.82));
   if(edge<.013&&u>.17&&u<.83&&v>.16&&v<.84){value=19;h=.25;}
   if(v>.26&&v<.29&&u>.35&&u<.65){value=88;h=.60;}
  }
  for(const sx of[.10,.90])if(Math.hypot(u-sx,v-.52)<.044){value=Math.abs(v-.52)<.010?17:73;h=.65;}
  pixels.set([value,value+3,value+2,255],i*4);packed.set([255,211+grain*22,255,255],i*4);height[i]=h;
 }
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const at=(a,b)=>height[Math.max(0,Math.min(127,b))*size+Math.max(0,Math.min(127,a))],n=new THREE.Vector3((at(x-1,y)-at(x+1,y))*.7,(at(x,y-1)-at(x,y+1))*.7,1).normalize();
  normals.set([(n.x*.5+.5)*255,(n.y*.5+.5)*255,(n.z*.5+.5)*255,255],(y*size+x)*4);
 }
 const texture=(a,color=false)=>{const t=new THREE.DataTexture(a,size,size);if(color)t.colorSpace=THREE.SRGBColorSpace;t.generateMipmaps=true;t.minFilter=THREE.LinearMipmapLinearFilter;t.needsUpdate=true;return t;},orm=texture(packed);
 const m=new THREE.MeshStandardMaterial({name:'tactical-'+kind,map:texture(pixels,true),roughnessMap:orm,metalnessMap:orm,normalMap:texture(normals),normalScale:new THREE.Vector2(.45,.45),metalness:.22,roughness:1});
 m.userData={sharedSalvageMaterial:true,textureDetail:'tactical-hardware',salvageColor:new THREE.Color(0x343b39)};detailCache.set(kind,m);return m;
}
function outline(points){const s=new THREE.Shape();s.moveTo(...points[0]);for(const p of points.slice(1))s.lineTo(...p);s.closePath();return s;}
const lensOutline=[[-.130,.020],[-.117,.038],[-.070,.045],[.070,.045],[.117,.038],[.130,.020],[.123,-.027],[.101,-.041],[.045,-.038],[.016,-.010],[0,-.004],[-.016,-.010],[-.045,-.038],[-.101,-.041],[-.123,-.027]];
const lensDepth=x=>.155-.058*(x/.137)**2;
// Tessellate only wide faces before bending them around the robot's round skull.
function curvedGoggle(shape,depth){
 const g=new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:false,curveSegments:3}),source=g.attributes.position,p=[];
 function split(a,b,c,level=0){
  const [u,v,w]=[[a,b,c],[b,c,a],[c,a,b]].sort((x,y)=>y[0].distanceToSquared(y[1])-x[0].distanceToSquared(x[1]))[0];
  if(level<8&&u.distanceToSquared(v)>.032**2){const mid=u.clone().lerp(v,.5);split(u,mid,w,level+1);split(mid,v,w,level+1);}else for(const q of[a,b,c])p.push(q.x,q.y,q.z+lensDepth(q.x));
 }
 for(let i=0;i<source.count;i+=3)split(...[0,1,2].map(n=>new THREE.Vector3().fromBufferAttribute(source,i+n)));g.dispose();
 const result=new THREE.BufferGeometry(),uv=[];for(let i=0;i<p.length;i+=3)uv.push(p[i]/.30+.5,p[i+1]/.12+.5);
 result.setAttribute('position',new THREE.Float32BufferAttribute(p,3));result.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));const smooth=mergeVertices(result,1e-5);result.dispose();smooth.computeVertexNormals();return smooth;
}

export function tacticalHelmet(group,surface,{graphite=false}={}){
 const tint={color:graphite?'#272e2c':null},crownPaint=helmetPaint(surface,'tactical',tint),maskPaint=helmetPaint(surface,'tactical-mask',tint);
 const add=(name,g,m,pos=[0,0,0],rotation=[0,0,0])=>{const mesh=new THREE.Mesh(g,m);mesh.name='tactical-'+name;mesh.position.fromArray(pos);mesh.rotation.set(...rotation);mesh.userData.itemStudy=mesh.userData.cosmetic=true;mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);return mesh;};
 const crown={rx:.142,ry:.140,rz:.137,cy:.021,cz:-.015,frontY:.051,sideY:-.018,backY:-.086,segments:28,rows:7,thickness:.012};
 add('high-cut-shell',roundedHeadShell(crown),crownPaint);
 add('padded-shell-rim',roundedHeadShell({...crown,rx:.143,ry:.141,rz:.138,rim:.009,rows:1,thickness:.015}),salvageRubber,[0,-.002,0]);
 add('projecting-brow',shell([[.069,.143,.147],[.049,.148,.153]],{start:-1.27,end:1.27,segments:14,thickness:.011}),maskPaint,[0,0,-.011]);

 const frame=outline(lensOutline.map(([x,y])=>[x*1.065,y*1.19]));frame.holes.push(outline(lensOutline));
 add('goggle-frame',curvedGoggle(frame,.008),salvageRubber);
 const lens=add('smoked-lens',curvedGoggle(outline(lensOutline),.0015),glass,[0,0,.002]);lens.castShadow=false;lens.renderOrder=2;

 const mask=shell([[-.041,.137,.153],[-.076,.130,.177],[-.127,.101,.142]],{start:-1.44,end:1.44,segments:10,thickness:.012,flat:true}),p=mask.attributes.position;
 for(let i=0;i<p.count;i++){
  const x=p.getX(i),y=p.getY(i),ratio=Math.min(1,Math.abs(x)/.137);
  if(y>-.05)p.setY(i,-.041+.030*Math.exp(-((x/.030)**2))+.020*ratio**3);
  else if(y<-.11)p.setY(i,-.127+.030*ratio**2);
 }
 mask.computeVertexNormals();add('faceted-face-guard',mask,maskPaint);
 // A dark backing closes the respirator under the visible cheek planes.
 add('mask-lower-seal',shell([[-.123,.102,.143],[-.130,.092,.133]],{start:-1.43,end:1.43,segments:10,thickness:.016}),salvageRubber);

 for(const sign of[-1,1]){
  const padding=plate([[-.049,.042],[.055,.039],[.054,-.027],[.019,-.051],[-.043,-.050]],.012);padding.translate(0,0,-.006);
  add('goggle-temple-padding',padding,salvageRubber,[sign*.123,-.009,.052],[0,sign*Math.PI/2,0]);
  const rail=plate([[-.069,-.012],[-.048,.016],[.057,.016],[.070,.002],[.059,-.018],[-.052,-.018]],.009);rail.translate(0,0,-.0045);
  add('side-accessory-rail',rail,details('rail'),[sign*.143,.027,-.035],[0,sign*Math.PI/2,0]);
  const cup=plate([[-.033,.050],[.024,.049],[.043,.028],[.043,-.027],[.021,-.048],[-.024,-.047],[-.041,-.027],[-.045,.016]],.025);cup.translate(0,0,-.0125);
  add('ear-protection',cup,details('ear'),[sign*.150,-.036,-.046],[0,sign*Math.PI/2,0]);
  // Broad cheek connector follows the temple instead of leaving an open seam.
  const arm=plate([[-.017,.055],[.012,.052],[.022,.002],[.016,-.048],[-.012,-.056],[-.020,-.015]],.012);arm.translate(0,0,-.006);
  add('cheek-connector',arm,maskPaint,[sign*.135,-.029,.041],[0,sign*Math.PI/2,-sign*.14]);
  const strap=new THREE.BoxGeometry(.008,.035,.009);add('goggle-side-strap',strap,salvageRubber,[sign*.137,.006,.059],[0,0,sign*.18]);
 }
 // The forehead shroud carries a compact articulated binocular aiming module.
 const shroud=outline([[-.035,-.027],[-.031,.031],[.031,.031],[.035,-.027],[.023,-.035],[-.023,-.035]]);
 shroud.holes.push(outline([[-.019,-.019],[-.019,.016],[.019,.016],[.019,-.019]]));
 add('nvg-mount-base',plate([[-.033,-.032],[.033,-.032],[.033,.030],[-.033,.030]],.007),details('ear'),[0,.098,.093],[-.74,0,0]);
 add('nvg-mount-shroud',new THREE.ExtrudeGeometry(shroud,{depth:.008,bevelEnabled:true,bevelSize:.002,bevelThickness:.002,bevelSegments:1,steps:1}),details('rail'),[0,.098,.100],[-.74,0,0]);
 const hardware=details('ear');
 add('optic-folding-arm',plate([[-.013,.041],[.013,.041],[.012,-.041],[-.012,-.041]],.018),hardware,[0,.064,.148],[-.61,0,0]);
 const hinge=new THREE.CylinderGeometry(.014,.014,.039,10);hinge.rotateZ(Math.PI/2);add('optic-mount-hinge',hinge,salvageRubber,[0,.098,.130]);
 add('binocular-bridge',plate([[-.083,.013],[.083,.013],[.083,-.013],[-.083,-.013]],.023),hardware,[0,.031,.175]);
 for(const sign of[-1,1]){
  const x=sign*.064;
  const tube=(name,radius,length,z,material,backRadius=radius)=>{
   const g=new THREE.CylinderGeometry(radius,backRadius,length,12);g.rotateX(Math.PI/2);return add(name,g,material,[x,.010,z]);
  };
  tube('optic-housing',.033,.070,.192,maskPaint,.031);
  tube('optic-focus-ring',.035,.018,.224,hardware);
  tube('optic-front-retainer',.031,.006,.237,lensRim);
  tube('optic-lens-recess',.027,.007,.241,salvageRubber);
  const objective=new THREE.SphereGeometry(.024,12,5,0,Math.PI*2,0,Math.PI/2);objective.rotateX(Math.PI/2);objective.scale(1,1,.18);
  const p=objective.attributes.position,uv=objective.attributes.uv;for(let i=0;i<p.count;i++)uv.setXY(i,p.getX(i)/.048+.5,p.getY(i)/.048+.5);
  add('optic-coated-objective',objective,opticGlass,[x,.010,.244]);
 }
 // Flat dark vent graphics sit on the sloping cheek panels.
 for(const sign of[-1,1]){
  const vent=plate([[-.028,-.004],[.020,-.004],[.028,.004],[-.019,.004]],.0006);vent.translate(0,0,-.0003);
  add('cheek-vent',vent,salvageRubber,[sign*.081,-.079,.128],[.14,sign*.62,sign*.22]);
 }
}

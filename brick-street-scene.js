import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {getRuinedVehicle,VEHICLE_TYPES} from './ruined-vehicles.js';
import {rng,hasBrickPassage,brickBuildingWidth,treeCanopyMask} from './brick-street-layout.js';
const originalWallMaterials=new Map();
const materials=new Map();const mat=(color)=>{if(!materials.has(color))materials.set(color,new T.MeshStandardMaterial({color,roughness:1}));return materials.get(color);};
let brickTexture;
function brickMap(){if(brickTexture)return brickTexture;const c=document.createElement('canvas');c.width=c.height=256;const ctx=c.getContext('2d'),r=rng(934);ctx.fillStyle='#635e54';ctx.fillRect(0,0,256,256);for(let row=0;row<16;row++)for(let col=-1;col<8;col++){const v=170+Math.floor(r()*70);ctx.fillStyle=`rgb(${v},${v},${v})`;ctx.fillRect(col*32+(row%2)*16+1,row*16+1,30,14);}brickTexture=new T.CanvasTexture(c);brickTexture.colorSpace=T.SRGBColorSpace;brickTexture.wrapS=brickTexture.wrapT=T.RepeatWrapping;brickTexture.repeat.set(3,6);return brickTexture;}
let leafTexture;
function leafMap(){if(leafTexture)return leafTexture;const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d'),edge=rng(673);x.fillStyle='#4b7c36';x.beginPath();for(let k=0;k<72;k++){const a=k*Math.PI*2/72,radius=49+edge()*12,px=64+Math.cos(a)*radius,py=64+Math.sin(a)*radius;k?x.lineTo(px,py):x.moveTo(px,py);}x.closePath();x.fill();for(let i=0;i<70;i++){const a=i*2.4,px=64+Math.cos(a)*Math.sqrt((i+.5)/70)*46,py=64+Math.sin(a)*Math.sqrt((i+.5)/70)*46;x.save();x.translate(px,py);x.rotate(a);x.fillStyle=['#648d43','#3b702f','#81a857'][i%3];x.beginPath();x.ellipse(0,0,6,12,0,0,Math.PI*2);x.fill();x.strokeStyle='#abc674';x.lineWidth=.8;x.beginPath();x.moveTo(0,-10);x.lineTo(0,10);x.stroke();x.restore();}leafTexture=new T.CanvasTexture(c);leafTexture.colorSpace=T.SRGBColorSpace;return leafTexture;}
let grassTexture,grassMaterial;
function grassMat(){if(grassMaterial)return grassMaterial;const c=document.createElement('canvas');c.width=c.height=128;const ctx=c.getContext('2d'),random=rng(82);for(let i=0;i<24;i++){const x=12+random()*104;ctx.fillStyle=['#69894b','#8a9f60','#43683d'][i%3];ctx.beginPath();ctx.moveTo(x-3,128);ctx.quadraticCurveTo(x-8,65,x+(random()-.5)*45,10+random()*50);ctx.quadraticCurveTo(x+4,75,x+3,128);ctx.fill();}grassTexture=new T.CanvasTexture(c);grassTexture.colorSpace=T.SRGBColorSpace;return grassMaterial=new T.MeshStandardMaterial({map:grassTexture,alphaTest:.45,side:T.DoubleSide,roughness:1});}
let foliageMaterial;function leafMat(){return foliageMaterial??=new T.MeshStandardMaterial({map:leafMap(),alphaTest:.45,side:T.DoubleSide,roughness:1});}
export function buildBrickStreet(block,library,{offset=0,colliders=[]}={}){
 const growthTargets=[];const colliderStart=colliders.length;const root=new T.Group(),r=rng(block.seed),stone=0x929383,steel=0x444b43,bricks=[0x854b38,0x784333,0x92543c,0x6f3e31];
 function box(w,h,d,x,y,z,color,solid=false){if(bricks.includes(color))mat(color).map=brickMap();const m=new T.Mesh(new T.BoxGeometry(w,h,d),mat(color));m.position.set(x,y,z+offset);root.add(m);if(solid)colliders.push({x,z:z+offset,w,d,h:y+h/2});return m;}
 function rod(a,b,width=.06,color=steel){const va=new T.Vector3(...a),vb=new T.Vector3(...b),delta=vb.clone().sub(va),m=new T.Mesh(new T.CylinderGeometry(width,width,delta.length(),6),mat(color));m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());m.position.copy(va.add(vb).multiplyScalar(.5));m.position.z+=offset;root.add(m);}
 function originalWall(id,x,y,z,width,height,angle){const t=library.get(id);if(!t)return false;for(const p of t.parts){if(!originalWallMaterials.has(p.material.uuid)){const material=p.material.clone();material.color.multiply(new T.Color(0xa1745b));originalWallMaterials.set(p.material.uuid,material);}const mesh=new T.Mesh(p.geometry,originalWallMaterials.get(p.material.uuid));mesh.userData.shared=true;mesh.scale.set(width/t.size.x,height/t.size.y,.4/t.size.z);mesh.rotation.y=angle;mesh.position.set(x,y,z+offset);root.add(mesh);}return true;}
 function tornStrip(points,depth,x,y,z,angle=0,color=stone){const shape=new T.Shape();points.forEach(([a,b],i)=>i?shape.lineTo(a,b):shape.moveTo(a,b));shape.closePath();const mesh=new T.Mesh(new T.ExtrudeGeometry(shape,{depth,bevelEnabled:false}),mat(color));mesh.rotation.y=angle;mesh.position.set(x,y,z+offset);root.add(mesh);return mesh;}
 function entranceSteps(front,side,z){for(let k=0;k<6;k++){const h=.17*(6-k);box(.36,h,1.8,front-side*(.18+k*.3),.27+h/2,z,stone,true);}for(const dz of[-.94,.94])rod([front-side*.2,2.15,z+dz],[front-side*1.68,1.25,z+dz],.035);}
 function leaves(x,y,z,w=1,h=1,angle=0){const mesh=new T.Mesh(new T.PlaneGeometry(w,h),leafMat());mesh.position.set(x,y,z+offset);mesh.rotation.set((r()-.5)*.7,angle,0);root.add(mesh);}
 function ivy(x,y,z,height){rod([x,y,z],[x+.15,y+height,z],.025,0x52643c);for(let j=0;j<height*7;j++)leaves(x+(r()-.5)*.6,y+j/7,z+.06 ,.55,.7,Math.PI/2);}
 box(36,.15,36,0,-.11,0,0x39403b);box(10,.08,36,0,-.025,0,0x424741);
 for(const side of[-1,1]){box(3.6,.3,36,side*6.8,.12,0,stone,true);for(let z=-17.5;z<18;z+=1){box(.18,.34,.94,side*5.05,.13,z,0xb4b3a2);box(3.5,.012,.025,side*6.8,.277,z,0x666d60);}for(let x=5.6;x<8.6;x+=.8)box(.018,.012,36,side*x,.278,0,0x757969);}
 for(let z=-15;z<18;z+=6)box(.12,.02,2,0,.03,z,0xb1b29a);
 for(const b of block.buildings){const front=b.side*8.6,center=b.side*12.6,H=b.floors*3.1,color=bricks[b.tone],buildingWidth=brickBuildingWidth(b),cellWidth=buildingWidth/b.columns;
 // Recessed interior shell: openings are empty geometry, while the rear structure blocks entry.
 const roomDepth=2.7;box(5.3,H,buildingWidth,front+b.side*5.35,H/2,b.z,color);
 box(roomDepth,H,.2,front+b.side*roomDepth/2,H/2,b.z-buildingWidth/2+.1,color);box(roomDepth,H,.2,front+b.side*roomDepth/2,H/2,b.z+buildingWidth/2-.1,color);
 colliders.push({x:center,z:b.z+offset,w:8,d:buildingWidth,h:H});
 const hole=(f,c)=>f>=0&&f<b.floors&&c>=0&&c<b.columns&&b.cells[f*b.columns+c]==='collapsed';
 for(let f=0;f<b.floors;f++){const y=f*3.1;for(let c=0;c<b.columns;c++){const z=b.z-buildingWidth/2+(c+.5)*cellWidth,type=b.cells[f*b.columns+c],face=front-b.side*.12;
 if(type==='collapsed'){
 // Only the outside perimeter gets torn masonry. Adjacent holes have no divider.
 const jagged=(edge)=>{const n=10,pts=[];if(edge==='left'||edge==='right'){const sign=edge==='left'?1:-1,border=z+(edge==='left'?-cellWidth/2:cellWidth/2);pts.push([border,y],[border,y+3.1]);for(let k=n;k>=0;k--)pts.push([border+sign*(.12+r()*.45),y+k*3.1/n]);}else{const sign=edge==='bottom'?1:-1,border=y+(edge==='bottom'?0:3.1);pts.push([z-cellWidth/2,border],[z+cellWidth/2,border]);for(let k=n;k>=0;k--)pts.push([z-cellWidth/2+k*cellWidth/n,border+sign*(.1+r()*.45)]);}tornStrip(pts.map(([z,y])=>[-z,y]),.4,front-.2,0,0,Math.PI/2,color);};
 if(!hole(f,c-1))jagged('left');if(!hole(f,c+1))jagged('right');
 if(!hole(f-1,c)){jagged('bottom');box(roomDepth,.15,cellWidth,front+b.side*roomDepth/2,y+.1,z,stone);}
 if(f<b.floors-1&&!hole(f+1,c)){jagged('top');box(roomDepth,.15,cellWidth,front+b.side*roomDepth/2,y+3.02,z,stone);}
 rod([front+b.side*.15,y+.25,z-cellWidth*.32],[front+b.side*.5,y+.7,z-cellWidth*.18],.025);continue;}
 if(originalWall(type==='door'?'wall_1_door_boarded':'wall_1_window_1',front,y,z,cellWidth,3.1,-b.side*Math.PI/2)){if(type==='door'){entranceSteps(front,b.side,z);}else if(type==='boarded'){for(let k=0;k<3;k++)box(.12,.2,cellWidth*.6,face-b.side*.18,y+1+k*.5,z,0x8a7756);}continue;}
 box(.38,3.1,cellWidth,front,y+1.55,z,color);box(.28,.18,cellWidth,front-b.side*.1,y+.1,z,0x614333);
 box(roomDepth,.15,cellWidth,front+b.side*roomDepth/2,y+.1,z,stone);
 const wh=type==='door'?2.3:1.65,ww=type==='door'?1.1:cellWidth*.57,wy=y+(type==='door'?1.15:1.75);
 box(.04,wh,ww,face,wy,z,0x25332e);for(const dz of[-ww/2,ww/2])box(.16,wh+.18,.12,face-b.side*.05,wy,z+dz,0xa18166);for(const dy of[-wh/2,wh/2])box(.18,.12,ww+.22,face-b.side*.08,wy+dy,z,0xa18166);
 if(type==='door'){entranceSteps(front,b.side,z);}
 else if(type==='boarded'){for(let k=0;k<3;k++){const plank=box(.13,.2,ww,face-b.side*.12,wy-.5+k*.5,z,0x8a7756);plank.rotation.x=(k-1)*.22;}}
 else{box(.12,wh,.045,face-b.side*.07,wy,z,0x766e59);if(type==='broken'){for(let k=0;k<3;k++)box(.05,.25,.16,face-b.side*.13,wy+(r()-.5)*wh,z+(r()-.5)*ww,0x75928e);}}
 }}
 const rearRoof=box(5.5,.23,buildingWidth,front+b.side*5.45,H+.08,b.z,0x694635);growthTargets.push({object:rearRoof,kind:'roof'});
 for(let c=0;c<b.columns;c++){const z=b.z-buildingWidth/2+(c+.5)*cellWidth;
 if(!hole(b.floors-1,c)){const roof=box(2.9,.23,cellWidth,front+b.side*1.25,H+.08,z,0x694635);growthTargets.push({object:roof,kind:'roof'});}
 else {const pts=[[z-cellWidth/2,2.8],[z+cellWidth/2,2.8]];for(let k=10;k>=0;k--)pts.push([z-cellWidth/2+k*cellWidth/10,2.7-(.15+r()*.7)]);const lip=tornStrip(pts.map(([z,d])=>[front+b.side*d,-z]),.18,0,H,0,0,stone);lip.rotation.x=-Math.PI/2;for(let k=0;k<4;k++){const slab=box(.35+r()*.4,.18,cellWidth/5,front+b.side*(2.4+r()*.25),H-.12-r()*.3,z-cellWidth/2+(k+.5)*cellWidth/4,stone);slab.rotation.z=b.side*(.15+r()*.45);growthTargets.push({object:slab,kind:'rubble'});rod([front+b.side*2.65,H-.12,z-cellWidth*.3+k*.2],[front+b.side*(1.8+r()*.5),H-.4-r()*.5,z-cellWidth*.3+k*.2],.025);}}
 }

 // Reuse the brownstone's projecting cornices and exterior iron fire escape.
 for(let f=1;f<b.floors;f++){const y=f*3.1,escapeCol=b.columns-1,z=b.z-buildingWidth/2+(escapeCol+.5)*cellWidth;if(hole(f,escapeCol))continue;box(1.15,.1,Math.min(2.2,cellWidth),front-b.side*.65,y,z,steel);const edge=front-b.side*1.2;for(const dz of[-cellWidth*.42,cellWidth*.42])rod([edge,y,z+dz],[edge,y+1,z+dz],.035);rod([edge,y+1,z-cellWidth*.42],[edge,y+1,z+cellWidth*.42],.035);for(let k=0;k<9;k++)rod([edge,y,z-cellWidth*.4+k*cellWidth*.1],[edge,y+1,z-cellWidth*.4+k*cellWidth*.1],.02);if(f<b.floors-1&&!hole(f+1,escapeCol)){for(let k=0;k<10;k++)box(.65,.07,.22,front-b.side*.7,y+k*.31,z-cellWidth*.4+k*cellWidth*.08,steel);rod([edge,y+.1,z-cellWidth*.4],[edge,y+3.1,z+cellWidth*.4],.035);} }
 for(let f=0;f<b.floors;f++)for(let c=0;c<b.columns;c++){if(hole(f,c)||hole(f-1,c))continue;box(.45,.14,cellWidth,front-b.side*.1,f*3.1+.12,b.z-buildingWidth/2+(c+.5)*cellWidth,0x614333);}

 if(b.ivy>.2){for(let k=0;k<8;k++)ivy(front-b.side*.26,.4,b.z-buildingWidth/2+.5+k*(buildingWidth-1)/7,H*(.72+(k%3)*.07));}
 }
 // City infrastructure follows fixed planting/utility slots; state varies, positions do not.
 // Shallow side alleys breathe between houses, with a recessed boundary wall.
 for(const side of[-1,1])for(const z of[-18,-9,0,9,18]){box(.25,2.8,2,side*10.5,1.4,z,0x614333,true);for(let k=0;k<5;k++)rod([side*10.5,2.8,z-.85+k*.42],[side*10.5,3.25,z-.85+k*.42],.025);}
 // Mature street trees form overlapping horizontal foliage decks above the road.
 for(const side of[-1,1])for(const z of[-12,0,12]){const x=side*5.65,crownX=x-side*1.1,occupied=treeCanopyMask((block.seed+Math.imul(z+19,7919)+(side>0?104729:0))>>>0);box(1,.015,1.2,x,.285,z,0x344b32);rod([x,.3,z],[x,9.8,z],.3,0x615642);
 for(let k=0;k<10;k++){const a=k*Math.PI*2/10,dx=Math.cos(a)*4.7,dz=Math.sin(a)*4.2;rod([x,6.5+(k%3)*.6,z],[crownX+dx,9.4+(k%2)*.6,z+dz],.11,0x615642);}
 // Occupied tiles seed rounded overlapping tufts, rather than rectangular leaf patches.
 for(const cell of occupied){let cx=-5.4+(cell%4+.5)*2.7+(r()-.5)*.8,cz=-4.7+(Math.floor(cell/4)+.5)*2.35+(r()-.5)*.8;const centerQ=(cx/5.4)**2+(cz/4.7)**2;if(centerQ>.88){const scale=Math.sqrt(.88/centerQ);cx*=scale;cz*=scale;}const tuftSize=1.4+r()*.6,tuftHeight=(r()-.5)*.7;
 for(let layer=0;layer<4;layer++)for(let k=0;k<22;k++){const a=k*2.399+cell*.43,rad=Math.sqrt((k+.5)/22)*tuftSize*(1-layer*.13),gx=cx+Math.cos(a)*rad,gz=cz+Math.sin(a)*rad,q=(gx/5.4)**2+(gz/4.7)**2,outline=1+.09*Math.sin(Math.atan2(gz,gx)*9+cell);if(q>outline)continue;const w=1.35+r()*.45,mesh=new T.Mesh(new T.PlaneGeometry(w,w*(.9+r()*.2)),leafMat());mesh.position.set(crownX+gx,9+layer*.85+Math.max(0,1-q)*1.1+tuftHeight+(r()-.5)*.3,z+gz+offset);mesh.rotation.set(-Math.PI/2+(r()-.5)*.5,(r()-.5)*.25,r()*Math.PI*2);root.add(mesh);}}


 }

 for(const side of[-1,1])for(const z of[-9,9]){const x=side*6.9;rod([x,.3,z],[x,6.7,z],.11);rod([x-.6,6.1,z],[x+.6,6.1,z],.06);rod([x,6.7,z],[x-side*1.8,6.6,z],.05);box(.55,.15,.35,x-side*1.8,6.5,z,steel);}
 for(const side of[-1,1]){rod([side*6.9,6.3,-18],[side*6.9,5.8,0],.014);rod([side*6.9,5.8,0],[side*6.9,6.3,18],.014);}
 for(const mound of block.rubble){const wall=mound.side*8.5;for(let k=0;k<6;k++){const depth=mound.reach/6,h=mound.height*(1-k/6),x=wall-mound.side*(k+.5)*depth;box(depth,h,5,x,h/2,mound.z,0x777264,true);for(let j=0;j<4;j++){const m=box(.3+r()*.7,.15+r()*.28,.3+r()*.7,x,h+.1,mound.z+(r()-.5)*5,j%2?stone:0x86543c);m.rotation.set(r()*.5,r()*3,r()*.4);growthTargets.push({object:m,kind:'rubble'});}}
 for(let j=0;j<7;j++){const x=wall-mound.side*r()*mound.reach;rod([x,.6,mound.z-2+r()*4],[x-.6*mound.side,1.1,mound.z+r()*2],.035);}}
 for(const v of block.vehicles){const t=getRuinedVehicle(v.id,v.paint??0)||library.get(v.id);if(!t)continue;const g=new T.Group();for(const p of t.parts){const m=new T.Mesh(p.geometry,p.material);m.userData.shared=true;g.add(m);}const scale=(VEHICLE_TYPES.find(t=>t.id===v.id)?.length||(v.id==='car'?5.2:7))/t.maxSize;g.scale.setScalar(scale);g.rotation.set(0,v.angle,v.roll);g.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(g);g.position.set(v.x-(bounds.min.x+bounds.max.x)/2,-bounds.min.y,v.z+offset-(bounds.min.z+bounds.max.z)/2);root.add(g);
 // Conservative collision includes overturned vehicles. One pavement is reachable around each zone.
 const w=bounds.max.x-bounds.min.x,d=bounds.max.z-bounds.min.z,h=bounds.max.y-bounds.min.y;const safeX=T.MathUtils.clamp(v.x,-5+w/2,5-w/2);g.position.x+=safeX-v.x;colliders.push({x:safeX,z:v.z+offset,w,d,h});growthTargets.push({object:g,kind:'vehicle'});}
 for(let i=0;i<385;i++){const side=i%2?1:-1,x=side*(i%5===0?.6+r()*3.7:4.3+r()*3.9),z=-16+r()*32;for(let k=0;k<3;k++){const height=.4+r()*.65,m=new T.Mesh(new T.PlaneGeometry(.5,height),grassMat());m.position.set(x,(Math.abs(x)>5.05?.27:.03)+height/2,z+offset);m.rotation.y=k*Math.PI/3;root.add(m);}}
 // Surface growth runs only after all rigid assets have their final pose.
 root.updateMatrixWorld(true);const ray=new T.Raycaster(),down=new T.Vector3(0,-1,0),up=new T.Vector3(0,1,0),planeNormal=new T.Vector3(0,0,1);let surfacePlants=0;
 function plantAt(hit,grass=false){const normal=hit.face.normal.clone().transformDirection(hit.object.matrixWorld);const m=new T.Mesh(new T.PlaneGeometry(grass?.35:.32,grass?.38:.42),grass?grassMat():leafMat());m.position.copy(hit.point).addScaledVector(normal,.025);if(grass){m.position.y+=.18;m.rotation.y=r()*Math.PI;}else{m.quaternion.setFromUnitVectors(planeNormal,normal);m.rotateZ(r()*Math.PI*2);}root.add(m);surfacePlants++;return m;}
 for(const target of growthTargets){const bounds=new T.Box3().setFromObject(target.object),size=bounds.getSize(new T.Vector3()),center=bounds.getCenter(new T.Vector3()),count=target.kind==='vehicle'?36:target.kind==='roof'?20:4;
  for(let j=0;j<count;j++){const x=bounds.min.x+r()*size.x,z=bounds.min.z+r()*size.z;ray.set(new T.Vector3(x,bounds.max.y+1,z),down);const hit=ray.intersectObject(target.object,true)[0];if(!hit)continue;const normal=hit.face.normal.clone().transformDirection(hit.object.matrixWorld);if(normal.dot(up)<.3)continue;plantAt(hit,j%3!==0);}
  if(target.kind==='vehicle'){for(const side of[-1,1])for(let strand=0;strand<4;strand++){let previous=null;const z=center.z+(r()-.5)*size.z*.7;for(let j=0;j<12;j++){const y=bounds.min.y+.15+j*size.y/12;ray.set(new T.Vector3(center.x+side*(size.x/2+1),y,z+Math.sin(j*.8)*.13),new T.Vector3(-side,0,0));const hit=ray.intersectObject(target.object,true)[0];if(!hit){previous=null;continue;}const m=plantAt(hit);if(previous&&previous.distanceTo(m.position)<.7)rod([previous.x,previous.y,previous.z-offset],[m.position.x,m.position.y,m.position.z-offset],.013,0x52643c);previous=m.position.clone();}}}
 }
 root.userData.surfacePlants=surfacePlants;
 if(!hasBrickPassage(colliders.slice(colliderStart),offset))throw Error('통행 가능한 경로가 없습니다.');root.updateMatrixWorld(true);const buckets=new Map();root.traverse(o=>{if(!o.isMesh)return;const geo=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();geo.applyMatrix4(o.matrixWorld);if(!geo.attributes.uv)geo.setAttribute('uv',new T.Float32BufferAttribute(new Float32Array(geo.attributes.position.count*2),2));if(!buckets.has(o.material))buckets.set(o.material,[]);buckets.get(o.material).push(geo);if(!o.userData.shared)o.geometry.dispose();});root.clear();for(const [material,geos]of buckets){const geometry=mergeGeometries(geos,false);geos.forEach(g=>g.dispose());if(!geometry)throw Error('거리 메시 병합 실패');root.add(new T.Mesh(geometry,material));}root.userData.blockSeed=block.seed;return root;
}
export function disposeBrickStreet(root){root.traverse(o=>{if(o.isMesh&&!o.userData.shared)o.geometry.dispose();});}

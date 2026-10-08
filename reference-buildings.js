import * as T from 'three';
import {replaceTemplates} from './asset-upgrades.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
export const referenceAssetInfo=[
 {id:'ref-brownstone',name:'덩굴 벽돌 주택',description:'사진 1 · 4층의 반복 창문, 현관 계단, 철제 비상계단과 벽을 타고 오르는 덩굴.',source:'wall_1_window_1 / wall_1_door_boarded / wall_column / leaf_1'},
 {id:'ref-office',name:'붕괴한 모퉁이 오피스',description:'사진 2 · 창문이 반복되는 7층 외벽, 통째로 무너진 모서리와 드러난 바닥판.',source:'Wall_Window_1 / Wall_1_Destroyed_1 / Floor_1 / rubble_1'},
 {id:'ref-tower',name:'노출된 고층 골조',description:'사진 3 · 12층 골조, 뜯겨나간 외벽과 빈 층, 건물 꼭대기의 비대칭 잔해.',source:'Wall_Window_2 / wall_column / Floor_1 / leaf_1'},
 {id:'ref-bridge',name:'끊어진 현수교',description:'사진 4 · 두 개의 아치가 난 교탑, 처진 주 케이블과 파손된 교량 상판.',source:'road_chunk_1 / road_chunk_2 / rubble_1 / wall_column'},
 {id:'ref-alley',name:'비상계단 벽돌 골목',description:'사진 5 · 마주 선 벽돌 외벽, 철제 비상계단, 낮은 창고와 잔해가 있는 골목.'},
 {id:'ref-warehouse',name:'항만 벽돌 창고',description:'사진 6 · 큰 화물 출입구, 톱니 형태의 파손 지붕과 컨테이너가 있는 창고.'},
 {id:'ref-roofless',name:'지붕이 무너진 블록 건물',description:'사진 7 · 여러 층의 창문, 열린 옥상과 기울어진 지붕 철골.'},
 {id:'ref-colonnade',name:'석조 기둥 건물',description:'사진 8 · 여섯 개의 세로 홈 기둥과 삼각 박공, 깊게 들어간 정면 창문.'}
];
export function composeReferenceAssets(library){
 const stone=new T.MeshStandardMaterial({color:0x9a9686,roughness:1,side:T.DoubleSide}),brick=new T.MeshStandardMaterial({color:0x74574b,roughness:1}),steel=new T.MeshStandardMaterial({color:0x414942,roughness:.9}),leaf=new T.MeshStandardMaterial({color:0x61744b,roughness:1,flatShading:true}),glass=new T.MeshStandardMaterial({color:0x293c3b,roughness:.7});
 const result=new Map();
 for(const info of referenceAssetInfo){const groups=new Map();let sources=new Set();const tinted=new Map();
  function addGeometry(g,mat,matrix=new T.Matrix4()){let geo=g.index?g.toNonIndexed():g.clone();geo.applyMatrix4(matrix);if(!geo.attributes.uv)geo.setAttribute('uv',new T.Float32BufferAttribute(new Float32Array(geo.attributes.position.count*2),2));if(!groups.has(mat.uuid))groups.set(mat.uuid,{material:mat,geometries:[]});groups.get(mat.uuid).geometries.push(geo);}
  function transform(x,y,z,w,h,d,angle=0){return new T.Matrix4().compose(new T.Vector3(x,y,z),new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),angle),new T.Vector3(w,h,d));}
  function box(w,h,d,x,y,z,mat=stone,angle=0){const g=new T.BoxGeometry(1,1,1);addGeometry(g,mat,transform(x,y,z,w,h,d,angle));g.dispose();}
  function asset(id,x,y,z,w,h,d,angle=0){const t=library.get(id);if(!t)throw Error('Missing modular asset '+id);sources.add(id);const matrix=transform(x,y,z,w/t.size.x,h/t.size.y,d/t.size.z,angle);for(const p of t.parts){let material=p.material;if(['ref-brownstone','ref-alley','ref-warehouse','ref-roofless'].includes(info.id)&&id.startsWith('wall_1')){if(!tinted.has(material.uuid)){const m=material.clone();m.color.multiply(new T.Color(0xa1745b));tinted.set(material.uuid,m);}material=tinted.get(material.uuid);}addGeometry(p.geometry,material,matrix);}}
  function beam(a,b,r=.07,mat=steel){const delta=new T.Vector3(...b).sub(new T.Vector3(...a)),g=new T.CylinderGeometry(r,r,delta.length(),5),m=new T.Matrix4().compose(new T.Vector3(...a).add(new T.Vector3(...b)).multiplyScalar(.5),new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize()),new T.Vector3(1,1,1));addGeometry(g,mat,m);g.dispose();}
  function ivy(x,y,z,count=8){for(let i=0;i<count;i++){const g=new T.IcosahedronGeometry(.26+(i%3)*.07,0);addGeometry(g,leaf,transform(x+Math.sin(i*2)*.32,y-i*.45,z+Math.cos(i*3)*.09,1,1.1, .65));g.dispose();}}
  function rubble(x,z,count=10){for(let i=0;i<count;i++)asset('rubble_1',x+Math.sin(i*2.4)*i*.22,0,z+Math.cos(i*2.4)*i*.22,.6+i%3*.35,.25+i%2*.22,.7+i%3*.2,i*1.2);}
  if(info.id==='ref-brownstone'){
   const W=8,D=7,H=12.6;box(W+1,.4,D+1,0,.2,0);for(let f=0;f<4;f++){const y=.4+f*3;box(W,.18,D,0,y,0,brick);for(let c=0;c<4;c++)asset(f===0&&c===1?'wall_1_door_boarded':'wall_1_window_1',-3+c*2,y,3.42,1.95,2.9,.26);for(let c=0;c<4;c++)asset('wall_1_window_1',-3+c*2,y,-3.42,1.95,2.9,.26,Math.PI);for(const side of[-1,1])for(let c=0;c<3;c++)asset('wall_1_window_1',side*3.94,y,-2.3+c*2.3,2.25,2.9,.26,side*Math.PI/2);box(8.25,.17,7.25,0,y+2.9,0,brick);}
   box(8.5,.3,7.5,0,H,0,brick);box(8.3,.65,.3,0,H+.35,3.55,brick);for(let i=0;i<6;i++)box(2.2,(i+1)*.17,.45,-1, (i+1)*.085,5.7-i*.45);for(const x of[-2.2,.2])beam([x,.3,5.8],[x,1.8,3.5],.035);
   for(let f=1;f<4;f++){const y=.4+f*3;box(2.2,.1,1.15,2,y,4.05,steel);for(const x of[.95,3.05]){beam([x,y,4.57],[x,y+1,4.57],.035);beam([x,y+1,3.5],[x,y+1,4.57],.035);}beam([.95,y+1,4.57],[3.05,y+1,4.57],.035);for(let i=0;i<10;i++){const x=.95+i*.22;beam([x,y,4.57],[x,y+1,4.57],.02);box(.52,.07,.25,1.4+i*.13,y+i*.3,4.02,steel);}beam([1.1,y+.1,4.4],[2.5,y+3,4.4],.035);}
   for(const x of[-3.6,.6,3.6])ivy(x,11,3.64,22);rubble(-3,4,9);
  }else if(info.id==='ref-office'){
   const W=10,D=9;for(let f=0;f<7;f++){const y=f*3.1,missing=f>1;asset('Floor_1',missing?-1:0,y,0,missing?8:10,.2,D);for(let c=0;c<5;c++){if(missing&&c>2)continue;asset(f%3===1?'Wall_1_Destroyed_1':'Wall_Window_1',-4+c*2,y,4.4,1.98,3,.22);}for(let c=0;c<5;c++)asset('Wall_Window_1',-4+c*2,y,-4.4,1.98,3,.22,Math.PI);for(const side of[-1,1])for(let c=0;c<4;c++){if(side===1&&missing&&c>1)continue;asset('Wall_Window_1',side*4.9,y,-3.35+c*2.2,2.18,3,.22,side*Math.PI/2);}for(const x of[-4.7,-.7,3.4])for(const z of[-4.3,0,4.3]){if(x>0&&z>0&&f>2)continue;asset('wall_column',x,y,z,.3,3.1,.3);}box(W+.2,.12,D+.2,0,y+.1,0,stone);}
   // A broken floor is a jagged polygon mesh, with exposed reinforcing bars.
   const shape=new T.Shape();shape.moveTo(-1,0);shape.lineTo(4,0);shape.lineTo(3.3,2.1);shape.lineTo(1.8,1.4);shape.lineTo(.9,3);shape.lineTo(-1,2.5);const slab=new T.ExtrudeGeometry(shape,{depth:.18,bevelEnabled:false});slab.rotateX(-Math.PI/2);slab.rotateZ(-.3);slab.translate(1,8,3.5);addGeometry(slab,stone);slab.dispose();for(let i=0;i<7;i++)beam([.2+i*.4,8,3.5],[1+i*.4,6.5,5.4],.025);rubble(2,5,22);ivy(-3,20,4.65,36);ivy(.7,18,4.65,18);
  }else if(info.id==='ref-tower'){
   for(let f=0;f<12;f++){const y=f*3;asset('Floor_1',0,y,0,8,.18,8);for(const x of[-3.7,0,3.7])for(const z of[-3.7,0,3.7])asset('wall_column',x,y,z,.27,3,.27);for(const side of[-1,1])for(let c=0;c<4;c++){if((f+c+(side>0?2:0))%5<2||f>9&&c>1)continue;asset('Wall_Window_2',-3+c*2,y,side*3.85,1.98,2.9,.2,side<0?Math.PI:0);if((f+c)%3)asset('Wall_Window_2',side*3.85,y,-3+c*2,1.98,2.9,.2,side*Math.PI/2);}}
   for(let i=0;i<8;i++)beam([-3+i*.8,36,3.6],[-3+i*.8+.2,37+i%3,3.5],.025);ivy(-3.4,31,4.01,42);ivy(3.8,20,1,28);rubble(0,4,14);
  }else if(['ref-alley','ref-warehouse','ref-roofless','ref-colonnade'].includes(info.id)){
   function shell(cx,cz,w,d,floors,openRoof=false){for(let f=0;f<floors;f++){const y=f*3;box(w,.18,d,cx,y,cz);for(let c=0;c<Math.round(w/2);c++){const x=cx-w/2+1+c*2;asset(f===0&&c===1?'wall_1_door_boarded':'wall_1_window_1',x,y,cz+d/2,1.95,2.9,.25);asset('wall_1_window_1',x,y,cz-d/2,1.95,2.9,.25,Math.PI);}for(const side of[-1,1])for(let c=0;c<Math.round(d/2);c++)asset('wall_1_window_1',cx+side*w/2,y,cz-d/2+1+c*2,1.95,2.9,.25,side*Math.PI/2);}if(!openRoof)box(w+.3,.3,d+.3,cx,floors*3,cz);}
   if(info.id==='ref-alley'){
    shell(-5,0,4,10,4);shell(5,1,4,8,2);for(let f=1;f<4;f++){let y=f*3;box(1.3,.12,3,-2.3,y,0,steel);for(const z of[-1.5,1.5])beam([-2.3,y,z],[-2.3,y+1,z],.04);beam([-2.3,y+1,-1.5],[-2.3,y+1,1.5],.04);for(let i=0;i<10;i++)box(.7,.08,.25,-2.3,y+i*.3,-1.5+i*.28,steel);}
    for(let i=0;i<8;i++){beam([3.1,i*.5,4.8],[3.1,(i+1)*.5,4.8],.035);beam([3.7,i*.5,4.8],[3.7,(i+1)*.5,4.8],.035);beam([3.1,i*.5,4.8],[3.7,i*.5,4.8],.03);}asset('box_1',1,0,-2,1.5,1.2,1.5);asset('barrel_damaged_blue',2,0,3,.8,1,.8);asset('wooden_spike_barricade',-1,0,-4,2,1.2,.6);rubble(0,1,12);ivy(-2.8,11,4.7,24);ivy(2.9,5,4.5,12);
   }else if(info.id==='ref-warehouse'){
    shell(0,0,12,8,2,true);box(5,4,.4,1,2,4.2,steel);box(5.7,.5,1,1,4.3,4.3);for(const x of[-5,-1,3,5]){box(.45,7,.6,x,3.5,4.1,brick);beam([x,6,-4],[x,7,0],.1);beam([x,7,0],[x,5.6,4],.1);}for(let i=0;i<6;i++)box(.7,1+(i%3)*.35,.45,-5+i*2,6.4,-4,brick);
    for(const [x,z]of [[-5,7],[3,7]]){box(4,2,2,x,1,z,steel);for(let c=0;c<13;c++)box(.04,1.9,.07,x-1.8+c*.3,1,z+1.04,stone);}rubble(0,4.5,16);ivy(-5.9,6,4.25,13);ivy(4.9,5,4.25,12);
   }else if(info.id==='ref-roofless'){
    shell(0,0,12,10,5,true);for(let i=0;i<6;i++){const x=-5+i*2;beam([x,15,-5],[x+.7,17,0],.12);beam([x+.7,17,0],[x+.3,14,4],.12);if(i%2===0)box(1.1,.2,3,x,15.5,-2,stone,.2);}box(2,1,.8,-4,15.5,4.7,brick);box(1.2,2,.8,5,16,4.7,brick);ivy(-5.8,14,5.2,25);ivy(3.4,11,5.2,21);rubble(1,6,17);
   }else{
    shell(0,-1,14,8,3);box(17,.7,5,0,.35,5);for(let i=0;i<5;i++)box(16,.14,.55,0,.7+i*.14,7-i*.55);for(let c=0;c<6;c++){const x=-6.25+c*2.5;box(1.5,.35,1.5,x,1.3,4.6);const g=new T.CylinderGeometry(.46,.59,7.2,12);addGeometry(g,stone,transform(x,5.05,4.6,1,1,1));g.dispose();for(let a=0;a<12;a++){let t=a*Math.PI/6;beam([x+Math.cos(t)*.52,1.7,4.6+Math.sin(t)*.52],[x+Math.cos(t)*.43,8.4,4.6+Math.sin(t)*.43],.045);}box(1.4,.5,1.4,x,8.85,4.6);}
    box(16,1.1,2,0,9.6,4.6);const pediment=new T.Shape();pediment.moveTo(-8,0);pediment.lineTo(0,3.1);pediment.lineTo(8,0);pediment.closePath();const g=new T.ExtrudeGeometry(pediment,{depth:1.2,bevelEnabled:false});g.translate(0,10.15,4.1);addGeometry(g,stone);g.dispose();ivy(-7,9,5.4,19);ivy(6.3,11,5.4,23);rubble(0,7,15);
   }
  }else{
   // Pointed twin arch openings are real holes between pier polygons.
   function pier(z){for(const x of[-5,0,5]){box(1.25,17,2,x,8.5,z);asset('wall_column',x,0,z,1.35,17,2.2);}box(11.3,2,2.2,0,17,z);for(const side of[-1,1]){const x=side*2.5;beam([x-1.7,13,z],[x,15.8,z],.38,stone);beam([x,15.8,z],[x+1.7,13,z],.38,stone);}box(12,.5,2.6,0,18.25,z);for(const x of[-5,0,5])box(1.4,.8,2.6,x,18.8,z);ivy(-5.6,16,z+1.2,25);}
   pier(-12);pier(12);for(const side of[-1,1]){for(let i=0;i<32;i++){const z=-24+i*1.5,next=z+1.5,y=Math.abs(z)<=12?7+11*(z/12)**2:18-11*(Math.abs(z)-12)/12,ny=Math.abs(next)<=12?7+11*(next/12)**2:18-11*(Math.abs(next)-12)/12;beam([side*5,y,z],[side*5,ny,next],.075);if(i%2===0&&Math.abs(z)>3)beam([side*5,4,z],[side*5,y,z],.025);}}
   for(let z=-24;z<24;z+=4){if(Math.abs(z)<3)continue;asset(z%8?'road_chunk_1':'road_chunk_2',0,3.7,z,9,.6,4);for(const side of[-1,1])box(.35,.6,4,side*4.7,4.2,z);}
   for(const side of[-1,1])beam([side*4.6,3.8,-2],[side*3.8,1.6,2],.15);rubble(0,-5,12);
  }
  const parts=[...groups.values()].map(g=>({material:g.material,geometry:mergeGeometries(g.geometries,false)}));const bounds=new T.Box3();for(const p of parts){if(!p.geometry)throw Error('Assembly merge failed '+info.id);p.geometry.computeBoundingBox();bounds.union(p.geometry.boundingBox);}const center=bounds.getCenter(new T.Vector3()),size=bounds.getSize(new T.Vector3());for(const p of parts)p.geometry.translate(-center.x,-bounds.min.y,-center.z);for(const g of groups.values())for(const geo of g.geometries)geo.dispose();result.set(info.id,{parts,size,maxSize:Math.max(size.x,size.y,size.z),sources:[...sources]});
 }
 return replaceTemplates(result);
}

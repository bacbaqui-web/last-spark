import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {mossMaterial} from './street-moss-material.js';
export const streetPropTypes=[{id:'traffic-signal',name:'파손된 뉴욕 신호등'},{id:'pedestrian-signal',name:'꺼진 보행자 신호등'},{id:'street-lamp',name:'휘어진 곡선 가로등'},{id:'utility-pole',name:'끊긴 전선 전신주'},{id:'street-sign',name:'기울어진 거리 표지판'},{id:'hydrant',name:'녹슨 소화전'},{id:'litter-bin',name:'찌그러진 쓰레기통'},{id:'electrical-box',name:'문이 열린 전기 제어함'},{id:'parking-meter',name:'깨진 주차계'},{id:'bus-stop',name:'훼손된 버스정류장 표지'}];
let material;const geometryCache=new Map(),labelCache=new Map();
function bodyMaterial(){if(material)return material;material=new T.MeshStandardMaterial({color:0xffffff,roughness:.92,metalness:.22});if(typeof document!=='undefined'){material.map=new T.TextureLoader().load(new URL('./textures/street/nyc-prop-materials.jpg',document.baseURI).href);material.map.colorSpace=T.SRGBColorSpace;}mossMaterial(material,.45);return material;}
function label(text,bg='#d5cfba',fg='#282820'){
 const key=text+bg+fg;if(labelCache.has(key))return labelCache.get(key);const m=new T.MeshStandardMaterial({color:0xffffff,roughness:1,side:T.DoubleSide});
 if(typeof document!=='undefined'){const c=document.createElement('canvas');c.width=512;c.height=256;const ctx=c.getContext('2d');ctx.fillStyle=bg;ctx.fillRect(0,0,512,256);ctx.strokeStyle=fg;ctx.lineWidth=12;ctx.strokeRect(12,12,488,232);ctx.fillStyle=fg;ctx.font='bold 58px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';const lines=text.split('|');lines.forEach((line,i)=>ctx.fillText(line,256,128+(i-(lines.length-1)/2)*70,460));let seed=34;for(let i=0;i<1900;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const x=seed%512,y=(seed>>>12)%256;ctx.fillStyle=i%3?'rgba(48,29,15,.18)':'rgba(131,93,47,.6)';ctx.fillRect(x,y,2+i%7,1+i%4);}ctx.strokeStyle='rgba(20,16,12,.5)';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(34,0);ctx.lineTo(80,100);ctx.lineTo(38,256);ctx.stroke();m.map=new T.CanvasTexture(c);m.map.colorSpace=T.SRGBColorSpace;}labelCache.set(key,m);return m;
}
export function createNYCStreetProp(index=0){
 index=((index%10)+10)%10;const root=new T.Group(),parts=[];
 function add(g,tile,x,y,z,rotation=[0,0,0]){const o=new T.Object3D();o.position.set(x,y,z);o.rotation.set(...rotation);o.updateMatrix();g.applyMatrix4(o.matrix);if(g.index)g=g.toNonIndexed();const uv=g.attributes.uv,tx=tile%2*.5,ty=tile<2?.5:0;for(let i=0;i<uv.count;i++)uv.setXY(i,tx+.015+uv.getX(i)*.47,ty+.015+uv.getY(i)*.47);parts.push(g);}
 const box=(x,y,z,w,h,d,tile=1,rot)=>add(new T.BoxGeometry(w,h,d),tile,x,y,z,rot);
 const cyl=(x,y,z,r,h,tile=1,rot)=>add(new T.CylinderGeometry(r*.9,r,h,10),tile,x,y,z,rot);
 const pipe=(points,r=.06,tile=1)=>add(new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),20,r,6,false),tile,0,0,0);
 function face(text,x,y,z,w,h,bg,fg,rot=0){const mesh=new T.Mesh(new T.PlaneGeometry(w,h),label(text,bg,fg));mesh.position.set(x,y,z);mesh.rotation.z=rot;mesh.userData.ownedGeometry=true;root.add(mesh);}
 function pole(h=5.6){cyl(0,.10,0,.22,.20);cyl(0,h/2,0,.095,h);for(const y of [.3,2.1,h-.4])cyl(0,y,0,.12,.07);}
 function signal(x,y,z){box(x,y,z,.40,1.25,.28,0,[0,0,-.12]);for(let i=0;i<3;i++){cyl(x+(i-1)*.035,y+.39-i*.39,z+.18,.145,.18,0,[Math.PI/2,0,0]);face(i===0?'╱':'●',x+(i-1)*.035,y+.39-i*.39,z+.28,.23,.23,'#252721',i===0?'#443329':i===1?'#49412b':'#283c32');}}
 if(index===0){pole();pipe([[0,5.2,0],[.5,5.55,0],[1.5,5.7,0],[3.3,5.45,0],[4.4,5.2,0]],.075);pipe([[.1,5.65,0],[2.3,5.63,0],[4.4,5.2,0]],.018,2);cyl(4.1,4.9,0,.045,.6);signal(4.1,4.05,0);face('ONE WAY  →',.65,2.8,.13,1.4,.38);pipe([[4.15,4.8,-.1],[4.45,3.8,-.12],[4.25,3.0,.1]],.015,2);}
 if(index===1){pole(3.8);box(.35,2.55,0,.8,.08,.12,0);box(.68,2.35,0,.68,.64,.28,0,[0,0,.12]);face('×',.68,2.35,.16,.53,.49,'#161b18','#3f4435',.12);face('WALKER ST',.65,3.45,.12,1.55,.35,'#554c35','#c4c0a8',-.06);}
 if(index===2){pole(6.5);pipe([[0,6,0],[.1,6.6,0],[.7,7,0],[1.6,7.15,0],[2.25,6.8,0]],.07);box(2.25,6.72,0,.6,.2,.34,1,[0,0,.22]);face('╱',2.25,6.65,.18,.4,.14,'#232823','#4a4d43',.22);pipe([[2.15,6.8,0],[2.45,6.2,0],[2.3,5.45,0]],.013,2);root.rotation.z=.06;}
 if(index===3){cyl(0,3.5,0,.16,7,3);box(0,6.1,0,2.3,.16,.18,3,[0,0,.08]);for(const x of [-.8,-.35,.4,.9]){cyl(x,6.35,0,.075,.3,1);cyl(x,6.32,0,.10,.05,1);}cyl(.32,5.35,0,.22,.7);pipe([[-.8,6.5,0],[-1.5,5.6,.12],[-2,4.5,.3],[-1.7,3.4,.2]],.019,2);pipe([[.8,6.5,0],[2.1,5.5,0],[3.2,5.8,0]],.019,2);}
 if(index===4){pole(3.4);face('BROADWAY',.45,3.05,.13,1.65,.35,'#514c39','#dbd6bc',-.1);face('←  ONE WAY',.3,2.6,.13,1.3,.42,undefined,undefined,.08);face('NO PARKING',.2,1.9,.13,.6,.7,'#c6c1ab','#6c3629',-.17);root.rotation.z=.1;}
 if(index===5){cyl(0,.42,0,.18,.7,0);cyl(0,.82,0,.23,.14,0);cyl(0,.96,0,.13,.14,0);cyl(-.28,.55,0,.11,.24,0,[0,0,Math.PI/2]);cyl(.27,.55,0,.11,.23,0,[0,0,Math.PI/2]);pipe([[.28,.55,.13],[.33,.29,.2],[.10,.08,.13]],.017,2);}
 if(index===6){cyl(0,.52,0,.36,1.04,2);cyl(0,1.04,0,.40,.08,2,[0,0,.15]);for(let i=0;i<10;i++){const a=i/10*6.28;cyl(Math.cos(a)*.355,.52,Math.sin(a)*.355,.012,.95,1);}face('KEEP NYC|CLEAN',0,.65,.37,.48,.38,'#b7b39f','#233629');box(.25,1.03,.1,.43,.025,.45,2,[.15,0,.4]);}
 if(index===7){box(0,.68,0,.75,1.35,.45,2);box(.53,.68,.20,.7,1.18,.035,2,[0,.9,0]);box(0,.68,.25,.60,1.15,.025,1);for(let i=0;i<5;i++)box(-.18+i*.08,.80,.29,.025,.44,.025,2);pipe([[.17,.6,.27],[.3,.2,.4],[.25,.04,.65]],.017,2);face('DANGER|HIGH VOLTAGE',0,1.11,.28,.54,.25,'#b7aa78','#433123');}
 if(index===8){cyl(0,.65,0,.055,1.3);box(0,1.45,0,.28,.4,.2,1);face('╱|EXPIRED',0,1.48,.11,.22,.25,'#282e29','#717564');box(.05,1.31,.13,.10,.035,.025,2);root.rotation.z=-.14;}
 if(index===9){pole(3.7);face('BUS|M1 · M2',0,3.2,.13,.64,.88,'#40565b','#c5cabb',.06);face('ROUTE MAP',0,1.85,.13,.6,.75,'#a8a798','#353c34',-.07);box(.3,.32,.20,.65,.06,.28,1,[0,.3,.2]);}
 if(!geometryCache.has(index)){const g=mergeGeometries(parts);g.computeBoundingBox();geometryCache.set(index,g);parts.forEach(g=>g.dispose());}else parts.forEach(g=>g.dispose());
 const mesh=new T.Mesh(geometryCache.get(index),bodyMaterial());mesh.castShadow=mesh.receiveShadow=true;mesh.userData.collisionKind='prop';root.add(mesh);root.name=streetPropTypes[index].id;root.userData.streetProp=index;return root;
}
export function addNYCStreetProps(root,options={}){
 const start=options.minZ??-32,end=options.maxZ??32,positions=options.junction?[[0,4.05,start+1],[1,-4.15,start+2],[4,5.2,start+1],[2,-5.1,(start+end)/2],[3,6.7,end-2],[9,-6.1,end-5],[5,4.2,(start+end)/2+2],[6,-6.5,start+8],[7,7,end-8],[8,-4.5,end-11]]:[[0,4.05,-28],[1,-4.1,28],[2,-5.5,-12],[2,5.5,15],[3,6.8,22],[4,-5,-29],[5,4.2,-2],[6,-6.4,7],[7,7,-19],[8,-4.5,19],[9,6.2,29]];
 for(const [index,x,z] of positions){const p=createNYCStreetProp(index);p.position.set(x,.205,z);p.rotation.y=x>0?Math.PI:0;root.add(p);}root.userData.streetProps=positions.length;
}

import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
export const VEHICLE_PAINTS=[{name:'퇴색한 붉은색',color:0x984d43},{name:'청록색',color:0x497f79},{name:'회청색',color:0x56748e},{name:'황토색',color:0xb69b55},{name:'아이보리',color:0xbab7a3},{name:'올리브',color:0x687756},{name:'남색',color:0x3e5268},{name:'검회색',color:0x525654}];
export const VEHICLE_TYPES=[
 {id:'street-sedan',name:'세단',length:4.8,width:1.85,height:1.5,style:'sedan'},
 {id:'street-hatch',name:'해치백',length:3.8,width:1.75,height:1.55,style:'hatch'},
 {id:'street-wagon',name:'스테이션 왜건',length:5.1,width:1.9,height:1.65,style:'wagon'},
 {id:'street-suv',name:'SUV',length:4.9,width:2.05,height:1.95,style:'suv'},
 {id:'street-pickup',name:'픽업트럭',length:5.5,width:2.05,height:1.9,style:'pickup'},
 {id:'street-taxi',name:'택시',length:4.85,width:1.9,height:1.6,style:'taxi'},
 {id:'street-van',name:'승합차',length:5.2,width:2.05,height:2.25,style:'van'},
 {id:'street-ambulance',name:'구급차',length:5.6,width:2.15,height:2.65,style:'ambulance'},
 {id:'street-delivery',name:'배달 화물차',length:6.4,width:2.35,height:3,style:'delivery'},
 {id:'street-minibus',name:'소형 버스',length:7,width:2.35,height:2.85,style:'minibus'},
 {id:'wreck-bus',name:'시내버스',length:10},
 {id:'wreck-truck',name:'대형 화물트럭',length:7}
];
const cache=new Map(),materialCache=new Map();
function sharedMaterial(name,color){const key=name+color;if(!materialCache.has(key))materialCache.set(key,new T.MeshStandardMaterial({color,roughness:1,flatShading:true}));return materialCache.get(key);}
export function getRuinedVehicle(id,paint=0){const info=VEHICLE_TYPES.find(v=>v.id===id);if(!info?.style)return null;const key=id+':'+paint;if(cache.has(key))return cache.get(key);
 const colors={body:VEHICLE_PAINTS[paint%VEHICLE_PAINTS.length].color,glass:0x273a39,rubber:0x262923,rust:0x78513a,metal:0x8a8c7d,light:0xada47f,red:0x964b3e},materials=new Map(),groups=new Map();for(const [name,color]of Object.entries(colors))materials.set(name,sharedMaterial(name,color));
 function add(g,name='body',x=0,y=0,z=0){g.translate(x,y,z);const geo=g.index?g.toNonIndexed():g;if(g!==geo)g.dispose();if(!groups.has(name))groups.set(name,[]);groups.get(name).push(geo);}
 function box(w,h,d,x,y,z,name='body'){add(new T.BoxGeometry(w,h,d),name,x,y,z);}
 const {width:W,length:L,height:H,style}=info,tall=['van','ambulance','delivery','minibus'].includes(style),wheel=style==='suv'||style==='pickup'?.43:.35;
 // A shaped side silhouette creates a hood, cabin and roof, rather than one scaled body box.
 const roofStart=style==='wagon'||style==='suv'||style==='hatch'?-L*.38:-L*.19,roofEnd=tall?L*.43:L*.22,roofY=H-.08,points=[[-L/2,.5],[-L/2,.95],[-L*.38,1.08],[roofStart,roofY],[roofEnd,roofY],[L*.37,1.08],[L/2,.92],[L/2,.5]];
 if(tall){points.splice(0,points.length,[-L/2,.5],[-L/2,H-.05],[L*.25,H-.05],[L*.35,H*.7],[L/2,1.05],[L/2,.5]);}
 if(style==='pickup'){points.splice(0,points.length,[-L/2,.52],[-L/2,.96],[-L*.04,.96],[-L*.04,H],[L*.2,H],[L*.35,1.05],[L/2,.92],[L/2,.52]);}
 const shape=new T.Shape();points.forEach(([z,y],i)=>i?shape.lineTo(z,y):shape.moveTo(z,y));shape.closePath();const body=new T.ExtrudeGeometry(shape,{depth:W,bevelEnabled:false});body.rotateY(-Math.PI/2);body.translate(W/2,0,0);add(body);
 box(W,.12,L,0,.46,0,'rust');for(const x of[-W/2-.035,W/2+.035])for(const z of[-L*.31,L*.31]){const g=new T.CylinderGeometry(wheel,wheel,.23,10);g.rotateZ(Math.PI/2);add(g,'rubber',x,wheel,z);const hub=new T.CylinderGeometry(wheel*.5,wheel*.5,.25,8);hub.rotateZ(Math.PI/2);add(hub,'metal',x,wheel,z);}
 const windowY=tall?H*.73:H*.76;for(const side of[-1,1]){const count=style==='minibus'?6:style==='van'?4:style==='wagon'?3:2;for(let i=0;i<count;i++){if(i===1&&style!=='minibus')continue;const z=tall?-L*.35+i*L*.65/count:roofStart+.25+i*(roofEnd-roofStart-.3)/count;box(.018,tall?.55:.42,tall?L*.55/count:.55,side*(W/2+.014),windowY,z,'glass');}box(.08,.12,.23,side*(W/2+.1),1.04,L*.19,'body');}
 box(W*.75,.38,.025,0,tall?H*.7:1.15,L*.34,'glass');for(const side of[-1,1]){box(.28,.16,.08,side*W*.32,.78,L/2+.02,'light');box(.23,.18,.08,side*W*.33,.77,-L/2-.02,'red');}box(W*.92,.15,.11,0,.54,L/2+.07,'metal');box(W*.92,.15,.11,0,.54,-L/2-.07,'rust');
 if(style==='pickup'){box(W*.8,.025,L*.42,0,.97,-L*.25,'rust');for(const x of[-W*.45,W*.45])box(.11,.28,L*.42,x,1.08,-L*.25);}
 if(style==='taxi')box(.55,.2,.28,0,H+.05,0,'light');if(style==='ambulance'){box(1,.18,.22,0,H+.03,L*.25,'red');for(const x of[-W/2-.02,W/2+.02]){box(.02,.15,.65,x,H*.48,-L*.12,'red');box(.02,.6,.15,x,H*.48,-L*.12,'red');}}
 if(style==='delivery')for(let i=0;i<9;i++)box(W+.025,.025,.035,0,1.2+i*.17,-L*.18,'metal');
 // Dents, missing glazing and exposed rusty seams remain visible in every paint variant.
 for(let i=0;i<12;i++){const side=i%2?1:-1,z=Math.sin(i*2.4)*L*.43;box(.035,.08+(i%3)*.035,.16+(i%4)*.09,side*(W/2+.02),.62+(i%5)*.16,z,'rust');}
 const parts=[...groups].map(([name,geos])=>{const geometry=mergeGeometries(geos,false);geos.forEach(g=>g.dispose());return {geometry,material:materials.get(name)};});const bounds=new T.Box3();for(const p of parts){p.geometry.computeBoundingBox();bounds.union(p.geometry.boundingBox);}const size=bounds.getSize(new T.Vector3()),center=bounds.getCenter(new T.Vector3());for(const p of parts)p.geometry.translate(-center.x,-bounds.min.y,-center.z);const result={parts,size,maxSize:Math.max(size.x,size.y,size.z),name:info.name};cache.set(key,result);return result;
}

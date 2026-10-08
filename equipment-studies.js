import * as THREE from 'three';
import {EQUIPMENT} from './equipment.js';
import {PARTS} from './salvage-campaign.js';
import {CHEST_SLOTS} from './salvage-chest.js';
import {attachExoskeleton,removeExoskeleton,shell,plate} from './exoskeleton-concepts.js';
import {exoskeletonSurface} from './exoskeleton-surface.js';
import {salvageMetal,salvageRubber} from './salvage-metal.js';
import {torsoSurface} from './torso-textures.js';
import {roundedHeadShell} from './robot-head-geometry.js';
import {equipmentFabric} from './equipment-fabric.js';
import {cycleHelmet,motoHelmet} from './road-helmets.js';
import {tacticalHelmet} from './tactical-helmet.js';

// Item studies share the approved rig and closed shells, but have their own silhouettes.
// These are preview assets: inventory names, stats and saved equipment are not mutated.
export const EQUIPMENT_STUDIES={
 beanie:{name:'털모자',concept:'halo',paint:'red',summary:'부드러운 니트 · 도톰하게 접어 올린 밑단'},
 cycle:{name:'경량 통풍 헬멧',concept:'swift',paint:'orange',summary:'자전거형 외피 · 길게 열린 통풍구 · 얇은 고정 끈'},
 moto:{name:'밀폐형 헬멧',concept:'halo',paint:'ivory',summary:'풀페이스 오토바이형 · 곡면 투명 바이저 · 아래턱 보호대'},
 tactical:{name:'전술 헬멧',concept:'field',paint:'olive',summary:'이중 광학 조준기 · 차광 고글 · 하관 보호대'},
 tshirt:{name:'정비복 상의',concept:'swift',paint:'teal',summary:'소매 없는 정비복 · 목 뒤로 접힌 두툼한 후드'},
 vest:{name:'방탄조끼',concept:'bulwark',paint:'olive',summary:'도톰한 목·어깨 패딩 · 돌출된 탄창 파우치 4개'},
 medic:{name:'자가 수복 흉갑',concept:'halo',paint:'ivory',summary:'수직 목보호대 · 밀착 어깨 연결부 · 자동 수복 장치'},
 marksman:{name:'조준 보조 팔 보호대',concept:'swift',paint:'teal',summary:'가는 팔과 어깨 · 손목 광학 센서'},
 brawler:{name:'타격 강화 건틀릿',concept:'bulwark',paint:'orange',summary:'큰 어깨 · 두꺼운 아래팔 · 너클 보호대'},
 runner:{name:'경량 러닝 외장',concept:'swift',paint:'teal',summary:'좁은 골반 · 가는 다리 · 경량 발 외장'},
 exoleg:{name:'동력 보조 각반',concept:'field',paint:'steel',summary:'강화 골반 · 외측 구동 실린더 · 단단한 발'},
 batteryPack:{name:'예비 배터리팩',concept:'field',paint:'teal',summary:'두 개의 교체형 전원 셀과 중앙 잠금쇠'},
 jetPack:{name:'제트팩',concept:'barrel',paint:'orange',summary:'두 개의 추진 포드와 아래로 열린 노즐'},
 shieldPack:{name:'방어막 발생기',concept:'halo',paint:'ivory',summary:'원형 발생 코일 · 양쪽 방열 하우징'},
 autoTurret:{name:'자동 사격 팔',concept:'field',paint:'olive',summary:'어깨 위로 뻗는 관절식 보조 총기'},
 houndPack:{name:'로봇 사냥개',concept:'carapace',paint:'red',summary:'등에 접어 수납한 네 다리와 센서 머리'},
};
export const MODULE_STUDIES={
 repair:{paint:'steel',summary:'잠금쇠와 보강 십자판'},armor:{paint:'olive',summary:'적층 복합판 카트리지'},
 drive:{paint:'orange',summary:'원형 구동 제어부'},reactor:{paint:'teal',summary:'원통형 축전 셀 세 개'},
 weapon:{paint:'red',summary:'제어 기판과 중앙 칩'},core:{paint:'ivory',summary:'보호 링 안의 발전 코어'},
};
const dark=salvageMetal('dark'),glow=new THREE.MeshStandardMaterial({color:0x76d9d0,emissive:0x388d87,emissiveIntensity:.65,roughness:.45});
glow.userData.sharedSalvageMaterial=true;
function builder(parent,surface){
 const add=(geometry,pos=[0,0,0],material=surface,rotation=[0,0,0])=>{const m=new THREE.Mesh(geometry,material);m.position.fromArray(pos);m.rotation.set(...rotation);m.castShadow=m.receiveShadow=true;m.userData.cosmetic=true;m.userData.itemStudy=true;parent.add(m);return m;};
 const box=(size,pos,material=surface)=>{
   const [w,h,d]=size,a=w/2,b=h/2,c=Math.min(w,h)*.12;
   const g=plate([[-a+c,b],[a-c,b],[a,b-c],[a,-b+c],[a-c,-b],[-a+c,-b],[-a,-b+c],[-a,b-c]],d);
   g.translate(0,0,-d/2);return add(g,pos,material);
 };
 const cylinder=(r,h,pos,material=surface,rotation=[0,0,0],r2=r)=>add(new THREE.CylinderGeometry(r,r2,h,10),pos,material,rotation);
 const ring=(radius,tube,pos,material=surface)=>add(new THREE.TorusGeometry(radius,tube,5,14),pos,material);
 const pipe=(points,r=.006,material=dark)=>add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),8,r,5,false),[0,0,0],material);
 return {add,box,cylinder,ring,pipe};
}
function materialFor(type,paint){const d=EQUIPMENT_STUDIES[type],color=paint==='item'?d.paint:paint;return type==='beanie'?equipmentFabric(color,{knit:true}):exoskeletonSurface(d.concept,{paint:color,mark:Object.keys(EQUIPMENT_STUDIES).indexOf(type)+1});}
function headModel(group,type,mat,paint){
 const b=builder(group,mat);
 if(type==='beanie'){
   const shape={rx:.136,ry:.151,rz:.123,cy:.019,frontY:.033,sideY:.004,backY:-.019};
   const crown=roundedHeadShell(shape),p=crown.attributes.position;
   for(let i=0;i<p.count;i++){
     const y=p.getY(i),phi=Math.atan2(p.getX(i),p.getZ(i)+.016),fold=.002*Math.sin(phi*6)*(1-Math.abs(y-.08)/.13);
     p.setX(i,p.getX(i)+Math.sin(phi)*fold);p.setZ(i,p.getZ(i)+Math.cos(phi)*fold);
   }
   crown.computeVertexNormals();b.add(crown);
   b.add(roundedHeadShell({...shape,rx:.143,ry:.154,rz:.131,rim:.034,rows:2,thickness:.008}),[0,-.001,0],equipmentFabric(mat.userData.paint,{knit:true,trim:true}));
   return;
 }
 if(type==='cycle'){cycleHelmet(group,mat);return;}
 if(type==='moto'){motoHelmet(group,mat);return;}
 if(type==='tactical')tacticalHelmet(group,mat,{graphite:paint==='item'});
}
function backModel(group,type,mat){
 const b=builder(group,mat);
 b.box([.174,.250,.050],[0,.002,-.157],dark);
 if(type==='batteryPack'){
   for(const x of[-.062,.062]){
     b.box([.104,.246,.103],[x,0,-.219]);
     b.box([.067,.030,.111],[x,.091,-.218],dark);
     b.box([.045,.014,.005],[x,.014,-.275],glow);
   }
   b.box([.039,.061,.121],[0,-.04,-.218]);
 }else if(type==='jetPack'){
   b.box([.098,.194,.084],[0,.025,-.207]);
   for(const x of[-.105,.105]){
     b.cylinder(.046,.221,[x,.018,-.206]);
     b.cylinder(.044,.055,[x,-.119,-.206],dark,[0,0,0],.056);
     b.add(new THREE.CylinderGeometry(.042,.052,.047,10,1,true),[x,-.126,-.206]);
     b.cylinder(.034,.004,[x,-.146,-.206],dark).name='equipment-nozzle';
     b.box([.045,.016,.007],[x,.054,-.255],glow);
   }
 }else if(type==='shieldPack'){
   b.cylinder(.107,.062,[0,.01,-.209],mat,[Math.PI/2,0,0]);
   b.cylinder(.080,.067,[0,.01,-.215],dark,[Math.PI/2,0,0]);
   b.ring(.066,.008,[0,.01,-.253],glow);b.cylinder(.030,.079,[0,.01,-.218],mat,[Math.PI/2,0,0]);
   for(const x of[-.122,.122])b.box([.044,.181,.079],[x,0,-.204]);
 }else if(type==='autoTurret'){
   b.box([.147,.196,.090],[0,0,-.206]);
   b.box([.045,.214,.056],[-.084,.187,-.190],dark);
   b.cylinder(.039,.053,[-.084,.272,-.186],mat,[Math.PI/2,0,0]);
   const beam=b.box([.200,.047,.054],[-.164,.292,-.133]);beam.rotation.z=-.24;
   b.cylinder(.038,.052,[-.247,.311,-.128],dark,[Math.PI/2,0,0]);
   const gun=new THREE.Group();gun.name='back-auto-gun';gun.position.set(-.248,.327,-.052);group.add(gun);
   const barrel=builder(gun,mat);
   barrel.box([.085,.077,.187],[0,0,0]);
   barrel.cylinder(.022,.104,[0,-.001,.137],dark,[Math.PI/2,0,0]);
   barrel.ring(.019,.005,[0,-.001,.187]);
   barrel.box([.050,.019,.068],[0,.048,.042],dark);
 }else if(type==='houndPack'){
   b.box([.154,.245,.099],[0,-.008,-.220]);
   b.box([.114,.084,.090],[0,.157,-.231]);
   b.box([.098,.041,.085],[0,.133,-.277],dark);
   b.box([.069,.013,.007],[0,.162,-.279],glow);
   for(const sign of[-1,1]){
     b.box([.023,.052,.026],[sign*.043,.208,-.217],dark);
     for(const y of[.069,-.095]){
       b.cylinder(.026,.032,[sign*.102,y,-.203],dark,[0,0,Math.PI/2]);
       const leg=b.box([.044,.107,.047],[sign*.117,y-.034,-.233]);leg.rotation.z=sign*.26;
       const shin=b.box([.036,.080,.039],[sign*.122,y-.034,-.275],dark);shin.rotation.z=-sign*.38;
       b.box([.044,.025,.065],[sign*.094,y+.004,-.281]);
     }
   }
 }
}
// A continuous torso garment/carrier ends at the navel, above the separate pelvis slot.
function torsoModel(robot,type,mat,paint,custom){
 const frame=robot.salvageFrame,isShirt=type==='tshirt',isVest=type==='vest',cloth=isShirt||isVest;
 const color=paint==='item'?EQUIPMENT_STUDIES[type].paint:paint;
 const surface=torsoSurface(type,color,isVest?'carrier':'front'),plain=torsoSurface(type,color,'plain');
 const hem=isShirt?-.290:-.265;
 const profile=isVest?[[.150,.116,.110],[.082,.157,.123],[-.040,.159,.137],[-.174,.149,.157],[hem,.137,.131]]
   :isShirt?[[.168,.115,.108],[.083,.163,.123],[-.045,.159,.139],[-.175,.146,.124],[hem,.149,.123]]
   :[[.156,.115,.108],[.080,.153,.121],[-.112,.145,.133],[hem,.114,.096]];
 function covering(start,end,front){
   const geometry=shell(profile,{start,end,segments:isShirt||isVest?(front?8:10):(front?6:8),thickness:cloth?.004:.007});
   const p=geometry.attributes.position,uv=geometry.attributes.uv;
   for(let i=0;i<p.count;i++){
     const x=p.getX(i),y=p.getY(i),z=p.getZ(i);
     if(isShirt){
       const fold=.0025*Math.sin(y*67+x*42)*Math.sin(Math.PI*(y-hem)/(.169-hem));p.setZ(i,z+Math.sign(z)*fold);
     }
     // The two doors share one uninterrupted front map, including its central zip/seam.
     if(front)uv.setXY(i,THREE.MathUtils.clamp(.5+x/.330,0,1),THREE.MathUtils.clamp((y-hem)/(profile[0][0]-hem),0,1));
   }
   geometry.computeVertexNormals();return geometry;
 }
 function collar(parent,start,end){
   const top=isVest?.268:isShirt?.262:.268;
   const padding=isVest?.014:isShirt?.006:.010,wall=isVest?.022:isShirt?.024:.018;
   const rx=(isVest?.103:.078)+padding,rz=(isVest?.089:.069)+padding;
   const cp=isShirt?[[.262,.107,.096],[.247,.119,.111],[.202,.139,.134],[profile[0][0],profile[0][1],profile[0][2]]]
     :isVest?[[top,rx,rz],[top-.012,rx+.004,rz+.004],[.206,.117,.101],[profile[0][0],profile[0][1],profile[0][2]]]
     :[[top,.117,.103],[top-.012,.120,.106],[.206,.117,.103],[profile[0][0],profile[0][1],profile[0][2]]];
   // Match the body rim vertex for vertex to avoid gaps or intersecting teeth.
   const front=end-start<Math.PI-.01;
   const geometry=shell(cp,{start,end,segments:isShirt||isVest?(front?8:10):(front?6:8),thickness:wall});
   const p=geometry.attributes.position;
   for(let i=0;i<p.count;i++)if(p.getY(i)>.23){
     const z=p.getZ(i)/cp[0][2],front=Math.max(0,z);
     p.setY(i,p.getY(i)-front*(isShirt?.032:.023)-(isShirt?Math.max(0,-z)*.010:0));
   }
   geometry.computeVertexNormals();const guard=builder(parent,plain).add(geometry);guard.name=isShirt?'folded-fabric-hood':'padded-neck-guard';parent.userData.neckGuard=true;
 }
 const rear=custom('item-'+type+'-torso',frame.anchors.spine_03);rear.userData.hemOffset=hem;
 const back=builder(rear,plain);back.add(covering(Math.PI/2,Math.PI*1.5,false));collar(rear,Math.PI/2,Math.PI*1.5);
 for(const {group:door,side}of frame.chestMechanism.doors){
   const g=custom('item-'+type+'-chest-door-'+side,door,[-side*.123,0,-.006]);g.userData.hemOffset=hem;
   const start=side<0?-Math.PI/2:.008,end=side<0?-.008:Math.PI/2;
   builder(g,surface).add(covering(start,end,true));collar(g,start,end);
   if(isVest){
     // Each low-poly volume samples one pouch from the original photographic atlas.
     // All small closures, folds and stitching remain on that texture.
     const pouchSurface=torsoSurface(type,color),b=builder(g,pouchSurface);
     for(const [u0,u1]of(side<0?[[.131,.311],[.322,.502]]:[[.511,.691],[.700,.880]])){
       const x=((u0+u1)/2-.5)*.330,y=-.146,width=(u1-u0)*.330,height=.196,depth=.048;
       const pouch=b.box([width,height,depth],[x,y,.151-Math.abs(x)*.19],pouchSurface),geometry=pouch.geometry;
       const p=geometry.attributes.position,uv=geometry.attributes.uv;
       for(let i=0;i<p.count;i++)uv.setXY(i,u0+(u1-u0)*THREE.MathUtils.clamp(p.getX(i)/width+.5,0,1),.052+.472*THREE.MathUtils.clamp(p.getY(i)/height+.5,0,1));
       // The atlas margin is plain cloth: use it for the sides without new maps/materials.
       for(const part of geometry.groups)if(part.materialIndex===1)for(let i=part.start;i<part.start+part.count;i++)
         uv.setXY(i,.012+.080*THREE.MathUtils.clamp(p.getZ(i)/depth+.5,0,1),.570+.350*THREE.MathUtils.clamp(p.getY(i)/height+.5,0,1));
       pouch.name='magazine-pouch';pouch.userData.magazinePouch=true;
     }
   }else if(!isShirt){
     // Two fitted halves read as one square unit and open with the original chest doors.
     const device=builder(g,torsoSurface(type,color,'device')).box([.094,.130,.050],[side*.049,-.012,.121]);
     const p=device.geometry.attributes.position,uv=device.geometry.attributes.uv;
     for(let i=0;i<p.count;i++)uv.setXY(i,.5+(p.getX(i)+side*.049)/.198,.5+p.getY(i)/.136);
     for(const part of device.geometry.groups)if(part.materialIndex===1)for(let i=part.start;i<part.start+part.count;i++)uv.setXY(i,.01,.02+THREE.MathUtils.clamp(p.getY(i)/.14+.5,0,1)*.10);
     device.name='auto-repair-cartridge';
   }
 }
 if(isShirt){
   // A folded hood hangs down the upper back, distinct from a padded neck ring.
   const hood=shell([[.225,.105,.104],[.165,.125,.165],[.047,.106,.174],[-.026,.035,.109]],{start:Math.PI/2,end:Math.PI*1.5,segments:10,thickness:.016});
   const p=hood.attributes.position;
   for(let i=0;i<p.count;i++)p.setZ(i,p.getZ(i)-.003*Math.cos(p.getX(i)*48)*Math.sin((p.getY(i)+.026)/.251*Math.PI));
   hood.computeVertexNormals();back.add(hood).name='folded-hood-back';
 }else if(isVest){
   // Broad shoulder straps remain in the silhouette; seams and buckles are texture detail.
   for(const side of[-1,1]){
     const points=[[.115,.111],[.178,.053],[.174,-.051],[.117,-.102]];
     for(let i=0;i<points.length-1;i++){
       const [y,z]=points[i],[ey,ez]=points[i+1];
       const strap=back.box([.060,Math.hypot(ey-y,ez-z)+.012,.026],[side*.101,(y+ey)/2,(z+ez)/2]);strap.rotation.x=Math.atan2(ez-z,ey-y);strap.name='padded-shoulder-strap';
     }
   }
 }
 // Keep the short socket straight across the torso, tucked under the arm armor.
 // A torso mount avoids the clavicle's diagonal sweep toward the shoulder.
 for(const side of['l','r']){
   const sign=side==='l'?1:-1,radius=isShirt?.032:isVest?.034:.033;
   const socket=custom('item-'+type+'-shoulder-socket-'+side,frame.anchors.spine_03);
   const connector=builder(socket,plain).add(new THREE.CylinderGeometry(radius,radius*.97,.090,12,1,false),[sign*.153,.126,0],plain,[0,0,-sign*Math.PI/2]);
   connector.name='shoulder-socket';
 }
}

function details(type,groups,mat){
 const get=name=>groups.find(g=>g.name.endsWith('-'+name));
 if(type==='marksman')for(const side of['l','r']){
   const g=get('lowerarm_'+side),sign=side==='l'?1:-1,device=new THREE.Group();
   // The back of each hand faces outward (+X left / -X right) in the forearm frame.
   device.name='forearm-device-'+side;device.rotation.y=sign*Math.PI/2;g.add(device);
   const b=builder(device,mat);
   b.box([.034,.094,.039],[0,-.122,.069],dark);
   b.cylinder(.014,.016,[0,-.093,.093],mat,[Math.PI/2,0,0]);
   b.cylinder(.009,.019,[0,-.093,.094],glow,[Math.PI/2,0,0]);
 }
 if(type==='brawler')for(const side of['l','r']){
   const sign=side==='l'?1:-1,b=builder(get('hand_'+side),mat);
   for(const z of[-.027,0,.027])b.box([.021,.022,.021],[sign*.041,-.119,z]);
 }
 if(type==='exoleg')for(const side of['l','r']){
   const sign=side==='l'?1:-1;
   for(const name of['thigh','calf']){
     const b=builder(get(name+'_'+side),mat);
     b.cylinder(.017,.162,[sign*.074,-.139,-.012],dark);
     b.cylinder(.024,.080,[sign*.074,-.185,-.012]);
   }
 }
}
export function attachEquipmentStudies(robot,equipment,parts=[],{paint='item'}={}){
 removeExoskeleton(robot);
 robot.exoskeletonPreview={id:'items',groups:[],jointCovers:[],triangles:0,slots:[],items:[]};
 const custom=(name,anchor,pos=[0,0,0])=>{
   const g=new THREE.Group();g.name=name;g.position.fromArray(pos);g.userData.itemStudy=true;anchor.add(g);robot.exoskeletonPreview.groups.push(g);return g;
 };
 for(const [slot,item]of Object.entries(equipment)){
   const type=item.type,d=EQUIPMENT_STUDIES[type];if(!d||EQUIPMENT[type].slot!==slot)continue;
   const mat=materialFor(type,paint),before=robot.exoskeletonPreview.groups.length;
   if(slot==='head')headModel(custom('item-'+type,robot.salvageFrame.anchors.Head),type,mat,paint);
   else if(slot==='back'){
     const mount=custom('item-'+type,robot.salvageFrame.anchors.spine_03,[0,.05,.0264]);
     mount.scale.setScalar(1.2);backModel(mount,type,mat);
   }
   else if(slot==='chest')torsoModel(robot,type,mat,paint,custom);
   else{
     attachExoskeleton(robot,d.concept,[slot],{append:true,armStyle:type==='brawler'?'melee':'standard',surfaceOverride:mat,specOverride:type==='exoleg'?{width:1.14}:{}});
     details(type,robot.exoskeletonPreview.groups.slice(before),mat);
   }
   for(const g of robot.exoskeletonPreview.groups.slice(before))g.userData.equipmentType=type;
 }
 for(const p of parts){
   if(!MODULE_STUDIES[p.type]||!CHEST_SLOTS[p.slot])continue;
   const socket=CHEST_SLOTS[p.slot],g=custom('module-study-'+p.type,robot.salvageFrame.anchors.spine_03,socket.position);g.rotation.z=socket.angle;g.userData.moduleType=p.type;g.userData.chestSlot=p.slot;
   buildModuleStudy(g,p.type,socket.size);
 }
 const result=robot.exoskeletonPreview;result.id='items';result.slots=Object.keys(equipment);result.items=Object.values(equipment).map(p=>p.type);result.triangles=0;result.moduleTriangles=0;
 for(const g of result.groups)g.traverse(o=>{if(o.isMesh){const count=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;if(g.userData.moduleType)result.moduleTriangles+=count;else result.triangles+=count;}});
 robot.root.updateMatrixWorld(true);return result;
}
export function buildModuleStudy(g,type,size=CHEST_SLOTS[0].size){
 const d=MODULE_STUDIES[type];if(!d)throw Error('Unknown module study: '+type);
 const mat=exoskeletonSurface('field',{paint:d.paint,mark:Object.keys(PARTS).indexOf(type)+21}),b=builder(g,mat);
 const [w,h,depth]=size;
 b.box([w,h,depth],[0,0,0]);const front=depth/2+.006;
 if(type==='repair'){
   b.box([w*.78,.010,.008],[0,0,front],dark);b.box([.013,h*.71,.012],[0,0,front]);
 }else if(type==='armor')for(let i=0;i<3;i++)b.box([w*.75,h*.24,.009],[0,(i-1)*h*.24,front+(1-i)*.002]);
 else if(type==='drive'){
   b.cylinder(w*.27,.011,[0,0,front],dark,[Math.PI/2,0,0]);b.ring(w*.18,.004,[0,0,front+.008]);
 }else if(type==='reactor')for(const x of[-w*.25,0,w*.25])b.cylinder(w*.105,h*.65,[x,0,front]);
 else if(type==='weapon'){
   b.box([w*.77,h*.70,.004],[0,0,front],dark);b.box([w*.33,h*.30,.009],[0,0,front+.006]);
   for(const sign of[-1,1])b.box([w*.10,h*.50,.005],[sign*w*.27,0,front+.004],glow);
 }else if(type==='core'){
   b.ring(w*.28,.005,[0,0,front+.003]);b.cylinder(w*.18,.015,[0,0,front],glow,[Math.PI/2,0,0]);
 }
 return g;
}

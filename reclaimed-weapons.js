import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {salvageMetal,salvageRubber,salvageChrome} from './salvage-metal.js';
import {weaponPaint} from './reclaimed-weapon-surface.js';

export const RECLAIMED_GUNS=Object.freeze({
 pistol:{name:'기관총',code:'AR–01',tone:'sage',role:'짧은 총열 · 접힌 형태의 개머리판',note:'기본 무기는 몸통 폭에 맞춘 짧은 카빈. 얇은 몸체와 아래로 내린 탄창으로 실루엣을 잡았습니다.'},
 shotgun:{name:'산탄총',code:'SG–02',tone:'ochre',role:'두꺼운 펌프 · 쌍관형 전면',note:'넓은 펌프 손잡이와 짧고 굵은 총구. 마모된 황토색 외피로 근거리 무기를 구분합니다.'},
 sniper:{name:'저격총',code:'SR–03',tone:'slate',role:'긴 총열 · 낮은 망원 조준경',note:'얇고 긴 총열, 닫힌 개머리판, 낮게 붙인 조준경. 로봇 팔보다 지나치게 굵던 몸통을 줄였습니다.'},
 rapid:{name:'미니건',code:'MG–04',tone:'sand',role:'회전 총열 · 측면 탄통',note:'중화기의 무게감은 여섯 개의 총열과 옆 탄통에 집중했습니다. 위쪽에는 별도의 운반 손잡이가 있습니다.'},
 flame:{name:'화염방사기',code:'FT–05',tone:'red',role:'열 차폐구 · 소형 압력 용기',note:'둥근 열 차폐구와 몸체 밑의 압력 용기, 짧은 호스로 재활용 공업 장비 같은 형태를 만들었습니다.'},
 laser:{name:'레이저',code:'LC–06',tone:'slate',role:'각진 방열 외피 · 다섯 개의 발광 셀',note:'총열 대신 낮은 방열 케이스와 교체식 전원 셀. 작동할 때만 청록색 충전부가 밝아집니다.'},
 rail:{name:'광자포',code:'PC–07',tone:'sand',role:'벌어진 전면 레일 · 중앙 축전기',note:'커다란 구체를 없애고 축전기와 두 갈래 전면 덮개로 바꿨습니다. 보랏빛은 내부 충전부에만 남겼습니다.'},
 rocket:{name:'미사일',code:'RL–08',tone:'sage',role:'어깨 발사관 · 측면 광학 조준 장치',note:'긴 원통과 두꺼운 끝단 보호대, 측면의 렌즈와 접안부를 갖춘 어깨형 발사기입니다.'},
});
const V=(x,y,z)=>new T.Vector3(x,y,z),rubber=salvageRubber,steel=salvageMetal('iron'),dark=salvageMetal('dark');
const optic=new T.MeshStandardMaterial({name:'weapon-optic',color:0x173b3e,emissive:0x367f83,emissiveIntensity:.24,metalness:.68,roughness:.17});optic.userData.sharedWeaponMaterial=true;

// Every model uses metres, -Z forward, +Y up. Grip and muzzle anchors are in
// that same space; consumers must not apply the former weapon-specific scale.
export function createReclaimedWeapon(requested){
 const type=requested==='rifle'?'pistol':requested,spec=RECLAIMED_GUNS[type];if(!spec)return null;
 const root=new T.Group();root.name='weapon-'+requested;
 const coat=weaponPaint(spec.tone),panel=weaponPaint(spec.tone,true),trim=weaponPaint('ochre');
 const add=(g,m,p=[0,0,0],parent=root)=>{const o=new T.Mesh(g,m);o.position.set(...p);parent.add(o);return o;};
 const box=(s,p,m=dark,parent=root)=>add(new T.BoxGeometry(...s),m,p,parent);
 function profile(points,width,mat=panel,x=0,parent=root){
  const shape=new T.Shape();points.forEach(([z,y],i)=>i?shape.lineTo(-z,y):shape.moveTo(-z,y));shape.closePath();
  const g=new T.ExtrudeGeometry(shape,{depth:width,steps:1,bevelEnabled:true,bevelSize:.003,bevelThickness:.003,bevelSegments:1,curveSegments:1});
  g.translate(0,0,-width/2);g.rotateY(Math.PI/2);g.computeBoundingBox();
  const {min,max}=g.boundingBox,p=g.attributes.position,n=g.attributes.normal,uv=g.attributes.uv;
  for(let i=0;i<p.count;i++){
   // The large side faces receive a complete panel, not stretched world UVs.
   if(Math.abs(n.getX(i))>.65)uv.setXY(i,(p.getZ(i)-min.z)/(max.z-min.z),(p.getY(i)-min.y)/(max.y-min.y));
   else uv.setXY(i,(p.getZ(i)-min.z)/(max.z-min.z),(p.getX(i)-min.x)/(max.x-min.x));
  }
  return add(g,mat,[x,0,0],parent);
 }
 const shell=(w,h,l,p,mat=panel,parent=root)=>{
  const [x,y,z]=p,b=Math.min(h*.15,l*.1,.022);
  return profile([[z-l/2,y-h/2+b],[z-l/2,y+h/2-b],[z-l/2+b,y+h/2],[z+l/2-b,y+h/2],[z+l/2,y+h/2-b],[z+l/2,y-h/2+b],[z+l/2-b,y-h/2],[z-l/2+b,y-h/2]],w,mat,x,parent);
 };
 function tube(r,length,p,mat=steel,parent=root,open=false){const o=add(new T.CylinderGeometry(r,r,length,12,1,open),mat,p,parent);o.rotation.x=Math.PI/2;return o;}
 function ring(r,thickness,z,y=0,mat=steel,parent=root,x=0){return add(new T.TorusGeometry(r,thickness,4,12),mat,[x,y,z],parent);}
 function bore(r,z,y=0,parent=root,x=0){tube(r,.025,[x,y,z+.012],dark,parent,true);add(new T.CircleGeometry(r,12),rubber,[x,y,z+.021],parent).rotation.y=Math.PI;ring(r,.005,z,y,steel,parent,x);}
 function grip(z=.12,y=-.105){profile([[z-.028,y+.068],[z+.028,y+.068],[z+.040,y-.064],[z-.017,y-.067]],.055,rubber);root.userData.triggerGrip=[0,y,z];
  box([.02,.009,.073],[0,y-.015,z-.07],steel);box([.02,.058,.009],[0,y+.015,z-.10],steel);box([.009,.029,.012],[0,y+.018,z-.048],dark);
 }
 function stock(end=.31){
  // Thin neck and sloping cheek pad break up the receiver/stock silhouette.
  profile([[.07,.029],[end-.065,.033],[end-.025,.012],[end-.025,-.027],[.11,-.019]],.047,dark);
  profile([[end-.142,.053],[end-.047,.053],[end,.012],[end,-.083],[end-.035,-.091],[end-.063,-.019],[end-.142,.001]],.068,coat);
  shell(.082,.126,.022,[0,-.029,end],rubber);root.userData.shoulderMount=[0,-.029,end+.014];
 }
 function rail(z,length,y){const pts=[[z-length/2,y],[z-length/2,y+.009]];for(let i=0;i<8;i++){const at=z-length/2+i*length/8;pts.push([at,y+.009],[at,y+.016],[at+length/8*.55,y+.016],[at+length/8*.55,y+.009]);}pts.push([z+length/2,y+.009],[z+length/2,y]);profile(pts,.032,dark);}

 function foregrip(z=-.22){shell(.077,.066,.18,[0,-.050,z],rubber);root.userData.supportGrip=[-.028,-.056,z];}
 function reflex(z=.025){shell(.051,.018,.073,[0,.092,z],dark);const frame=new T.Shape();frame.moveTo(-.034,.105);frame.lineTo(-.034,.157);frame.lineTo(-.022,.172);frame.lineTo(.022,.172);frame.lineTo(.034,.157);frame.lineTo(.034,.105);frame.closePath();const h=new T.Path();h.moveTo(-.025,.113);h.lineTo(.025,.113);h.lineTo(.025,.153);h.lineTo(.018,.163);h.lineTo(-.018,.163);h.lineTo(-.025,.153);h.closePath();frame.holes.push(h);add(new T.ExtrudeGeometry(frame,{depth:.014,bevelEnabled:false}),rubber,[0,0,z]);root.userData.sightCenter=[0,.138,z+.015];}
 function hose(points,r=.009){return add(new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>V(...p))),10,r,5,false),rubber);}

 if(type==='pistol'){
  profile([[-.185,-.031],[-.19,.036],[-.147,.064],[.077,.059],[.116,.020],[.09,-.053],[-.082,-.068]],.078,panel);
  profile([[-.377,-.023],[-.377,.021],[-.33,.053],[-.179,.049],[-.158,-.009],[-.205,-.039]],.080,panel);
  tube(.018,.145,[0,.023,-.425]);tube(.026,.055,[0,.023,-.49],dark);bore(.016,-.52,.023);
  stock(.275);grip(.073);foregrip(-.255);
  profile([[-.088,-.045],[-.024,-.045],[.001,-.185],[-.054,-.203],[-.081,-.183]],.058,dark);
  shell(.063,.031,.06,[0,-.184,-.043],coat);rail(-.080,.216,.061);reflex();
  root.userData.muzzle=[0,.023,-.525];
 }
 if(type==='shotgun'){
  profile([[-.13,-.022],[-.135,.039],[-.104,.063],[.11,.056],[.144,.014],[.13,-.036],[.01,-.051]],.081,panel);stock(.302);grip(.101);
  tube(.026,.43,[0,.028,-.335]);tube(.024,.38,[0,-.031,-.312],dark);
  shell(.108,.090,.18,[0,-.029,-.275],rubber);shell(.112,.035,.183,[0,-.051,-.275],coat);
  tube(.032,.047,[0,.028,-.541],steel);bore(.023,-.567,.028);ring(.025,.005,-.506,-.031);
  box([.023,.032,.037],[0,.068,-.463],dark);box([.006,.01,.012],[0,.09,-.463],trim);
  root.userData.supportGrip=[-.037,-.046,-.275];root.userData.muzzle=[0,.028,-.572];root.userData.sightCenter=[0,.09,.028];
 }
 if(type==='sniper'){
  profile([[-.20,-.023],[-.188,.036],[.09,.046],[.139,.007],[.134,-.036],[-.032,-.05]],.073,panel);
  profile([[-.395,-.019],[-.382,.028],[-.18,.042],[-.17,-.031]],.070,panel);rail(-.028,.235,.044);
  tube(.016,.325,[0,.016,-.519]);tube(.028,.093,[0,.016,-.697],dark);bore(.020,-.746,.016);
  stock(.345);grip(.105);foregrip(-.263);
  shell(.058,.083,.072,[0,-.080,-.059],dark);
  for(const z of[-.115,.04])box([.036,.054,.024],[0,.065,z],dark);
  tube(.027,.235,[0,.116,-.059],dark);tube(.043,.060,[0,.116,-.195],coat);tube(.035,.055,[0,.116,.080],rubber);
  add(new T.CircleGeometry(.033,12),optic,[0,.116,-.227]).rotation.y=Math.PI;add(new T.CircleGeometry(.026,12),optic,[0,.116,.109]);
  const dial=tube(.018,.024,[.038,.116,-.059],steel);dial.rotation.set(0,0,Math.PI/2);
  root.userData.scopeEye=[0,.116,.111];root.userData.sightCenter=[0,.116,.111];root.userData.muzzle=[0,.016,-.752];
 }
 if(type==='rapid'){
  tube(.080,.258,[0,0,.062],dark);profile([[-.066,-.041],[-.070,.055],[-.015,.095],[.163,.095],[.192,.033],[.163,-.063]],.151,panel);tube(.098,.049,[0,0,-.088],dark);
  const rotor=new T.Group();rotor.name='barrel-rotor';rotor.position.z=-.117;root.add(rotor);
  tube(.028,.371,[0,0,-.18],dark,rotor);
  for(let i=0;i<6;i++){const a=i*Math.PI/3,x=Math.cos(a)*.056,y=Math.sin(a)*.056;tube(.015,.383,[x,y,-.187],steel,rotor);bore(.011,-.382,y,rotor,x);}
  for(const z of[-.032,-.245,-.347])ring(.072,.014,z,0,dark,rotor);
  tube(.088,.149,[.152,-.021,.069],coat);tube(.091,.020,[.152,-.021,.151],dark);tube(.036,.024,[.152,-.021,.167],steel);
  grip(.219,.170);box([.064,.055,.081],[0,.102,.216],dark);
  for(const x of[-.078,.078])box([.023,.107,.025],[x,.132,-.10],dark);
  shell(.186,.03,.047,[0,.188,-.10],rubber);
  box([.035,.066,.08],[.152,-.021,.186],dark);root.userData.beltFeed=[.152,-.021,.229];
  root.userData.rotor=rotor;root.userData.triggerGrip=[0,.170,.219];root.userData.supportGrip=[-.065,.186,-.10];root.userData.muzzle=[0,0,-.507];
 }
 if(type==='flame'){
  profile([[-.133,-.018],[-.135,.043],[-.099,.073],[.110,.060],[.160,.010],[.13,-.059],[-.069,-.050]],.111,panel);grip(.137,-.098);foregrip(-.174);
  for(const z of[-.071,.088])box([.025,.034,.022],[0,.091,z],dark);shell(.044,.026,.182,[0,.121,.007],rubber);
  tube(.041,.255,[0,.018,-.249],dark);tube(.075,.137,[0,.018,-.351],coat);ring(.071,.009,-.423,.018);bore(.043,-.429,.018);
  tube(.056,.226,[0,-.13,-.023],coat);ring(.056,.007,-.103,-.13);ring(.056,.007,.067,-.13);
  hose([[.044,-.13,.07],[.104,-.136,.121],[.106,-.009,.11],[.052,.009,.045]]);
  tube(.011,.123,[0,-.040,-.38],steel);
  const pilot=new T.Group();pilot.position.set(0,-.04,-.45);root.add(pilot);const fire=new T.MeshBasicMaterial({color:0x71cbdc,transparent:true,opacity:.8,depthWrite:false});const tip=add(new T.ConeGeometry(.009,.039,6),fire,[0,0,-.016],pilot);tip.rotation.x=-Math.PI/2;
  root.userData.pilotFlame=pilot;root.userData.carrySupportGrip=[-.03,-.055,-.174];root.userData.muzzle=[0,.018,-.45];
 }
 if(type==='laser'){
  profile([[-.226,-.039],[-.225,.052],[-.162,.087],[.105,.073],[.131,.024],[.108,-.059],[-.076,-.077]],.104,panel);
  profile([[-.407,-.024],[-.39,.021],[-.218,.065],[-.20,-.033],[-.276,-.048]],.112,coat);
  tube(.028,.06,[0,.007,-.427],dark);bore(.020,-.46,.007);add(new T.CircleGeometry(.012,12),optic,[0,.007,-.461]).rotation.y=Math.PI;
  stock(.272);grip(.083,-.119);foregrip(-.235);shell(.077,.074,.115,[0,-.117,-.055],dark);
  root.userData.chargeRings=[];
  for(let i=0;i<5;i++){
   const mat=new T.MeshStandardMaterial({color:0x37424c,emissive:0x43b7c6,emissiveIntensity:.08,metalness:.42,roughness:.3});
   const cell=shell(.12,.018,.023,[0,[.047,.062,.071,.092,.089][i],-.315+i*.057],mat);root.userData.chargeRings.push(cell);
  }
  reflex(.021);root.userData.muzzle=[0,.007,-.47];
 }
 if(type==='rail'){
  shell(.158,.182,.31,[0,.017,.018]);grip(.147,-.13);foregrip(-.159);
  tube(.067,.229,[0,.019,-.22],dark);
  for(const x of[-.075,.075])profile([[-.426,-.060],[-.45,-.033],[-.438,.035],[-.241,.103],[-.14,.081],[-.14,-.048]],.041,panel,x);
  tube(.039,.044,[0,.018,-.403],steel);bore(.031,-.428,.018);
  shell(.101,.052,.125,[0,-.096,-.048],rubber);shell(.089,.065,.142,[0,.143,.049],coat);
  const glow=new T.MeshBasicMaterial({color:0xc299e8,transparent:true,opacity:0,depthWrite:false,blending:T.AdditiveBlending});root.userData.chargeGlowMaterial=glow;root.userData.chargeVents=[];
  for(const side of[-1,1])for(let i=0;i<3;i++){
   const mat=new T.MeshStandardMaterial({color:0x282633,emissive:0x9a68bb,emissiveIntensity:0,roughness:.3,metalness:.5});
   const vent=box([.004,.021,.03],[side*.083,.018,-.074+i*.073],mat);
   const spill=add(new T.PlaneGeometry(.035,.026),glow,[side*.088,.018,-.074+i*.073]);spill.rotation.y=side*Math.PI/2;spill.visible=false;
   root.userData.chargeVents.push({vent,spill,normal:V(side,0,0)});
  }
  const light=new T.PointLight(0xaf86df,0,2);light.position.set(0,.07,-.28);root.add(light);root.userData.chargeLight=light;
  root.userData.muzzle=[0,.018,-.46];
 }
 if(type==='rocket'){
  // Shoulder tube with protective end bumpers and an inboard optical unit.
  tube(.090,.86,[0,.03,.015],coat);
  for(const z of[-.443,.473]){tube(.118,.066,[0,.03,z],rubber);ring(.102,.009,z+(z<0?-.034:.034),.03,steel);}
  bore(.087,-.482,.03);ring(.085,.008,.511,.03,dark);
  for(const z of[-.31,.30])tube(.092,.025,[0,.03,z],trim);
  shell(.146,.036,.20,[0,-.085,.18],rubber);
  grip(-.115,-.154);
  const sight=new T.Group();root.add(sight);
  shell(.16,.16,.225,[-.163,.058,-.087],dark,sight);
  shell(.182,.027,.25,[-.163,.149,-.087],rubber,sight);
  for(const x of[-.255,-.071])shell(.022,.15,.17,[x,.051,-.10],rubber,sight);
  for(const [x,y,r]of[[-.19,.068,.039],[-.123,.082,.025],[-.123,.023,.014]]){
   tube(r+.007,.025,[x,y,-.21],steel,sight);
   add(new T.CircleGeometry(r,12),optic,[x,y,-.224],sight).rotation.y=Math.PI;
  }
  tube(.029,.057,[-.17,.105,.05],rubber,sight);
  add(new T.CircleGeometry(.023,12),optic,[-.17,.105,.08],sight);
  shell(.055,.119,.052,[-.23,-.137,-.14],rubber);
  box([.05,.035,.13],[-.23,-.068,-.11],dark);
  root.userData.sightAssembly=sight;root.userData.supportGrip=[-.23,-.137,-.14];
  root.userData.shoulderMount=[0,-.105,.18];root.userData.scopeEye=[-.17,.105,.081];
  root.userData.sightCenter=[-.17,.105,.081];root.userData.muzzle=[0,.03,-.488];
 }

 // Collapse static primitives by material. Keep rotor, charge cells, sight and
 // flame as separate nodes because game effects animate those exact objects.
 const preserve=new Set([root.userData.rotor,root.userData.pilotFlame,root.userData.sightAssembly,...(root.userData.chargeRings||[]),...(root.userData.chargeVents||[]).flatMap(x=>[x.vent,x.spill])].filter(Boolean));
 function batch(parent){
  const groups=new Map();for(const o of [...parent.children])if(o.isMesh&&!preserve.has(o)){
   o.updateMatrix();const g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();g.applyMatrix4(o.matrix);if(!groups.has(o.material))groups.set(o.material,[]);groups.get(o.material).push(g);o.geometry.dispose();parent.remove(o);
  }
  for(const [mat,geometries]of groups){const g=mergeGeometries(geometries);geometries.forEach(g=>g.dispose());add(g,mat,[0,0,0],parent);}
 }
 batch(root);for(const group of [root.userData.rotor,root.userData.sightAssembly])if(group)batch(group);
 if(type==='rapid'){
  // Bake the larger size into geometry and anchors; all consumers keep metre units.
  root.traverse(o=>{if(o!==root)o.position.multiplyScalar(1.5);if(o.isMesh)o.geometry.scale(1.5,1.5,1.5);});
  for(const key of ['triggerGrip','supportGrip','muzzle','beltFeed'])root.userData[key]=root.userData[key].map(v=>v*1.5);
 }
 root.userData.reclaimedWeapon=true;root.userData.designCode=spec.code;root.userData.unit='metre';root.userData.type=requested;
 root.traverse(o=>{if(o.isMesh)o.castShadow=o.receiveShadow=true;});
 root.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(root),size=bounds.getSize(V(0,0,0));root.userData.dimensions=size.toArray();
 return root;
}

export function createMinigunAmmoPack(){
 const group=new T.Group();group.name='minigun-ammo-pack';
 const mat=weaponPaint('sage'),edge=salvageMetal('dark');
 const box=(size,pos,material)=>{const mesh=new T.Mesh(new T.BoxGeometry(...size),material);mesh.position.set(...pos);mesh.castShadow=true;group.add(mesh);};
 box([.30,.215,.15],[0,0,0],mat);box([.32,.032,.165],[0,.112,0],edge);
 for(const x of[-.105,.105]){box([.025,.23,.012],[x,0,-.082],edge);box([.03,.09,.03],[x,.15,.06],edge);}
 box([.072,.036,.015],[0,.06,-.084],salvageChrome);box([.065,.085,.07],[-.174,-.033,0],edge);
 group.position.set(0,-.30,-.235);group.visible=false;return group;
}

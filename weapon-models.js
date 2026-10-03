import {panelGeometry,panelTexture,detailBatch} from './model-detail.js';
import * as THREE from 'three';
const metal=new THREE.MeshStandardMaterial({color:0xa1b7c3,metalness:.75,roughness:.35}),dark=new THREE.MeshStandardMaterial({color:0x182c36,metalness:.65,roughness:.5});
metal.map=panelTexture;
metal.userData.sharedWeaponMaterial=dark.userData.sharedWeaponMaterial=true;
const brass=new THREE.MeshStandardMaterial({color:0xb7954f,metalness:.85,roughness:.32});brass.userData.sharedWeaponMaterial=true;
function accent(color){return new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:.65,metalness:.3,roughness:.3});}
export function createWeaponModel(type){const root=new THREE.Group();root.name='weapon-'+type;const color=accent({pistol:0xb9f56b,rapid:0x68e9ff,shotgun:0xffb65f,rail:0xbc66ff,sniper:0x86c6ff,rocket:0xff744a,flame:0xff792b,bow:0x58eaff,laser:0xff426b,knife:0xc6eeff,chainsaw:0xffca52,sword:0x68e9ff}[type]);
 const box=(size,pos,mat=dark)=>{const m=new THREE.Mesh(panelGeometry,mat);m.scale.set(...size);m.position.set(...pos);root.add(m);return m;};
 const barrel=(radius,length,pos,mat=metal)=>{const m=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,length,12),mat);m.rotation.x=Math.PI/2;m.position.set(...pos);root.add(m);return m;};
 if(type==='pistol'){
  // Reference rifle: layered ivory shell, graphite chassis and red mechanical controls.
  const ivory=new THREE.MeshStandardMaterial({color:0xe2e1e6,metalness:.32,roughness:.36});
  const graphite=new THREE.MeshStandardMaterial({color:0x292a2e,metalness:.65,roughness:.42});
  const red=new THREE.MeshStandardMaterial({color:0xdb2912,metalness:.3,roughness:.36});
  const steel=new THREE.MeshStandardMaterial({color:0x77787d,metalness:.85,roughness:.32});
  const profile=(points,width,material,x=0)=>{const shape=new THREE.Shape();points.forEach(([z,y],i)=>i?shape.lineTo(-z,y):shape.moveTo(-z,y));shape.closePath();const g=new THREE.ExtrudeGeometry(shape,{depth:width,bevelEnabled:true,bevelSize:.008,bevelThickness:.006,bevelSegments:1,steps:1});g.translate(0,0,-width/2);g.rotateY(Math.PI/2);const m=new THREE.Mesh(g,material);m.position.x=x;root.add(m);return m;};
  profile([[-.91,.09],[-.77,.22],[.29,.18],[.48,.08],[.47,-.12],[-.68,-.16],[-.87,-.08]],.23,graphite);
  for(const x of[-.126,.126])profile([[-.8,.11],[-.7,.19],[.22,.15],[.36,.06],[.30,-.06],[-.58,-.075],[-.75,-.025]],.025,ivory,x);
  // Deep, raked magazine and the open trigger/grip frame give the silhouette its shape.
  profile([[-.55,-.10],[-.30,-.13],[-.07,-.68],[-.19,-.76],[-.33,-.69]],.18,ivory);
  profile([[-.53,-.16],[-.37,-.18],[-.16,-.64],[-.24,-.68],[-.34,-.59]],.19,graphite);
  profile([[.05,-.11],[.18,-.12],[.35,-.48],[.26,-.56],[.14,-.51]],.16,ivory);
  const grip=box([.12,.28,.13],[0,-.33,.20],graphite);grip.rotation.x=-.32;
  box([.15,.04,.27],[0,-.14,-.03],ivory);box([.15,.04,.18],[0,-.30,.03],ivory);box([.025,.13,.03],[0,-.22,-.04],graphite);
  profile([[.32,.11],[.65,.09],[.69,-.02],[.64,-.09],[.34,-.06]],.15,graphite);
  profile([[.64,.15],[.74,.12],[.78,-.20],[.71,-.26],[.65,-.20]],.21,ivory);box([.18,.31,.04],[0,-.05,.79],graphite);
  barrel(.045,.22,[0,.04,-.96],steel);
  // Hollow muzzle brake with separated vent ribs, rather than a capped cylinder.
  const tube=new THREE.Mesh(new THREE.TorusGeometry(.058,.015,6,16),steel);tube.position.set(0,.04,-1.19);root.add(tube);
  const parts=[[[.20,.045,1.20],[0,.225,-.18],graphite],[[.16,.035,.27],[0,.265,-.05],ivory]];
  for(let i=0;i<22;i++)parts.push([[.23,.027,.022],[0,.263,-.77+i*.056],steel]);
  for(const x of[-.145,.145]){
   parts.push([[.018,.055,.38],[x,.095,-.36],graphite],[[.035,.065,.11],[x,.10,-.57],red],[[.035,.10,.12],[x,-.055,-.55],red]);
   for(let i=0;i<6;i++)parts.push([[.012,.065,.02],[x,.065,-.05+i*.035],steel]);
   for(let i=0;i<5;i++)parts.push([[.012,.018,.14],[x*.68,-.25-i*.072,-.38+i*.029],steel]);
   for(const z of[-.70,-.12,.29]){const screw=new THREE.Mesh(new THREE.CylinderGeometry(.018,.018,.012,8),steel);screw.rotation.z=Math.PI/2;screw.position.set(x,.02,z);root.add(screw);}
  }
  for(let i=0;i<4;i++){const ring=new THREE.Mesh(new THREE.TorusGeometry(.058,.013,6,16),steel);ring.position.set(0,.04,-1.07-i*.037);root.add(ring);}
  for(const x of[-.053,.053])parts.push([[.018,.035,.15],[x,.075,-1.12],graphite],[[.018,.035,.15],[x,.005,-1.12],graphite]);
  parts.push([[.14,.04,.055],[0,-.74,-.18],red],[[.035,.08,.08],[-.16,-.13,-.76],red]);
  detailBatch(root,parts);
  // A genuinely open, chamfered reflex housing; no opaque plate across the window.
  const outer=[[-.115,.285],[-.115,.49],[-.075,.55],[.075,.55],[.115,.49],[.115,.285]];
  const inner=[[-.101,.299],[-.101,.486],[-.069,.536],[.069,.536],[.101,.486],[.101,.299]];
  const sightShape=new THREE.Shape();outer.forEach(([x,y],i)=>i?sightShape.lineTo(x,y):sightShape.moveTo(x,y));sightShape.closePath();const hole=new THREE.Path();inner.slice().reverse().forEach(([x,y],i)=>i?hole.lineTo(x,y):hole.moveTo(x,y));hole.closePath();sightShape.holes.push(hole);
  const sight=new THREE.Mesh(new THREE.ExtrudeGeometry(sightShape,{depth:.035,bevelEnabled:true,bevelSize:.002,bevelThickness:.002,bevelSegments:1,steps:1}),ivory);sight.position.z=-.13;root.add(sight);
  const reticleMat=new THREE.MeshBasicMaterial({color:0xff3218,transparent:true,opacity:.8});const reticle=new THREE.Mesh(new THREE.TorusGeometry(.034,.002,4,24),reticleMat);reticle.position.set(0,.41,-.09);root.add(reticle);const dot=new THREE.Mesh(new THREE.SphereGeometry(.004,6,4),reticleMat);dot.position.copy(reticle.position);root.add(dot);
  root.scale.setScalar(.62);
  root.position.y=-.08;
  root.userData.sightCenter=[0,.41,-.09];
  root.userData.muzzle=[0,.04,-1.21];
 }
 if(type==='rapid'){
  const steel=new THREE.MeshStandardMaterial({color:0x737c86,metalness:.78,roughness:.4});
  const black=new THREE.MeshStandardMaterial({color:0x292e35,metalness:.65,roughness:.46});
  const rubber=new THREE.MeshStandardMaterial({color:0x15191e,metalness:.1,roughness:.8});
  barrel(.225,.65,[0,0,.08],steel);barrel(.24,.065,[0,0,-.25],black);barrel(.205,.065,[0,0,.43],black);
  barrel(.135,.62,[0,-.30,.12],steel);barrel(.15,.055,[0,-.30,.44],black);
  const rotor=new THREE.Group();rotor.position.z=-.28;root.add(rotor);
  const cylinder=(r,len,pos,mat)=>{const mesh=new THREE.Mesh(new THREE.CylinderGeometry(r,r,len,16),mat);mesh.rotation.x=Math.PI/2;mesh.position.set(...pos);rotor.add(mesh);return mesh;};
  cylinder(.075,.95,[0,0,-.47],black);
  for(let i=0;i<6;i++){
   const angle=i*Math.PI/3,x=Math.cos(angle)*.145,y=Math.sin(angle)*.145;
   cylinder(.039,.98,[x,y,-.51],steel);
   const lip=new THREE.Mesh(new THREE.TorusGeometry(.031,.009,6,16),steel);lip.position.set(x,y,-1.008);rotor.add(lip);
   cylinder(.025,.008,[x,y,-1.004],rubber);
   const bolt=new THREE.Mesh(new THREE.SphereGeometry(.017,8,6),black);bolt.position.set(x*1.35,y*1.35,-.993);rotor.add(bolt);
  }
  for(const z of[-.06,-.55,-.96]){const ring=new THREE.Mesh(new THREE.TorusGeometry(.193,.033,8,24),black);ring.position.z=z;rotor.add(ring);}
  cylinder(.215,.025,[0,0,-.975],steel);
  // Separate barrel bores remain visible ahead of the face plate.
  const handle=(points,r,mat)=>root.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),20,r,8,false),mat));
  handle([[0,.17,-.16],[0,.38,-.12],[0,.43,.05],[0,.40,.27],[0,.17,.32]],.036,black);
  handle([[0,.03,.41],[0,-.03,.60],[0,-.25,.67],[0,-.39,.56],[0,-.30,.39]],.045,rubber);
  const grip=box([.10,.24,.105],[-.19,-.22,-.14],rubber);grip.rotation.x=-.17;
  const parts=[[[.19,.025,.34],[0,.216,.07],black],[[.06,.045,.1],[0,.24,.25],steel],[[.08,.03,.06],[0,.26,.25],black],[[.13,.16,.22],[.20,-.04,.18],black]];
  for(const x of[-.21,.21]){
   for(let i=0;i<6;i++)parts.push([[.017,.07,.018],[x,.04,-.18+i*.035],rubber]);
   for(const z of[-.13,.27]){const screw=new THREE.Mesh(new THREE.CylinderGeometry(.018,.018,.014,8),black);screw.rotation.z=Math.PI/2;screw.position.set(x,.09,z);root.add(screw);}
  }
  for(let i=0;i<5;i++)parts.push([[.1,.014,.06],[0,-.03-i*.043,.62],black]);
  detailBatch(root,parts);root.userData.rotor=rotor;root.userData.muzzle=[0,0,-1.30];
 }
 if(type==='shotgun'){
  const black=new THREE.MeshStandardMaterial({color:0x24262a,metalness:.5,roughness:.4});
  const steel=new THREE.MeshStandardMaterial({color:0x62666b,metalness:.8,roughness:.38});
  const rubber=new THREE.MeshStandardMaterial({color:0x15181b,metalness:.12,roughness:.8});
  box([.21,.23,.49],[0,.025,.07],black);
  // Single upper barrel, lower magazine tube, and an open muzzle.
  barrel(.045,1.00,[0,.055,-.84],black);barrel(.049,.88,[0,-.075,-.83],steel);
  barrel(.052,.055,[0,-.075,-1.28],black);
  const rim=new THREE.Mesh(new THREE.TorusGeometry(.043,.009,8,24),steel);rim.position.set(0,.055,-1.345);root.add(rim);
  barrel(.032,.008,[0,.055,-1.325],rubber);
  // Build vented heat shield from rails and bridges, leaving real openings.
  const parts=[];
  for(const x of[-.105,.105]){
   for(const y of[-.06,.02,.105])parts.push([[.025,.025,.64],[x,y,-.51],steel]);
   for(let i=0;i<9;i++)parts.push([[.025,.065,.022],[x,.067,-.80+i*.072],steel]);
  }
  for(let i=0;i<10;i++)parts.push([[.21,.018,.021],[0,.13,-.82+i*.07],steel]);
  box([.235,.19,.48],[0,-.115,-.52],rubber);
  for(let i=0;i<12;i++)parts.push([[.25,.205,.014],[0,-.115,-.755+i*.041],black]);
  const grip=box([.125,.32,.15],[0,-.25,.22],rubber);grip.rotation.x=-.23;
  for(let i=0;i<5;i++)parts.push([[.13,.016,.13],[0,-.18-i*.047,.20+i*.011],black]);
  // Open trigger guard and skeleton folding stock.
  parts.push([[.14,.025,.24],[0,-.115,.09],steel],[[.14,.025,.24],[0,-.25,.09],black],[[.14,.14,.025],[0,-.18,-.025],black],[[.025,.08,.025],[0,-.17,.105],steel]);
  for(const x of[-.065,.065]){
   parts.push([[.025,.032,.51],[x,.13,.51],steel],[[.025,.032,.51],[x,.015,.51],steel]);
   for(let i=0;i<5;i++)parts.push([[.025,.12,.026],[x,.07,.30+i*.105],steel]);
  }
  parts.push([[.19,.27,.05],[0,-.035,.79],rubber],[[.075,.055,.075],[0,.13,.27],steel]);
  const hookPoints=[];for(let i=0;i<=16;i++){const angle=Math.PI*i/16;hookPoints.push(new THREE.Vector3(0,-.18-.13*Math.sin(angle),.68+.12*Math.cos(angle)));}
  root.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(hookPoints),20,.018,8,false),steel));
  // Rear aperture and front post share one sight axis.
  const aperture=new THREE.Mesh(new THREE.TorusGeometry(.037,.009,6,16),steel);aperture.position.set(0,.205,-.04);root.add(aperture);
  parts.push([[.09,.045,.06],[0,.145,-.04],black],[[.017,.07,.025],[0,.17,-1.16],steel],[[.095,.02,.10],[0,.145,-1.16],steel]);
  for(const x of[-.046,.046])parts.push([[.012,.055,.07],[x,.17,-1.16],black]);
  parts.push([[.008,.009,.009],[0,.205,-1.16],steel],[[.012,.045,.15],[.112,.065,.11],rubber]);
  detailBatch(root,parts);
  root.scale.setScalar(.68);root.userData.sightCenter=[0,.205,-.04];root.userData.muzzle=[0,.055,-1.36];
 }
 if(type==='rail'){box([.3,.3,.6],[0,0,-.12]);for(const x of[-.18,.18]){box([.085,.13,.64],[x,.04,-.45],metal);box([.055,.055,.55],[x,.11,-.44],color);}const core=new THREE.Mesh(new THREE.SphereGeometry(.135,12,8),color);core.position.set(0,.02,-.5);root.add(core);for(const z of[-.24,-.44,-.65]){const ring=new THREE.Mesh(new THREE.TorusGeometry(.18,.025,6,16),color);ring.position.set(0,.02,z);root.add(ring);}box([.13,.25,.15],[0,-.21,.12]);root.userData.muzzle=[0,.02,-.77];}
 if(type==='sniper'){
  const steel=new THREE.MeshStandardMaterial({color:0x77797b,metalness:.8,roughness:.4,map:panelTexture});
  const black=new THREE.MeshStandardMaterial({color:0x24272b,metalness:.65,roughness:.4});
  const rubber=new THREE.MeshStandardMaterial({color:0x14171a,metalness:.1,roughness:.75});
  box([.23,.235,.65],[0,.01,.025],steel);
  const parts=[];
  // Perforated rectangular handguard built around open vents.
  for(const x of[-.112,.112]){
   for(const y of[-.075,.005,.09])parts.push([[.025,.025,.54],[x,y,-.56],steel]);
   for(let i=0;i<8;i++)parts.push([[.025,.07,.022],[x,.047,-.80+i*.07],steel],[[.025,.065,.022],[x,-.036,-.80+i*.07],steel]);
  }
  parts.push([[.225,.035,.55],[0,.122,-.56],steel],[[.20,.035,.52],[0,-.105,-.55],black]);
  barrel(.052,.92,[0,.028,-1.25],black);
  for(let i=0;i<8;i++){const angle=i*Math.PI/4;parts.push([[.014,.014,.81],[Math.cos(angle)*.052,.028+Math.sin(angle)*.052,-1.25],steel]);}
  // Rectangular muzzle brake with deep side vents and visible bore.
  box([.18,.15,.26],[0,.028,-1.78],black);
  for(const x of[-.094,.094])for(let i=0;i<2;i++)parts.push([[.008,.10,.066],[x,.028,-1.73-i*.09],rubber]);
  const rim=new THREE.Mesh(new THREE.TorusGeometry(.043,.009,8,24),steel);rim.position.set(0,.028,-1.916);root.add(rim);barrel(.034,.009,[0,.028,-1.914],rubber);
  box([.165,.34,.23],[0,-.26,-.035],black);box([.19,.04,.24],[0,-.43,-.035],steel);
  for(const x of[-.085,.085])for(let i=0;i<3;i++)parts.push([[.012,.29,.017],[x,-.26,-.10+i*.067],steel]);
  const grip=box([.12,.29,.13],[0,-.24,.21],rubber);grip.rotation.x=-.18;
  parts.push([[.14,.023,.22],[0,-.14,.1],black],[[.14,.023,.20],[0,-.27,.1],black],[[.14,.12,.024],[0,-.205,.015],black],[[.026,.075,.025],[0,-.19,.13],steel]);
  // Open buttstock with cheek rest and shoulder pad.
  parts.push([[.19,.12,.48],[0,.065,.54],steel],[[.12,.035,.42],[0,-.20,.56],black],[[.16,.28,.05],[0,-.08,.77],steel],[[.18,.31,.035],[0,-.08,.81],rubber]);
  for(const x of[-.067,.067])parts.push([[.025,.21,.045],[x,-.10,.40],black]);
  parts.push([[.18,.035,1.26],[0,.16,-.17],black],[[.018,.06,.16],[.124,.065,.04],rubber],[[.06,.04,.065],[.14,.095,.12],black]);
  for(let i=0;i<25;i++)parts.push([[.20,.019,.018],[0,.185,-.78+i*.05],steel]);
  for(const z of[-.22,.13]){parts.push([[.11,.08,.06],[0,.23,z],black]);const ring=new THREE.Mesh(new THREE.TorusGeometry(.074,.012,6,20),steel);ring.position.set(0,.33,z);root.add(ring);}
  barrel(.065,.43,[0,.33,-.025],black);barrel(.106,.16,[0,.33,-.32],black);barrel(.082,.13,[0,.33,.24],black);
  const lens=new THREE.MeshStandardMaterial({color:0x263b4d,metalness:.85,roughness:.15});barrel(.086,.007,[0,.33,-.405],lens);barrel(.067,.007,[0,.33,.31],lens);
  const turret=new THREE.Mesh(new THREE.CylinderGeometry(.043,.043,.105,16),black);turret.position.set(0,.435,-.025);root.add(turret);box([.10,.025,.10],[0,.49,-.025],steel);
  const dial=new THREE.Mesh(new THREE.CylinderGeometry(.043,.043,.06,16),black);dial.rotation.z=Math.PI/2;dial.position.set(.09,.33,-.025);root.add(dial);
  // Deployed bipod, attached to the underside of the handguard.
  for(const side of[-1,1]){const leg=box([.033,.40,.035],[side*.13,-.30,-.69],black);leg.rotation.z=side*.42;box([.14,.028,.10],[side*.215,-.49,-.69],rubber);for(let i=0;i<6;i++)parts.push([[.012,.017,.038],[side*(.065+i*.026),-.15-i*.055,-.69],steel]);}
  detailBatch(root,parts);root.scale.setScalar(.66);root.userData.muzzle=[0,.028,-1.93];
 }
 if(type==='rocket'){
  barrel(.23,1.3,[0,.04,-.35],dark);barrel(.26,.13,[0,.04,-1.02],metal);barrel(.19,.014,[0,.04,-1.09],dark);barrel(.26,.12,[0,.04,.31],metal);
  box([.15,.3,.2],[0,-.25,.14]);box([.2,.14,.35],[0,-.11,-.38]);box([.15,.15,.25],[.2,.16,-.05],metal);box([.025,.07,.15],[.285,.17,-.08],color);
  for(const z of[-.8,-.5,-.2])box([.46,.035,.06],[0,.2,z],metal);root.userData.muzzle=[0,.04,-1.12];
 }
 if(type==='flame'){box([.25,.25,.6],[0,0,-.2]);barrel(.075,.65,[0,.02,-.75]);barrel(.11,.13,[0,.02,-1.1],color);for(const x of[-.2,.2])barrel(.11,.5,[x,-.06,.15],color);box([.12,.25,.15],[0,-.23,.1]);root.userData.muzzle=[0,.02,-1.18];}
 if(type==='laser'){box([.26,.24,.7],[0,0,-.25]);for(const x of[-.16,.16])box([.05,.06,.75],[x,.04,-.4],color);barrel(.09,.18,[0,0,-.8],color);box([.12,.25,.15],[0,-.22,.04]);root.userData.chargeRings=[];for(const z of[-.18,-.31,-.44,-.57,-.70]){const mat=accent(0xff426b);mat.color.setHex(0x37424c);mat.emissiveIntensity=.08;const ring=new THREE.Mesh(new THREE.TorusGeometry(.19,.025,8,24),mat);ring.position.set(0,0,z);root.add(ring);root.userData.chargeRings.push(ring);}root.userData.muzzle=[0,0,-.92];}
 if(type==='bow'){
  root.scale.setScalar(.8);root.userData.limbs=[];
  for(const side of[-1,1]){const limb=new THREE.Group();limb.userData.side=side;root.add(limb);root.userData.limbs.push(limb);for(const x of[-.035,.035]){const points=[new THREE.Vector3(x,side*.12,-.42),new THREE.Vector3(x,side*.36,-.58),new THREE.Vector3(x,side*.64,-.48),new THREE.Vector3(x,side*.85,-.22)];limb.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),20,.026,8,false),metal));}const wheel=new THREE.Mesh(new THREE.TorusGeometry(.11,.025,8,24),dark);wheel.rotation.y=Math.PI/2;wheel.position.set(0,side*.85,-.22);limb.add(wheel);const hub=new THREE.Mesh(new THREE.SphereGeometry(.045,12,8),color);hub.position.copy(wheel.position);limb.add(hub);for(let j=0;j<3;j++)box([.11,.035,.075],[0,side*(.3+j*.15),-.55+j*.06],color);}
  box([.12,.25,.14],[0,0,-.43],dark);for(const side of[-1,1]){box([.17,.055,.12],[0,side*.16,-.43],metal);box([.055,.24,.09],[.105,side*.12,-.43],metal);}const string=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,-.85,-.22),new THREE.Vector3(0,0,.14),new THREE.Vector3(0,.85,-.22)]),new THREE.LineBasicMaterial({color:0x8af6ff}));root.add(string);root.userData.string=string;
  const arrow=new THREE.Group();const shaft=new THREE.Mesh(new THREE.CylinderGeometry(.012,.012,1,6),metal);shaft.rotation.x=Math.PI/2;shaft.position.z=-.36;arrow.add(shaft);const tip=new THREE.Mesh(new THREE.ConeGeometry(.055,.18,4),color);tip.rotation.x=-Math.PI/2;tip.position.z=-.94;arrow.add(tip);for(const x of[-.05,.05]){const fin=new THREE.Mesh(new THREE.BoxGeometry(.09,.012,.16),color);fin.position.set(x,0,.1);arrow.add(fin);}root.add(arrow);arrow.visible=false;root.userData.nockedArrow=arrow;root.userData.muzzle=[0,0,-1.05];
 }
 if(type==='knife'){box([.09,.12,.32],[0,-.08,.04]);box([.26,.045,.08],[0,-.02,-.16],metal);box([.11,.035,.55],[0,-.02,-.46],metal);const tip=new THREE.Mesh(new THREE.ConeGeometry(.075,.2,3),metal);tip.rotation.x=-Math.PI/2;tip.position.set(0,-.02,-.83);root.add(tip);root.userData.muzzle=[0,-.02,-.94];}
 if(type==='chainsaw'){box([.33,.29,.44],[0,-.04,.03],color);box([.15,.12,.9],[0,.02,-.62],metal);root.userData.chainTeeth=[];for(let i=0;i<13;i++)for(const x of[-.1,.1]){const tooth=box([.065,.07,.035],[x,.02,-.2-i*.065],dark);tooth.userData.baseZ=tooth.position.z;root.userData.chainTeeth.push(tooth);}for(const x of[-.22,.22])box([.055,.28,.055],[x,.08,.05]);box([.49,.055,.055],[0,.22,.05],metal);root.userData.muzzle=[0,.02,-1.1];}
 if(type==='sword'){box([.13,.38,.13],[0,0,0]);box([.6,.1,.2],[0,.24,0],metal);box([.28,2.5,.085],[0,1.54,0],metal);box([.035,2.43,.10],[.155,1.53,0],color);box([.2,.12,.2],[0,-.25,0],color);const tip=new THREE.Mesh(new THREE.ConeGeometry(.16,.3,4),metal);tip.position.set(0,2.94,0);root.add(tip);root.userData.grip=[0,0,0];}

 if(['rail','rocket'].includes(type)){
  const wide=type==='rapid'?.42:type==='rail'?.32:.22;
  const parts=[[[wide,.055,.28],[0,.17,.02],metal],[[.035,.07,.025],[-wide/2,.07,.16],type==='pistol'?dark:color],[[.035,.07,.025],[wide/2,.07,.16],type==='pistol'?dark:color],[[.1,.045,.12],[0,-.31,.15],metal]];
  if(type==='rail'){for(const x of[-.18,.18])for(let i=0;i<5;i++)parts.push([[.12,.045,.03],[x,.065,-.27-i*.09],metal]);parts.push([[.17,.08,.2],[0,.22,.02],metal],[[.12,.045,.11],[0,.27,.01],color],[[.18,.12,.15],[0,-.14,-.24],metal]);}
  if(type==='rail'){
   for(const x of[-.23,.23])for(let i=0;i<4;i++)parts.push([[.07,.11,.045],[x,.025,-.18-i*.105],dark]);
   parts.push([[.13,.18,.23],[0,-.19,-.33],color],[[.32,.03,.17],[0,-.16,.06],metal]);
  }

  detailBatch(root,parts);
 }
 root.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});return root;
}

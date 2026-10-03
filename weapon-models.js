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
  const olive=new THREE.MeshStandardMaterial({color:0x666c43,metalness:.35,roughness:.7,map:panelTexture});
  const black=new THREE.MeshStandardMaterial({color:0x22292a,metalness:.5,roughness:.5});
  const yellow=new THREE.MeshStandardMaterial({color:0xcaba45,metalness:.2,roughness:.6});
  const rubber=new THREE.MeshStandardMaterial({color:0x161d1c,roughness:.85});
  barrel(.20,1.40,[0,.06,-.25],olive);
  for(const z of[-.85,.32])barrel(.205,.047,[0,.06,z],yellow);
  barrel(.224,.20,[0,.06,-1.02],black);barrel(.245,.035,[0,.06,-1.13],olive);barrel(.18,.008,[0,.06,-1.15],rubber);
  const mouth=new THREE.Mesh(new THREE.TorusGeometry(.198,.022,8,24),black);mouth.position.set(0,.06,-1.16);root.add(mouth);
  barrel(.25,.08,[0,.06,.47],rubber);barrel(.28,.045,[0,.06,.525],black);
  // Boxy command sight mounted alongside the shoulder tube.
  const sightStart=root.children.length;
  box([.29,.29,.33],[-.27,-.06,-.04],olive);box([.18,.22,.15],[-.40,-.055,.13],black);
  barrel(.061,.065,[-.40,-.025,.235],rubber);barrel(.038,.008,[-.40,-.025,.274],black);
  box([.025,.105,.145],[-.427,-.04,-.11],black);
  const glass=new THREE.MeshStandardMaterial({color:0x456a66,metalness:.8,roughness:.18});box([.027,.076,.10],[-.442,-.04,-.11],glass);
  box([.11,.24,.11],[-.30,-.29,.10],black);box([.10,.19,.09],[.16,-.23,-.06],black);
  const sightAssembly=new THREE.Group();sightAssembly.name='launcher-command-unit';for(const part of root.children.slice(sightStart))sightAssembly.add(part);root.add(sightAssembly);root.userData.sightAssembly=sightAssembly;
  const parts=[[[.14,.10,.31],[0,-.17,.13],rubber],[[.08,.025,.18],[0,.28,-.18],black],[[.035,.035,.09],[-.29,-.19,.12],yellow]];
  for(const x of[-.20,.20])for(const z of[-.62,.13])parts.push([[.025,.10,.07],[x,.06,z],black]);
  for(let i=0;i<5;i++)parts.push([[.018,.018,.19],[-.425,-.13+i*.04,-.035],black]);
  for(const z of[-1.04,-.96])parts.push([[.065,.045,.015],[.22,.10,z],yellow]);
  for(const x of[-.34,-.20])parts.push([[.025,.025,.025],[x,.09,.12],metal]);
  detailBatch(root,parts);root.scale.setScalar(.75);root.userData.muzzle=[0,.06,-1.18];
 }
 if(type==='flame'){
  const steel=new THREE.MeshStandardMaterial({color:0x93938b,metalness:.85,roughness:.34});
  const black=new THREE.MeshStandardMaterial({color:0x262b2d,metalness:.72,roughness:.43});
  const red=new THREE.MeshStandardMaterial({color:0x6e2921,metalness:.35,roughness:.48});
  const rubber=new THREE.MeshStandardMaterial({color:0x171a1c,metalness:.08,roughness:.8});
  // Narrow pressure pipe and a separate thick nozzle jacket.
  barrel(.044,1.03,[0,.025,-.46],black);barrel(.064,.68,[0,-.017,-.34],steel);
  for(const z of[-.75,-.47,-.15,.02])barrel(.070,.033,[0,.025,z],black);
  barrel(.091,.23,[0,.025,-1.075],black);
  for(const z of[-.96,-1.17]){const rim=new THREE.Mesh(new THREE.TorusGeometry(.091,.012,6,20),steel);rim.position.set(0,.025,z);root.add(rim);}
  barrel(.067,.009,[0,.025,-1.195],rubber);
  const path=(points,r,mat)=>root.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),24,r,8,false),mat));
  path([[0,.018,-.66],[0,-.035,-.79],[0,-.045,-1.02],[0,.01,-1.20]],.012,black);
  // The pilot light sits beside the main outlet, as in the reference.
  const pilot=new THREE.Group();pilot.position.set(.045,-.065,-1.235);root.add(pilot);
  for(const [radius,length,color] of [[.029,.13,0xff6c13],[.017,.095,0xffd85b],[.011,.035,0x629cff]]){const flame=new THREE.Mesh(new THREE.ConeGeometry(radius,length,7),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.85,depthWrite:false,blending:THREE.AdditiveBlending}));flame.rotation.x=-Math.PI/2;flame.position.z=-length/2;pilot.add(flame);}
  root.userData.pilotFlame=pilot;
  barrel(.135,.28,[0,-.19,-.24],steel);barrel(.10,.045,[0,-.19,-.41],black);barrel(.105,.045,[0,-.19,-.065],black);
  for(const z of[-.36,-.12]){const band=new THREE.Mesh(new THREE.TorusGeometry(.134,.014,6,20),black);band.position.set(0,-.19,z);root.add(band);}
  barrel(.085,.22,[0,-.19,-.53],black);
  const parts=[];for(const x of[-.088,.088])for(let i=0;i<4;i++)parts.push([[.009,.045,.028],[x,-.19,-.61+i*.048],rubber]);
  const shape=new THREE.Shape();shape.moveTo(-.07,-.02);shape.lineTo(-.02,.105);shape.lineTo(.10,.11);shape.lineTo(.15,-.025);shape.lineTo(.09,-.11);shape.lineTo(-.035,-.105);shape.closePath();const shell=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:.17,bevelEnabled:true,bevelSize:.014,bevelThickness:.01,bevelSegments:1,steps:1}),red);shell.geometry.translate(0,0,-.085);shell.rotation.y=Math.PI/2;shell.position.set(0,-.01,.16);root.add(shell);
  const grip=box([.11,.26,.12],[0,-.20,.24],red);grip.rotation.x=-.25;
  parts.push([[.12,.026,.20],[0,-.105,.09],steel],[[.12,.026,.21],[0,-.30,.10],black],[[.12,.20,.025],[0,-.20,.005],black],[[.025,.09,.025],[0,-.18,.105],steel],[[.10,.055,.085],[0,-.36,.29],steel]);
  path([[0,-.36,.30],[-.10,-.44,.22],[-.17,-.45,-.02],[-.18,-.38,-.26],[-.13,-.25,-.33]],.018,rubber);
  for(const x of[-.09,.09]){const bolt=new THREE.Mesh(new THREE.CylinderGeometry(.014,.014,.014,8),steel);bolt.rotation.z=Math.PI/2;bolt.position.set(x,-.04,.14);root.add(bolt);}
  detailBatch(root,parts);root.scale.setScalar(.8);root.userData.muzzle=[0,.025,-1.23];
 }
 if(type==='laser'){
  // Offset open-frame energy rifle, with a visible reactor and twin cooling hoses.
  const shell=new THREE.MeshStandardMaterial({color:0x252a40,metalness:.72,roughness:.34}),steel=new THREE.MeshStandardMaterial({color:0x82959c,metalness:.85,roughness:.3}),black=new THREE.MeshStandardMaterial({color:0x101a21,metalness:.55,roughness:.48}),cyan=accent(0x48ddff);
  box([.23,.13,1.15],[0,.19,-.31],shell);box([.26,.09,.8],[0,-.17,-.53],shell);
  box([.22,.33,.25],[0,-.005,.27],shell);box([.19,.26,.13],[0,-.31,.12],black).rotation.x=-.22;
  box([.17,.055,.30],[0,-.47,.03],shell);box([.04,.28,.055],[.095,-.30,-.04],steel);
  box([.13,.07,.35],[0,.10,.49],shell);box([.21,.33,.09],[0,-.02,.69],black);
  barrel(.102,.60,[0,.015,-.36],black);barrel(.072,.48,[0,.015,-.4],cyan);
  for(const z of[-.11,-.59]){barrel(.13,.095,[0,.015,z],steel);for(let i=0;i<6;i++){const angle=i*Math.PI/3;box([.035,.04,.075],[Math.cos(angle)*.145,.015+Math.sin(angle)*.145,z],steel);}}
  barrel(.085,.28,[0,.015,-.86],steel);barrel(.115,.13,[0,.015,-1.025],black);barrel(.06,.018,[0,.015,-1.096],cyan);
  for(const side of[-1,1]){
   for(let i=0;i<3;i++)box([.015,.025,.10],[side*.122,.19,-.59+i*.18],cyan);
   const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(side*.10,.02,.24),new THREE.Vector3(side*.19,-.045,.02),new THREE.Vector3(side*.20,-.10,-.20),new THREE.Vector3(side*.10,-.045,-.41)]);const hose=new THREE.Mesh(new THREE.TubeGeometry(curve,16,.025,6,false),steel);root.add(hose);
   for(let i=0;i<7;i++)box([.018,.025,.035],[side*.14,-.17,-.91+i*.10],steel);
  }
  root.userData.chargeRings=[];for(const z of[-.16,-.26,-.36,-.46,-.56]){const mat=accent(0x48ddff);mat.color.setHex(0x37424c);mat.emissiveIntensity=.08;const ring=new THREE.Mesh(new THREE.TorusGeometry(.092,.012,8,20),mat);ring.position.set(0,.015,z);root.add(ring);root.userData.chargeRings.push(ring);}
  box([.07,.045,.12],[0,.28,.07],black);box([.025,.012,.025],[0,.308,.065],cyan);
  root.scale.setScalar(.78);root.userData.muzzle=[0,.015,-1.11];
 }
 if(type==='bow'){
  root.scale.setScalar(.8);root.userData.limbs=[];
  const steel=new THREE.MeshStandardMaterial({color:0x949d99,metalness:.75,roughness:.4});
  const black=new THREE.MeshStandardMaterial({color:0x242a28,metalness:.5,roughness:.5});
  const red=new THREE.MeshStandardMaterial({color:0x73352c,metalness:.6,roughness:.4});
  const gold=new THREE.MeshStandardMaterial({color:0xb6a14c,metalness:.7,roughness:.38});
  const cableMat=new THREE.LineBasicMaterial({color:0x333834});
  const tube=(parent,points,r,mat)=>parent.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),18,r,6,false),mat));
  for(const side of[-1,1]){
   const limb=new THREE.Group();limb.userData.side=side;root.add(limb);root.userData.limbs.push(limb);
   for(const x of[-.045,.045])tube(limb,[[x,side*.18,-.43],[x,side*.37,-.56],[x,side*.61,-.43],[x,side*.83,-.22]],.023,black);
   const plates=[];for(let i=0;i<3;i++)plates.push([[.145,.075,.10],[0,side*(.30+i*.16),-.52+i*.055],steel]);plates.push([[.19,.04,.19],[0,side*.85,-.28],steel]);detailBatch(limb,plates);
   const wheel=new THREE.Mesh(new THREE.TorusGeometry(.088,.018,8,24),black);wheel.rotation.y=Math.PI/2;wheel.position.set(0,side*.85,-.22);limb.add(wheel);
   for(const x of[-.031,.031]){const rim=new THREE.Mesh(new THREE.TorusGeometry(.069,.006,6,20),red);rim.rotation.y=Math.PI/2;rim.position.set(x,side*.85,-.22);limb.add(rim);for(let i=0;i<4;i++){const angle=i*Math.PI/2;tube(limb,[[x,side*.85,-.22],[x,side*.85+Math.cos(angle)*.069,-.22+Math.sin(angle)*.069]],.007,steel);}}
   const hub=new THREE.Mesh(new THREE.CylinderGeometry(.025,.025,.085,12),steel);hub.rotation.z=Math.PI/2;hub.position.copy(wheel.position);limb.add(hub);
  }
  box([.095,.22,.10],[0,0,-.43],black);
  for(const side of[-1,1]){tube(root,[[-.07,side*.08,-.43],[-.08,side*.20,-.48],[-.065,side*.32,-.53]],.028,steel);tube(root,[[.065,side*.08,-.43],[.07,side*.19,-.35],[.065,side*.31,-.52]],.021,steel);box([.14,.035,.075],[0,side*.18,-.43],black);}
  // Offset control cables keep the centre clear for the arrow and drawn string.
  for(const x of[-.038,.038]){const cable=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x,-.85,-.22),new THREE.Vector3(x,.85,-.22)]),cableMat);root.add(cable);}
  const string=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,-.85,-.22),new THREE.Vector3(0,0,.14),new THREE.Vector3(0,.85,-.22)]),new THREE.LineBasicMaterial({color:0xaaa99b}));root.add(string);root.userData.string=string;
  tube(root,[[.06,.055,-.44],[.17,.055,-.44],[.17,.055,-.60]],.012,black);
  const sight=new THREE.Mesh(new THREE.TorusGeometry(.045,.007,6,16),black);sight.position.set(.17,.055,-.61);root.add(sight);
  barrel(.018,.23,[0,-.13,-.65],steel);barrel(.027,.055,[0,-.13,-.78],black);
  const arrow=new THREE.Group();const shaft=new THREE.Mesh(new THREE.CylinderGeometry(.009,.009,1,8),black);shaft.rotation.x=Math.PI/2;shaft.position.z=-.36;arrow.add(shaft);
  for(const z of[-.79,.08]){const band=new THREE.Mesh(new THREE.CylinderGeometry(.011,.011,.055,8),gold);band.rotation.x=Math.PI/2;band.position.z=z;arrow.add(band);}
  const tip=new THREE.Mesh(new THREE.ConeGeometry(.034,.14,3),steel);tip.rotation.x=-Math.PI/2;tip.position.z=-.91;arrow.add(tip);
  for(let i=0;i<3;i++){const fin=new THREE.Mesh(new THREE.BoxGeometry(.045,.005,.12),gold);fin.rotation.z=i*Math.PI*2/3;fin.position.set(Math.cos(i*Math.PI*2/3)*.022,Math.sin(i*Math.PI*2/3)*.022,.06);arrow.add(fin);}
  root.add(arrow);arrow.visible=false;root.userData.nockedArrow=arrow;root.userData.muzzle=[0,0,-1.05];
 }
 if(type==='knife'){
  const black=new THREE.MeshStandardMaterial({color:0x202125,metalness:.7,roughness:.38});
  const rubber=new THREE.MeshStandardMaterial({color:0x16171c,metalness:.12,roughness:.75});
  const red=new THREE.MeshStandardMaterial({color:0x9d3825,metalness:.45,roughness:.4});
  const orange=new THREE.MeshStandardMaterial({color:0xff8c22,emissive:0xff6310,emissiveIntensity:1.5,metalness:.35,roughness:.3});
  const hot=new THREE.MeshStandardMaterial({color:0xffd961,emissive:0xffba32,emissiveIntensity:1.8,metalness:.15,roughness:.3});
  // Side profile follows a shallow curved saber, keeping the original grip origin.
  const profile=(points,width,material)=>{const shape=new THREE.Shape();points.forEach(([z,x],i)=>i?shape.lineTo(x,-z):shape.moveTo(x,-z));shape.closePath();const geometry=new THREE.ExtrudeGeometry(shape,{depth:width,bevelEnabled:true,bevelSize:.003,bevelThickness:.002,bevelSegments:1,steps:1});geometry.translate(0,0,-width/2);geometry.rotateX(-Math.PI/2);const mesh=new THREE.Mesh(geometry,material);root.add(mesh);return mesh;};
  profile([[-.16,-.055],[-.38,-.056],[-.64,-.032],[-.90,.013],[-1.13,.075],[-1.26,.13],[-1.16,.031],[-.96,-.077],[-.68,-.124],[-.39,-.139],[-.16,-.125]],.035,black);
  profile([[-.17,-.104],[-.40,-.119],[-.68,-.105],[-.95,-.06],[-1.15,.045],[-1.26,.13],[-1.16,.031],[-.96,-.077],[-.68,-.124],[-.39,-.139],[-.17,-.125]],.039,orange);
  profile([[-.17,-.119],[-.40,-.133],[-.68,-.117],[-.96,-.071],[-1.16,.038],[-1.26,.13],[-1.16,.031],[-.96,-.077],[-.68,-.124],[-.39,-.139],[-.17,-.125]],.041,hot);
  const strip=[new THREE.Vector3(-.077,.024,-.19),new THREE.Vector3(-.087,.024,-.42),new THREE.Vector3(-.065,.024,-.70),new THREE.Vector3(-.025,.024,-.94)];root.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(strip),24,.004,5,false),orange));
  box([.11,.095,.26],[0,0,.025],rubber);box([.13,.105,.045],[0,0,.175],black);
  for(let i=0;i<6;i++){const rib=box([.116,.10,.012],[0,0,-.075+i*.041],black);rib.rotation.y=-.12;}
  box([.25,.08,.05],[-.012,0,-.135],black);box([.13,.09,.033],[-.015,0,-.165],red);box([.09,.032,.12],[-.072,.052,-.12],red);
  const pommel=new THREE.Mesh(new THREE.TorusGeometry(.045,.014,6,12),black);pommel.rotation.x=Math.PI/2;pommel.position.set(.012,0,.225);root.add(pommel);
  for(const z of[-.12,.11]){const screw=new THREE.Mesh(new THREE.CylinderGeometry(.012,.012,.012,8),metal);screw.position.set(0,.057,z);root.add(screw);}
  root.userData.muzzle=[.13,0,-1.26];
 }
 if(type==='chainsaw'){
  const iron=new THREE.MeshStandardMaterial({color:0x3c3b39,metalness:.8,roughness:.52,map:panelTexture});
  const black=new THREE.MeshStandardMaterial({color:0x181b1d,metalness:.55,roughness:.5});
  const bronze=new THREE.MeshStandardMaterial({color:0x745b4c,metalness:.75,roughness:.45});
  const toothSteel=new THREE.MeshStandardMaterial({color:0x92938e,metalness:.85,roughness:.38});
  const red=new THREE.MeshStandardMaterial({color:0x8d3028,metalness:.4,roughness:.5});
  box([.32,.28,.40],[0,-.04,.12],iron);box([.27,.23,.13],[0,-.04,.36],black);box([.34,.045,.31],[0,.12,.10],black);
  // Rotate the complete guide bar and chain into a vertical cutting plane.
  const bodyParts=new Set(root.children);
  const shape=new THREE.Shape();shape.moveTo(.135,-.16);shape.lineTo(.135,-1.05);shape.absarc(0,-1.05,.135,0,Math.PI,true);shape.lineTo(-.135,-.16);shape.closePath();
  const bar=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:.075,bevelEnabled:true,bevelSize:.007,bevelThickness:.006,bevelSegments:1,steps:1}),iron);bar.geometry.translate(0,0,-.0375);bar.rotation.x=Math.PI/2;bar.position.y=.02;root.add(bar);
  const parts=[];for(const x of[-.105,.105])parts.push([[.012,.018,.80],[x,.068,-.59],bronze]);
  for(let i=0;i<6;i++)parts.push([[.028,.015,.17],[0,.068,-.24-i*.12],black]);
  const nose=new THREE.Mesh(new THREE.CylinderGeometry(.085,.085,.012,20),bronze);nose.position.set(0,.073,-1.05);root.add(nose);
  for(const z of[-.15,-1.05]){const screw=new THREE.Mesh(new THREE.CylinderGeometry(.022,.022,.022,8),toothSteel);screw.position.set(0,.09,z);root.add(screw);}
  root.userData.chainTeeth=[];
  const toothShape=new THREE.Shape();toothShape.moveTo(0,-.03);toothShape.lineTo(.06,-.025);toothShape.lineTo(.085,.012);toothShape.lineTo(.05,.004);toothShape.lineTo(.06,.034);toothShape.lineTo(.022,.025);toothShape.closePath();
  const toothGeometry=new THREE.ExtrudeGeometry(toothShape,{depth:.025,bevelEnabled:false});toothGeometry.rotateX(Math.PI/2);
  for(const side of[-1,1])for(let i=0;i<15;i++){const tooth=new THREE.Mesh(toothGeometry,toothSteel);tooth.scale.x=side;tooth.position.set(side*.13,.035,-.18-i*.059);tooth.userData.baseZ=tooth.position.z;root.add(tooth);root.userData.chainTeeth.push(tooth);parts.push([[.038,.075,.031],[side*.135,.025,-.18-i*.059],black]);}
  // Curved end teeth complete the saw silhouette.
  for(let i=0;i<7;i++){const angle=i*Math.PI/6;const tooth=new THREE.Mesh(toothGeometry,toothSteel);tooth.position.set(Math.cos(angle)*.13,.035,-1.05-Math.sin(angle)*.13);tooth.rotation.y=angle;root.add(tooth);}
  const blade=new THREE.Group();blade.name='vertical-chain-guide';blade.position.y=.02;
  for(const mesh of [...root.children])if(!bodyParts.has(mesh)){mesh.position.y-=.02;blade.add(mesh);}
  detailBatch(blade,parts.map(([size,pos,mat])=>[size,[pos[0],pos[1]-.02,pos[2]],mat]));parts.length=0;
  blade.rotation.z=Math.PI/2;root.add(blade);
  const handle=(points)=>root.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),18,.028,6,false),black));
  handle([[-.20,-.035,-.02],[-.20,.27,-.025],[-.14,.34,.07],[.14,.34,.07],[.20,.27,-.025],[.20,-.035,-.02]]);
  handle([[-.12,.04,.34],[-.13,-.09,.50],[.13,-.09,.50],[.12,.04,.34]]);
  for(const x of[-.17,.17])for(let i=0;i<7;i++)parts.push([[.018,.018,.18],[x,-.10+i*.027,.14],black]);
  for(let i=0;i<5;i++)parts.push([[.30,.015,.027],[0,.155,.005+i*.049],iron]);
  parts.push([[.045,.045,.045],[.17,.045,.30],red],[[.12,.025,.16],[0,.35,.07],iron]);
  for(const x of[-.18,.18]){const cap=new THREE.Mesh(new THREE.CylinderGeometry(.045,.045,.032,12),bronze);cap.rotation.z=Math.PI/2;cap.position.set(x,-.12,.05);root.add(cap);}
  detailBatch(root,parts);root.scale.setScalar(.85);root.userData.muzzle=[0,.02,-1.26];
 }
 if(type==='sword'){box([.13,.38,.13],[0,0,0]);box([.6,.1,.2],[0,.24,0],metal);box([.28,2.5,.085],[0,1.54,0],metal);box([.035,2.43,.10],[.155,1.53,0],color);box([.2,.12,.2],[0,-.25,0],color);const tip=new THREE.Mesh(new THREE.ConeGeometry(.16,.3,4),metal);tip.position.set(0,2.94,0);root.add(tip);root.userData.grip=[0,0,0];}

 if(['rail'].includes(type)){
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

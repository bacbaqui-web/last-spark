import {panelGeometry,panelTexture,detailBatch} from './model-detail.js';
import * as THREE from 'three';
import {createReclaimedWeapon} from './reclaimed-weapons.js';
import {applyRigidUpgrade} from './asset-upgrades.js';
const metal=new THREE.MeshStandardMaterial({color:0xa1b7c3,metalness:.75,roughness:.35}),dark=new THREE.MeshStandardMaterial({color:0x182c36,metalness:.65,roughness:.5});
metal.map=panelTexture;
metal.userData.sharedWeaponMaterial=dark.userData.sharedWeaponMaterial=true;
function accent(color){return new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:.65,metalness:.3,roughness:.3});}
export function createWeaponModel(type){const reclaimed=createReclaimedWeapon(type);if(reclaimed)return reclaimed;const root=new THREE.Group();root.name='weapon-'+type;const color=accent({pistol:0xb9f56b,rapid:0x68e9ff,shotgun:0xffb65f,rail:0xbc66ff,sniper:0x86c6ff,rocket:0xff744a,flame:0xff792b,bow:0x58eaff,laser:0xff426b,knife:0xc6eeff,chainsaw:0xffca52,sword:0x68e9ff}[type]);
 const box=(size,pos,mat=dark)=>{const m=new THREE.Mesh(panelGeometry,mat);m.scale.set(...size);m.position.set(...pos);root.add(m);return m;};
 const barrel=(radius,length,pos,mat=metal)=>{const m=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,length,12),mat);m.rotation.x=Math.PI/2;m.position.set(...pos);root.add(m);return m;};
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

 root.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});return applyRigidUpgrade(root,'weapon-'+type);
}

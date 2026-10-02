import {panelGeometry,panelTexture,detailBatch} from './model-detail.js';
import * as THREE from 'three';
const metal=new THREE.MeshStandardMaterial({color:0xa1b7c3,metalness:.75,roughness:.35}),dark=new THREE.MeshStandardMaterial({color:0x182c36,metalness:.65,roughness:.5});
metal.map=panelTexture;
metal.userData.sharedWeaponMaterial=dark.userData.sharedWeaponMaterial=true;
const brass=new THREE.MeshStandardMaterial({color:0xb7954f,metalness:.85,roughness:.32});brass.userData.sharedWeaponMaterial=true;
function accent(color){return new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:.65,metalness:.3,roughness:.3});}
export function createWeaponModel(type){const root=new THREE.Group();root.name='weapon-'+type;const color=accent({pistol:0xb9f56b,rapid:0x68e9ff,shotgun:0xffb65f,rail:0xbc66ff,sniper:0x86c6ff,rocket:0xff744a,sword:0x68e9ff}[type]);
 const box=(size,pos,mat=dark)=>{const m=new THREE.Mesh(panelGeometry,mat);m.scale.set(...size);m.position.set(...pos);root.add(m);return m;};
 const barrel=(radius,length,pos,mat=metal)=>{const m=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,length,12),mat);m.rotation.x=Math.PI/2;m.position.set(...pos);root.add(m);return m;};
 if(type==='pistol'){
  box([.20,.20,.53],[0,.025,-.1]);box([.18,.075,.48],[0,.16,-.13],metal);
  box([.18,.18,.48],[0,.015,-.6]);barrel(.035,.42,[0,.025,-1.01]);barrel(.055,.105,[0,.025,-1.26]);barrel(.032,.012,[0,.025,-1.319],dark);
  barrel(.065,.30,[0,.01,.30],metal);box([.15,.20,.27],[0,-.035,.47]);box([.18,.27,.055],[0,-.055,.61]);box([.13,.055,.22],[0,.08,.48]);
  const grip=box([.10,.25,.14],[0,-.19,.12]);grip.rotation.x=-.25;
  const magazine=box([.13,.31,.22],[0,-.24,-.18],metal);magazine.rotation.x=.17;box([.145,.045,.22],[0,-.4,-.205]);
  box([.12,.027,.20],[0,-.14,.045],metal);box([.018,.10,.025],[.065,-.18,.15],metal);
  for(const x of[-.047,.047])box([.018,.085,.09],[x,.21,.12]);box([.10,.02,.10],[0,.255,.12]);
  box([.018,.12,.02],[0,.14,-.99]);box([.10,.026,.045],[0,.09,-.99]);
  root.userData.muzzle=[0,.025,-1.33];
 }
 if(type==='rapid'){box([.43,.38,.58],[0,-.01,.03]);barrel(.26,.4,[0,0,-.3]);const rotor=new THREE.Group();rotor.position.set(0,0,-.48);root.add(rotor);for(let i=0;i<6;i++){const a=i/6*Math.PI*2,m=new THREE.Mesh(new THREE.CylinderGeometry(.042,.042,.85,10),metal);m.rotation.x=Math.PI/2;m.position.set(Math.cos(a)*.16,Math.sin(a)*.16,-.24);rotor.add(m);}for(const z of[.02,-.43,-.64]){const ring=new THREE.Mesh(new THREE.TorusGeometry(.21,.045,6,16),dark);ring.position.z=z;rotor.add(ring);}box([.3,.42,.4],[-.29,-.12,.1],metal);for(let i=0;i<5;i++)box([.07,.1,.07],[-.24+i*.055,.22,.2],color);box([.28,.09,.26],[0,.27,.02]);box([.09,.3,.09],[-.19,.16,.07]);box([.09,.3,.09],[.19,.16,.07]);root.userData.rotor=rotor;root.userData.muzzle=[0,0,-1.16];}
 if(type==='shotgun'){for(const x of[-.065,.065])barrel(.057,.92,[x,.04,-.36]);box([.24,.18,.32],[0,-.04,.19]);box([.21,.15,.33],[0,-.09,-.44],color);box([.13,.27,.14],[0,-.18,.23]);root.userData.muzzle=[0,.04,-.84];}
 if(type==='rail'){box([.3,.3,.6],[0,0,-.12]);for(const x of[-.18,.18]){box([.085,.13,.64],[x,.04,-.45],metal);box([.055,.055,.55],[x,.11,-.44],color);}const core=new THREE.Mesh(new THREE.SphereGeometry(.135,12,8),color);core.position.set(0,.02,-.5);root.add(core);for(const z of[-.24,-.44,-.65]){const ring=new THREE.Mesh(new THREE.TorusGeometry(.18,.025,6,16),color);ring.position.set(0,.02,z);root.add(ring);}box([.13,.25,.15],[0,-.21,.12]);root.userData.muzzle=[0,.02,-.77];}
 if(type==='sniper'){
  box([.24,.22,.64],[0,.02,-.1],metal);box([.20,.14,.54],[0,.025,-.64]);
  barrel(.035,.75,[0,.06,-1.19]);barrel(.065,.18,[0,.06,-1.56]);barrel(.043,.01,[0,.06,-1.655],dark);
  box([.16,.28,.17],[0,-.2,.15]);box([.17,.25,.18],[0,-.22,-.12]);box([.2,.22,.5],[0,-.01,.44]);box([.24,.29,.06],[0,-.02,.72]);
  for(const z of[-.24,.08])box([.1,.09,.05],[0,.2,z]);
  barrel(.076,.5,[0,.28,-.15],dark);barrel(.104,.15,[0,.28,-.44],metal);barrel(.095,.13,[0,.28,.15],metal);barrel(.088,.012,[0,.28,-.52],color);
  barrel(.035,.09,[.13,.28,-.1],metal);box([.08,.06,.09],[.15,.29,-.09]);box([.11,.035,.07],[.17,.04,.08],metal);
  root.userData.muzzle=[0,.06,-1.67];
 }
 if(type==='rocket'){
  barrel(.23,1.3,[0,.04,-.35],dark);barrel(.26,.13,[0,.04,-1.02],metal);barrel(.19,.014,[0,.04,-1.09],dark);barrel(.26,.12,[0,.04,.31],metal);
  box([.15,.3,.2],[0,-.25,.14]);box([.2,.14,.35],[0,-.11,-.38]);box([.15,.15,.25],[.2,.16,-.05],metal);box([.025,.07,.15],[.285,.17,-.08],color);
  for(const z of[-.8,-.5,-.2])box([.46,.035,.06],[0,.2,z],metal);root.userData.muzzle=[0,.04,-1.12];
 }
 if(type==='sword'){box([.13,.38,.13],[0,0,0]);box([.6,.1,.2],[0,.24,0],metal);box([.28,2.5,.085],[0,1.54,0],metal);box([.035,2.43,.10],[.155,1.53,0],color);box([.2,.12,.2],[0,-.25,0],color);const tip=new THREE.Mesh(new THREE.ConeGeometry(.16,.3,4),metal);tip.position.set(0,2.94,0);root.add(tip);root.userData.grip=[0,0,0];}

 if(type!=='sword'){
  const wide=type==='rapid'?.42:type==='rail'?.32:.22;
  const parts=[[[wide,.055,.28],[0,.17,.02],metal],[[.035,.07,.025],[-wide/2,.07,.16],type==='pistol'?dark:color],[[.035,.07,.025],[wide/2,.07,.16],type==='pistol'?dark:color],[[.1,.045,.12],[0,-.31,.15],metal]];
  if(type==='pistol'){
   for(let i=0;i<12;i++)parts.push([[.19,.024,.02],[0,.13,.04-i*.06],metal]);
   for(const x of[-.094,.094])for(let i=0;i<5;i++)parts.push([[.009,.045,.049],[x,.02,-.44-i*.075],metal]);
   parts.push([[.023,.045,.16],[.11,.07,-.07],metal],[[.035,.025,.11],[.13,.10,-.03],dark],[[.05,.055,.05],[.12,.055,.10],dark]);
   for(const x of[-.068,.068])for(let i=0;i<3;i++)parts.push([[.008,.22,.012],[x,-.25,-.24+i*.055],dark]);
   parts.push([[.10,.025,.04],[0,.18,.18],dark],[[.025,.05,.05],[-.115,-.03,.025],metal]);
  }
  if(type==='shotgun'){for(let i=0;i<6;i++)parts.push([[.24,.028,.025],[0,-.04,-.32-i*.045],dark]);parts.push([[.20,.13,.33],[0,.01,.37],metal],[[.18,.24,.045],[0,-.03,.55],dark],[[.028,.085,.035],[0,.12,-.72],color]);for(const x of[-.065,.065]){barrel(.066,.05,[x,.04,-.8],metal);barrel(.044,.012,[x,.04,-.83],dark);}}
  if(type==='rapid'){for(let i=0;i<8;i++)parts.push([[.07,.1,.065],[-.39,-.2+i*.055,.1],metal]);for(let i=0;i<4;i++)parts.push([[.20,.025,.05],[.08,-.04-i*.06,.33],metal]);parts.push([[.27,.08,.32],[0,.29,.05],metal],[[.12,.14,.24],[.31,-.02,.12],color]);}
  if(type==='rail'){for(const x of[-.18,.18])for(let i=0;i<5;i++)parts.push([[.12,.045,.03],[x,.065,-.27-i*.09],metal]);parts.push([[.17,.08,.2],[0,.22,.02],metal],[[.12,.045,.11],[0,.27,.01],color],[[.18,.12,.15],[0,-.14,-.24],metal]);}
  if(type==='rapid'){
   barrel(.115,.32,[.28,-.12,.3],dark);barrel(.085,.035,[.28,-.12,.48],metal);
   for(let i=0;i<6;i++)parts.push([[.1,.055,.035],[-.43,-.1+i*.05,.13],brass]);
   for(const z of[-.23,.08])parts.push([[.05,.42,.055],[.23,-.01,z],metal]);
  }
  if(type==='shotgun'){
   for(let i=0;i<5;i++)parts.push([[.055,.08,.036],[.15,.02,.08+i*.067],brass]);
   parts.push([[.035,.055,.12],[.135,.045,.14],dark],[[.065,.025,.07],[.145,.07,.18],metal],[[.12,.025,.17],[0,-.28,.23],metal]);
  }
  if(type==='rail'){
   for(const x of[-.23,.23])for(let i=0;i<4;i++)parts.push([[.07,.11,.045],[x,.025,-.18-i*.105],dark]);
   parts.push([[.13,.18,.23],[0,-.19,-.33],color],[[.32,.03,.17],[0,-.16,.06],metal]);
  }
  if(type==='sniper'){for(let i=0;i<7;i++)parts.push([[.23,.025,.025],[0,.11,-.43-i*.062],metal]);for(const x of[-.09,.09])parts.push([[.025,.12,.4],[x,-.05,.43],dark]);}
  detailBatch(root,parts);
 }
 root.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});return root;
}

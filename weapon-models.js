import {panelGeometry,panelTexture,detailBatch} from './model-detail.js';
import * as THREE from 'three';
const metal=new THREE.MeshStandardMaterial({color:0xa1b7c3,metalness:.75,roughness:.35}),dark=new THREE.MeshStandardMaterial({color:0x182c36,metalness:.65,roughness:.5});
metal.map=panelTexture;
metal.userData.sharedWeaponMaterial=dark.userData.sharedWeaponMaterial=true;
function accent(color){return new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:.65,metalness:.3,roughness:.3});}
export function createWeaponModel(type){const root=new THREE.Group();root.name='weapon-'+type;const color=accent({pistol:0xb9f56b,rapid:0x68e9ff,shotgun:0xffb65f,rail:0xbc66ff,sword:0x68e9ff}[type]);
 const box=(size,pos,mat=dark)=>{const m=new THREE.Mesh(panelGeometry,mat);m.scale.set(...size);m.position.set(...pos);root.add(m);return m;};
 const barrel=(radius,length,pos,mat=metal)=>{const m=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,length,12),mat);m.rotation.x=Math.PI/2;m.position.set(...pos);root.add(m);return m;};
 if(type==='pistol'){box([.2,.22,.6],[0,.04,-.16],metal);box([.12,.27,.16],[0,-.17,.12]);box([.13,.35,.18],[0,-.2,-.12]);box([.18,.16,.4],[0,.04,-.58]);barrel(.045,.35,[0,.05,-.88]);box([.16,.18,.25],[0,.02,.35]);box([.07,.04,.12],[0,.17,-.24],color);root.userData.muzzle=[0,.05,-1.06];}
 if(type==='rapid'){box([.43,.38,.58],[0,-.01,.03]);barrel(.26,.4,[0,0,-.3]);const rotor=new THREE.Group();rotor.position.set(0,0,-.48);root.add(rotor);for(let i=0;i<6;i++){const a=i/6*Math.PI*2,m=new THREE.Mesh(new THREE.CylinderGeometry(.042,.042,.85,10),metal);m.rotation.x=Math.PI/2;m.position.set(Math.cos(a)*.16,Math.sin(a)*.16,-.24);rotor.add(m);}for(const z of[.02,-.43,-.64]){const ring=new THREE.Mesh(new THREE.TorusGeometry(.21,.045,6,16),dark);ring.position.z=z;rotor.add(ring);}box([.3,.42,.4],[-.29,-.12,.1],metal);for(let i=0;i<5;i++)box([.07,.1,.07],[-.24+i*.055,.22,.2],color);box([.28,.09,.26],[0,.27,.02]);box([.09,.3,.09],[-.19,.16,.07]);box([.09,.3,.09],[.19,.16,.07]);root.userData.rotor=rotor;root.userData.muzzle=[0,0,-1.16];}
 if(type==='shotgun'){for(const x of[-.065,.065])barrel(.057,.92,[x,.04,-.36]);box([.24,.18,.32],[0,-.04,.19]);box([.21,.15,.33],[0,-.09,-.44],color);box([.13,.27,.14],[0,-.18,.23]);root.userData.muzzle=[0,.04,-.84];}
 if(type==='rail'){box([.3,.3,.6],[0,0,-.12]);for(const x of[-.18,.18]){box([.085,.13,.64],[x,.04,-.45],metal);box([.055,.055,.55],[x,.11,-.44],color);}const core=new THREE.Mesh(new THREE.SphereGeometry(.135,12,8),color);core.position.set(0,.02,-.5);root.add(core);for(const z of[-.24,-.44,-.65]){const ring=new THREE.Mesh(new THREE.TorusGeometry(.18,.025,6,16),color);ring.position.set(0,.02,z);root.add(ring);}box([.13,.25,.15],[0,-.21,.12]);root.userData.muzzle=[0,.02,-.77];}
 if(type==='sword'){box([.13,.38,.13],[0,0,0]);box([.6,.1,.2],[0,.24,0],metal);box([.28,2.5,.085],[0,1.54,0],metal);box([.035,2.43,.10],[.155,1.53,0],color);box([.2,.12,.2],[0,-.25,0],color);const tip=new THREE.Mesh(new THREE.ConeGeometry(.16,.3,4),metal);tip.position.set(0,2.94,0);root.add(tip);root.userData.grip=[0,0,0];}

 if(type!=='sword'){
  const wide=type==='rapid'?.42:type==='rail'?.32:.22;
  const parts=[[[wide,.055,.28],[0,.17,.02],metal],[[.035,.07,.025],[-wide/2,.07,.16],color],[[.035,.07,.025],[wide/2,.07,.16],color],[[.1,.045,.12],[0,-.31,.15],metal]];
  if(type==='pistol'){for(let i=0;i<5;i++)parts.push([[.018,.055,.035],[.108,.02,-.05-i*.08],dark]);parts.push([[.06,.1,.16],[0,.22,-.16],dark],[[.03,.06,.025],[0,.18,-.75],color],[[.16,.05,.2],[0,-.39,-.12],metal],[[.025,.05,.22],[.115,.11,-.17],dark]);}
  if(type==='shotgun'){for(let i=0;i<6;i++)parts.push([[.24,.028,.025],[0,-.04,-.32-i*.045],dark]);parts.push([[.20,.13,.33],[0,.01,.37],metal],[[.18,.24,.045],[0,-.03,.55],dark],[[.028,.085,.035],[0,.12,-.72],color]);for(const x of[-.065,.065]){barrel(.066,.05,[x,.04,-.8],metal);barrel(.044,.012,[x,.04,-.83],dark);}}
  if(type==='rapid'){for(let i=0;i<8;i++)parts.push([[.07,.1,.065],[-.39,-.2+i*.055,.1],metal]);for(let i=0;i<4;i++)parts.push([[.20,.025,.05],[.08,-.04-i*.06,.33],metal]);parts.push([[.27,.08,.32],[0,.29,.05],metal],[[.12,.14,.24],[.31,-.02,.12],color]);}
  if(type==='rail'){for(const x of[-.18,.18])for(let i=0;i<5;i++)parts.push([[.12,.045,.03],[x,.065,-.27-i*.09],metal]);parts.push([[.17,.08,.2],[0,.22,.02],metal],[[.12,.045,.11],[0,.27,.01],color],[[.18,.12,.15],[0,-.14,-.24],metal]);}
  detailBatch(root,parts);
 }
 root.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});return root;
}

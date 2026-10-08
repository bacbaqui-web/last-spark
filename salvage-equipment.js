import * as THREE from 'three';
import {salvageMetal} from './salvage-metal.js';
import {EQUIPMENT} from './equipment.js';
import {applyRigidUpgrade} from './asset-upgrades.js';
import {CHEST_SLOTS, chestArmorGeometry} from './salvage-chest.js';

// One tapered box, twelve triangles. Front-face fasteners, vents and seams
// live in the PBR texture; side faces sample its plain painted margin.
export function panelBlock(parent, size, position, kind = 'pale', {taper = 1, back = false, surface = true} = {}) {
  const geometry = new THREE.BoxGeometry(...size), uv = geometry.attributes.uv, vertices = geometry.attributes.position;
  for (let i = 0; i < vertices.count; i++) {
    if (vertices.getY(i) < 0) vertices.setX(i, vertices.getX(i) * taper);
    const face=Math.floor(i/4);
    if (face !== (back ? 5 : 4) && !(surface==='foot'&&face===2)) uv.setXY(i, .018 + uv.getX(i) * .025, .018 + uv.getY(i) * .025);
  }
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, salvageMetal(kind, surface)); mesh.position.fromArray(position);
  mesh.castShadow = mesh.receiveShadow = true; mesh.userData.cosmetic = true; mesh.userData.simpleEquipment = true;
  parent.add(mesh); return mesh;
}

export function createSimpleEquipment(type, segment = '') {
  const d = EQUIPMENT[type], root = new THREE.Group(); root.name = 'equipment-' + type;
  const block = (size, pos, kind = 'iron', options) => panelBlock(root, size, pos, kind, options);
  if (d.slot === 'head') {
    block([.292,.046,.249],[0,.138,-.017]);
    block([.281,.185,.03],[0,.026,-.132]);
    for(const x of [-.132,.132])block([.031,.153,.215],[x,.025,-.025]);
  } else if (d.slot === 'chest') {
    if(segment.startsWith('upperarm'))block([.15,.13,.15],[0,.03,0],'iron');
    else {
      const color='iron';
      const shell=new THREE.Mesh(chestArmorGeometry(),salvageMetal(color));
      shell.castShadow=shell.receiveShadow=true;shell.userData.cosmetic=true;root.add(shell);
    }
  } else if (d.slot === 'arms' || d.slot === 'legs') {
    const arm=d.slot==='arms',hand=segment.startsWith('hand'),foot=segment.startsWith('foot'),upper=segment.startsWith('upperarm'),thigh=segment.startsWith('thigh');
    const color='iron';
    if(hand)block([.037,.066,.067],[segment.endsWith('_l')?.018:-.018,-.047,-.004],color);
    else if(foot){
      const instep=block([.104,.008,.090],[0,-.037,.015],color,{taper:.96,surface:'foot'});instep.rotation.x=.18;
      const toe=block([.094,.008,.058],[0,-.050,.104],color,{taper:.96,surface:'foot'});toe.rotation.x=.14;
      for(const plate of [instep,toe]){
        const p=plate.geometry.attributes.position;
        for(let i=0;i<p.count;i++)if(p.getZ(i)>0)p.setX(i,p.getX(i)*.82);
        plate.geometry.computeVertexNormals();
      }
    }
    else block([arm?.143:.164,thigh?.235:upper?.15:arm?.187:.215,arm?.139:.154],[0,0,.008],color,{taper:.88});
  } else {
    block([.24,.295,.12],[0,0,-.184],'iron',{back:true,taper:.93});
    if(d.shape==='autoTurret'){
      block([.045,.22,.055],[.12,.18,-.18],'dark');
      const gun=new THREE.Group();gun.name='back-auto-gun';gun.position.set(.24,.28,-.14);root.add(gun);
      panelBlock(gun,[.20,.057,.08],[0,0,0],'dark');
    }
    if(d.shape==='jetPack')for(const x of[-.07,.07]){
      const nozzle=new THREE.Mesh(new THREE.CylinderGeometry(.025,.031,.05,8),salvageMetal('dark'));
      nozzle.name='equipment-nozzle';nozzle.userData.cosmetic=true;nozzle.position.set(x,-.171,-.19);root.add(nozzle);
    }
  }
  return applyRigidUpgrade(root,'equipment-'+type,{segment:['tshirt','marksman','brawler','runner','exoleg'].includes(type)?segment:undefined});
}

export function addSimpleModules(robot, parts, mount) {
  const occupied=new Set();
  const colors={armor:'pale',drive:'ochre',reactor:'blue',weapon:'copper',core:'copper',repair:'pale'};
  for(const {type,slot} of parts) {
    if(!['armor','drive','reactor','weapon','core','repair'].includes(type))continue;
    const index=Number.isInteger(slot)&&slot>=0&&slot<3&&!occupied.has(slot)?slot:[0,1,2].find(i=>!occupied.has(i));
    if(index===undefined)continue;
    const torso=mount('spine_03',type);
    occupied.add(index);const socket=CHEST_SLOTS[index];
    torso.userData.chestSlot=index;torso.userData.moduleType=type;
    const mountPoint=new THREE.Group();mountPoint.position.fromArray(socket.position);mountPoint.rotation.z=socket.angle;torso.add(mountPoint);
    const cassette=panelBlock(mountPoint,socket.size,[0,0,0],colors[type],{surface:'module'});
    cassette.name='chest-cartridge-'+index;cassette.userData.moduleCassette=true;
    panelBlock(mountPoint,[socket.size[0]*.61,.007,.011],[0,-socket.size[1]*.30,socket.size[2]/2+.003],colors[type],{surface:'module'});
  }
}

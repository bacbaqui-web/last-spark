// Compare authored poses against a saved implementation, without browser image decoding.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {batchWildSurfaces} from '../wild-enemy-surfaces.js';
import * as current from '../wild-enemy-models.js';
const root=new URL('../',import.meta.url),snapshot=resolve(process.env.IK_BASELINE||'output/hangar-actor-performance/before-source/wild-enemy-models.js');
const source=readFileSync(snapshot,'utf8').replace(/from '([^']+)'/g,(_,specifier)=>`from '${specifier.startsWith('.')?new URL(specifier,root).href:import.meta.resolve(specifier)}'`);
const previous=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const records=[];
for(const id of Object.keys(current.WILD_ENEMIES)){
 const bytes=readFileSync(new URL(`public/models/wild-robots-v1/${id}.glb`,root)),jsonSize=bytes.readUInt32LE(12),json=JSON.parse(bytes.subarray(20,20+jsonSize));
 const mapped=new Set(json.materials.filter(m=>m.pbrMetallicRoughness?.baseColorTexture).map(m=>m.name));
 for(const material of json.materials){delete material.normalTexture;delete material.emissiveTexture;delete material.occlusionTexture;if(material.pbrMetallicRoughness){delete material.pbrMetallicRoughness.baseColorTexture;delete material.pbrMetallicRoughness.metallicRoughnessTexture;}}
 delete json.images;delete json.textures;json.extensionsRequired=[];
 const data=Buffer.from(JSON.stringify(json)),size=Math.ceil(data.length/4)*4,bin=bytes.subarray(20+jsonSize),glb=Buffer.alloc(20+size+bin.length,32);
 bytes.copy(glb,0,0,20);glb.writeUInt32LE(glb.length,8);glb.writeUInt32LE(size,12);data.copy(glb,20);bin.copy(glb,20+size);
 const model=await new GLTFLoader().parseAsync(glb.buffer.slice(glb.byteOffset,glb.byteOffset+glb.length),''),atlas=new THREE.Texture();
 model.scene.traverse(o=>{if(o.isMesh&&mapped.has(o.material.name))o.material.map=atlas;});batchWildSurfaces(model.scene);
 previous.registerWildTemplate(id,model.scene);current.registerWildTemplate(id,model.scene);
 const rigs=[previous.createWildEnemy(id),current.createWildEnemy(id)],apis=[previous,current],times=[0,0],visits=[0,0];let maxError=0,compared=0;
 for(let frame=0;frame<360;frame++){
  const phase=frame/60,speed=frame<60?0:frame<180?2.3:6,options={speed,aim:.8,elevation:.2*Math.sin(phase),grounded:frame<250||frame>280,velocityX:Math.sin(phase)*speed,velocityZ:Math.cos(phase)*speed};
  for(const i of frame%2?[1,0]:[0,1]){
   const r=rigs[i];r.root.position.set(Math.sin(phase)*2,.1*Math.cos(phase),phase);r.root.rotation.set(.03,.7+phase/8,-.02);r.mount.rotation.z=id==='wall-sniper-spider'?-Math.PI/2:0;
   const update=THREE.Object3D.prototype.updateWorldMatrix;
   THREE.Object3D.prototype.updateWorldMatrix=function(...args){visits[i]++;return update.apply(this,args);};
   const start=performance.now();try{apis[i].animateWildEnemy(r,1/60,options);}finally{times[i]+=performance.now()-start;THREE.Object3D.prototype.updateWorldMatrix=update;}
  }
  const old=[];rigs[0].root.traverse(o=>old.push(o.matrixWorld.elements));let j=0;
  rigs[1].root.traverse(o=>{const expected=old[j++];for(let k=0;k<16;k++){const error=Math.abs(o.matrixWorld.elements[k]-expected[k]);maxError=Math.max(maxError,error);assert(error<1e-8,`${id} frame ${frame} ${o.name} matrix error ${error}`);compared++;}});
 }
 records.push({id,frames:360,compared,maxMatrixError:maxError,animationMs:{before:times[0],after:times[1]},worldMatrixVisits:{before:visits[0],after:visits[1]}});
 for(const [i,r]of rigs.entries())apis[i].disposeWildEnemy(r);
}
mkdirSync('output/hangar-actor-performance',{recursive:true});writeFileSync('output/hangar-actor-performance/ik-equivalence.json',JSON.stringify(records,null,2));console.log(JSON.stringify(records,null,2));

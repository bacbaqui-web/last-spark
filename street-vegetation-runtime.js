import * as T from 'three';
import {streetTreeDetail} from './street-tree-variants.js';
import {streetDetailLevel} from './street-lod-policy.js';
import {vegetationDetailLevel} from './vegetation-density.js';
export const windTime={value:0};
export function windMaterial(material,kind){
 if(material.userData.streetWind)return;material.userData.streetWind=true;
 const previous=material.onBeforeCompile,previousKey=material.customProgramCacheKey();
 material.onBeforeCompile=shader=>{previous.call(material,shader);shader.uniforms.streetWindTime=windTime;shader.vertexShader='uniform float streetWindTime;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
 vec3 windWorld=(modelMatrix*vec4(position,1.0)).xyz;
 float windNear=1.0-smoothstep(25.0,65.0,distance(cameraPosition,windWorld));
 float windWeight=${kind==='grass'?'uv.y * uv.y':'0.65'};
 float breeze=sin(streetWindTime*1.3+windWorld.x*.47+windWorld.z*.31)+.35*sin(streetWindTime*2.1+windWorld.z*.8);
 transformed.x+=breeze*windWeight*windNear*${kind==='grass'?'.13':'.045'};
 transformed.z+=breeze*windWeight*windNear*${kind==='grass'?'.065':'.025'};
`);};material.customProgramCacheKey=()=>previousKey+'street-wind-'+kind;material.needsUpdate=true;
}
export function prepareVegetation(root){
 root.updateMatrixWorld(true);const trees=[],items=[];
 root.traverse(o=>{if(o.userData.lod){
  const [trunk,leaves]=o.children;if(!trunk?.isMesh||!leaves?.isMesh)return;
  windMaterial(leaves.material,'leaves');leaves.userData.vegetation=true;leaves.userData.treeLeaves=true;leaves.userData.fullLeaves=leaves.geometry;leaves.castShadow=false;
  const full={wood:trunk.geometry,leaves:leaves.geometry},levels=o.userData.broken?[full,full,full]:[full,streetTreeDetail(o.userData.variant,1),streetTreeDetail(o.userData.variant,2)];
  trees.push({node:o,trunk,leaves,levels,bounds:new T.Box3().setFromObject(o),originalVisible:leaves.visible,level:0});
 }});
 root.traverse(o=>{if(o.userData.vegetation&&!o.userData.treeLeaves){
  const bounds=new T.Box3().setFromObject(o).expandByScalar(.25),parents=[];for(let p=o.parent;p&&p!==root;p=p.parent)parents.push(p);
  items.push({mesh:o,bounds,parents,originalVisible:o.visible,level:0});
 }});
 const lastPosition=new T.Vector3(Infinity,Infinity,Infinity);let last=-Infinity,lastWalking;
 const update=(time,camera,walking)=>{
  windTime.value=time;
  if(time>=last&&time-last<.12&&walking===lastWalking&&camera.position.distanceToSquared(lastPosition)<1)return;
  last=time;lastWalking=walking;lastPosition.copy(camera.position);let changed=false;
  for(const item of trees){
   const distance=item.bounds.distanceToPoint(camera.position),level=walking?streetDetailLevel(distance,item.level):0;
   if(level!==item.level){item.level=level;item.node.userData.detailLevel=level;item.trunk.geometry=item.levels[level].wood;item.leaves.geometry=item.levels[level].leaves;changed=true;}
   item.leaves.visible=item.originalVisible&&(!walking||distance<110);
  }
  for(const item of items){
   if(item.parents.some(p=>!p.visible))continue;
   const mesh=item.mesh,distance=item.bounds.distanceToPoint(camera.position),limit=mesh.userData.grass?70:110;
   const level=walking?vegetationDetailLevel(distance,item.level):0,counts=mesh.userData.vegetationDensity;
   if(counts&&level!==item.level){item.level=level;mesh.userData.detailLevel=level;mesh.geometry.setDrawRange(0,counts[level]);changed=true;}
   const visible=item.originalVisible&&(!walking||distance<limit)&&(!counts||counts[level]>0);
   if(mesh.visible!==visible){mesh.visible=visible;changed=true;}
  }
  if(changed)root.userData.visibilityRevision=(root.userData.visibilityRevision||0)+1;
 };
 update.snapshot=()=>{
  const levels=[0,0,0];let fullTriangles=0,drawTriangles=0;
  for(const {mesh,parents,level} of items){
   if(!mesh.visible||parents.some(p=>!p.visible))continue;const counts=mesh.userData.vegetationDensity;if(!counts)continue;
   levels[level]++;fullTriangles+=counts[0]/3;drawTriangles+=counts[level]/3;
  }
  return {cells:items.length,visibleLevels:levels,fullTriangles,drawTriangles};
 };
 return update;
}

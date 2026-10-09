import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// All surfaces use the same authored atlas. Carry the original material values per
// vertex so one mechanical assembly renders in one draw call without recoloring it.
let surfaceMaterial;
function materialFor(map){
 if(surfaceMaterial)return surfaceMaterial;
 const material=new THREE.MeshStandardMaterial({map,vertexColors:true,side:THREE.DoubleSide});
 material.name='Wild robot shared atlas';
 material.onBeforeCompile=shader=>{
  shader.vertexShader=shader.vertexShader.replace('#include <common>',`#include <common>\nattribute vec3 wildSurface; attribute vec3 wildEmission; varying vec3 vWildSurface; varying vec3 vWildEmission;`)
   .replace('#include <begin_vertex>',`#include <begin_vertex>\nvWildSurface=wildSurface; vWildEmission=wildEmission;`);
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>\nvarying vec3 vWildSurface; varying vec3 vWildEmission;`)
   .replace('#include <map_fragment>',`#ifdef USE_MAP\nvec4 wildTexel=texture2D(map,vMapUv); diffuseColor*=mix(vec4(1.0),wildTexel,vWildSurface.z);\n#endif`)
   .replace('#include <roughnessmap_fragment>','float roughnessFactor=vWildSurface.y;')
   .replace('#include <metalnessmap_fragment>','float metalnessFactor=vWildSurface.x;')
   .replace('#include <emissivemap_fragment>','totalEmissiveRadiance=vWildEmission;');
 };
 material.customProgramCacheKey=()=> 'wild-robot-atlas-v1';surfaceMaterial=material;return material;
}
export function batchWildSurfaces(scene){
 if(scene.userData.wildBatched)return scene;
 // Capture the optical center before rigid-part batching removes individual lenses.
 scene.updateMatrixWorld(true);
 scene.traverse(mesh=>{
  if(!mesh.isMesh)return;
  if([].concat(mesh.material).some(material=>material.name.endsWith('_iris'))){
   const center=new THREE.Box3().setFromObject(mesh).getCenter(new THREE.Vector3());
   scene.userData.wildEye=scene.worldToLocal(center).toArray();
  }
  for(const material of [].concat(mesh.material))if(/_(eye|iris)$/.test(material.name)){
   material.color.setHex(0xb90812);material.emissive.setHex(0xff0818);
   material.emissiveIntensity=material.name.endsWith('_iris')?4:1.8;
  }
 });
 let atlas;const assemblies=[];
 scene.traverse(o=>{if(o.isMesh&&o.material.map)atlas=o.material.map;if(o.isGroup&&o.name.endsWith('_Mesh'))assemblies.push(o);});
 if(!atlas)return scene; // Geometry-only Node validation has no browser textures.
 scene.updateMatrixWorld(true);const material=materialFor(atlas);
 for(const group of assemblies){
  const geometries=[],inverse=group.matrixWorld.clone().invert();
  group.traverse(mesh=>{if(!mesh.isMesh)return;const source=mesh.material,g=mesh.geometry.clone();g.applyMatrix4(inverse.clone().multiply(mesh.matrixWorld));
   const count=g.attributes.position.count,color=new Float32Array(count*3),surface=new Float32Array(count*3),emission=new Float32Array(count*3);
   for(let i=0;i<count;i++){source.color.toArray(color,i*3);surface.set([source.metalness,source.roughness,source.map?1:0],i*3);source.emissive.clone().multiplyScalar(source.emissiveIntensity).toArray(emission,i*3);}
   g.setAttribute('color',new THREE.BufferAttribute(color,3));g.setAttribute('wildSurface',new THREE.BufferAttribute(surface,3));g.setAttribute('wildEmission',new THREE.BufferAttribute(emission,3));
   for(const key of Object.keys(g.attributes))if(!['position','normal','uv','color','wildSurface','wildEmission'].includes(key))g.deleteAttribute(key);
   geometries.push(g);
  });
  const geometry=mergeGeometries(geometries,false);if(!geometry)throw Error('Wild robot assembly merge failed: '+group.name);
  for(const g of geometries)g.dispose();
  group.clear();const mesh=new THREE.Mesh(geometry,material);mesh.name=group.name+'_Batched';mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);
 }
 scene.userData.wildBatched=true;return scene;
}

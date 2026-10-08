import * as T from 'three';
import {preloadAssetUpgrades} from './asset-upgrades.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
let cached;
export function loadPurchasedModels(){return cached??=(async()=>{
 await preloadAssetUpgrades();
 const response=await fetch(new URL('./atomic/manifest.json',document.baseURI));if(!response.ok)throw Error('에셋 목록을 불러오지 못했습니다');const manifest=await response.json(),loader=new GLTFLoader(),templates=new Map();let cursor=0;
 await Promise.all(Array.from({length:4},async()=>{while(cursor<manifest.length){const asset=manifest[cursor++],gltf=await loader.loadAsync(new URL('./atomic/'+asset.file,document.baseURI).href),model=gltf.scene;model.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(model),center=bounds.getCenter(new T.Vector3()),size=bounds.getSize(new T.Vector3()),buckets=new Map();
  model.traverse(o=>{if(!o.isMesh)return;let geometry=o.geometry.clone();geometry.applyMatrix4(o.matrixWorld);geometry.translate(-center.x,-bounds.min.y,-center.z);if(geometry.index){const expanded=geometry.toNonIndexed();geometry.dispose();geometry=expanded;}for(const attr of Object.keys(geometry.attributes))if(!['position','normal','uv'].includes(attr))geometry.deleteAttribute(attr);if(!geometry.attributes.normal)geometry.computeVertexNormals();if(!geometry.attributes.uv)geometry.setAttribute('uv',new T.Float32BufferAttribute(new Float32Array(geometry.attributes.position.count*2),2));if(Array.isArray(o.material))throw Error('복합 재질: '+asset.id);if(!buckets.has(o.material.uuid))buckets.set(o.material.uuid,{material:o.material,geometries:[]});buckets.get(o.material.uuid).geometries.push(geometry);o.material.side=T.DoubleSide;if('metalness' in o.material)o.material.metalness=Math.min(o.material.metalness,.15);});
  const parts=[...buckets.values()].map(b=>({material:b.material,geometry:mergeGeometries(b.geometries,false)}));if(parts.some(p=>!p.geometry))throw Error('메시 병합 실패: '+asset.id);for(const b of buckets.values())for(const g of b.geometries)g.dispose();templates.set(asset.id,{parts,size,maxSize:Math.max(size.x,size.y,size.z)});
 }}));return templates;
})();}

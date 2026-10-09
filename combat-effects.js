import * as THREE from 'three';

// Only cosmetic objects use this pool. Projectile damage and loot never depend
// on whether a visual slot is available. Retained GPU resources have fixed caps.
export function createCombatEffectPool(){
 const specs={casing:{limit:48},spark:{limit:128},tracer:{limit:64}};
 const pools=new Map(),owned=new WeakMap();let created=0,reused=0,dropped=0;
 function create(kind){
  const pool=pools.get(kind);
  if(kind==='tracer'){
   const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(6),3).setUsage(THREE.DynamicDrawUsage));
   return new THREE.Line(geometry,new THREE.LineBasicMaterial({transparent:true,opacity:.7}));
  }
  if(!pool.geometry){
   pool.geometry=kind==='casing'?new THREE.CylinderGeometry(.026,.026,.13,6):new THREE.BoxGeometry(.018,.018,.12);
   pool.materials=kind==='casing'?[new THREE.MeshStandardMaterial({color:0xd5a34a,metalness:.75,roughness:.3})]:[0xffeea3,0xffb63e].map(color=>new THREE.MeshBasicMaterial({color,transparent:true,opacity:1,blending:THREE.AdditiveBlending,depthWrite:false}));
  }
  return new THREE.Mesh(pool.geometry,pool.materials[0]);
 }
 for(const kind of Object.keys(specs))pools.set(kind,{free:[],active:new Set()});
 return {
  acquire(kind,variant=0){
   const pool=pools.get(kind);if(!pool)throw Error('Unknown cosmetic effect: '+kind);
   let object=pool.free.pop();
   if(object)reused++;
   else{if(pool.active.size>=specs[kind].limit){dropped++;return null;}object=create(kind);owned.set(object,pool);created++;}
   object.visible=true;object.position.set(0,0,0);object.quaternion.identity();object.scale.setScalar(1);object.userData.effect=true;
   if(kind==='spark')object.material=pool.materials[variant%2];
   pool.active.add(object);return object;
  },
  tracer(start,end,color,opacity=.7){
   const object=this.acquire('tracer');if(!object)return null;
   const positions=object.geometry.attributes.position;positions.setXYZ(0,start.x,start.y,start.z);positions.setXYZ(1,end.x,end.y,end.z);positions.needsUpdate=true;object.geometry.computeBoundingSphere();
   object.material.color.set(color);object.material.opacity=opacity;return object;
  },
  release(object){
   const pool=owned.get(object);if(!pool)return false;
   object.removeFromParent();if(pool.active.delete(object))pool.free.push(object);return true;
  },
  snapshot(){let active=0,retained=0;for(const pool of pools.values()){active+=pool.active.size;retained+=pool.free.length;}return {effectPoolCreated:created,effectPoolReused:reused,effectPoolActive:active,effectPoolRetained:retained,effectPoolDropped:dropped};},
  dispose(){
   for(const [kind,pool]of pools){for(const object of [...pool.active,...pool.free]){object.removeFromParent();owned.delete(object);if(kind==='tracer'){object.geometry.dispose();object.material.dispose();}}pool.geometry?.dispose();for(const material of pool.materials||[])material.dispose();pool.geometry=null;pool.materials=null;pool.active.clear();pool.free.length=0;}
  }
 };
}

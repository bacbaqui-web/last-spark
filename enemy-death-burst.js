import * as THREE from 'three';

export const ENEMY_DEATH_DURATION=1.05;
// All deaths share an unlit, texture-free black material. Live materials and
// authored geometry are never modified or copied for the burst.
const black=new THREE.MeshBasicMaterial({color:0x080808,toneMapped:false,side:THREE.DoubleSide});
black.name='Black scattered robot parts';black.userData.sharedWeaponMaterial=true;
const rotation=new THREE.Quaternion(),instance=new THREE.Matrix4();

// Shared radial falloff keeps the flash soft without postprocessing or scene lights.
const pixels=new Uint8Array(32*32*4);
for(let y=0;y<32;y++)for(let x=0;x<32;x++){
 const radius=Math.hypot((x-15.5)/15.5,(y-15.5)/15.5);
 pixels.set([255,255,255,Math.round(255*Math.max(0,1-radius)**1.7)],(y*32+x)*4);
}
const flashMap=new THREE.DataTexture(pixels,32,32);flashMap.needsUpdate=true;
function explosion(group,center,size){
 const effect=new THREE.Group();effect.position.copy(center);group.add(effect);
 const material=new THREE.SpriteMaterial({map:flashMap,color:0xffad32,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false});
 const flash=new THREE.Sprite(material);effect.add(flash);
 const coreMaterial=material.clone();coreMaterial.color.setHex(0xfff4c9);
 const core=new THREE.Sprite(coreMaterial);effect.add(core);
 const sparkPositions=new Float32Array(28*2*3),arcPositions=new Float32Array(8*5*2*3);
 const sparkGeometry=new THREE.BufferGeometry().setAttribute('position',new THREE.BufferAttribute(sparkPositions,3));
 const arcGeometry=new THREE.BufferGeometry().setAttribute('position',new THREE.BufferAttribute(arcPositions,3));
 const sparkMaterial=new THREE.LineBasicMaterial({color:0xffb641,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false});
 const arcMaterial=new THREE.LineBasicMaterial({color:0x70cfff,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false});
 const sparks=new THREE.LineSegments(sparkGeometry,sparkMaterial),arcs=new THREE.LineSegments(arcGeometry,arcMaterial);
 sparks.frustumCulled=arcs.frustumCulled=false;effect.add(sparks,arcs);
 return {effect,flash,core,sparks,arcs,size,owned:[material,coreMaterial,sparkGeometry,arcGeometry,sparkMaterial,arcMaterial]};
}
function updateExplosion(fx,t){
 const burst=Math.max(0,1-t/.30),size=fx.size;
 fx.flash.visible=fx.core.visible=burst>0;
 fx.flash.scale.setScalar(size*(.65+2.9*(1-burst)));fx.flash.material.opacity=burst*burst;
 fx.core.scale.setScalar(size*(.28+1.0*(1-burst)));fx.core.material.opacity=burst**3;
 fx.sparks.visible=t<.48;fx.sparks.material.opacity=Math.max(0,1-t/.48);
 const sparks=fx.sparks.geometry.attributes.position;
 for(let i=0;i<28;i++){
  const az=i*2.39996323,y=1-2*(i+.5)/28,rad=Math.sqrt(1-y*y),speed=size*(2.2+(i%4)*.4);
  for(let end=0;end<2;end++){const age=Math.max(0,t-end*.035),d=.10*size+speed*age;sparks.setXYZ(i*2+end,Math.cos(az)*rad*d,y*d-2.5*age*age,Math.sin(az)*rad*d);}
 }
 sparks.needsUpdate=true;
 const pulse=[[0,.065],[.13,.19],[.27,.33],[.43,.49]].findIndex(([a,b])=>t>=a&&t<b);
 fx.arcs.visible=pulse>=0;
 if(pulse>=0){
  const arcs=fx.arcs.geometry.attributes.position;
  for(let branch=0;branch<8;branch++){
   const az=branch*2.39996+pulse*.8,dy=Math.sin(branch*3.7+pulse)*.75,rad=Math.sqrt(1-dy*dy);
   for(let segment=0;segment<5;segment++)for(let end=0;end<2;end++){
    const step=segment+end,d=(.12+step*.18)*size,jitter=Math.sin(step*12.3+branch*8.1+pulse*3)*size*.12;
    arcs.setXYZ((branch*5+segment)*2+end,Math.cos(az)*rad*d+Math.sin(az)*jitter,dy*d+Math.cos(step*9+branch)*size*.08,Math.sin(az)*rad*d-Math.cos(az)*jitter);
   }
  }
  arcs.needsUpdate=true;
 }
}

export function recordEnemyImpact(r,point,direction,strength=1,mesh=null){
 if(!point||!direction||![...point.toArray(),...direction.toArray(),strength].every(Number.isFinite)||direction.lengthSq()<1e-10)return;
 r.deathImpact={point:point.clone(),direction:direction.clone().normalize(),strength:THREE.MathUtils.clamp(strength,.65,1.35),mesh:r.hitMeshes.includes(mesh)?mesh:null};
}

function begin(r){
 r.mixer?.stopAllAction();r.flashTime=0;
 if(r.muzzleFlash)r.muzzleFlash.visible=false;
 if(r.muzzleGlow)r.muzzleGlow.visible=false;
 if(r.muzzleLight)r.muzzleLight.intensity=0;
 r.root.updateWorldMatrix(true,true);
 const sources=[];
 r.root.traverseVisible(o=>{
  if(!o.isMesh||o===r.muzzleFlash||o.userData.effect||![].concat(o.material||[]).some(m=>m.visible&&m.opacity>0))return;
  if(o.isInstancedMesh){for(let i=0;i<o.count;i++){o.getMatrixAt(i,instance);sources.push({source:o,transform:o.matrixWorld.clone().multiply(instance)});}}
  else sources.push({source:o,transform:o.matrixWorld.clone()});
 });
 const group=new THREE.Group();group.name='black-part-burst';
 // Counteract the frozen robot root so gravity and scatter use world axes,
 // including wall-mounted robots, small drones and scaled bosses.
 group.matrixAutoUpdate=false;group.matrix.copy(r.root.matrixWorld).invert();
 const hidden=r.root.children.map(node=>({node,visible:node.visible}));
 for(const {node}of hidden)node.visible=false;
 r.root.add(group);
 const pieces=[],limit=Math.max(0,Math.min(sources.length,r.deathPartLimit??Infinity));
 for(let i=0;i<limit;i++){
  const {source,transform}=sources[Math.floor(i*sources.length/limit)],geometry=source.geometry;
  if(!geometry.boundingBox)geometry.computeBoundingBox();
  const center=geometry.boundingBox.getCenter(new THREE.Vector3()),position=center.clone().applyMatrix4(transform),orientation=new THREE.Quaternion(),scale=new THREE.Vector3();
  transform.decompose(new THREE.Vector3(),orientation,scale);
  const node=new THREE.Group(),mesh=new THREE.Mesh(geometry,black);
  mesh.name=source.name+'-fragment';mesh.position.copy(center).negate();mesh.castShadow=mesh.receiveShadow=false;
  node.position.copy(position);node.quaternion.copy(orientation);node.scale.copy(scale);node.add(mesh);group.add(node);
  const angle=i*2.399963229728653,speed=3.4+(i*7%11)*.18;
  pieces.push({mesh,node,source,p:position,q:orientation,velocity:new THREE.Vector3(Math.cos(angle)*speed,3.2+(i*5%9)*.24,Math.sin(angle)*speed),axis:new THREE.Vector3(Math.sin(i+1),.5,Math.cos(i*1.7)).normalize(),spin:4+(i%5)*.7});
 }
 const bounds=new THREE.Box3();
 for(const {source,transform}of sources){source.geometry.computeBoundingBox();bounds.union(source.geometry.boundingBox.clone().applyMatrix4(transform));}
 const center=r.deathImpact?.point?.clone()||(bounds.isEmpty()?r.root.getWorldPosition(new THREE.Vector3()):bounds.getCenter(new THREE.Vector3()));
 const size=bounds.isEmpty()?1:THREE.MathUtils.clamp(bounds.getSize(new THREE.Vector3()).length()*.28,.45,2.4);
 const fx=explosion(group,center,size);
 const state={group,pieces,hidden,hit:r.deathImpact,fx,age:0};r.destruction=state;return state;
}

export function updateEnemyDeathBurst(r,time){
 const d=r.destruction||begin(r),t=Math.max(0,Math.min(ENEMY_DEATH_DURATION,Number.isFinite(time)?time:0));d.age=t;
 // Absolute-time ballistic motion and short effects remain seekable without physics.
 updateExplosion(d.fx,t);
 for(const p of d.pieces){
  p.node.position.copy(p.p).addScaledVector(p.velocity,t);p.node.position.y-=9*t*t;
  rotation.setFromAxisAngle(p.axis,p.spin*t);p.node.quaternion.copy(rotation).multiply(p.q);
 }
 d.group.visible=t<ENEMY_DEATH_DURATION;
 return d;
}

export function resetEnemyDeathBurst(r){
 r.deathImpact=null;delete r.deathPartLimit;
 const d=r.destruction;if(!d)return;
 for(const resource of d.fx.owned)resource.dispose();
 d.group.removeFromParent();d.group.clear();
 for(const {node,visible}of d.hidden)node.visible=visible;
 r.destruction=null;
}

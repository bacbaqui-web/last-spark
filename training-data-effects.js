import * as THREE from 'three';

// Temporary material copies leave shared enemy textures and batching untouched
// after assembly. Cosmetic particles never participate in hits or rewards.
export function createTrainingDataEffects(scene,{maxEffects=8}={}){
 const actors=new Map(),geometry=new THREE.BoxGeometry(1,1,1),ringGeometry=new THREE.RingGeometry(.86,1,48),matrix=new THREE.Matrix4(),q=new THREE.Quaternion(),pos=new THREE.Vector3(),scale=new THREE.Vector3();
 function release(robot){const state=actors.get(robot);if(!state)return;for(const [mesh,original]of state.materials)mesh.material=original;for(const [mesh,visible]of state.visibility||[])mesh.visible=visible;for(const mat of state.copies)mat.dispose();state.visual?.removeFromParent();state.visual?.traverse(node=>{if(node.isInstancedMesh)node.dispose();});for(const mat of state.visualMaterials)mat.dispose();robot.trainingData=false;actors.delete(robot);}
 function begin(robot,kind){
  release(robot);robot.trainingData=true;robot.root.updateWorldMatrix(true,true);
  const bounds=new THREE.Box3().setFromObject(robot.root),height=Math.max(.3,bounds.max.y-bounds.min.y),uniforms={dataLevel:{value:kind==='spawn'?-.12:1.12},dataMin:{value:bounds.min.y},dataHeight:{value:height}};
  const state={kind,materials:[],copies:[],visualMaterials:[],uniforms,bounds,height};actors.set(robot,state);
  const sharedCopies=new Map();
  function material(original){if(sharedCopies.has(original))return sharedCopies.get(original);const mat=original.clone();mat.onBeforeCompile=shader=>{
   Object.assign(shader.uniforms,uniforms);
   shader.vertexShader='varying vec3 vDataWorld;\n'+shader.vertexShader.replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvDataWorld=(modelMatrix * vec4(transformed,1.0)).xyz;');
   shader.fragmentShader='varying vec3 vDataWorld; uniform float dataLevel; uniform float dataMin; uniform float dataHeight;\n'+shader.fragmentShader.replace('#include <alphatest_fragment>',`#include <alphatest_fragment>
    vec3 cell=floor(vDataWorld*11.0);float noise=fract(sin(dot(cell,vec3(12.9898,78.233,37.719)))*43758.5453);
    float dataThreshold=(vDataWorld.y-dataMin)/dataHeight+(noise-.5)*.15;
    if(dataThreshold>dataLevel)discard;
    float dataEdge=1.0-smoothstep(0.0,.16,dataLevel-dataThreshold);
   `).replace('#include <opaque_fragment>','outgoingLight=mix(outgoingLight,vec3(.12,1.4,2.8),dataEdge*.95);\n#include <opaque_fragment>');
  };mat.customProgramCacheKey=()=> 'training-data-dissolve-v1';sharedCopies.set(original,mat);state.copies.push(mat);return mat;}
  robot.root.traverse(mesh=>{if(!mesh.isMesh)return;state.materials.push([mesh,mesh.material]);mesh.material=Array.isArray(mesh.material)?mesh.material.map(material):material(mesh.material);});
  if([...actors.values()].filter(s=>s.visual).length<maxEffects){
   const group=new THREE.Group();group.userData.effect=true;group.name='training-data-'+kind;
   const color=new THREE.MeshBasicMaterial({color:0x55dfff,transparent:true,opacity:.8,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false});state.visualMaterials.push(color);
   const pixels=new THREE.InstancedMesh(geometry,color,48);pixels.frustumCulled=false;pixels.instanceMatrix.setUsage(THREE.DynamicDrawUsage);group.add(pixels);state.pixels=pixels;
   const ring=new THREE.Mesh(ringGeometry,color);ring.rotation.x=-Math.PI/2;ring.position.set((bounds.min.x+bounds.max.x)/2,bounds.min.y+.04,(bounds.min.z+bounds.max.z)/2);const radius=Math.max(.7,Math.min(4,(bounds.max.x-bounds.min.x)*.65));ring.scale.setScalar(radius);group.add(ring);state.ring=ring;state.radius=radius;
   scene.add(group);state.visual=group;
  }
  return state;
 }
 function scatter(robot,age){
  let state=actors.get(robot);
  if(state?.kind!=='parts'){
   release(robot);robot.trainingData=true;robot.root.updateWorldMatrix(true,true);
   const bounds=new THREE.Box3().setFromObject(robot.root),center=bounds.getCenter(new THREE.Vector3());
   const group=new THREE.Group();group.name='training-data-parts';group.userData.effect=true;scene.add(group);
   const material=new THREE.MeshStandardMaterial({color:0x30bfff,emissive:0x087abe,emissiveIntensity:.8,roughness:.4,metalness:.25,transparent:true,opacity:1,depthWrite:true,toneMapped:false});
   const dissolve={level:{value:1e5}};material.onBeforeCompile=shader=>{shader.uniforms.partDataLevel=dissolve.level;shader.vertexShader='varying vec3 vPartWorld;\n'+shader.vertexShader.replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvPartWorld=(modelMatrix*vec4(transformed,1.0)).xyz;');shader.fragmentShader='varying vec3 vPartWorld;uniform float partDataLevel;\n'+shader.fragmentShader.replace('#include <alphatest_fragment>','#include <alphatest_fragment>\nfloat noise=fract(sin(dot(floor(vPartWorld*18.0),vec3(12.9898,78.233,37.719)))*43758.5453);float edge=vPartWorld.y+(noise-.5)*.06;if(edge>partDataLevel)discard;').replace('#include <opaque_fragment>','outgoingLight=mix(outgoingLight,vec3(.12,1.4,2.8),1.0-smoothstep(0.0,.12,partDataLevel-edge));\n#include <opaque_fragment>');};material.customProgramCacheKey=()=> 'training-parts-top-down-v1';
   state={kind:'parts',materials:[],copies:[],visualMaterials:[material],visual:group,visibility:[],parts:[],age:0,dissolve};actors.set(robot,state);
   const candidates=[];robot.root.traverse(mesh=>{if(mesh.isMesh&&mesh.visible&&mesh.geometry&&!mesh.userData.effect)candidates.push(mesh);});
   const limit=Math.min(robot.deathPartLimit||96,96),step=Math.max(1,Math.ceil(candidates.length/limit));
   for(let i=0;i<candidates.length;i++){
    const mesh=candidates[i];state.visibility.push([mesh,mesh.visible]);mesh.visible=false;if(i%step)continue;
    const part=new THREE.Group(),fragment=new THREE.Mesh(mesh.geometry,material);mesh.geometry.computeBoundingBox();const localCenter=mesh.geometry.boundingBox.getCenter(new THREE.Vector3());mesh.matrixWorld.decompose(part.position,part.quaternion,part.scale);part.position.copy(localCenter).applyMatrix4(mesh.matrixWorld);fragment.position.copy(localCenter).negate();part.add(fragment);group.add(part);
    const initial=part.position.clone(),direction=initial.clone().sub(center);direction.y=0;
    if(direction.lengthSq()<.01)direction.set(Math.cos(i*2.399),0,Math.sin(i*2.399));direction.normalize();
    const velocity=direction.multiplyScalar(2.2+(i%5)*.65);velocity.y=.5+(i%7)*.12;
    state.parts.push({mesh:part,initial,rotation:part.quaternion.clone(),velocity,spin:new THREE.Vector3(Math.sin(i+1),Math.cos(i*1.7),Math.sin(i*.7)).normalize(),floor:0,radius:Math.max(.04,Math.min(.4,mesh.geometry.boundingBox.getSize(new THREE.Vector3()).multiply(part.scale).length()*.22)),spinSpeed:3+(i%5)});
   }
  }
  robot.deathDuration=2.8;const t=Math.max(0,Math.min(2.8,age));
  // Fixed substeps keep floor bounce and rolling stable across frame rates.
  while(state.age<t){const dt=Math.min(1/120,t-state.age);state.age+=dt;
   for(const part of state.parts){const p=part.mesh.position;part.velocity.y-=12*dt;p.addScaledVector(part.velocity,dt);const floor=part.floor+part.radius;
    if(p.y<floor){p.y=floor;if(part.velocity.y<-.55)part.velocity.y=-part.velocity.y*.28;else part.velocity.y=0;const friction=Math.exp(-3.5*dt);part.velocity.x*=friction;part.velocity.z*=friction;part.spinSpeed*=Math.exp(-2*dt);}
    part.mesh.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(part.spin,dt*part.spinSpeed));
   }
  }
  if(t>=1.65){if(!state.deleteBounds)state.deleteBounds=new THREE.Box3().setFromObject(state.visual);const b=state.deleteBounds,u=THREE.MathUtils.smoothstep(t,1.65,2.8);state.dissolve.level.value=THREE.MathUtils.lerp(b.max.y+.08,b.min.y-.08,u);}

 }
 function pose(robot,kind,t){
  const state=actors.get(robot)?.kind===kind?actors.get(robot):begin(robot,kind),u=THREE.MathUtils.clamp(t,0,1),level=kind==='spawn'?u:1-u;
  state.uniforms.dataLevel.value=-.12+level*1.24;
  if(state.visual){const {bounds,height,pixels,ring}=state;const cx=(bounds.min.x+bounds.max.x)/2,cz=(bounds.min.z+bounds.max.z)/2;
   for(let i=0;i<48;i++){const a=i*2.39996323,r=state.radius*(.25+(i%7)/8),travel=(u+i/48)%1;
    pos.set(cx+Math.cos(a)*r*(kind==='death'?1+u:1),bounds.min.y+height*(kind==='spawn'?1-travel:travel)+u*(kind==='death'?1:0),cz+Math.sin(a)*r*(kind==='death'?1+u:1));
    scale.setScalar((.035+(i%4)*.018)*Math.sin(travel*Math.PI));matrix.compose(pos,q,scale);pixels.setMatrixAt(i,matrix);
   }pixels.instanceMatrix.needsUpdate=true;state.visualMaterials[0].opacity=(1-u)*.85;ring.scale.setScalar(state.radius*(1+Math.sin(u*Math.PI)*.4));
  }
  if(kind==='spawn'&&u>=1)release(robot);
 }
 return {spawn:(robot,t)=>pose(robot,'spawn',t),death:scatter,release,clear(){for(const robot of [...actors.keys()])release(robot);},snapshot:()=>({dataActors:actors.size,dataEffects:[...actors.values()].filter(s=>s.visual).length}),dispose(){this.clear();geometry.dispose();ringGeometry.dispose();}};
}

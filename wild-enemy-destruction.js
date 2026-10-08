import * as THREE from 'three';
import {WILD_BODY_RELEASE,wildRecoilBreakTime,createWildRecoil,poseWildRecoil,applyWildRecoil} from './wild-enemy-recoil.js';
import {WILD_DEBRIS_GRAVITY,createWildDebris,poseWildDebris,sampleWildDebrisPosition,disposeWildDebris} from './wild-enemy-debris.js';

export const WILD_DESTRUCTION_DURATION=5.4;
export const WILD_FINAL_BURST_AT=3;
const gravity=WILD_DEBRIS_GRAVITY,debrisDrag=2.8;
// Three discrete discharges with dark gaps, rather than a sustained arc.
const lightningFlashes=[[.06,.12],[.24,.30],[.46,.525]];
const fractured=new WeakMap(),up=new THREE.Vector3(0,1,0),scratch=new THREE.Vector3(),dummy=new THREE.Object3D();
const boltGeometry=new THREE.CylinderGeometry(1,1,1,5,1),boltMaterial=new THREE.MeshBasicMaterial({color:0xa7eeff,toneMapped:false});
const boltGlowMaterial=new THREE.MeshBasicMaterial({color:0x158dff,transparent:true,opacity:.24,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false});
function random(seed){return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}

// Point and direction are captured in world space at the lethal hit. Direction
// follows the projectile, away from the shooter; gravity still acts downward.
export function recordWildImpact(r,point,direction,strength=1,mesh=null){
  if(!point||!direction||![...point.toArray(),...direction.toArray(),strength].every(Number.isFinite)||direction.lengthSq()<1e-10)return;
  r.deathImpact={point:point.clone(),direction:direction.clone().normalize(),strength:THREE.MathUtils.clamp(strength,.65,1.35),mesh:r.hitMeshes.includes(mesh)?mesh:null};
}

// Detach the authored mechanical assemblies intact. A broken robot retains
// recognisable armour, limbs and weapons; no spatial slicing of its surfaces.
function fragments(geometry){
  let cached=fractured.get(geometry);if(cached)return cached;
  const g=geometry.clone();g.computeBoundingBox();
  const origin=g.boundingBox.getCenter(new THREE.Vector3());
  if(g.attributes.wildEmission)g.attributes.wildEmission.array.fill(0);
  g.translate(-origin.x,-origin.y,-origin.z);g.computeBoundingSphere();
  cached=[{geometry:g,origin}];fractured.set(geometry,cached);return cached;
}

// Split only at the three-second explosion. Four spatial clusters retain the
// actual mesh surfaces and UVs, rather than substituting generic cubes.
const shardCache=new WeakMap();
function shardGeometry(source){
  if(shardCache.has(source))return shardCache.get(source);
  const g=source.index?source.toNonIndexed():source.clone(),position=g.attributes.position;
  const triangles=Array.from({length:position.count/3},(_,i)=>({i,center:new THREE.Vector3().fromBufferAttribute(position,i*3).add(new THREE.Vector3().fromBufferAttribute(position,i*3+1)).add(new THREE.Vector3().fromBufferAttribute(position,i*3+2)).multiplyScalar(1/3)}));
  let groups=[triangles];
  for(let level=0;level<2;level++)groups=groups.flatMap(group=>{
    if(group.length<8)return [group];
    const bounds=new THREE.Box3().setFromPoints(group.map(t=>t.center)),size=bounds.getSize(new THREE.Vector3());
    const axis=size.x>size.y?(size.x>size.z?'x':'z'):(size.y>size.z?'y':'z');
    group.sort((a,b)=>a.center[axis]-b.center[axis]);const mid=Math.ceil(group.length/2);
    return [group.slice(0,mid),group.slice(mid)];
  });
  const chunks=groups.map(group=>{
    const geometry=new THREE.BufferGeometry();
    for(const name of ['position','normal','uv']){
      const attribute=g.attributes[name];if(!attribute)continue;
      const values=new Float32Array(group.length*3*attribute.itemSize);
      group.forEach((t,n)=>{for(let v=0;v<3;v++)for(let c=0;c<attribute.itemSize;c++)values[(n*3+v)*attribute.itemSize+c]=attribute.array[(t.i*3+v)*attribute.itemSize+c];});
      geometry.setAttribute(name,new THREE.BufferAttribute(values,attribute.itemSize));
    }
    geometry.computeBoundingBox();const offset=geometry.boundingBox.getCenter(new THREE.Vector3());geometry.translate(-offset.x,-offset.y,-offset.z);geometry.computeBoundingBox();geometry.computeBoundingSphere();
    return {geometry,offset};
  });g.dispose();shardCache.set(source,chunks);return chunks;
}

function beginShards(d){
  // Always sample the same absolute instant, even if rendering skipped it.
  poseWildDebris(d.physics,d.finalBurstAt);
  d.shards=[];d.shardsByPart=[];
  const materials=new Map();
  d.pieces.forEach((p,index)=>{
    const source=p.mesh.material;
    if(!materials.has(source)){
      const material=new THREE.MeshStandardMaterial({map:source.map||null,color:0x25272a,roughness:.96,metalness:.12,side:THREE.DoubleSide});
      material.name='Charred broken metal';
      material.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\ndiffuseColor.rgb=vec3(dot(diffuseColor.rgb,vec3(.299,.587,.114)));');};
      material.customProgramCacheKey=()=> 'wild-charred-shards-v1';materials.set(source,material);d.owned.push(material);
    }
    const chunks=shardGeometry(p.mesh.geometry);d.shardsByPart[index]=[];
    chunks.forEach((chunk,n)=>{
      const offset=chunk.offset.clone().multiply(p.s).applyQuaternion(p.mesh.quaternion),start=p.mesh.position.clone().add(offset),q=p.mesh.quaternion.clone();
      const mesh=new THREE.Mesh(chunk.geometry,materials.get(source));mesh.name=p.mesh.name+'-charred-'+n;mesh.castShadow=mesh.receiveShadow=true;d.group.add(mesh);
      const half=chunk.geometry.boundingBox.getSize(new THREE.Vector3()).multiply(p.s).multiplyScalar(.5).max(new THREE.Vector3().setScalar(.012*d.scale));
      const spread=offset.clone().setY(0);if(spread.lengthSq()<1e-8)spread.set(Math.sin(n*2.4+index),0,Math.cos(n*2.4+index));spread.normalize().multiplyScalar(.7*d.scale);
      const velocity=p.motionVelocity.clone().add(new THREE.Vector3().crossVectors(p.motionAngular,offset)).add(spread);
      const angular=p.motionAngular.clone().add(new THREE.Vector3(Math.sin(index+n)*2,Math.cos(index+n)*2,1));
      d.shardsByPart[index].push(d.shards.length);
      d.shards.push({mesh,start,startQ:q,s:p.s.clone(),half,delay:0,velocity,axis:angular.clone().normalize(),spin:angular.length(),drag:.9,supported:false,detached:true,part:{mass:p.mass/chunks.length}});
    });
  });
  // Many small adjacent shards overlap at creation; floor-only contacts avoid
  // artificial self-explosions and the collision-mask limit for >31 bodies.
  d.shardPhysics=createWildDebris(d.shards,{floor:d.floor,scale:d.scale,collidePieces:false});
}

function cloud(count,smoke){
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(count*3),3));
  geometry.setAttribute('tint',new THREE.BufferAttribute(new Float32Array(count*3),3));
  geometry.setAttribute('radius',new THREE.BufferAttribute(new Float32Array(count),1));
  geometry.setAttribute('alpha',new THREE.BufferAttribute(new Float32Array(count),1));
  const material=new THREE.ShaderMaterial({
    transparent:true,depthWrite:false,blending:smoke?THREE.NormalBlending:THREE.AdditiveBlending,
    uniforms:{pixelScale:{value:600},smoke:{value:smoke?1:0}},
    vertexShader:`attribute vec3 tint; attribute float radius; attribute float alpha;
      uniform float pixelScale; varying vec3 vTint; varying float vAlpha;
      void main(){vec4 p=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*p;
        gl_PointSize=clamp(radius*pixelScale/max(.1,-p.z),1.,512.);vTint=tint;vAlpha=alpha;}`,
    fragmentShader:`uniform float smoke; varying vec3 vTint; varying float vAlpha;
      void main(){vec2 p=gl_PointCoord*2.-1.;float d=length(p);
        float cloud=sin(p.x*11.+sin(p.y*8.))*sin(p.y*13.+p.x*4.)*.10;
        float edge=1.-smoothstep(.30,1.,d+cloud*smoke);
        gl_FragColor=vec4(vTint,vAlpha*edge*edge);if(gl_FragColor.a<.005)discard;}`
  });
  const points=new THREE.Points(geometry,material);points.frustumCulled=false;points.name=smoke?'destruction-smoke':'destruction-fire';
  points.onBeforeRender=(renderer,scene,camera)=>{material.uniforms.pixelScale.value=renderer.getDrawingBufferSize(new THREE.Vector2()).y*camera.projectionMatrix.elements[5]*.5;};
  return points;
}

// Cut the attachment above the struck branch, not the elbow/wrist below it.
// Missing torso support never leaves a phantom bridge holding the upper body.
function remainingLinks(recoil,pieces,impact){
  const links=[],index=new Map(pieces.map((p,i)=>[p.part,i])),source=impact?recoil.source:null;
  const add=(a,b,anchor,rigid=false)=>{
    const atRelease=part=>{const p=pieces[index.get(part)],rotation=p.startQ.clone().multiply(p.q.clone().invert());return anchor.clone().sub(p.p).applyQuaternion(rotation).add(p.start);};
    const world=atRelease(a).add(atRelease(b)).multiplyScalar(.5);
    links.push({a:index.get(a),b:index.get(b),anchor:world,rigid});
  };
  for(const p of recoil.parts){
    const parent=p.parentPart;if(!parent||recoil.detached.has(p)!==recoil.detached.has(parent)||recoil.falling.has(p)!==recoil.falling.has(parent))continue;
    add(p,parent,p.jointAnchor,!/segment|foot|shoulder|forearm|Blade_hand/i.test(p.joint.name));
  }
  if(source&&recoil.failure==='torso'){
    // Keep only the surviving lower frame connected. Upper attachments have
    // lost their support and fall as separate head/arm/backpack branches.
    const neighbours=source.neighbours.map(edge=>edge.part).filter(p=>p.supported).sort((a,b)=>b.mass-a.mass);
    for(const p of neighbours.slice(1))add(neighbours[0],p,source.center,true);
  }
  return links;
}

function begin(r){
  r.root.updateWorldMatrix(true,true);
  const group=new THREE.Group();group.name='wild-robot-destruction';group.userData.effect=true;r.root.add(group);
  const inverse=r.root.matrixWorld.clone().invert(),bounds=new THREE.Box3().setFromObject(r.asset),center=r.root.worldToLocal(bounds.getCenter(new THREE.Vector3()));
  const scale=r.mount.scale.x,rand=random(137+r.root.id*197),pieces=[],owned=[];
  const impact=r.deathImpact?{point:r.deathImpact.point.clone().applyMatrix4(inverse),direction:r.deathImpact.direction.clone().transformDirection(inverse),strength:r.deathImpact.strength,mesh:r.deathImpact.mesh}:null;
  const recoil=createWildRecoil(r,impact,inverse,scale),burstDelay=0;
  const finalBurstAt=recoil.failure==='head'?1.15:WILD_FINAL_BURST_AT;
  const burstCenter=recoil.failure==='arm'?recoil.source.joint.getWorldPosition(new THREE.Vector3()).applyMatrix4(inverse):(impact?.point||center).clone();
  const releaseAt=impact?wildRecoilBreakTime(0)+.006*(1-Math.exp(-recoil.source.center.distanceToSquared(impact.point)/(scale*scale*.65))):0;

  const wallNormal=up.clone().applyQuaternion(r.mount.quaternion),floor=r.wallMounted?-r.root.getWorldPosition(new THREE.Vector3()).y:0;
  for(const original of r.hitMeshes){
    const matrix=inverse.clone().multiply(original.matrixWorld),part=recoil?.byMesh.get(original);
    for(const fragment of fragments(original.geometry)){
      const mesh=new THREE.Mesh(fragment.geometry,original.material),p=fragment.origin.clone().applyMatrix4(matrix),q=new THREE.Quaternion(),s=new THREE.Vector3();
      matrix.decompose(scratch,q,s);mesh.position.copy(p);mesh.quaternion.copy(q);mesh.scale.copy(s);mesh.castShadow=mesh.receiveShadow=true;mesh.name=original.name+'-fragment';mesh.userData.originalMaterial=original.userData.originalMaterial||original.material;group.add(mesh);
      const velocity=new THREE.Vector3();
      const impactWeight=impact?Math.exp(-p.distanceToSquared(impact.point)/(scale*scale*.65)):0;
      const delay=recoil.failure==='head'?finalBurstAt:recoil.detached.has(part)||recoil.falling.has(part)||recoil.failure==='leg'?releaseAt:WILD_BODY_RELEASE;
      fragment.geometry.computeBoundingBox();
      const half=fragment.geometry.boundingBox.getSize(new THREE.Vector3()).multiply(s).multiplyScalar(.5);
      const size=half.length()/scale,small=1-THREE.MathUtils.smoothstep(size,.12,.6);
      mesh.castShadow=size>.28;
      const axis=new THREE.Vector3();
      const piece={mesh,p,q,s,half,small,detached:recoil.detached.has(part),falling:recoil.falling.has(part),supported:part.supported,start:p.clone(),startQ:q.clone(),delay,velocity,axis,spin:0,impactWeight,part,drag:debrisDrag};
      pieces.push(piece);part?.pieces.push(piece);
    }
  }
  for(const p of pieces){
    // Dependent limbs inherit their own joint motion. The surviving frame
    // inherits the much smaller reaction baked into poseWildRecoil.
    poseWildRecoil(recoil,p.delay-.001);const previous=applyWildRecoil(new THREE.Vector3(),p.p,p.part),previousQ=p.part.rotation.clone();
    poseWildRecoil(recoil,p.delay+.001);const next=applyWildRecoil(new THREE.Vector3(),p.p,p.part);
    p.velocity.copy(next.sub(previous).divideScalar(.002));
    if(impact&&recoil.failure!=='head'&&p.part===recoil.source)p.velocity.addScaledVector(impact.direction,1.15*scale*impact.strength);
    const delta=p.part.rotation.clone().multiply(previousQ.invert());
    const sin=Math.hypot(delta.x,delta.y,delta.z);
    if(sin>1e-8)p.axis.add(new THREE.Vector3(delta.x,delta.y,delta.z).multiplyScalar(2*Math.atan2(sin,delta.w)/(.002*sin)));
    poseWildRecoil(recoil,p.delay);applyWildRecoil(p.start,p.p,p.part);p.startQ.premultiply(p.part.rotation);
    if(r.wallMounted&&p.detached)p.velocity.addScaledVector(wallNormal,Math.max(0,.65*scale-p.velocity.dot(wallNormal)));
    // Preserve the release velocity; stronger air drag limits the eventual
    // spread instead of cutting the momentum at the moment of fragmentation.
    p.drag=Math.max(debrisDrag,Math.hypot(p.velocity.x,p.velocity.z)/((recoil?1.8:.7)*scale));
    p.spin=p.axis.length();p.axis.normalize();
    if(recoil.failure==='head'){p.velocity.set(0,0,0);p.spin=0;}

  }
  const links=remainingLinks(recoil,pieces,impact);
  // The severed branch falls first. The frame keeps its slow supported motion
  // until the later handoff, inheriting that velocity without a pause or kick.
  const physics=createWildDebris(pieces,{floor,scale,links,finalBurstAt:finalBurstAt});
  const fire=cloud(8,false),smoke=cloud(12,true);group.add(fire,smoke);owned.push(fire.geometry,fire.material,smoke.geometry,smoke.material);
  const particles=(count,isSmoke)=>Array.from({length:count},(_,i)=>({
    p:burstCenter.clone().add(new THREE.Vector3((rand()-.5)*.5,(rand()-.5)*.35,(rand()-.5)*.5).multiplyScalar(scale)),
    v:new THREE.Vector3((rand()-.5)*(isSmoke?.35:.8),isSmoke?.45+rand()*.45:.2+rand()*.65,(rand()-.5)*(isSmoke?.35:.8)).multiplyScalar(scale),
    delay:isSmoke?.10+rand()*.55:i===0?0:rand()*.22,life:isSmoke?1.4+rand()*.65:.10+rand()*.12,
    size:(isSmoke?.22+rand()*.25:.08+rand()*.11)*scale,seed:rand()
  }));
  const finalFire=cloud(40,false),finalSmoke=cloud(26,true);group.add(finalFire,finalSmoke);
  owned.push(finalFire.geometry,finalFire.material,finalSmoke.geometry,finalSmoke.material);
  const finaleParticles=(count,smoke)=>Array.from({length:count},(_,i)=>({
    p:new THREE.Vector3(),offset:new THREE.Vector3((rand()-.5)*1.8,.3+rand()*.8,(rand()-.5)*1.8).multiplyScalar(scale),
    v:new THREE.Vector3((rand()-.5)*(smoke?2:6),smoke?1+rand():rand()*2,(rand()-.5)*(smoke?2:6)).multiplyScalar(scale),
    delay:i===0?0:rand()*(smoke?.18:.06),life:smoke?.9+rand()*.2:.32+rand()*.25,
    size:(smoke?1+rand()*.7:1.3+rand()*1.1)*scale,seed:rand()
  }));
  const finalFlames=finaleParticles(40,false),finalFumes=finaleParticles(26,true);
  finalFlames[0].size=3.6*scale;finalFlames[0].life=.25;
  const flames=particles(8,false),fumes=particles(12,true);flames[0].p.copy(burstCenter);flames[0].size=.3*scale;flames[0].life=.08;
  const sparkGeometry=new THREE.BufferGeometry();sparkGeometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(24*6),3));sparkGeometry.setAttribute('color',new THREE.BufferAttribute(new Float32Array(24*6),3));
  const sparkMaterial=new THREE.LineBasicMaterial({vertexColors:true,transparent:true,opacity:1,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false});
  const sparks=new THREE.LineSegments(sparkGeometry,sparkMaterial);sparks.frustumCulled=false;sparks.name='destruction-sparks';group.add(sparks);owned.push(sparkGeometry,sparkMaterial);
  const embers=Array.from({length:24},()=>({v:new THREE.Vector3(rand()-.5,rand()*.9,rand()-.5).normalize().multiplyScalar((1.3+rand()*2.5)*scale),life:.15+rand()*.28}));
  const electric=new THREE.InstancedMesh(boltGeometry,boltMaterial,3*7),glow=new THREE.InstancedMesh(boltGeometry,boltGlowMaterial,3*7);
  electric.frustumCulled=glow.frustumCulled=false;electric.name='destruction-electric-arcs';glow.name='destruction-electric-glow';group.add(electric,glow);
  const light=new THREE.PointLight(0xffa33c,0,7*scale,2);light.position.copy(burstCenter);group.add(light);
  const trailParticles=smoke=>pieces.flatMap((piece,index)=>Array.from({length:14},(_,n)=>({
    partIndex:index,p:new THREE.Vector3(),v:new THREE.Vector3(0,smoke?.55:.15,0).multiplyScalar(scale),
    delay:finalBurstAt+n*.075,life:smoke?.9:.32,
    size:(smoke?.38:.28)*scale,seed:rand()
  })));
  const trailFlames=trailParticles(false),trailFumes=trailParticles(true),trailFire=cloud(trailFlames.length,false),trailSmoke=cloud(trailFumes.length,true);
  group.add(trailFire,trailSmoke);owned.push(trailFire.geometry,trailFire.material,trailSmoke.geometry,trailSmoke.material);
  r.asset.visible=false;r.muzzleFlash.visible=false;r.deathDuration=WILD_DESTRUCTION_DURATION;
  return r.destruction={group,finalBurstAt,center:burstCenter,hit:impact,recoil,burstDelay,collapseAt:recoil.failure==='head'?finalBurstAt:recoil.failure==='leg'||recoil.failure==='pelvis'?releaseAt:WILD_BODY_RELEASE,scale,pieces,trailFire,trailSmoke,trailFlames,trailFumes,finalFire,finalSmoke,finalFlames,finalFumes,fire,smoke,flames,fumes,sparks,embers,electric,glow,light,owned,age:0,floor,physics};
}

function updateCloud(points,particles,time,smoke){
  const {position,tint,radius,alpha}=points.geometry.attributes;
  particles.forEach((p,i)=>{
    const age=time-p.delay,t=THREE.MathUtils.clamp(age/p.life,0,1),visible=age>=0&&t<1;
    scratch.copy(p.p).addScaledVector(p.v,Math.max(0,age));if(smoke)scratch.x+=Math.sin(p.seed*8+age*1.8)*age*.13;
    position.setXYZ(i,scratch.x,scratch.y,scratch.z);radius.setX(i,p.size*(smoke?.65+t*2:1+t*.8));
    alpha.setX(i,visible?(smoke?Math.min(1,t*12)*(1-t)**1.1*.32:.7*(1-t)**1.3):0);
    if(smoke){const shade=.20+t*.12+p.seed*.06;tint.setXYZ(i,shade,shade*.96,shade*.9);}
    else tint.setXYZ(i,1.8,Math.max(.08,.9-t*.85),Math.max(.005,.26-t*.45));
  });
  for(const attribute of Object.values(points.geometry.attributes))attribute.needsUpdate=true;
}

export function updateWildDestruction(r,time){
  const d=r.destruction||begin(r),t=Math.max(0,time);d.age=t;r.muzzleFlash.visible=false;
  const fade=1-THREE.MathUtils.smoothstep(t,4.7,5.3),effectTime=t-d.burstDelay;
  if(d.recoil)poseWildRecoil(d.recoil,t);
  for(const p of d.pieces){
    if(t<p.delay){
      p.mesh.position.copy(p.p);p.mesh.quaternion.copy(p.q);
      applyWildRecoil(p.mesh.position,p.p,p.part);p.mesh.quaternion.premultiply(p.part.rotation);
    }
    p.mesh.scale.copy(p.s).multiplyScalar(fade);p.mesh.visible=fade>0&&t<d.finalBurstAt;
  }
  poseWildDebris(d.physics,Math.min(t,WILD_DESTRUCTION_DURATION));
  if(t>=d.finalBurstAt&&!d.shards){beginShards(d);poseWildDebris(d.physics,Math.min(t,WILD_DESTRUCTION_DURATION));}
  if(d.shards){
    if(t>=d.finalBurstAt)poseWildDebris(d.shardPhysics,Math.min(t,WILD_DESTRUCTION_DURATION)-d.finalBurstAt);
    for(const p of d.shards){p.mesh.visible=t>=d.finalBurstAt&&fade>0;p.mesh.scale.copy(p.s).multiplyScalar(fade);}
  }
  for(const p of [...d.trailFlames,...d.trailFumes]){
    if(t>=p.delay&&d.shards){const indices=d.shardsByPart[p.partIndex],index=indices[Math.floor(p.seed*indices.length)];sampleWildDebrisPosition(d.shardPhysics,index,p.delay-d.finalBurstAt,p.p);}
  }
  updateCloud(d.trailFire,d.trailFlames,t,false);updateCloud(d.trailSmoke,d.trailFumes,t,true);
  d.trailFire.visible=d.trailSmoke.visible=t>=d.finalBurstAt;
  const finalTime=t-d.finalBurstAt;
  d.finalFire.visible=d.finalSmoke.visible=finalTime>=0;
  if(d.physics.finalBurstCenter){
    for(const p of [...d.finalFlames,...d.finalFumes])p.p.copy(d.physics.finalBurstCenter).add(p.offset);
  }
  updateCloud(d.finalFire,d.finalFlames,finalTime,false);updateCloud(d.finalSmoke,d.finalFumes,finalTime,true);
  updateCloud(d.fire,d.flames,effectTime,false);updateCloud(d.smoke,d.fumes,effectTime,true);
  const positions=d.sparks.geometry.attributes.position,colors=d.sparks.geometry.attributes.color;
  d.embers.forEach((p,i)=>{
    const live=effectTime>=0&&effectTime<p.life,brightness=live?(1-effectTime/p.life):0;
    for(let end=0;end<2;end++){
      const a=Math.max(0,effectTime-end*.025);scratch.copy(d.center).addScaledVector(p.v,a);scratch.y-=gravity*.5*a*a;scratch.y=Math.max(d.floor+.025,scratch.y);positions.setXYZ(i*2+end,scratch.x,scratch.y,scratch.z);
      colors.setXYZ(i*2+end,brightness*(end?.6:2),brightness*(end?.08:.9),brightness*.04);
    }
  });positions.needsUpdate=colors.needsUpdate=true;d.sparks.visible=effectTime>=0&&effectTime<.43;d.fire.visible=d.recoil.failure!=='head';
  const flash=d.recoil.failure==='head'?(t>=.08&&t<d.finalBurstAt&&t%.14<.095?Math.floor(t/.14):-1):lightningFlashes.findIndex(([start,end])=>effectTime>=start&&effectTime<end),electricVisible=flash>=0;d.electric.visible=d.glow.visible=electricVisible;
  if(electricVisible){
    let index=0;
    for(let bolt=0;bolt<3;bolt++){
      const target=d.pieces[(bolt*7+flash*11)%d.pieces.length].mesh.position,start=(d.recoil.failure==='head'?d.recoil.source.pieces[0].mesh.position:d.center).clone(),rand=random(flash*173+bolt*7919+1);
      if(d.recoil.failure!=='head')start.y=Math.max(d.floor+.1*d.scale,start.y+.6*d.scale*effectTime-gravity*.5*effectTime*effectTime);let previous=start;
      for(let segment=1;segment<=7;segment++){
        const end=start.clone().lerp(target,Math.min(1,.7*d.scale/Math.max(.001,start.distanceTo(target))));
        const next=start.clone().lerp(end,segment/7);if(segment<7)next.add(new THREE.Vector3(rand()-.5,rand()-.5,rand()-.5).multiplyScalar(.12*d.scale));
        scratch.copy(next).sub(previous);const length=scratch.length();dummy.position.copy(previous).add(next).multiplyScalar(.5);dummy.quaternion.setFromUnitVectors(up,scratch.normalize());dummy.scale.set(.009*d.scale,length,.009*d.scale);dummy.updateMatrix();d.electric.setMatrixAt(index,dummy.matrix);
        dummy.scale.set(.033*d.scale,length,.033*d.scale);dummy.updateMatrix();d.glow.setMatrixAt(index++,dummy.matrix);previous=next;
      }
    }d.electric.instanceMatrix.needsUpdate=d.glow.instanceMatrix.needsUpdate=true;
  }
  d.light.intensity=effectTime<0?0:1.8*Math.max(0,1-effectTime/.14)**2;if(finalTime>=0){d.light.position.copy(d.physics.finalBurstCenter||d.center);d.light.intensity=16*Math.max(0,1-finalTime/.4)**2;}
  else d.light.position.copy(d.center);
  d.group.visible=t<WILD_DESTRUCTION_DURATION;
  d.group.updateWorldMatrix(true,true);return d;
}

export function resetWildDestruction(r){
  r.deathImpact=null;
  const d=r.destruction;if(!d)return;
  disposeWildDebris(d.physics);if(d.shardPhysics)disposeWildDebris(d.shardPhysics);
  for(const resource of d.owned)resource.dispose();d.electric.dispose();d.glow.dispose();d.group.removeFromParent();r.destruction=null;r.asset.visible=true;
}

import * as THREE from 'three';
import {World,Body,Box,Plane,Vec3,Quaternion,Material,ContactMaterial,SAPBroadphase,ConeTwistConstraint} from 'cannon-es';

export const WILD_DEBRIS_STEP=1/180;
export const WILD_DEBRIS_GRAVITY=22;
const stride=13;
const savedRotation=new THREE.Quaternion(),savedArm=new THREE.Vector3(),savedPosition=new THREE.Vector3(),savedVelocity=new THREE.Vector3(),sampleVector=new THREE.Vector3(),sampleRotation=new THREE.Quaternion();
// Welded armour shares one compound body. Limbs remain joined to that frame;
// a severed limb retains its own elbow/wrist links and falls as a separate branch.
export function createWildDebris(pieces,{floor,scale,links=[],blast=null,finalBurstAt=Infinity,collidePieces=true}){
  const world=new World({gravity:new Vec3(0,-WILD_DEBRIS_GRAVITY,0),allowSleep:true});
  world.broadphase=new SAPBroadphase(world);world.solver.iterations=40;
  const metal=new Material('wild-debris-metal'),groundMaterial=new Material('wild-debris-ground');
  world.addContactMaterial(new ContactMaterial(metal,metal,{friction:.45,restitution:.015,contactEquationStiffness:1e6,contactEquationRelaxation:8}));
  world.addContactMaterial(new ContactMaterial(metal,groundMaterial,{friction:.48,restitution:.025,contactEquationStiffness:1e7,contactEquationRelaxation:4}));
  const ground=new Body({mass:0,material:groundMaterial,shape:new Plane()});
  ground.collisionFilterGroup=1;ground.position.y=floor;ground.quaternion.setFromEuler(-Math.PI/2,0,0);world.addBody(ground);
  const connected=new Set(links.flatMap(link=>[link.a,link.b]));
  const sim={world,ground,pieces,scale,time:0,frames:[],times:[],events:[],grounded:new Set(),releaseIndex:0,links,blast,finalBurstAt,finalBurstCenter:null,connected,constraints:[],connectedReady:false,units:[],islands:[],collisionPairs:[]};
  const parents=pieces.map((_,i)=>i),root=i=>parents[i]===i?i:parents[i]=root(parents[i]);
  for(const link of links)if(link.rigid)parents[root(link.b)]=root(link.a);
  const islands=pieces.map((_,i)=>i),islandRoot=i=>islands[i]===i?i:islands[i]=islandRoot(islands[i]);
  for(const link of links)islands[islandRoot(link.b)]=islandRoot(link.a);
  const islandMap=new Map();
  for(let i=0;i<pieces.length;i++){
    const key=islandRoot(i);
    if(!islandMap.has(key)){const island={id:sim.islands.length,bit:collidePieces?2**(sim.islands.length+1):2,units:[]};islandMap.set(key,island);sim.islands.push(island);}
    pieces[i].collisionIsland=islandMap.get(key).id;
  }
  const groups=new Map();
  pieces.forEach((p,index)=>{
    p.mass=p.part?.mass??THREE.MathUtils.clamp(.35+8*p.half.x*p.half.y*p.half.z/(scale**3)*2,.4,5);
    p.activationTime=Math.ceil((p.delay-1e-8)/WILD_DEBRIS_STEP)*WILD_DEBRIS_STEP;p.contactTime=Infinity;p.motionVelocity=new THREE.Vector3();p.motionAngular=new THREE.Vector3();
    const key=root(index);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(index);
  });
  for(const indices of groups.values()){
    const mass=indices.reduce((n,i)=>n+pieces[i].mass,0),body=new Body({mass:0,material:metal,linearDamping:0,angularDamping:.55,allowSleep:true,sleepSpeedLimit:.12*scale,sleepTimeLimit:.45});
    const index=indices[0],unit={body,indices,mass,drag:indices.reduce((n,i)=>n+pieces[i].drag*pieces[i].mass,0)/mass};
    unit.supported=pieces[index].supported??(connected.has(index)&&!pieces[index].detached);
    unit.island=islandMap.get(islandRoot(index));unit.island.units.push(unit);
    body.collisionFilterGroup=unit.island.bit;body.collisionFilterMask=1;
    body.allowSleep=!connected.has(index);
    body.userData={piece:index};indices.forEach(i=>{pieces[i].physicsBody=body;});
    body.addEventListener('collide',event=>{
      const other=event.body,otherIndex=other.userData?.piece;
      if(other===ground){indices.forEach(i=>{pieces[i].contactTime=Math.min(pieces[i].contactTime,sim.time);});return;}
      if(index<otherIndex&&sim.events.length<256)sim.events.push({time:sim.time,a:index,b:otherIndex,speed:Math.abs(event.contact.getImpactVelocityAlongNormal())});
    });
    sim.units.push(unit);
  }
  sim.releases=sim.units.map(unit=>({time:Math.max(...unit.indices.map(i=>pieces[i].activationTime)),unit})).sort((a,b)=>a.time-b.time||a.unit.indices[0]-b.unit.indices[0]);
  if(collidePieces)for(let i=0;i<sim.islands.length;i++)for(let j=i+1;j<sim.islands.length;j++)sim.collisionPairs.push({a:sim.islands[i],b:sim.islands[j],enabled:false});
  activate(sim,0);save(sim);return sim;
}

function activate(sim,time){
  while(sim.releaseIndex<sim.releases.length&&sim.releases[sim.releaseIndex].time<=time+1e-8){
    const unit=sim.releases[sim.releaseIndex++].unit,{body,indices,mass}=unit;
    unit.releaseTime=time;
    // Keep solver steps uniform even when adjacent release times are very
    // close. Bridge the sub-frame interval without changing a displayed mesh.
    const poses=indices.map(i=>{const p=sim.pieces[i],pose={position:new THREE.Vector3(),quaternion:new THREE.Quaternion()};launchPose(p,time-p.delay,pose);return pose;});
    const center=new THREE.Vector3(),velocity=new THREE.Vector3(),angular=new THREE.Vector3();
    indices.forEach((i,n)=>{const p=sim.pieces[i],weight=p.mass/mass;center.addScaledVector(poses[n].position,weight);velocity.addScaledVector(p.motionVelocity,weight);angular.addScaledVector(p.motionAngular,weight);});
    body.position.copy(center);body.velocity.copy(velocity);body.angularVelocity.copy(angular);
    indices.forEach((i,n)=>{
      const p=sim.pieces[i];p.bodyOffset=poses[n].position.sub(center);p.bodyQ=poses[n].quaternion;
      body.addShape(new Box(new Vec3(p.half.x,p.half.y,p.half.z)),new Vec3(p.bodyOffset.x,p.bodyOffset.y,p.bodyOffset.z),new Quaternion(p.bodyQ.x,p.bodyQ.y,p.bodyQ.z,p.bodyQ.w));
    });
    body.mass=mass;body.type=Body.DYNAMIC;body.updateMassProperties();
    sim.world.addBody(body);
  }
  for(const link of sim.links){
    if(link.active)continue;
    const a=sim.pieces[link.a].physicsBody,b=sim.pieces[link.b].physicsBody;
    if(!a.world||!b.world)continue;link.active=true;
    if(a===b)continue;
    const anchor=new Vec3(link.anchor.x,link.anchor.y,link.anchor.z),axis=b.position.vsub(a.position);axis.normalize();
    const constraint=new ConeTwistConstraint(a,b,{
      pivotA:a.pointToLocalFrame(anchor),pivotB:b.pointToLocalFrame(anchor),
      axisA:a.vectorToLocalFrame(axis),axisB:b.vectorToLocalFrame(axis),angle:1.35,twistAngle:Math.PI,maxForce:1e5,collideConnected:false
    });
    constraint.collideConnected=false;
    for(const equation of constraint.equations)equation.setSpookParams(1e7,6,WILD_DEBRIS_STEP);
    sim.world.addConstraint(constraint);sim.constraints.push(constraint);
  }
  if(!sim.connectedReady&&sim.pieces.every(p=>p.physicsBody.world)){
    sim.connectedReady=true;
    if(sim.blast){
      const {target,impulse,point}=sim.blast,body=sim.pieces[target].physicsBody;
      body.applyImpulse(new Vec3(impulse.x,impulse.y,impulse.z),new Vec3(point.x-body.position.x,point.y-body.position.y,point.z-body.position.z));
      const turn=body.angularVelocity.length();if(turn>1.8)body.angularVelocity.scale(1.8/turn,body.angularVelocity);
    }
  }
}

function launchPose(p,age,target=p.mesh){
  const damping=Math.exp(-p.drag*age),travel=p.drag>0?(1-damping)/p.drag:age;
  target.position.copy(p.start).addScaledVector(p.velocity,travel);target.position.y=p.start.y+p.velocity.y*age-WILD_DEBRIS_GRAVITY*.5*age*age;
  target.quaternion.setFromAxisAngle(p.axis,p.spin*age).multiply(p.startQ);
  p.motionVelocity.copy(p.velocity);p.motionVelocity.x*=damping;p.motionVelocity.z*=damping;p.motionVelocity.y-=WILD_DEBRIS_GRAVITY*age;
  p.motionAngular.copy(p.axis).multiplyScalar(p.spin);
}

function save(sim){
  const values=new Float32Array(sim.pieces.length*stride);
  sim.pieces.forEach((p,index)=>{
    const b=p.physicsBody,offset=index*stride;
    savedRotation.copy(b.quaternion);savedArm.set(0,0,0);if(p.bodyOffset)savedArm.copy(p.bodyOffset);savedArm.applyQuaternion(savedRotation);
    savedPosition.copy(b.position).add(savedArm);savedVelocity.copy(b.angularVelocity).cross(savedArm).add(b.velocity);
    if(p.bodyQ)savedRotation.multiply(p.bodyQ);
    savedPosition.toArray(values,offset);savedRotation.toArray(values,offset+3);savedVelocity.toArray(values,offset+7);
    values[offset+10]=b.angularVelocity.x;values[offset+11]=b.angularVelocity.y;values[offset+12]=b.angularVelocity.z;
  });
  sim.frames.push(values);sim.times.push(sim.time);
}

function finalBurst(sim){
  if(sim.finalBurstCenter||sim.time<sim.finalBurstAt-1e-8)return;
  const center=new THREE.Vector3(),mass=sim.units.reduce((sum,u)=>sum+u.mass,0);
  for(const u of sim.units)center.addScaledVector(u.body.position,u.mass/mass);
  sim.finalBurstCenter=center;
  // The final blast tears surviving joints apart, while welded armour remains
  // an intact mechanical part. Each body receives its own outward impulse.
  for(const joint of sim.constraints)sim.world.removeConstraint(joint);
  sim.constraints.length=0;
  sim.units.forEach((u,i)=>{
    const direction=new THREE.Vector3().copy(u.body.position).sub(center).setY(0);
    if(direction.lengthSq()<.01)direction.set(Math.sin(i*2.4),0,Math.cos(i*2.4));
    direction.normalize().multiplyScalar((5.5+(i%3)*.8)*sim.scale);
    direction.y=(5+(i%4)*.35)*sim.scale;
    u.body.wakeUp();u.body.velocity.vadd(new Vec3(direction.x,direction.y,direction.z),u.body.velocity);
    u.body.angularVelocity.vadd(new Vec3(Math.sin(i*2.4)*2,Math.cos(i)*1.5,Math.cos(i*2.4)*2),u.body.angularVelocity);
  });
}

function advance(sim,time){
  while(sim.time<time-1e-8){
    const grid=(Math.floor((sim.time+1e-8)/WILD_DEBRIS_STEP)+1)*WILD_DEBRIS_STEP;
    const next=grid,dt=WILD_DEBRIS_STEP;
    const groundedIslands=new Set(sim.units.filter(unit=>sim.grounded.has(unit.body.id)).map(unit=>unit.island.id));
    // Each disconnected branch has its own collision island. Enable contacts
    // only after both branches exist and their authored overlapping bounds clear.
    for(const pair of sim.collisionPairs){
      if(pair.enabled||!pair.a.units.every(u=>u.body.world)||!pair.b.units.every(u=>u.body.world))continue;
      for(const unit of [...pair.a.units,...pair.b.units])unit.body.updateAABB();
      if(pair.a.units.some(a=>pair.b.units.some(b=>a.body.aabb.overlaps(b.body.aabb))))continue;
      for(const unit of pair.a.units)unit.body.collisionFilterMask|=pair.b.bit;
      for(const unit of pair.b.units)unit.body.collisionFilterMask|=pair.a.bit;
      pair.enabled=true;
    }
    for(const unit of sim.units){
      const b=unit.body;if(!b.world||b.sleepState===Body.SLEEPING)continue;
      // The damaged frame briefly retains support, then its actuators give
      // way. Gravity takes over progressively, rather than a slow-motion fall.
      // The severed hit part gets full gravity immediately after launch.
      if(unit.supported){
        const load=.3+.7*THREE.MathUtils.smoothstep(sim.time-unit.releaseTime,.045,.28);
        b.force.y+=unit.mass*WILD_DEBRIS_GRAVITY*(1-load);
      }
      // Air drag keeps the throw compact. On the floor contact friction, rather
      // than an instant animation stop, governs sliding and repeated rolling.
      const grounded=groundedIslands.has(unit.island.id),airDrag=sim.finalBurstCenter?.9:unit.drag>0?Math.max(unit.drag,Math.hypot(b.velocity.x,b.velocity.z)/(2*sim.scale)):0;
      const groundDrag=(sim.finalBurstCenter?4:1.1)+Math.max(0,Math.hypot(b.velocity.x,b.velocity.z)/(.85*sim.scale)-1.5);
      const drag=Math.exp(-(grounded?groundDrag:airDrag)*dt);
      b.velocity.x*=drag;b.velocity.z*=drag;b.angularDamping=grounded?(sim.finalBurstCenter?.98:.9):.55;
    }
    // Passive joint resistance dissipates relative rotation; equal and opposite
    // angular impulses preserve the connected frame's overall momentum.
    for(const joint of sim.constraints){
      const a=joint.bodyA,b=joint.bodyB,relative=b.angularVelocity.vsub(a.angularVelocity),speed=relative.length();if(speed<1e-6)continue;
      const axis=relative.scale(1/speed),ia=a.invInertiaWorld.vmult(axis),ib=b.invInertiaWorld.vmult(axis),inertia=axis.dot(ia.vadd(ib));
      if(inertia<1e-8)continue;const impulse=speed*(1-Math.exp(-8*dt))/inertia;
      a.angularVelocity.vadd(ia.scale(impulse),a.angularVelocity);b.angularVelocity.vsub(ib.scale(impulse),b.angularVelocity);
    }
    sim.time=next;sim.world.step(dt);sim.grounded.clear();
    for(const c of sim.world.contacts){
      if(c.bi===sim.ground)sim.grounded.add(c.bj.id);
      if(c.bj===sim.ground)sim.grounded.add(c.bi.id);
    }
    activate(sim,next);finalBurst(sim);save(sim);
  }
}

// Cache fixed steps and interpolate poses. Scrubbing backwards never advances
// physics, and 30/60 fps playback follows the same contact/rolling trajectory.
export function poseWildDebris(sim,time){
  advance(sim,time);
  let low=0,high=sim.times.length-1;
  while(low<high){const middle=Math.ceil((low+high)/2);if(sim.times[middle]<=time)low=middle;else high=middle-1;}
  const next=Math.min(low+1,sim.frames.length-1),a=sim.frames[low],b=sim.frames[next];
  const mix=low===next?0:(time-sim.times[low])/(sim.times[next]-sim.times[low]);
  sim.pieces.forEach((p,index)=>{
    if(time<p.delay)return;
    if(time<p.activationTime){launchPose(p,time-p.delay);return;}
    const at=index*stride;
    p.mesh.position.fromArray(a,at).lerp(sampleVector.fromArray(b,at),mix);
    p.mesh.quaternion.fromArray(a,at+3).normalize().slerp(sampleRotation.fromArray(b,at+3).normalize(),mix);
    p.motionVelocity.fromArray(a,at+7).lerp(sampleVector.fromArray(b,at+7),mix);
    p.motionAngular.fromArray(a,at+10).lerp(sampleVector.fromArray(b,at+10),mix);
  });
}

export function disposeWildDebris(sim){
  for(const constraint of [...sim.world.constraints])sim.world.removeConstraint(constraint);
  for(const body of [...sim.world.bodies])sim.world.removeBody(body);
  sim.frames.length=sim.times.length=sim.events.length=sim.constraints.length=0;
}

// Trail particles use recorded emission positions rather than following the
// current mesh, so smoke remains behind a flying part and seeks deterministically.
export function sampleWildDebrisPosition(sim,index,time,target){
  const frame=Math.min(sim.frames.length-1,Math.max(0,Math.floor(time/WILD_DEBRIS_STEP)));
  const next=Math.min(frame+1,sim.frames.length-1),mix=THREE.MathUtils.clamp((time-sim.times[frame])/WILD_DEBRIS_STEP,0,1);
  return target.fromArray(sim.frames[frame],index*stride).lerp(sampleVector.fromArray(sim.frames[next],index*stride),mix);
}

import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createWildDebris,poseWildDebris,disposeWildDebris} from '../wild-enemy-debris.js';

function piece(position,velocity,{half=[.2,.2,.2],mass=1,spin=0,delay=0,drag=0}={}){
  return {mesh:new THREE.Object3D(),start:new THREE.Vector3(...position),startQ:new THREE.Quaternion(),half:new THREE.Vector3(...half),velocity:new THREE.Vector3(...velocity),axis:new THREE.Vector3(0,0,1),spin,delay,drag,part:{mass}};
}
const make=pieces=>createWildDebris(pieces,{floor:0,scale:1});
{
  const hit=piece([0,2,0],[6,.4,0]),sim=make([hit]);
  poseWildDebris(sim,.08);assert(hit.mesh.position.x>.45,'the hit part retains a sharp initial launch');
  poseWildDebris(sim,.65);assert(hit.contactTime<.6,'the launched part drops quickly instead of hanging in the air');
  disposeWildDebris(sim);
}
function fallingFrame(){
  return createWildDebris([piece([0,5,0],[0,0,0],{mass:5}),piece([0,4.3,0],[0,0,0],{mass:3})],{floor:0,scale:1,links:[{a:0,b:1,anchor:new THREE.Vector3(0,4.65,0),rigid:true}]});
}
{
  const sim=fallingFrame(),p=sim.pieces[0];
  poseWildDebris(sim,.1);const early=p.motionVelocity.y,firstDrop=5-p.mesh.position.y;
  poseWildDebris(sim,.3);const middle=p.motionVelocity.y;
  poseWildDebris(sim,.5);const late=p.motionVelocity.y;
  assert(firstDrop<.045&&early>-.85,'the connected body initially tips slowly rather than dropping abruptly');
  assert(middle<early*3&&late<middle-2.6,'gravity progressively accelerates the unsupported body into the floor');
  disposeWildDebris(sim);
  const at30=fallingFrame(),at60=fallingFrame();
  for(let n=0;n<=24;n++)poseWildDebris(at30,n/30);
  for(let n=0;n<=48;n++)poseWildDebris(at60,n/60);
  assert(at30.pieces[0].mesh.position.distanceTo(at60.pieces[0].mesh.position)<1e-6,'slow start and fast fall agree at 30/60 fps');
  disposeWildDebris(at30);disposeWildDebris(at60);
}
{
  const p=piece([0,3,0],[2,1,0]),sim=make([p]);
  const heights=[.1,.2,.3].map(time=>{poseWildDebris(sim,time);return p.mesh.position.y;});
  assert(Math.abs((heights[2]-2*heights[1]+heights[0])/.1**2+22)<.0002,'severed metal immediately accelerates downward under stronger gravity');
  assert(Math.abs(p.mesh.position.x-.6)<1e-5,'free bodies preserve incoming motion');
  disposeWildDebris(sim);assert.equal(sim.world.bodies.length,0,'despawning releases the physics world');
}
{
  const shot=piece([-.85,1.8,0],[5,0,0]),passive=piece([.05,1.75,.16],[0,0,0]);
  const sim=make([shot,passive]);poseWildDebris(sim,.45);
  assert(sim.events.some(e=>e.speed>1),'actual part contact carries the impact');
  assert(passive.mesh.position.x>.25&&passive.mesh.quaternion.angleTo(new THREE.Quaternion())>.2,'a passive part is pushed and turned by the flying part');
  assert(shot.motionVelocity.x<5,'the striking part gives up momentum at contact');
  disposeWildDebris(sim);
}
function roll(){return make([piece([0,.8,0],[2.4,0,.3],{half:[.26,.18,.15],spin:-4,drag:.6})]);}
{
  const sim=roll(),p=sim.pieces[0];poseWildDebris(sim,.6);
  assert(p.contactTime<.6,'rolling begins with real floor contact');
  const early=p.mesh.position.clone(),orientation=p.mesh.quaternion.clone();poseWildDebris(sim,1.4);
  assert(p.mesh.position.distanceTo(early)>.015&&p.mesh.quaternion.angleTo(orientation)>.04,'heavy debris rocks after landing rather than freezing on contact');
  const position=p.mesh.position.clone(),q=p.mesh.quaternion.clone();
  poseWildDebris(sim,2.5);poseWildDebris(sim,1.4);
  assert(p.mesh.position.distanceTo(position)<1e-7&&p.mesh.quaternion.angleTo(q)<1e-6,'seeking uses cached physical poses');
  disposeWildDebris(sim);
}
{
  const p=piece([0,1,0],[0,0,0]),sim=make([p]);let reboundHeight=0;
  for(let n=0;n<=180;n++){poseWildDebris(sim,n/120);if(Number.isFinite(p.contactTime))reboundHeight=Math.max(reboundHeight,p.mesh.position.y-p.half.y);}
  assert(reboundHeight<.015,'metal hits the floor with almost no elastic rebound');
  assert(p.motionVelocity.length()<.03,'a dropped metal block settles');disposeWildDebris(sim);
}
{
  const a=piece([0,2,0],[0,0,0],{mass:5}),b=piece([0,1.3,0],[0,0,0],{mass:3}),shot=piece([1,2,0],[3,0,0]);
  const sim=createWildDebris([a,b,shot],{floor:0,scale:1,links:[{a:0,b:1,anchor:new THREE.Vector3(0,1.65,0)}],blast:{target:0,point:new THREE.Vector3(0,1.65,0),impulse:new THREE.Vector3(5,0,0)}});
  poseWildDebris(sim,.3);
  assert.equal(sim.constraints.length,1);const joint=sim.constraints[0];
  assert(joint.bodyA.pointToWorldFrame(joint.pivotA).distanceTo(joint.bodyB.pointToWorldFrame(joint.pivotB))<.01,'blast momentum travels through a joint without separating it');
  assert(b.mesh.position.x>.05,'the attached limb follows the blasted torso');
  assert(shot.mesh.position.x>1.8,'only the struck part flies independently');
  disposeWildDebris(sim);assert.equal(sim.world.constraints.length,0,'reset releases ragdoll constraints');
}
{
  const a=roll(),b=roll();
  for(let i=0;i<=36;i++)poseWildDebris(a,i/30);
  for(let i=0;i<=72;i++)poseWildDebris(b,i/60);
  a.pieces.forEach((p,i)=>{assert(p.mesh.position.distanceTo(b.pieces[i].mesh.position)<1e-6,'30/60 fps collision paths agree');assert(p.mesh.quaternion.angleTo(b.pieces[i].mesh.quaternion)<1e-6);});
  disposeWildDebris(a);disposeWildDebris(b);
}
{
  const a=piece([0,2,0],[0,0,0],{mass:5}),b=piece([0,1.3,0],[0,0,0],{mass:3});
  const sim=createWildDebris([a,b],{floor:0,scale:1,links:[{a:0,b:1,anchor:new THREE.Vector3(0,1.65,0),rigid:true}],blast:{target:0,point:new THREE.Vector3(0,1.7375,0),impulse:new THREE.Vector3(4,0,0)}});
  assert.equal(sim.units.length,1,'welded armour uses one compound body');assert.equal(a.physicsBody.mass,8,'compound mass includes every attachment');
  assert.equal(a.physicsBody,b.physicsBody);assert.equal(a.physicsBody.shapes.length,2,'each intact mesh keeps its collision shape');
  poseWildDebris(sim,.1);assert(Math.abs(a.motionVelocity.x-.5)<.001,'the whole compound mass absorbs the blast impulse');
  for(const age of [.3,.8,1.4]){poseWildDebris(sim,age);assert(Math.abs(a.mesh.position.distanceTo(b.mesh.position)-.7)<1e-6,'welded parts never stretch or separate');}
  disposeWildDebris(sim);
}
{
  const delayed=()=>make([piece([-.85,1.8,0],[5,0,0],{delay:.071301}),piece([.05,1.75,.16],[0,0,0],{delay:.071302})]);
  const a=delayed(),b=delayed(),before=a.pieces[0].mesh.position.clone();
  poseWildDebris(a,.0713);
  assert(a.pieces[0].mesh.position.equals(before),'physics lookahead cannot overwrite a still-connected rendered assembly');
  for(let i=3;i<=36;i++)poseWildDebris(a,i/30);
  for(let i=0;i<=72;i++)poseWildDebris(b,i/60);
  a.pieces.forEach((p,i)=>{assert(p.mesh.position.distanceTo(b.pieces[i].mesh.position)<1e-6,'near-simultaneous release times retain fixed-step frame-rate independence');assert(p.motionVelocity.length()<6,'close release times do not inject solver energy');});
  assert(a.events.some(e=>e.speed>1),'delayed parts still exchange impact momentum');
  disposeWildDebris(a);disposeWildDebris(b);
}
{
  const branched=()=>{
    const upper=piece([0,3,0],[3,0,0],{mass:2,delay:.08}),lower=piece([0,2.3,0],[0,0,0],{delay:.08});
    upper.detached=lower.detached=true;
    return createWildDebris([upper,lower,piece([2,3,0],[0,0,0],{mass:5,delay:.75}),piece([2,2.3,0],[0,0,0],{delay:.75})],{floor:0,scale:1,links:[{a:0,b:1,anchor:new THREE.Vector3(0,2.65,0)},{a:2,b:3,anchor:new THREE.Vector3(2,2.65,0),rigid:true}]});
  };
  const a=branched(),b=branched();poseWildDebris(a,.3);
  assert.equal(a.constraints.length,1,'the elbow engages without waiting for the torso release');
  assert(a.pieces[1].mesh.position.x>.1,'the lower arm receives the shoulder momentum');
  assert(!a.pieces[2].physicsBody.world,'body support and severed-arm physics have independent handoff times');
  const earlier=a.pieces.map(p=>p.mesh.position.clone());
  for(let n=0;n<=42;n++)poseWildDebris(a,n/30);
  for(let n=0;n<=84;n++)poseWildDebris(b,n/60);
  a.pieces.forEach((p,i)=>assert(p.mesh.position.distanceTo(b.pieces[i].mesh.position)<1e-6&&p.mesh.quaternion.angleTo(b.pieces[i].mesh.quaternion)<1e-6,'connected severed arms and late body collapse agree at 30/60 fps'));
  poseWildDebris(a,.3);a.pieces.slice(0,2).forEach((p,i)=>assert(p.mesh.position.distanceTo(earlier[i])<1e-6,'severed-limb replay preserves the early joint response'));
  assert(a.events.every(e=>a.pieces[e.a].detached!==a.pieces[e.b].detached),'a connected severed arm never collides with itself');
  disposeWildDebris(a);disposeWildDebris(b);
}
console.log('PASS heavy debris: compound mass, severed limb follow-through, independent support, low rebound, gravity, 30/60 fps, seeking and cleanup');

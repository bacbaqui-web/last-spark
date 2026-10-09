import assert from 'node:assert/strict';
import {Vector3} from 'three';
import {createPillbug,pillbugDemoPose} from '../pillbug-robot.js';
const r=createPillbug();assert.equal(r.segments.length,6);assert.equal(r.legs.length,6);
assert.equal(r.legHub.position.x,0);assert.equal(r.legHub.position.z,0);
assert.equal(new Set(r.legs.map(l=>l.angle)).size,6);
for(const {leg} of r.legs){assert.equal(leg.parent,r.legHub);assert.deepEqual(leg.position.toArray(),[0,0,0]);}
r.pose(0,0,2,true);assert(new Set(r.legs.map(l=>l.knee.rotation.x)).size===6);
for(const collision of ['player','wall']){let previous=null;for(let i=0;i<1050;i++){const age=i/100,p=pillbugDemoPose(age,collision);r.pose(p.curl,p.roll,age,p.flail);r.root.traverse(o=>assert(o.matrixWorld.elements.every(Number.isFinite)));assert(p.curl>=0&&p.curl<=1);assert.equal(p.invulnerable,!p.flail);if(previous)assert(Math.abs(p.z-previous.z)<.2);previous=p;}
 const impact=3.4+((collision==='player'?1.55:7.65)+3.7)/18;
 assert(pillbugDemoPose(impact-.01,collision).curl===1);
 const bounce=pillbugDemoPose(impact+.2,collision);assert(bounce.hop>.8&&bounce.z<bounce.contactZ&&bounce.invulnerable);
 const weak=pillbugDemoPose(impact+.6,collision);assert(weak.flip===1&&weak.flail&&!weak.invulnerable);
 assert(pillbugDemoPose(impact+2.9,collision).invulnerable);
}
// A planted toe stays on the floor and stationary while the body advances.
for(const t of [.06,.12,.18]){
 r.root.position.z=t*.65;r.pose(0,0,t*7,false);
 const toe=r.legs[0].knee.localToWorld(new Vector3(0,-.28,.67));
 assert(Math.abs(toe.y)<1e-6,'planted toe is on the floor');
 if(t===.06)r.userToe=toe;else assert(toe.distanceTo(r.userToe)<1e-6,'no stance sliding');
}
r.root.position.z=0;
for(const collision of ['player','wall']){
 const impact=3.4+((collision==='player'?1.55:7.65)+3.7)/18;
 const airborne=pillbugDemoPose(impact+3.27,collision);
 assert(airborne.hop>.9&&airborne.flip>.1&&airborne.flip<.9&&airborne.invulnerable);
 const landed=pillbugDemoPose(impact+3.8,collision);assert.equal(landed.hop,0);assert.equal(landed.flip,0);
}
assert(pillbugDemoPose(6,'none').z>40,'without contact it keeps rolling');
assert(pillbugDemoPose(2.1).invulnerable);assert(pillbugDemoPose(2.35).hop>.4);assert.equal(pillbugDemoPose(2.45).curl,1);
r.pose(1);assert(!r.head.visible);r.pose(0);assert(r.head.visible);r.dispose();
console.log('PASS pillbug: contact-driven roll, player/wall rebound, belly-only vulnerability, recovery, six plates/legs and finite poses');

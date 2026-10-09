import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createRobot,createSpider,disposeRobot} from '../robot.js';
import {createScoutDrone,createAssassin} from '../boss-models.js';
import {disposeObjectResources} from '../runtime-resources.js';
import {roadEncounterPlan,budgetEnemy,updateDropVisibility} from '../combat-budget.js';

function resources(robot){const found=new Set();robot.root.traverse(o=>{if(o.geometry)found.add(o.geometry);for(const m of [].concat(o.material||[]))found.add(m);});return found;}
const counts=[];
for(const [name,make] of [['drone',createScoutDrone],['spider',createSpider],['trooper',()=>createRobot()],['sniper',()=>createRobot(false,'sniper')],['assassin',createAssassin],['player',()=>createRobot(false,'player')]]){
 const neighbour=make(),shared=resources(neighbour);
 for(let round=0;round<12;round++){
  const robot=make(),all=resources(robot),owned=[...all].filter(r=>!shared.has(r)),freed=new Set();
  for(const resource of all)resource.addEventListener('dispose',()=>freed.add(resource));
  disposeRobot(robot);disposeRobot(robot);
  assert(owned.every(r=>freed.has(r)),name+' releases all actor-owned mesh resources');
  assert([...shared].every(r=>!freed.has(r)),name+' preserves live neighbour resources');
  if(round===0)counts.push({name,owned:owned.length,freed:owned.filter(r=>freed.has(r)).length});
 }
 disposeRobot(neighbour);
}
const material=new THREE.MeshBasicMaterial(),geometry=new THREE.BoxGeometry(),group=new THREE.Group();
group.add(new THREE.Mesh(geometry,[material,material]));let materials=0,geometries=0;
material.addEventListener('dispose',()=>materials++);geometry.addEventListener('dispose',()=>geometries++);
disposeObjectResources(group);assert.equal(materials,1);assert.equal(geometries,1);
for(const length of [120,335,650,1100]){
 const plan=roadEncounterPlan(length,2);assert.equal(plan[0].distance,24);assert.equal(plan[0].count,6);
 assert(plan.every(g=>g.distance<=length-30));assert(plan.slice(1).every((g,i)=>g.distance-plan[i].distance<=38));
}
assert.equal(roadEncounterPlan(335).reduce((n,g)=>n+g.count,1),35,'stage-one route has 34 patrols and one guardian');
const enemy={group:new THREE.Group(),hit:0,awareness:{state:'idle'}};enemy.group.position.z=150;
assert(!budgetEnemy(enemy,new THREE.Vector3()));assert(!enemy.group.visible);
assert(budgetEnemy(enemy,new THREE.Vector3(0,0,100)));assert(enemy.group.visible);
enemy.group.position.z=95;enemy.awareness.state='combat';assert(budgetEnemy(enemy,new THREE.Vector3()),'pursuers remain active beyond idle range');
const drop={m:new THREE.Group(),beam:new THREE.Group(),base:.5,kind:'weapon',life:600};drop.m.position.z=80;
updateDropVisibility(drop,new THREE.Vector3(),1);assert(!drop.m.visible&&!drop.beam.visible);assert.equal(drop.life,600);
updateDropVisibility(drop,new THREE.Vector3(0,0,78),2);assert(drop.m.visible&&drop.beam.visible);assert.equal(drop.kind,'weapon');
console.log(JSON.stringify({pass:true,actorLifecycles:72,resources:counts,stage1Enemies:35},null,2));

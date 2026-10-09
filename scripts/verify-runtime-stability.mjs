import assert from 'node:assert/strict';
import * as T from 'three';
import {buildWalkCollision} from '../street-walk-collision.js';
import {movePlayerWithSlide} from '../player-movement.js';
import {createPerformanceWindow,frameSteps} from '../runtime-performance.js';
const root=new T.Group();root.userData={walkBounds:20,walkBoundsZ:20,groundBase:0};const wall=new T.Mesh(new T.BoxGeometry(4,3,.04));wall.position.y=1.5;wall.userData.collisionKind='building';root.add(wall);
const roof=new T.Mesh(new T.BoxGeometry(4,.04,4));roof.position.set(7,3,0);roof.userData.collisionKind='building';root.add(roof);const collision=buildWalkCollision(root),platforms=[];platforms.streetCollision=collision;
for(const dt of [1/120,1/60,1/30,.04,.1,.25]){let position=new T.Vector3(0,1.7,1),velocity=new T.Vector3(0,0,-30);for(let i=0;i<Math.ceil(.2/dt);i++){const result=movePlayerWithSlide(position,position.clone().addScaledVector(velocity,dt),velocity,platforms);position=result.position;}assert(position.z>.27,'thin wall at '+dt);}
for(const dt of [.04,.1,.25]){const start=new T.Vector3(7,2.5,0),result=movePlayerWithSlide(start,start.clone().add(new T.Vector3(0,20*dt,0)),new T.Vector3(0,20,0),platforms);assert(result.position.y<3.1,'ceiling blocks large upward steps');assert.equal(result.velocity.y,0);}
const hit=new T.Raycaster(new T.Vector3(0,1,-3),new T.Vector3(0,0,1),0,10).intersectObject(collision.rayTarget)[0];assert(hit&&Math.abs(hit.point.z+.02)<.001);wall.visible=false;assert(new T.Raycaster(new T.Vector3(0,1,-3),new T.Vector3(0,0,1),0,10).intersectObject(collision.rayTarget).length,'hidden source still occludes');
for(const dt of [8.3,16.7,33.3,40,100]){const steps=frameSteps(dt);assert(steps.every(s=>s<=1/60+.0001));assert(Math.abs(steps.reduce((a,b)=>a+b,0)-dt/1000)<1e-8);}assert.deepEqual(frameSteps(300),[]);
const monitor=createPerformanceWindow(10);for(let i=1;i<=20;i++)monitor.record({elapsed:i,update:1,render:2});assert.equal(monitor.snapshot().frames,10);assert.equal(monitor.snapshot().p95FrameMs,20);monitor.reset();assert.equal(monitor.snapshot().frames,0);
console.log('PASS street high-speed thin walls/ceilings, spatial bullet occlusion, bounded simulation substeps and rolling performance percentiles');

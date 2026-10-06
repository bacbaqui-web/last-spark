import {State,StateMachine,Vehicle,ArriveBehavior,Vector3} from 'yuka';
class Approach extends State{enter(e){e.state='approach';e.stateTime=0;}execute(e){e.stateTime+=e.dt;e.intent='approach';if(e.canSee&&e.distance<(e.type==='sniper'?50:18)&&e.stateTime>.85+e.delay)e.ai.changeTo(e.type==='sniper'?'snipe':'aim');}}
class Aim extends State{enter(e){e.state='aim';e.stateTime=0;}execute(e){e.intent='stop';e.stateTime+=e.dt;if(!e.canSee||e.distance>24)e.ai.changeTo('approach');else if(e.stateTime>(e.boss?1.1:.9))e.ai.changeTo('fire');}}
class Fire extends State{enter(e){e.state='fire';e.stateTime=0;e.wantFire=true;}execute(e){e.intent='stop';e.stateTime+=e.dt;if(e.stateTime>.18)e.ai.changeTo('recover');}}
class Recover extends State{enter(e){e.state='recover';e.stateTime=0;e.strafe*=-1;}execute(e){e.intent='strafe';e.stateTime+=e.dt;if(e.stateTime>1.1+e.delay)e.ai.changeTo('approach');}}
class Hurt extends State{enter(e){e.state='hurt';e.stateTime=0;e.wantFire=false;}execute(e){e.intent='stop';e.stateTime+=e.dt;if(e.stateTime>.2)e.ai.changeTo('approach');}}
const states={approach:new Approach(),aim:new Aim(),fire:new Fire(),recover:new Recover(),hurt:new Hurt()};
export function attachEnemyAI(e){e.dt=0;e.distance=999;e.canSee=false;e.delay=Math.random()*.65;e.strafe=Math.random()<.5?-1:1;e.intent='approach';e.wantFire=false;e.ai=new StateMachine(e);for(const [id,state]of Object.entries(states))e.ai.add(id,state);e.ai.add('snipe',new Snipe());e.ai.add('sniperRecover',new SniperRecover());e.ai.add('dodge',new Dodge());e.ai.add('cover',new Cover());e.gazeTime=0;e.tacticalCooldown=0;e.ai.changeTo('approach');return e;}
export function updateEnemyAI(e,dt,distance,canSee,watched=false,findCover=()=>null){e.dt=dt;e.distance=distance;e.canSee=canSee;
 if(e.boss){e.stateTime=(e.stateTime||0)+dt;e.intent='bossDrift';e.seenTime=canSee?(e.seenTime||0)+dt:0;e.state=e.seenTime>=.5?'barrage':'patrol';return;}
 if(e.type==='sniper'){e.intent='stop';if(e.state==='snipe'||e.state==='sniperRecover')e.ai.update();else{e.state='observe';e.seenTime=canSee?(e.seenTime||0)+dt:0;if(e.seenTime>=1){e.seenTime=0;e.ai.changeTo('snipe');}}e.intent='stop';return;}
 if(e.type==='spider'){e.state='hunt';e.intent='approach';e.wantFire=false;return;}
 e.wantFire=false;e.fireClock=(e.fireClock||0)+dt;e.gazeTime=watched&&canSee?e.gazeTime+dt:Math.max(0,e.gazeTime-dt*3);e.tacticalCooldown=Math.max(0,e.tacticalCooldown-dt);
 if(!e.coverMode&&e.gazeTime>.25&&e.tacticalCooldown===0){const plan=findCover();e.gazeTime=0;e.tacticalCooldown=2;if(plan){e.coverPlan=plan;e.coverReached=false;e.coverMode='retreat';e.coverTimer=0;}}
 if(e.coverMode){e.coverTimer=(e.coverTimer||0)+dt;
  if(e.coverMode==='retreat'){e.state='cover';e.intent='cover';if(e.coverReached){e.coverMode='hide';e.coverTimer=0;}else if(e.coverTimer>5){e.coverMode=null;}return;}
  if(e.coverMode==='hide'){e.state='hidden';e.intent='stop';if(e.coverTimer> .8){e.coverMode='peek';e.coverTimer=0;const t=e.coverPlan.target,p=e.playerPoint||t,dx=t.x-p.x,dz=t.z-p.z,len=Math.hypot(dx,dz)||1;e.patrolGoal={x:t.x-dz/len*4*e.strafe,z:t.z+dx/len*4*e.strafe};}return;}
  e.state='peek';e.intent='patrol';if(canSee){e.state='aim';e.intent='stop';if(e.fireClock>=.55){e.wantFire=true;e.fireClock=0;e.state='fire';}}
  if(e.coverTimer>2.2){if(watched){const plan=findCover();if(plan){e.coverPlan=plan;e.coverReached=false;e.coverMode='retreat';e.coverTimer=0;e.strafe*=-1;}else e.coverMode=null;}else{e.coverMode=null;e.tacticalCooldown=1;}}return;
 }
 e.state=canSee?'aim':'approach';e.intent=canSee&&distance<14?'strafe':'approach';if(canSee&&distance<45&&e.fireClock>=.55){e.wantFire=true;e.fireClock=0;e.state='fire';}

}

// Yuka integrates steering force into velocity; render orientation stays horizontal.
export function steerEnemy(e,dt,direction,speed){
 if(!e.vehicle){e.vehicle=new Vehicle();e.vehicle.updateOrientation=false;e.vehicle.mass=.32;e.vehicle.maxForce=2.4;e.arrival=new ArriveBehavior(new Vector3(),.18,.025);e.vehicle.steering.add(e.arrival);}
 const vehicle=e.vehicle,p=e.group.position;vehicle.mass=speed===0?.36:e.state==='dodge'?.12:.2;vehicle.maxForce=e.state==='dodge'?8:5;vehicle.position.set(p.x,p.y,p.z);vehicle.maxSpeed=Math.max(e.speed,speed);
 e.arrival.target.set(p.x+direction.x*speed*.18,p.y,p.z+direction.z*speed*.18);
 vehicle.update(dt);return vehicle.position;
}
class Dodge extends State{enter(e){e.state='dodge';e.stateTime=0;e.rollDirection=null;e.strafe*=-1;e.wantFire=false;}execute(e){e.intent='dodge';e.stateTime+=e.dt;if(e.stateTime>.72)e.ai.changeTo('approach');}}
class Cover extends State{enter(e){e.state='cover';e.stateTime=0;e.wantFire=false;}execute(e){e.stateTime+=e.dt;e.intent=e.coverReached?'stop':'cover';if(e.coverReached)e.coverHold=(e.coverHold||0)+e.dt;if(e.coverHold>1.3||e.stateTime>5)e.ai.changeTo('approach');}}
// Segment/expanded rectangle tests also prevent cover routes crossing walls.
export function clearRoute(a,b,obstacles,pad=.6){return !obstacles.some(p=>{let lo=0,hi=1;for(const [axis,center,half]of[['x',p.x,p.w/2+pad],['z',p.z,p.d/2+pad]]){const d=b[axis]-a[axis];if(Math.abs(d)<1e-8){if(Math.abs(a[axis]-center)>=half)return false;}else{let t1=(center-half-a[axis])/d,t2=(center+half-a[axis])/d;if(t1>t2)[t1,t2]=[t2,t1];lo=Math.max(lo,t1);hi=Math.min(hi,t2);if(lo>hi)return false;}}return hi>0&&lo<1;});}
const navigationGraphs=new WeakMap();
function navigationGraph(obstacles,pad){let variants=navigationGraphs.get(obstacles);if(!variants){variants=new Map();navigationGraphs.set(obstacles,variants);}let graph=variants.get(pad);if(graph)return graph;const points=[];for(const p of obstacles)for(const x of[-1,1])for(const z of[-1,1]){const v={x:p.x+x*(p.w/2+pad+.25),z:p.z+z*(p.d/2+pad+.25)};if(Math.abs(v.x)<(obstacles.bounds?.x||40)&&Math.abs(v.z)<(obstacles.bounds?.z||40)&&clearRoute(v,v,obstacles,pad))points.push(v);}const edges=points.map(()=>[]);for(let i=0;i<points.length;i++)for(let j=i+1;j<points.length;j++)if(clearRoute(points[i],points[j],obstacles,pad)){const distance=Math.hypot(points[i].x-points[j].x,points[i].z-points[j].z);edges[i].push([j,distance]);edges[j].push([i,distance]);}graph={points,edges};variants.set(pad,graph);return graph;}
export function coverRoute(start,target,obstacles,pad=.6){if(clearRoute(start,target,obstacles,pad))return {route:[target],distance:Math.hypot(start.x-target.x,start.z-target.z)};const graph=navigationGraph(obstacles,pad),points=[start,target,...graph.points],edges=[[],[],...graph.edges.map(list=>list.map(([j,d])=>[j+2,d]))];for(let i=2;i<points.length;i++)for(const j of[0,1])if(clearRoute(points[j],points[i],obstacles,pad)){const d=Math.hypot(points[j].x-points[i].x,points[j].z-points[i].z);edges[j].push([i,d]);edges[i].push([j,d]);}const distances=points.map(()=>Infinity),prev=[],done=new Set();distances[0]=0;for(let k=0;k<points.length;k++){let i=-1;for(let j=0;j<points.length;j++)if(!done.has(j)&&(i<0||distances[j]<distances[i]))i=j;if(i<0||!Number.isFinite(distances[i]))break;if(i===1){const route=[];for(let c=1;c!==0;c=prev[c])route.unshift(points[c]);return {route,distance:distances[1]};}done.add(i);for(const [j,d]of edges[i])if(!done.has(j)&&distances[i]+d<distances[j]){distances[j]=distances[i]+d;prev[j]=i;}}return null;}

export function chooseCover(start,player,obstacles){const candidates=[];for(const p of obstacles){if(p.h<Math.max(2,player.y+.3))continue;const dx=p.x-player.x,dz=p.z-player.z,len=Math.hypot(dx,dz)||1,c={x:p.x+dx/len*(p.w/2+1.3),z:p.z+dz/len*(p.d/2+1.3)};const distance=Math.hypot(c.x-start.x,c.z-start.z);if(distance>20||Math.abs(c.x)>(obstacles.bounds?.x||39)||Math.abs(c.z)>(obstacles.bounds?.z||39)||!clearRoute(c,c,obstacles)||clearRoute(player,c,[p],0))continue;candidates.push({c,distance});}candidates.sort((a,b)=>a.distance-b.distance);let best=null;for(const {c}of candidates.slice(0,4)){const path=coverRoute(start,c,obstacles);if(path&&path.distance<20&&(!best||path.distance<best.distance))best={...path,target:c};}return best;}

class Snipe extends State{enter(e){e.state='snipe';e.stateTime=0;const p=e.playerPoint||{x:0,y:1.7,z:0};e.snipeTarget={x:p.x+3,y:p.y,z:p.z};e.snipeLocked=false;e.lockTime=0;e.snipeWarn=true;e.wantSnipe=false;}execute(e){e.intent='stop';e.stateTime+=e.dt;}}
class SniperRecover extends State{enter(e){e.state='sniperRecover';e.stateTime=0;e.snipeCooldown=3+Math.random()*2;}execute(e){e.intent='stop';e.stateTime+=e.dt;if(e.stateTime>e.snipeCooldown)e.ai.changeTo('approach');}}

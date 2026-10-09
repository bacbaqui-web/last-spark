import * as THREE from 'three';
export const SLAG={gravity:18,flight:1.8,radius:2.1,lifetime:5,tick:.5,damage:4,interval:.8,cooldown:3.2};
export function mortarVelocity(start,target,flight=SLAG.flight){return target.clone().sub(start).divideScalar(flight).add(new THREE.Vector3(0,SLAG.gravity*flight/2,0));}
export function advanceMortar(state,dt,distance){
  state.wait=(state.wait??1.1)-dt;state.shots??=0;
  if(distance<9){state.shots=0;state.wait=Math.max(state.wait,.8);return {move:-1,fire:false};}
  if(distance>34)return {move:1,fire:false};
  if(state.wait>0)return {move:0,fire:false};
  state.shots++;state.wait=state.shots===3?SLAG.cooldown:SLAG.interval;if(state.shots===3)state.shots=0;
  return {move:0,fire:true};
}
export function createSlagMortar(scene,{collide=()=>null,ground=p=>new THREE.Vector3(p.x,0,p.z),onImpact=()=>{}}={}){
  const projectiles=[],pools=[],embers=[];
  let damageClock=0;
  const sphere=new THREE.IcosahedronGeometry(1,1),disc=new THREE.CircleGeometry(1,28),ring=new THREE.RingGeometry(.94,1,40),flameGeometry=new THREE.ConeGeometry(1,3,5);
  const hot=new THREE.MeshBasicMaterial({color:0xff6a12,toneMapped:false}),core=new THREE.MeshBasicMaterial({color:0xffd35c,toneMapped:false});
  const random=(a,b)=>a+Math.random()*(b-a);
  const add=(g,m)=>{const o=new THREE.Mesh(g,m);scene.add(o);return o;};
  function puff(position,velocity,life=.45,size=.07,flame=false){if(embers.length>=180)return;const m=add(flame?flameGeometry:sphere,core);m.position.copy(position);m.scale.setScalar(size);embers.push({m,v:velocity,life,max:life});}
  function launch(start,target){
    if(projectiles.length>=24)return false;
    const landing=ground(target),m=add(sphere,hot);m.position.copy(start);m.scale.setScalar(.22);
    const warning=add(ring,new THREE.MeshBasicMaterial({color:0xffa53a,transparent:true,opacity:.45,depthWrite:false,side:THREE.DoubleSide}));warning.rotation.x=-Math.PI/2;warning.position.copy(landing).add(new THREE.Vector3(0,.035,0));warning.scale.setScalar(SLAG.radius);
    projectiles.push({m,v:mortarVelocity(start,landing),age:0,trail:0,warning});return true;
  }
  function ignite(point){
    if(pools.length>=32){const p=pools.shift();p.m.removeFromParent();p.material.dispose();}
    const material=new THREE.MeshBasicMaterial({color:0xff5912,transparent:true,opacity:.9,side:THREE.DoubleSide,depthWrite:false,toneMapped:false});
    material.onBeforeCompile=shader=>{shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec2 vSlag;').replace('#include <begin_vertex>','#include <begin_vertex>\nvSlag=(modelMatrix*vec4(position,1.0)).xz;');shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec2 vSlag;').replace('#include <color_fragment>','#include <color_fragment>\nvec2 cell=floor(vSlag*2.4),f=fract(vSlag*2.4);float nearest=8.,second=8.;for(int y=-1;y<=1;y++){for(int x=-1;x<=1;x++){vec2 o=vec2(float(x),float(y)),id=cell+o;vec2 jitter=fract(sin(vec2(dot(id,vec2(127.1,311.7)),dot(id,vec2(269.5,183.3))))*43758.5453);float d=length(o+jitter-f);if(d<nearest){second=nearest;nearest=d;}else second=min(second,d);}}float crust=smoothstep(.04,.17,second-nearest);diffuseColor.rgb*=mix(1.65,.10,crust);');};
    const m=new THREE.Group();m.position.copy(point);m.position.y+=.025;
    const floor=new THREE.Mesh(disc,material);floor.rotation.x=-Math.PI/2;floor.scale.setScalar(SLAG.radius);m.add(floor);
    for(let i=0;i<7;i++){const blob=new THREE.Mesh(disc,material);blob.rotation.x=-Math.PI/2;const a=i*Math.PI*2/7;blob.position.set(Math.sin(a)*1.5,.003,Math.cos(a)*1.5);blob.scale.setScalar(.65);m.add(blob);}
    scene.add(m);pools.push({m,material,age:0,flame:0,point:point.clone()});
    for(let i=0;i<18;i++)puff(point,new THREE.Vector3(random(-3,3),random(1,4),random(-3,3)),.5,.09);
    onImpact(point);
  }
  function update(dt,feet=null,damage=()=>{}){
    // Small integration steps keep curved flight collision reliable at low FPS.
    for(let i=projectiles.length-1;i>=0;i--){const p=projectiles[i];let impact=null;
      const steps=Math.max(1,Math.ceil(dt/.025)),step=dt/steps;
      for(let j=0;j<steps&&!impact;j++){const from=p.m.position.clone();p.m.position.addScaledVector(p.v,step);p.m.position.y-=SLAG.gravity*step*step/2;p.v.y-=SLAG.gravity*step;p.age+=step;
        impact=collide(from,p.m.position);const floor=ground(p.m.position);if(!impact&&p.m.position.y<=floor.y)impact=floor;
      }
      p.trail+=dt;if(p.trail>.035){p.trail%=.035;puff(p.m.position,p.v.clone().multiplyScalar(-.035),.30,.10);}
      p.m.rotation.x+=dt*5;p.warning.material.opacity=.3+.2*Math.sin(p.age*12);
      if(impact||p.age>4){if(impact)ignite(ground(impact));p.m.removeFromParent();p.warning.removeFromParent();p.warning.material.dispose();projectiles.splice(i,1);}
    }
    for(let i=pools.length-1;i>=0;i--){const p=pools[i];p.age+=dt;p.flame+=dt;const remaining=Math.max(0,1-p.age/SLAG.lifetime);p.material.color.setRGB(.16+.84*remaining,.025+.24*remaining, .008);p.material.opacity=Math.min(.9,remaining*3);
      if(p.flame>.08){p.flame%=.08;const angle=random(0,Math.PI*2),radius=Math.sqrt(Math.random())*SLAG.radius;puff(p.point.clone().add(new THREE.Vector3(Math.cos(angle)*radius,.08,Math.sin(angle)*radius)),new THREE.Vector3(0,random(.8,1.8),0),.45,.16,true);}
      if(p.age>=SLAG.lifetime){p.m.removeFromParent();p.material.dispose();pools.splice(i,1);}
    }
    for(let i=embers.length-1;i>=0;i--){const e=embers[i];e.life-=dt;e.m.position.addScaledVector(e.v,dt);e.m.scale.multiplyScalar(Math.exp(-dt*2));if(e.life<=0){e.m.removeFromParent();embers.splice(i,1);}}
    const touching=feet&&pools.some(p=>Math.abs(feet.y-p.point.y)<.65&&Math.hypot(feet.x-p.point.x,feet.z-p.point.z)<SLAG.radius);
    if(touching){damageClock+=dt;while(damageClock+1e-8>=SLAG.tick){damageClock-=SLAG.tick;damage(SLAG.damage);}}else damageClock=0;
    for(const list of [projectiles,pools,embers])for(const p of list)p.m.updateMatrixWorld(true);
    for(const p of projectiles)p.warning.updateMatrixWorld(true);
  }
  function clear(){for(const p of projectiles){p.m.removeFromParent();p.warning.removeFromParent();p.warning.material.dispose();}for(const p of pools){p.m.removeFromParent();p.material.dispose();}for(const e of embers)e.m.removeFromParent();projectiles.length=pools.length=embers.length=0;damageClock=0;}
  function dispose(){clear();for(const r of [sphere,disc,ring,flameGeometry,hot,core])r.dispose();}
  return {launch,update,clear,dispose,projectiles,pools,ignite};
}

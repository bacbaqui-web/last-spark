import * as THREE from 'three';

// Three.js includes the number of point lights in its shader cache key. Actors
// appearing/dying must not compile a new material variant for each light count.
export function createCombatLightPool(scene,limit=4){
 const root=new THREE.Group();root.name='combat-light-pool';scene.add(root);
 const slots=Array.from({length:limit},()=>{const light=new THREE.PointLight(0xffffff,0,1,2);root.add(light);return light;}),candidates=[],position=new THREE.Vector3();
 let active=0;
 return {
  prepare(enemies,dying,camera){
   candidates.length=0;
   for(const actors of [enemies,dying])for(const e of actors){
    for(const source of [e.robot.muzzleLight,e.robot.destruction?.light]){
     if(!source)continue;source.visible=false;
     if(!e.group.visible||source.intensity<=0||source===e.robot.destruction?.light&&!e.robot.destruction.group.visible)continue;
     source.getWorldPosition(position);const distance=position.distanceToSquared(camera.position);
     if(distance>90*90)continue;
     candidates.push({source,score:source.intensity/Math.max(1,distance)});
    }
   }
   candidates.sort((a,b)=>b.score-a.score);active=Math.min(limit,candidates.length);
   for(let i=0;i<slots.length;i++){
    const target=slots[i],source=candidates[i]?.source;target.intensity=source?.intensity||0;
    if(source){source.getWorldPosition(target.position);target.color.copy(source.color);target.distance=source.distance;target.decay=source.decay;}
   }
   candidates.length=0;
  },
  clear(){for(const light of slots)light.intensity=0;candidates.length=0;active=0;},
  snapshot:()=>({combatLightSlots:limit,activeCombatLights:active}),
  dispose(){root.removeFromParent();for(const light of slots)light.dispose();candidates.length=0;}
 };
}

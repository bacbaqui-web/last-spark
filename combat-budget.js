import * as THREE from 'three';
import {setEnemySleeping,setObjectSleeping} from './enemy-visibility.js';

// Populate the opening street, then add encounters at walking-scale intervals.
export function roadEncounterPlan(length,count=2){
 const end=Math.max(24,length-30),groups=[{distance:Math.min(24,end),count:Math.max(6,count+2),opening:true}];
 for(let distance=62;distance<=end;distance+=38)groups.push({distance,count:Math.max(4,count+1),opening:false});
 return groups;
}

// Offscreen or fully covered actors freeze their AI and pose. Distance limits
// also suspend far patrols while preserving their state for a later return.
export function budgetEnemy(enemy,position,visibility){
 const distance=enemy.group.position.distanceTo(position),combat=enemy.awareness?.state==='combat';
 enemy.group.visible=distance<130&&(!visibility||visibility.visible(enemy));
 setEnemySleeping(enemy,!enemy.group.visible||distance>(combat?110:72)&&enemy.hit<=0);
 return !enemy.dormant;
}

// Never delete valuable loot to meet a render budget. Only nearby drops animate;
// their item data and pickup collision remain available until normal expiry.
export function updateDropVisibility(drop,position,time,detail=true,inView=true){
 const distance=drop.m.position.distanceToSquared(position);
 drop.m.visible=inView&&detail&&distance<50*50;drop.beam.visible=inView&&distance<30*30;
 setObjectSleeping(drop.m,!drop.m.visible);setObjectSleeping(drop.beam,!drop.beam.visible);
 if(drop.m.visible&&distance<30*30){drop.m.rotation.y=time*2;drop.m.position.y=drop.base+Math.sin(time*3)*.15;}
}

// Keep every pickup and its type-colored marker. Dense piles show the nearest
// 32 full models, so hundreds of uncollected weapons cannot dominate a frame.
export function createDropBudget(limit=32){
 const frustum=new THREE.Frustum(),matrix=new THREE.Matrix4(),sphere=new THREE.Sphere(),nearby=[],details=new Set(),visible=new Set();
 return {clear(){nearby.length=0;details.clear();visible.clear();},update(drops,position,time,camera){
  camera.updateWorldMatrix(true,false);matrix.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);frustum.setFromProjectionMatrix(matrix);
  nearby.length=0;details.clear();visible.clear();sphere.radius=2;
  for(const drop of drops){sphere.center.copy(drop.m.position);if(drop.m.position.distanceToSquared(position)<50*50&&frustum.intersectsSphere(sphere)){nearby.push(drop);visible.add(drop);}}
  nearby.sort((a,b)=>a.m.position.distanceToSquared(position)-b.m.position.distanceToSquared(position));
  for(let i=0;i<Math.min(limit,nearby.length);i++)details.add(nearby[i]);
  for(const drop of drops)updateDropVisibility(drop,position,time,details.has(drop),visible.has(drop));
 }};
}

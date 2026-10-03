import * as THREE from 'three';
const v=(x,y,z)=>new THREE.Vector3(x,y,z);
const ready={grip:v(.28,-.32,-.46),direction:v(.55,.40,-1),twist:0};
const raised={grip:v(.29,.015,-.31),direction:v(.18,.98,.08),twist:-.32};
const finish={grip:v(-.28,-.35,-.58),direction:v(-.94,-.22,-.26),twist:.30};
const ease=t=>t*t*(3-2*t);
// Eye-relative authored poses: brief windup, two-frame cut at 30 fps,
// a readable follow-through, then a controlled return to ready.
export function sampleKnifeSlash(phase){
 let a=ready,b=ready,t=0,stage='ready';
 if(phase>=0){if(phase<.12){a=ready;b=raised;t=ease(phase/.12);stage='raise';}
 else if(phase<.22){a=raised;b=finish;t=(phase-.12)/.10;stage='cut';}
 else if(phase<.65){a=b=finish;stage='hold';}
 else{a=finish;b=ready;t=ease(Math.min(1,(phase-.65)/.35));stage='recover';}}
 const q=p=>new THREE.Quaternion().setFromUnitVectors(v(0,0,-1),p.direction.clone().normalize());
 const rotation=q(a).slerp(q(b),t),grip=a.grip.clone().lerp(b.grip,t),twist=THREE.MathUtils.lerp(a.twist,b.twist,t);
 return {grip,rotation,twist,stage};
}

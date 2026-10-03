import * as THREE from 'three';
const v=(x,y,z)=>new THREE.Vector3(x,y,z),ease=t=>t*t*(3-2*t);
const ready={grip:v(.28,-.32,-.46),direction:v(.55,.40,-1),twist:0};
function bladeRotation(direction,edge){const z=direction.clone().normalize().negate(),x=edge.clone().addScaledVector(z,-edge.dot(z)).normalize().negate(),y=z.clone().cross(x).normalize();return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x,y,z));}
export function sampleKnifeSlash(phase,{combo=1,guard=false,block=0,rush=false}={}){
 if(guard&&phase<0){const hit=Math.sin(Math.min(1,block/.24)*Math.PI/2),grip=v(-.32,-.12,-.80).lerp(v(.30,.08,-.80),hit),direction=v(1,.08,-.10).lerp(v(-.85,-.45,-.08),hit);return{grip,rotation:bladeRotation(direction,v(0,1,0)),twist:hit*.12,stage:hit>0?'parry':'guard'};}
 const side=combo===2?-1:1,raised={grip:v(side*.31,.015,-.48),direction:v(side*.52,.64,-.66),twist:-side*.32},finish={grip:v(-side*.32,-.36,-.62),direction:v(-side*.62,-.48,-.65),twist:side*.30};
 let a=ready,b=ready,t=0,stage='ready';
 if(phase>=0){if(phase<.12){a=ready;b=raised;t=ease(phase/.12);stage='raise';}else if(phase<.22){a=raised;b=finish;t=(phase-.12)/.10;stage='cut';}else if(phase<.65){a=b=finish;stage='hold';}else{a=finish;b=ready;t=ease(Math.min(1,(phase-.65)/.35));stage='recover';}}
 if(rush&&phase>=0){a={grip:v(.22,-.28,-.50),direction:v(-.85,.12,-.5),twist:-.2};b=a;t=0;stage='rush';}
 const edge=v(-side,-1,0).normalize(),q=p=>bladeRotation(p.direction,edge),rotation=q(a).slerp(q(b),t),grip=a.grip.clone().lerp(b.grip,t),twist=THREE.MathUtils.lerp(a.twist,b.twist,t);
 return {grip,rotation,twist,stage};
}

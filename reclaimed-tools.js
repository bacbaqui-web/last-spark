import * as T from 'three';
import {weaponPaint} from './reclaimed-weapon-surface.js';
import {salvageMetal,salvageRubber} from './salvage-metal.js';

// Same metre units and worn industrial finishes as the reclaimed firearms.
export function createReclaimedTool(type){
 if(!['knife','bow','chainsaw'].includes(type))return null;
 const root=new T.Group(),steel=salvageMetal('iron'),dark=salvageMetal('dark'),rubber=salvageRubber,paint=weaponPaint(type==='chainsaw'?'ochre':type==='bow'?'slate':'sage',true);
 root.name='weapon-'+type;root.userData.utilityWeapon=true;
 const mesh=(g,m,p=[0,0,0],parent=root)=>{const o=new T.Mesh(g,m);o.position.set(...p);parent.add(o);return o;};
 const box=(s,p,m=paint,parent=root)=>mesh(new T.BoxGeometry(...s),m,p,parent);
 const rod=(a,b,r,m=dark,parent=root)=>{const av=new T.Vector3(...a),bv=new T.Vector3(...b),o=mesh(new T.CylinderGeometry(r,r,av.distanceTo(bv),8),m,av.clone().add(bv).multiplyScalar(.5).toArray(),parent);o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),bv.sub(av).normalize());return o;};
 if(type==='knife'){
  // A compact salvaged machete: broad clipped blade, narrow wrapped grip.
  const shape=new T.Shape();[[0,-.12],[-.07,-.19],[-.08,-.69],[.015,-.87],[.055,-.66],[.045,-.15]].forEach(([x,z],i)=>i?shape.lineTo(x,-z):shape.moveTo(x,-z));shape.closePath();
  const g=new T.ExtrudeGeometry(shape,{depth:.018,bevelEnabled:true,bevelSize:.003,bevelThickness:.002,bevelSegments:1,steps:1});g.translate(0,0,-.009);g.rotateX(-Math.PI/2);mesh(g,steel);
  box([.058,.053,.34],[0,0,.075],rubber);box([.16,.042,.036],[0,0,-.113],dark);box([.067,.06,.035],[0,0,.265],paint);
  root.userData.triggerGrip=[0,0,.015];root.userData.supportGrip=[0,0,.18];root.userData.muzzle=[.015,0,-.87];
 }
 if(type==='bow'){
  root.userData.limbs=[];box([.065,.18,.07],[0,0,-.43],rubber);
  for(const side of[-1,1]){
   const limb=new T.Group();limb.userData.side=side;root.add(limb);root.userData.limbs.push(limb);
   const points=[[0,side*.08,-.43],[0,side*.24,-.49],[0,side*.48,-.37],[0,side*.66,-.22]];
   for(let i=0;i<points.length-1;i++){
    const a=new T.Vector3(...points[i]),b=new T.Vector3(...points[i+1]),o=box([.065,a.distanceTo(b),.04],a.clone().add(b).multiplyScalar(.5).toArray(),paint,limb);o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),b.sub(a).normalize());
   }
   const cam=mesh(new T.CylinderGeometry(.066,.066,.04,12),dark,[0,side*.66,-.22],limb);cam.rotation.z=Math.PI/2;
   rod([-.03,side*.66,-.22],[.03,side*.66,-.22],.017,steel,limb);
  }
  const string=new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(0,-.66,-.22),new T.Vector3(0,0,-.22),new T.Vector3(0,.66,-.22)]),new T.LineBasicMaterial({color:0xa4aaa0}));root.add(string);root.userData.string=string;
  const arrow=new T.Group();rod([0,0,.14],[0,0,-.63],.005,steel,arrow);const tip=mesh(new T.ConeGeometry(.018,.075,4),steel,[0,0,-.665],arrow);tip.rotation.x=-Math.PI/2;
  for(let i=0;i<3;i++){const fin=box([.028,.003,.065],[0,0,.075],paint,arrow);fin.rotation.z=i*Math.PI*2/3;}
  root.add(arrow);arrow.visible=false;root.userData.nockedArrow=arrow;root.userData.triggerGrip=[0,0,-.43];root.userData.muzzle=[0,0,-.71];
 }
 if(type==='chainsaw'){
  root.userData.reclaimedWeapon=true;root.userData.triggerGripStyle='over';
  box([.22,.19,.29],[0,-.025,.105]);box([.19,.045,.23],[0,.085,.10],dark);box([.025,.12,.19],[.12,-.025,.10],steel);
  box([.035,.125,.62],[0,0,-.34],steel);const nose=mesh(new T.CylinderGeometry(.0625,.0625,.035,12),steel,[0,0,-.65]);nose.rotation.z=Math.PI/2;
  root.userData.chainTeeth=[];root.userData.chainPitch=.047;
  for(const side of[-1,1])for(let i=0;i<13;i++){
   const o=box([.044,.024,.026],[0,side*.074,-.055-i*.047],dark);o.userData.baseZ=o.position.z;root.userData.chainTeeth.push(o);
  }
  // Two continuous handles; the contact anchors lie on the actual bars.
  for(const x of[-.105,.105])rod([x,.04,.21],[x,.12,.36],.022);
  rod([-.105,.12,.36],[.105,.12,.36],.023,rubber);
  for(const x of[-.145,.145])rod([x,-.04,-.015],[x,.22,-.015],.022);
  rod([-.145,.22,-.015],[.145,.22,-.015],.024,rubber);
  root.userData.triggerGrip=[.055,.12,.36];root.userData.supportGrip=[-.065,.22,-.015];root.userData.muzzle=[0,0,-.735];
 }
 root.traverse(o=>{if(o.isMesh)o.castShadow=o.receiveShadow=true;});return root;
}

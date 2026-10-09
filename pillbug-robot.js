import * as THREE from 'three';

export function createPillbug(){
 const root=new THREE.Group(),body=new THREE.Group();root.add(body);
 const canvas=typeof document!=='undefined'?document.createElement('canvas'):null;let map;
 if(canvas){canvas.width=canvas.height=256;const c=canvas.getContext('2d');c.fillStyle='#95703d';c.fillRect(0,0,256,256);let seed=91;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};for(let i=0;i<6000;i++){c.fillStyle=['#503923','#b28142','#39412c','#263326','#78603b'][i%5];c.fillRect(rand()*256,rand()*256,rand()*5+1,rand()*3+1);}map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;}
 const armor=new THREE.MeshStandardMaterial({color:0xe8cf9a,...(map?{map}:{}),metalness:.25,roughness:.85}),dark=new THREE.MeshStandardMaterial({color:0x252923,metalness:.7,roughness:.7}),steel=new THREE.MeshStandardMaterial({color:0x666b60,metalness:.8,roughness:.48}),moss=new THREE.MeshStandardMaterial({color:0x34472a,roughness:1});
 const sphere=new THREE.SphereGeometry(1,12,8),bolt=new THREE.CylinderGeometry(.026,.026,.03,8),segments=[],legs=[];
 const add=(parent,geometry,material,pos,scale)=>{const m=new THREE.Mesh(geometry,material);if(pos)m.position.set(...pos);if(scale)m.scale.set(...scale);m.castShadow=m.receiveShadow=true;parent.add(m);return m;};
 // Separate insect body volumes, joined by narrow recessed couplings.
 const abdomen=add(body,sphere,dark,[0,.43,-.72],[.57,.30,.70]);abdomen.name='Abdomen';
 const thorax=add(body,sphere,dark,[0,.43,.35],[.43,.29,.36]);thorax.name='Thorax';
 const joints=[-.03,.80].map(z=>add(body,sphere,steel,[0,.44,z],[.20,.17,.15]));
 const shellWidths=[.64,.92,1.18,1.20,1.02,.74];
 for(let i=0;i<6;i++){
  const group=new THREE.Group();body.add(group);const taper=1,vertices=[],uv=[],indices=[],steps=18;
  for(let z=0;z<2;z++)for(let j=0;j<=steps;j++){const a=j/steps*Math.PI;vertices.push(Math.cos(a)*.72*taper,Math.sin(a)*.38, (z-.5)*.69);uv.push(j/steps,z);}
  for(let j=0;j<steps;j++){const a=j,b=j+steps+1;indices.push(a,b,a+1,a+1,b,b+1);}
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();armor.side=THREE.DoubleSide;add(group,geometry,armor);
  for(const side of [-1,1])add(group,bolt,steel,[side*.48,.29,.08]);
  for(const x of [-.35,0,.35]){const spike=add(group,new THREE.ConeGeometry(.095,x===0?.38:.25,6),steel,[x,x===0?.55:.44,0]);spike.rotation.z=-x*.65;}
  // Repair plates, raised fasteners, and irregular moss mats from concept C.
  for(const side of [-1,1]){
   const patch=add(group,new THREE.BoxGeometry(.28,.045,.30),armor,[side*.36,.34,-.08]);patch.rotation.z=-side*.35;patch.rotation.y=side*(i%2?.12:-.13);
   for(const z of [-.18,.04])add(group,bolt,steel,[side*.36,.38,z]);
   add(group,new THREE.CylinderGeometry(.05,.07,.09,6),steel,[side*.57,.26,.13]);
  }
  for(let j=0;j<12;j++){const x=Math.sin(j*2.4+i)*.51,z=Math.cos(j*1.7+i)*.25,y=Math.sqrt(Math.max(0,1-(x/(.72*taper))**2))*.38+.024;add(group,sphere,moss,[x,y,z],[.09+(j%3)*.014,.022+(j%2)*.012,.065]);}

  const rimPoints=Array.from({length:19},(_,j)=>{const a=j/18*Math.PI;return new THREE.Vector3(Math.cos(a)*.72*taper,Math.sin(a)*.38+.012,.30);});add(group,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(rimPoints),20,.018,5,false),steel);
  segments.push(group);
 }
 const legHub=new THREE.Group();legHub.name='Belly_central_six_way_hub';legHub.position.set(0,.10,0);body.add(legHub);
 add(legHub,new THREE.CylinderGeometry(.25,.21,.16,12),dark);
 add(legHub,new THREE.TorusGeometry(.21,.04,8,20),steel).rotation.x=Math.PI/2;
 const rod=(parent,a,b,r,material)=>{const delta=new THREE.Vector3(...b).sub(new THREE.Vector3(...a)),m=add(parent,new THREE.CylinderGeometry(r*.78,r,delta.length(),8),material);m.position.copy(new THREE.Vector3(...a).add(new THREE.Vector3(...b)).multiplyScalar(.5));m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());return m;};
 for(let i=0;i<6;i++){
  const angle=Math.PI/6+i*Math.PI/3,leg=new THREE.Group();leg.name='Central_leg_'+i;legHub.add(leg);
  add(leg,sphere,steel,[0,0,.14],[.10,.10,.13]);
  rod(leg,[0,0,.14],[0,.24,.76],.08,dark);
  rod(leg,[-.06,-.03,.22],[-.06,.23,.70],.027,steel);
  const upper=add(leg,new THREE.BoxGeometry(.18,.12,.38),armor,[0,.22,.48]);upper.rotation.x=-.12;
  const knee=new THREE.Group();knee.position.set(0,.24,.76);leg.add(knee);
  add(knee,sphere,steel,[0,0,0],[.13,.13,.13]);rod(knee,[0,0,0],[0,-.04,.46],.07,dark);
  // Pointed, bevel-like wedge feet based on concept B, not block toes.
  const v=[-.13,.12,.08, .13,.12,.08, -.15,.04,.32, .15,.04,.32, -.065,-.22,.63, .065,-.22,.63, -.07,-.28,.67, .07,-.28,.67];
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(v,3));g.setAttribute('uv',new THREE.Float32BufferAttribute([0,0,1,0,0,.4,1,.4,0,.85,1,.85,0,1,1,1],2));g.setIndex([0,2,1,1,2,3,2,4,3,3,4,5,4,6,5,5,6,7,0,1,6,1,7,6,0,6,2,2,6,4,1,3,7,3,5,7]);g.computeVertexNormals();add(knee,g,armor);rod(knee,[-.09,.09,.13],[0,-.20,.60],.023,steel);
  legs.push({leg,knee,angle,side:i<3?1:-1,index:i});
 }
 const caps=[-1,1].map(side=>add(body,sphere,armor,[side*.60,0,0],[.20,.69,.69]));
 const head=new THREE.Group();body.add(head);head.name='Head';add(head,sphere,dark,[0,0,0],[.31,.24,.27]);const eyeMaterial=new THREE.MeshStandardMaterial({color:0x8b0908,emissive:0xff1508,emissiveIntensity:4});add(head,sphere,dark,[0,.015,.23],[.16,.16,.07]);add(head,sphere,eyeMaterial,[0,.015,.29],[.105,.105,.04]);
 function pose(curl=0,roll=0,walk=0,flail=false,locomotion=1){
  for(const cap of caps){cap.visible=curl>.5;cap.scale.set(.20*curl,.69*curl,.69*curl);}
  body.rotation.x=roll;body.position.y=curl*1.15;
  abdomen.position.set(0,THREE.MathUtils.lerp(.43,0,curl),THREE.MathUtils.lerp(-.72,0,curl));abdomen.scale.set(.57,THREE.MathUtils.lerp(.30,.64,curl),THREE.MathUtils.lerp(.70,.64,curl));
  thorax.position.set(0,.43*(1-curl),.35*(1-curl));thorax.scale.set(.43,.29,.36).multiplyScalar(1-curl*.85);
  for(const joint of joints)joint.visible=curl<.5;
  segments.forEach((part,i)=>{const t=i-2.5,angle=t/6*Math.PI*2;part.position.set(0,THREE.MathUtils.lerp(.39,.57*Math.cos(angle),curl),THREE.MathUtils.lerp(t*.49,.57*Math.sin(angle),curl));part.rotation.x=angle*curl;part.scale.x=THREE.MathUtils.lerp(shellWidths[i],1,curl);});
  legHub.visible=curl<.97;
  for(const {leg,knee,angle,index}of legs){
   leg.scale.setScalar(Math.max(.015,1-curl));
   if(flail){
    leg.rotation.set(.25+Math.sin(walk*2.1+index*1.9)*.48,angle+Math.sin(walk*1.7+index)*.27,0,'YXZ');
    knee.rotation.x=Math.sin(walk*2.8+index*1.4)*.7;
   }else{
    // Alternating tripods: planted toes travel backward relative to the body;
    // the other three lift and return forward. Solve both joints to the toe.
    const phase=((walk/(Math.PI*2)+index*.5)%1+1)%1,stance=.62;
    const swing=phase>=stance,u=swing?(phase-stance)/(1-stance):phase/stance;
    const stride=.65*(Math.PI*2/7)*stance*locomotion;
    const offset=swing?THREE.MathUtils.lerp(-stride/2,stride/2,THREE.MathUtils.smootherstep(u,0,1)):stride*(.5-u);
    const x=Math.sin(angle)*1.28,z=Math.cos(angle)*1.28+offset;
    const y=-.10+(swing?Math.sin(Math.PI*u)**2*.22*locomotion:0);
    const radius=Math.hypot(x,z),distance=Math.hypot(radius,y),upper=Math.hypot(.24,.76),lower=Math.hypot(.28,.67);
    const bend=-Math.acos(THREE.MathUtils.clamp((distance*distance-upper*upper-lower*lower)/(2*upper*lower),-1,1));
    const hip=Math.atan2(y,radius)-Math.atan2(lower*Math.sin(bend),upper+lower*Math.cos(bend));
    leg.rotation.set(Math.atan2(.24,.76)-hip,Math.atan2(x,z),0,'YXZ');
    knee.rotation.x=(Math.atan2(-.28,.67)-Math.atan2(.24,.76))-bend;
   }
  }

  head.position.set(0,.42,1.10);head.visible=curl<.75;head.scale.setScalar(1-curl*.75);
  root.updateMatrixWorld(true);
 }
 function dispose(){const geometries=new Set(),materials=new Set();root.traverse(o=>{if(o.isMesh){geometries.add(o.geometry);materials.add(o.material);}});for(const g of geometries)g.dispose();for(const m of materials)m.dispose();map?.dispose();root.removeFromParent();}
 pose();return {root,pose,dispose,segments,head,legs,legHub,thorax,abdomen};
}

export function pillbugDemoPose(age,collision='player'){
 const t=age%10.5,smooth=x=>THREE.MathUtils.smootherstep(x,0,1);
 // Contact positions account for the rolled shell radius. No timed roll exit.
 const contactZ=collision==='player'?1.55:collision==='wall'?7.65:Infinity;
 const impactAt=3.4+(contactZ+3.7)/18,impactAge=t-impactAt;
 const state=(stage,z,curl,roll,warning,hop=0,squash=1,flip=0,flail=false)=>({stage,z,curl,roll,warning,invulnerable:!flail,hop,squash,flip,flail,impactAge,contactZ});
 if(t<2)return state('기어다니기 · 무적',-5+t*.65,0,0,false);
 if(t<2.18)return state('도약 준비 · 무적',-3.7,0,0,true,0,1-.18*Math.sin((t-2)/.18*Math.PI));
 if(t<2.5){const u=(t-2.18)/.32;return state('통! 공으로 변형 · 무적',-3.7,smooth(u/.62),0,true,Math.sin(u*Math.PI)*.55);}
 if(t<3.4){const u=t-2.5;return state('회전 충전 · 무적',-3.7,1,8*u+20*u*u,true,.025*Math.sin(u*60)**2);}
 const spin=23.4;
 if(impactAge<0){const d=(t-3.4)*18;return state('충돌할 때까지 돌진 · 무적',-3.7+d,1,spin+d/1.15,true);}
 const end=spin+(contactZ+3.7)/1.15,upright=Math.ceil(end/(Math.PI*2))*Math.PI*2;
 if(impactAge<.4){const u=impactAge/.4,e=smooth(u);return state('퉁! 충돌 반동 · 무적',contactZ-1.8*(1-(1-u)**2),1-e,THREE.MathUtils.lerp(end,upright,e),false,Math.sin(u*Math.PI)*.85,1,e);}
 if(impactAge<2.8)return state('배 노출 · 발버둥 · 지금 공격!',contactZ-1.8,0,0,false,.025*Math.sin(t*30),1,1,true);
 if(impactAge<2.98){const u=(impactAge-2.8)/.18;return state('복귀 준비 · 움찔!',contactZ-1.8,0,0,false,0,1-.12*smooth(u),1);}
 if(impactAge<3.56){const u=(impactAge-2.98)/.58;return state('통! 뛰어올라 바로 서기',contactZ-1.8,0,0,false,4*.95*u*(1-u),THREE.MathUtils.lerp(.88,1,smooth(u/.18)),1-smooth((u-.12)/.76));}
 if(impactAge<3.78){const u=(impactAge-3.56)/.22;return state('착지 · 다리로 충격 흡수',contactZ-1.8,0,0,false,0,1-.14*Math.sin(Math.PI*u),0);}
 return state('기어다니기 · 무적',contactZ-1.8,0,0,false);
}

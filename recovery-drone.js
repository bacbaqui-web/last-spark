import * as T from 'three';
let sharedPaintTexture; // One bounded, immutable texture shared across regenerated maps.

// Heavy cargo UAV: open landing frame and an unobstructed underslung robot cradle.
export function createRecoveryDrone(){
 const root=new T.Group();root.position.z=12;
 const paint=new T.MeshStandardMaterial({color:0xffffff,metalness:.35,roughness:.85}),metal=new T.MeshStandardMaterial({color:0x465459,metalness:.65,roughness:.65}),rubber=new T.MeshStandardMaterial({color:0x202725,roughness:1}),yellow=new T.MeshStandardMaterial({color:0xb89342,roughness:.85}),lamp=new T.MeshStandardMaterial({color:0x99ebde,emissive:0x56c7ac,emissiveIntensity:1});
 if(typeof document!=='undefined'){paint.map=sharedPaintTexture ||=new T.TextureLoader().load(new URL('./textures/street/return-drone-top-v1.png',document.baseURI).href);paint.map.colorSpace=T.SRGBColorSpace;metal.map=paint.map;}
 root.userData.ownedMaterials=[paint,metal,rubber,yellow,lamp];
 function mesh(parent,g,m,pos,solid=true){const o=new T.Mesh(g,m);o.position.set(...pos);o.castShadow=o.receiveShadow=true;o.userData={ownedGeometry:true,...(solid?{collisionKind:'building'}:{})};parent.add(o);return o;}
 const box=(p,x,y,z,w,h,d,m=paint,solid=true)=>mesh(p,new T.BoxGeometry(w,h,d),m,[x,y,z],solid);
 function rod(p,a,b,r=.055,m=metal){const from=new T.Vector3(...a),to=new T.Vector3(...b),o=mesh(p,new T.CylinderGeometry(r,r,from.distanceTo(to),8),m,from.clone().add(to).multiplyScalar(.5).toArray());o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),to.sub(from).normalize());return o;}
 // Beveled compact fuselage with access panels, cooling vents and a camera.
 const hull=new T.Shape();[[-1,-.4],[-.8,-.65],[.8,-.65],[1,-.4],[1,.4],[.8,.65],[-.8,.65],[-1,.4]].forEach(([x,y],i)=>i?hull.lineTo(x,y):hull.moveTo(x,y));hull.closePath();
 mesh(root,new T.ExtrudeGeometry(hull,{depth:2.3,bevelEnabled:false}),paint,[0,2.9,-1.15]);
 box(root,0,2.95,1.18,1.5,.9,.12,metal);box(root,0,3,1.255,1.2,.58,.035,rubber);
 for(let i=0;i<6;i++)box(root,-.45+i*.18,3,1.285,.06,.45,.02,metal);
 box(root,0,2.48,1.18,.65,.22,.28,metal);mesh(root,new T.SphereGeometry(.12,8,6),lamp,[0,2.48,1.34],false);
 box(root,0,3.56,0,1.55,.08,1.9,paint);
 // Four separate round duct shrouds, open centers and recessed propellers.
 for(const side of [-1,1])for(const z of [-1.65,1.65]){
  const x=side*2.65;rod(root,[side*.9,3.05,z*.42],[x,3.05,z],.11);rod(root,[side*.7,2.67,z*.5],[x,3.02,z],.055);
  const shroud=mesh(root,new T.CylinderGeometry(.98,.98,.35,24,1,true),paint,[x,3.08,z]);shroud.material=paint;
  for(const y of [2.91,3.25]){const ring=mesh(root,new T.TorusGeometry(.98,.045,4,24),metal,[x,y,z]);ring.rotation.x=Math.PI/2;}
  const hub=mesh(root,new T.CylinderGeometry(.17,.17,.3,10),metal,[x,3.06,z]);
  for(const a of [0,Math.PI/2]){const blade=box(root,x,3.05,z,1.7,.04,.12,rubber);blade.rotation.y=a;}
  for(const a of [0,Math.PI/2]){const brace=box(root,x,2.94,z,1.85,.045,.05,metal);brace.rotation.y=a;}
  // Angled long outriggers carry load to wide landing feet.
  rod(root,[side*.75,2.58,z*.5],[side*2.05,.22,z*1.04],.065);
  rod(root,[side*1,2.3,z*.3],[side*2.05,.22,z*1.04],.035);
  box(root,side*2.05,.15,z*1.04,.32,.2,.5,rubber);
 }
 // Robot clamps hang below the body; the central entry lane remains open.
 box(root,0,2.12,0,.8,.55,.8,metal);
 for(const side of [-1,1]){
  rod(root,[side*.36,2.05,0],[side*.72,1.55,0],.07,yellow);
  box(root,side*.72,1.35,0,.16,.5,.45,metal);
  box(root,side*.52,1.1,0,.55,.13,.45,yellow);
  box(root,side*.45,1.25,0,.12,.25,.45,rubber);
 }
 box(root,0,.045,.55,1.2,.04,2.3,metal,false);
 for(const side of [-1,1])box(root,side*.65,.075,.55,.06,.04,2.3,yellow,false);
 // Small rotating six-barrel turret on top of the fuselage.
 const turret=new T.Group();turret.position.set(0,3.68,0);root.add(turret);
 mesh(turret,new T.CylinderGeometry(.4,.48,.18,12),metal,[0,0,0]);box(turret,0,.3,0,.58,.5,.58,paint);
 const gun=new T.Group();gun.position.set(0,.42,.12);turret.add(gun);
 box(gun,-.28,0,0,.24,.38,.55,metal);box(gun,.28,0,-.08,.3,.42,.6,yellow);
 const barrels=new T.Group();gun.add(barrels);
 for(let i=0;i<6;i++){const a=i*Math.PI/3,barrel=mesh(barrels,new T.CylinderGeometry(.037,.037,1.15,6),metal,[Math.cos(a)*.11,Math.sin(a)*.11,.62]);barrel.rotation.x=Math.PI/2;}
 for(const z of [.2,1.12]){const ring=mesh(barrels,new T.TorusGeometry(.145,.035,4,12),metal,[0,0,z]);}
 const muzzle=mesh(gun,new T.ConeGeometry(.13,.42,6),new T.MeshBasicMaterial({color:0xffdf70}),[0,0,1.4],false);muzzle.rotation.x=Math.PI/2;muzzle.visible=false;muzzle.userData.ownedMaterial=true;
 if(typeof document!=='undefined'){
  const c=document.createElement('canvas');c.width=512;c.height=128;const ctx=c.getContext('2d');ctx.fillStyle='#fff3b8';ctx.fillRect(0,0,512,128);ctx.fillStyle='#153d46';ctx.textAlign='center';ctx.font='bold 60px sans-serif';ctx.fillText('RETURN HERE',256,86);const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;
  const sign=box(root,0,3.48,1.3,1.5,.36,.03,new T.MeshBasicMaterial({map}),false);sign.userData.ownedMaterial=true;
 }
 let targets=[],lastShot=-1,lastScan=-1,current=null;const local=new T.Vector3(),world=new T.Vector3(),origin=new T.Vector3();
 root.userData.setDefenseTargets=value=>{targets=value;current=null;};
 root.userData.updateDefense=time=>{
  root.updateWorldMatrix(true,true);turret.getWorldPosition(origin);muzzle.visible=false;
  if(time-lastScan>.1){lastScan=time;current=null;let distance=18;for(const target of targets){if(target.userData.hp<=0)continue;target.getWorldPosition(world);const d=origin.distanceTo(world);if(d<distance){current=target;distance=d;}}}
  if(!current||current.userData.hp<=0)return;
  current.getWorldPosition(world);world.y+=.7;local.copy(world);root.worldToLocal(local);turret.rotation.y=Math.atan2(local.x,local.z);gun.rotation.x=-Math.atan2(local.y-turret.position.y-.42,Math.hypot(local.x,local.z));
  barrels.rotation.z=time*35;
  if(time-lastShot>.1){lastShot=time;current.userData.hp=Math.max(0,current.userData.hp-8);current.userData.onHit?.(8);}
  muzzle.visible=time-lastShot<.045;
 };
 return root;
}

import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {salvageMetal, salvageRubber} from './salvage-metal.js';
import {exoskeletonSurface} from './exoskeleton-surface.js';
import {roundedHeadShell,fitHelmetToSkull} from './robot-head-geometry.js';

// Workshop-only alternatives. The existing frame, inventory and game equipment stay independent.
export const EXOSKELETON_CONCEPTS = [
  {id:'field',name:'필드',summary:'접어 만든 판금 · 단단한 작업용 외피',shape:'folded',width:1,shoulder:1,coverage:.86,segments:6},
  {id:'swift',name:'스위프트',summary:'작은 어깨 · 길고 가벼운 정찰용 외피',shape:'slim',width:.77,shoulder:.75,coverage:.70,segments:8},
  {id:'halo',name:'헤일로',summary:'둥근 어깨 · 매끈하게 이어지는 곡면',shape:'round',width:1.02,shoulder:1.05,coverage:.93,segments:12},
  {id:'bulwark',name:'벌워크',summary:'넓은 흉갑 · 두꺼운 팔과 정강이',shape:'heavy',width:1.26,shoulder:1.45,coverage:.88,segments:6},
  {id:'kite',name:'카이트',summary:'뒤로 뻗은 어깨 · 끝이 좁아지는 쐐기',shape:'swept',width:.95,shoulder:1.20,coverage:.83,segments:6},
  {id:'lamella',name:'라멜라',summary:'겹쳐진 세 장의 판 · 유연한 분절 외피',shape:'layered',width:1.02,shoulder:1.02,coverage:.85,segments:8},
  {id:'patch',name:'패치',summary:'크기가 다른 양쪽 장비 · 수리한 작업 기체',shape:'asymmetric',width:1.02,shoulder:1.1,coverage:.83,segments:6},
  {id:'barrel',name:'배럴',summary:'짧고 둥근 보호통 · 튼튼한 산업용 기체',shape:'barrel',width:1.17,shoulder:1.18,coverage:.78,segments:10},
  {id:'rail',name:'레일',summary:'열린 중앙부 · 길게 둘러싼 외부 지지대',shape:'open',width:.92,shoulder:.9,coverage:.86,segments:6},
  {id:'carapace',name:'카라페이스',summary:'넓은 등껍질 · 겹쳐 맞물리는 다각형 외피',shape:'carapace',width:1.10,shoulder:1.28,coverage:.90,segments:8},
];

// A few broad cross-sections define a hollow plate. Fasteners, vents and seams are textures.
export function shell(profile,{start=-2.05,end=2.05,segments=8,thickness=.006,flat=false}={}) {
  const p=[],uv=[],ix=[],rows=profile.length,columns=segments+1,span=rows*columns;
  const fullCircle=Math.abs(end-start-Math.PI*2)<1e-6;
  for(let layer=0;layer<2;layer++)for(let row=0;row<rows;row++)for(let col=0;col<=segments;col++) {
    const [y,rx,rz,shift=0]=profile[row],phi=fullCircle&&col===segments?start:start+(end-start)*col/segments;
    const sin=Math.abs(Math.sin(phi))<1e-12?0:Math.sin(phi),cos=Math.abs(Math.cos(phi))<1e-12?0:Math.cos(phi);
    p.push((rx-layer*thickness)*sin,y,(rz-layer*thickness)*cos+shift);
    uv.push(.06+.88*col/segments,.08+.84*(1-row/(rows-1)));
  }
  for(let layer=0;layer<2;layer++)for(let row=0;row<rows-1;row++)for(let col=0;col<segments;col++) {
    const a=layer*span+row*columns+col,b=a+1,c=a+columns,d=c+1;
    if(layer===0)ix.push(a,c,b,b,c,d);else ix.push(a,b,c,b,d,c);
  }
  const edge=(a,b)=>ix.push(a,b,a+span,b,b+span,a+span);
  for(let col=0;col<segments;col++){edge(col,col+1);edge((rows-1)*columns+col+1,(rows-1)*columns+col);}
  if(!fullCircle)for(let row=0;row<rows-1;row++){edge((row+1)*columns,row*columns);edge(row*columns+segments,(row+1)*columns+segments);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(ix);g.computeVertexNormals();
  if(!flat)return g;const faceted=g.toNonIndexed();g.dispose();faceted.computeVertexNormals();return faceted;
}
export function plate(points,depth=.013) {
  const shape=new THREE.Shape();shape.moveTo(...points[0]);for(const point of points.slice(1))shape.lineTo(...point);shape.closePath();
  const g=new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelSize:.003,bevelThickness:.003,bevelSegments:1,steps:1});
  g.computeBoundingBox();const {min,max}=g.boundingBox;
  for(let i=0;i<g.attributes.position.count;i++)g.attributes.uv.setXY(i,.08+.84*(g.attributes.position.getX(i)-min.x)/(max.x-min.x),.08+.84*(g.attributes.position.getY(i)-min.y)/(max.y-min.y));
  return g;
}
export function removeExoskeleton(robot) {
  for(const group of robot.exoskeletonPreview?.groups||[]){group.removeFromParent();group.traverse(o=>{if(o.isMesh)o.geometry.dispose();});}
  robot.exoskeletonPreview=null;
}
export function attachExoskeleton(robot,id,slots=['head','chest','arms','legs','back'],{armStyle='standard',append=false,specOverride={},surfaceOverride=null}={}) {
  const previous=append?robot.exoskeletonPreview:null;
  if(!append)removeExoskeleton(robot);
  const baseSpec=EXOSKELETON_CONCEPTS.find(c=>c.id===id);if(!baseSpec)throw new Error('Unknown exoskeleton concept: '+id);
  const spec={...baseSpec,...specOverride};
  const groups=[],jointCovers=[],frame=robot.salvageFrame,active=new Set(slots),surface=surfaceOverride||exoskeletonSurface(spec.id),dark=salvageMetal('dark');
  const melee=armStyle==='melee';
  robot.root.updateMatrixWorld(true);
  function mount(name,parent=frame.anchors[name],pos=[0,0,0]) {
    const g=new THREE.Group();g.name='concept-'+id+'-'+name;g.position.fromArray(pos);g.userData.exoskeletonConcept=id;parent.add(g);groups.push(g);return g;
  }
  function add(g,geometry,pos=[0,0,0],rotation=[0,0,0],material=surface) {
    const m=new THREE.Mesh(geometry,material);m.position.fromArray(pos);m.rotation.set(...rotation);m.userData.cosmetic=true;m.userData.exoskeletonConcept=id;m.castShadow=m.receiveShadow=true;g.add(m);return m;
  }
  function wrap(g,profile,options={},pos=[0,0,0],rotation=[0,0,0]) {
    return add(g,shell(profile,{segments:spec.segments,flat:['folded','heavy','swept','asymmetric','carapace'].includes(spec.shape),...options}),pos,rotation);
  }
  function wrapClosed(g,profile,options={},pos=[0,0,0],rotation=[0,0,0]) {
    // Preserve the front silhouette/UVs and close the missing arc with a matching rear shell.
    const start=options.start??-2.05,end=options.end??2.05,remaining=Math.PI*2-(end-start);
    wrap(g,profile,options,pos,rotation);
    if(remaining>1e-5)wrap(g,profile,{...options,start:end,end:start+Math.PI*2,
      segments:Math.max(2,Math.round((options.segments??spec.segments)*remaining/(end-start)))},pos,rotation);
  }
  function length(name,end) {
    const endpoint=robot.bones.find(b=>b.name===end).getWorldPosition(new THREE.Vector3());return frame.anchors[name].worldToLocal(endpoint).length();
  }
  function hinge(g,name,width,radius,{pad=false,heavy=false}={}) {
    // A compact flexible enclosure stays centered on the real joint as its two sleeves rotate.
    const geometry=new THREE.SphereGeometry(1,10,6);geometry.scale(width,radius,radius);
    add(g,geometry,[0,0,0],[0,0,0],salvageRubber);
    jointCovers.push({name,group:g,width,radius});
    if(pad){
      const w=width*(heavy?1.13:1),r=radius;
      wrap(g,[[r*.98,w*.47,r*.80],[r*.48,w*.88,r*1.28],[-r*.42,w,r*1.32],[-r*1.18,w*.52,r*.92]],{start:-1.12,end:1.12,segments:6});
    }
  }
  if(active.has('head')){
    const g=mount('Head'),wide=spec.shape==='heavy'?1.08:1;
    const neck=mount('neck_01');add(neck,new THREE.CylinderGeometry(.028,.033,.106,8),[0,.027,0],[0,0,0],salvageRubber);
    add(g,roundedHeadShell({rx:.151*wide+.011,ry:.170,rz:.150,cy:.014,frontY:.040,sideY:-.092,backY:-.113,segments:20,rows:6,thickness:.016}));
    for(const sign of [-1,1]){
      const cap=plate([[0,.053],[.039,.034],[.033,-.045],[.012,-.059],[-.010,-.032]],.017);
      cap.scale(1.08,1.24,1);add(g,cap,[sign*.146,-.019,-.017],[0,sign*Math.PI/2,0]);
    }
    if(['folded','heavy','asymmetric','open'].includes(spec.shape))add(g,shell([[.080,.139*wide+.011,.142],[.040,.153*wide+.011,.151]],{start:-1.10,end:1.10,segments:12,thickness:.016}),[0,0,-.016]);
    if(spec.shape==='swept'||spec.shape==='carapace')for(const sign of [-1,1])add(g,plate([[0,.025],[.031,.090],[.048,.004],[.019,-.036]],.009),[sign*.101,.045,-.040],[0,sign*.6,sign*-.23]);
    fitHelmetToSkull(g);
  }
  if(active.has('chest')){
    const torso=mount('spine_03'),w=spec.shape==='heavy'?.18:spec.shape==='slim'?.132:.148;
    const profile=[[.154,w*.56,.058],[.108,w,.101],[.015,w*.94,.121],[-.096,w*.71,.087],[-.150,w*.44,.043]];
    if(spec.shape==='barrel'){profile[1][1]=w;profile[2][1]=w;profile[3][1]=w*.86;}
    for(const {group:door,side} of frame.chestMechanism.doors){
      const g=mount('chest-door-'+side,door,[-side*.123,0,-.006]);
      const options={start:side<0?-1.52:.026,end:side<0?-.026:1.52,segments:Math.max(3,spec.segments/2)};
      if(spec.shape==='open'){
        wrap(g,profile,{...options,start:side<0?-1.52:.85,end:side<0?-.85:1.52});
        wrap(g,profile.slice(0,2),options);
      } else if(spec.shape==='layered'){
        for(let i=0;i<profile.length-1;i++)wrap(g,[profile[i],profile[i+1]],options,[0,-i*.003,i*.002]);
      } else wrap(g,profile,options);
    }
    wrap(torso,profile.map(([y,x,z])=>[y,x,z*.86]),{start:Math.PI/2,end:Math.PI*1.5});
    for(const name of ['spine_01','spine_02']){
      const g=mount(name),width=(name==='spine_02'?.072:.065)*(spec.shape==='heavy'?1.15:1);
      const top=name==='spine_02'?.040:.085;
      const core=new THREE.CylinderGeometry(width*.73,width*.64,.145,8);add(g,core,[0,.020,-.015],[0,0,0],salvageRubber);
      const waistProfile=[[top,width,.062],[top-.045,width*1.04,.077],[top-.102,width*.88,.059]];
      if(spec.shape!=='open')wrapClosed(g,waistProfile,{start:-1.35,end:1.35,segments:6});
      else wrap(g,waistProfile,{start:Math.PI/2,end:Math.PI*1.5,segments:6});
    }
  }
  if(active.has('legs')){
    const hips=mount('pelvis'),hipWidth=spec.shape==='heavy'?.17:.146;
    // Enclose the rear and sides of the hips behind the existing front plates.
    wrap(hips,[[.076,hipWidth*.85,.049,-.035],[.020,hipWidth,.062,-.035],[-.061,hipWidth*.73,.060,-.035],[-.094,hipWidth*.39,.036,-.035]],{start:-Math.PI,end:Math.PI,segments:12});
    for(const sign of[-1,1])add(hips,plate([[sign*.016,.065],[sign*(hipWidth-.022),.082],[sign*hipWidth,.043],[sign*.10,-.040],[sign*.035,-.057]],.024),[0,0,.036]);
    add(hips,plate([[-.051,.042],[.051,.042],[.040,-.047],[0,-.09],[-.040,-.047]],.023),[0,-.01,.056]);
  }
  if(active.has('arms')){
    for(const side of['l','r']){
      const sign=side==='l'?1:-1,g=mount('upperarm-shoulder_'+side,frame.anchors['upperarm_'+side]);
      let f=spec.shoulder*(melee?1.26:1.05)*1.12;if(spec.shape==='asymmetric')f*=side==='l'?1.22:.86;
      hinge(g,'upperarm_'+side,.064,.061);
      const r=.074*f,depth=.077*f,thickness=melee?.022:.016;
      if(melee)wrapClosed(g,[[.099,r*.46,depth*.56],[.064,r*1.06,depth],[.001,r*1.12,depth*1.05],[-.118,r*.82,depth*.76]],{start:-2.9,end:2.9,segments:8,flat:true,thickness},[sign*.012,0,0]);
      else if(spec.shape==='swept')wrapClosed(g,[[.094,.020,.036],[.024,r,depth],[-.120,r*.72,depth*.64]],{start:-2.6,end:2.6,thickness},[sign*.018,.009,-.025],[0,0,sign*-.40]);
      else if(spec.shape==='layered')for(let i=0;i<2;i++)wrapClosed(g,[[.06-i*.07,r*.72,depth*.74],[.014-i*.07,r,depth],[-.038-i*.07,r*.93,depth*.9]],{start:-2.65,end:2.65,thickness});
      else wrapClosed(g,[[.079,.031*f,.033*f],[.045,r*.9,depth*.93],[-.023,r,depth],[-.119,r*.80,depth*.78]],{start:-2.75,end:2.75,thickness},[sign*.009,0,0]);
    }
  }
  for(const side of['l','r'])for(const [part,end,slot,radius] of [['upperarm','lowerarm','arms',.057],['lowerarm','hand','arms',.066],['thigh','calf','legs',.075],['calf','foot','legs',.073]]){
    if(!active.has(slot))continue;
    const g=mount(part+'_'+side),span=length(part+'_'+side,end+'_'+side),lower=part==='lowerarm'||part==='calf';
    let r=radius*spec.width;if(spec.shape==='asymmetric'&&slot==='arms')r*=side==='l'?.88:1.20;
    const armoredArm=melee&&slot==='arms';if(armoredArm)r*=lower?1.43:1.20;
    // Continuous sleeves reach their joint enclosures, instead of isolated plates mid-bone.
    const y0=part==='upperarm'?-.067:part==='thigh'?.018:-.014,y1=-span+.012,reach=y0-y1;
    const endRadius=Math.max(slot==='arms'?.034:.042,r*.61);
    const profile=[[y0,Math.max(r*.78,endRadius),r*.78],[y0-reach*.22,r,r*.94],[y1+reach*.25,r*(lower?.81:.88),r*.85],[y1,endRadius,endRadius]];
    const linerScale=spec.shape==='layered'?.90:1;
    const liner=new THREE.CylinderGeometry(Math.max(.034,r*.64)*linerScale,endRadius*.93*linerScale,span-.012,8);
    add(g,liner,[0,-span/2,0],[0,0,0],salvageRubber);
    if(lower)hinge(g,part+'_'+side,part==='calf'?.059:armoredArm?.060:.052,part==='calf'?.056:.047,{pad:true,heavy:armoredArm});
    if(part==='thigh')hinge(g,part+'_'+side,.064,.062);
    if(spec.shape==='barrel'){profile[1][1]*=1.08;profile[2][1]=r;profile[2][2]=r*.88;}
    if(spec.shape==='swept'||spec.shape==='carapace'){profile[0][1]=r*.97;profile[0][2]=r*.65;profile[1][3]=.014;profile[3][1]=r*.40;}
    if(armoredArm){
      wrapClosed(g,profile,{start:-2.75,end:2.75,segments:8,flat:true});
      if(lower){
        const sign=side==='l'?1:-1;
        add(g,plate([[-r*.70,reach*.44],[r*.63,reach*.44],[r*.82,reach*.21],[r*.61,-reach*.40],[0,-reach*.49],[-r*.72,-reach*.31]],.019),[sign*r*.88,(y0+y1)/2,0],[0,sign*Math.PI/2,0]);
      }
    }else if(spec.shape==='open'){
      for(const sign of[-1,1])wrap(g,profile,{start:sign<0?-2.30:.50,end:sign<0?-.50:2.30,segments:3});
      wrap(g,profile,{start:2.30,end:Math.PI*2-2.30,segments:3});
    }else if(spec.shape==='layered'){
      for(let i=0;i<3;i++){
        const h=reach/3,y=y0-i*h,s=1-i*.12;
        wrapClosed(g,[[y,r*.88*s,r*.77*s],[y-h*.55,r*s,r*.91*s],[y-h*1.09,r*.85*s,r*.78*s]],{start:-2.25,end:2.25});
      }
    }else wrapClosed(g,profile,{start:spec.shape==='slim'?-1.80:-2.35,end:spec.shape==='slim'?1.80:2.35});
  }
  for(const side of['l','r']){
    if(active.has('arms')){
      const g=mount('hand_'+side),sign=side==='l'?1:-1;
      hinge(g,'hand_'+side,.036,.036);
      wrapClosed(g,[[.022,.038,.039],[-.012,.039,.042],[-.040,.035,.042]],{start:-2.8,end:2.8,segments:8});
      const handPlate=plate([[-.038,.047],[.035,.047],[.046,-.039],[.031,-.061],[-.036,-.061]],melee?.017:.010);
      if(melee)handPlate.scale(1.13,1.06,1);
      add(g,handPlate,[sign*(melee?.029:.025),-.060,0],[0,sign*Math.PI/2,0]);
      if(melee)add(g,new THREE.BoxGeometry(.024,.022,.082),[sign*.020,-.119,0]);
    }
    if(active.has('legs')){
      const g=mount('foot_'+side),r=spec.shape==='heavy'?.058:.051;
      hinge(g,'foot_'+side,.047,.043);
      wrapClosed(g,[[.035,r*.82,.044],[-.011,r,.048],[-.060,r,.075]],{start:-2.8,end:2.8,segments:8},[0,-.006,.015]);
      const toe=plate([[-r,.044],[r,.044],[r*.86,-.046],[-r*.86,-.046]],.009);
      add(g,toe,[0,-.043,.107],[-Math.PI/2+.12,0,0]);
    }
  }
  if(active.has('back')){
    const g=mount('pack',frame.anchors.spine_03);
    const w=spec.shape==='heavy'?.128:spec.shape==='slim'?.066:.103;
    wrap(g,[[.142,w*.72,.042],[.101,w,.072],[-.108,w*.83,.060],[-.146,w*.54,.024]],{start:Math.PI/2,end:Math.PI*1.5},[0,0,-.109]);
    if(spec.shape==='asymmetric')add(g,new THREE.BoxGeometry(.056,.20,.044),[.12,-.01,-.15],[0,0,-.05],dark);
  }
  let triangles=0;
  for(const group of groups){
    const buckets=new Map();
    for(const child of [...group.children]){
      if(!child.isMesh)continue;child.updateMatrix();const geometry=child.geometry.index?child.geometry.toNonIndexed():child.geometry.clone();geometry.applyMatrix4(child.matrix);
      if(!buckets.has(child.material))buckets.set(child.material,[]);buckets.get(child.material).push(geometry);child.geometry.dispose();group.remove(child);
    }
    for(const [material,geometries] of buckets){
      const geometry=mergeGeometries(geometries);geometries.forEach(g=>g.dispose());
      const mesh=new THREE.Mesh(geometry,material);mesh.name=group.name+'-shell';mesh.userData.cosmetic=true;mesh.userData.exoskeletonConcept=id;mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);triangles+=geometry.attributes.position.count/3;
    }
  }
  robot.exoskeletonPreview={id,groups:[...(previous?.groups||[]),...groups],triangles:(previous?.triangles||0)+triangles,jointCovers:[...(previous?.jointCovers||[]),...jointCovers],armStyle,slots:[...new Set([...(previous?.slots||[]),...active])]};return robot.exoskeletonPreview;
}

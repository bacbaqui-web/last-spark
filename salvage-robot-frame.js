import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {salvageMetal, salvageRubber, salvageOptic} from './salvage-metal.js';
import {CHEST_SLOTS, createChestMechanism, chestArmorGeometry} from './salvage-chest.js';
import {jawlessSkullGeometry} from './robot-head-geometry.js';

const skullCoreMaterial=new THREE.MeshStandardMaterial({name:'skull-inner-core',color:0x101313,roughness:1,metalness:0});
skullCoreMaterial.userData.sharedSalvageMaterial=true;

// Human bone silhouettes, kept as a few broad forms. Surface detail stays in maps.
export function createSalvageFrame(motion, bones, head, visor) {
  const iron = salvageMetal('iron'), dark = salvageMetal('dark');
  const assemblies = [], anchors = {}, sockets = [];
  motion.traverse(o => { if (o.isMesh && o !== head && o !== visor) { o.visible = false; o.userData.frameAnchor = true; } });
  const point = name => bones[name].getWorldPosition(new THREE.Vector3());
  function assembly(name, position = point(name), quaternion = new THREE.Quaternion()) {
    const group = new THREE.Group(); group.name = 'reclaimed-frame-' + name;
    group.position.copy(position); group.quaternion.copy(quaternion); motion.add(group);
    group.userData.frameAssembly = true; assemblies.push({group, bone: bones[name]}); anchors[name] = group;
    return group;
  }
  function mesh(parent, geometry, material, pos = [0, 0, 0], rotation) {
    const m = new THREE.Mesh(geometry, material); m.position.fromArray(pos);
    if (rotation) m.rotation.set(...rotation); parent.add(m); return m;
  }
  const box = (g, size, pos, mat = iron) => mesh(g, new THREE.BoxGeometry(...size), mat, pos);
  function joint(g, radius, width, pos = [0, 0, 0], axis = 'z') {
    return mesh(g, new THREE.CylinderGeometry(radius, radius, width, 10), iron, pos, axis === 'x' ? [0, 0, Math.PI / 2] : axis === 'z' ? [Math.PI / 2, 0, 0] : undefined);
  }
  function boneBeam(g, a, b, radius, mat = iron) {
    const from = new THREE.Vector3(...a), to = new THREE.Vector3(...b), delta = to.sub(from);
    const geometry = new THREE.CylinderGeometry(radius, radius, delta.length(), 6, 2);
    const p = geometry.attributes.position;
    for (let i = 0; i < p.count; i++) if (Math.abs(p.getY(i)) < .001) {
      p.setX(i, p.getX(i) * .64); p.setZ(i, p.getZ(i) * .64);
    }
    if(mat===iron)for(let i=0;i<geometry.attributes.uv.count;i++)geometry.attributes.uv.setY(i,geometry.attributes.uv.getY(i)*delta.length()/.08);
    geometry.computeVertexNormals();
    const m = mesh(g, geometry, mat, from.addScaledVector(delta, .5).toArray());
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize()); return m;
  }
  const chest = assembly('spine_03');
  const chestMechanism=createChestMechanism(chest);
  for(const slot of CHEST_SLOTS)sockets.push({...slot,position:[...slot.position],assembly:chest.name});
  boneBeam(chest, [0,.172,-.045], [0,-.10,-.060], .024, iron);
  for(const side of ['l','r']) {
    const g=assembly('clavicle_'+side),delta=point('upperarm_'+side).sub(g.position);
    boneBeam(g,[0,0,0],delta.toArray(),.021);
  }
  for(const name of ['spine_01','spine_02']) {
    const g=assembly(name),back=name==='spine_02'?-.083:0;
    boneBeam(g,[0,-.034,0],[0,.113,back],.018,iron);
    joint(g,.033,.055,[0,.036,back*.070/.147],'y');
  }
  const pelvis=assembly('pelvis',new THREE.Vector3(0,point('pelvis').y,0));
  boneBeam(pelvis,[0,.13,0],[0,-.04,0],.023,iron);
  for(const side of [-1,1]) {
    const wing=new THREE.Shape();wing.moveTo(.017,.032);wing.lineTo(.073,.076);wing.lineTo(.133,.079);
    wing.lineTo(.122,.01);wing.lineTo(.07,-.046);wing.lineTo(.025,-.027);wing.closePath();
    const hipGeometry=new THREE.ExtrudeGeometry(wing,{depth:.061,bevelEnabled:false,steps:1});
    hipGeometry.translate(0,0,-.031); if(side<0)hipGeometry.rotateY(Math.PI);mesh(pelvis,hipGeometry,iron);
    boneBeam(pelvis,[side*.096,.008,.009],[side*.038,-.066,.021],.018);
  }
  for(const side of ['l','r']) {
    for(const [start,end,width,radius,axleWidth,axis] of [
      ['upperarm','lowerarm',.048,.043,.070,'x'],
      ['lowerarm','hand',.052,.034,.056,'x'],
      ['thigh','calf',.062,.043,.070,'x'],
      ['calf','foot',.063,.038,.060,'x'],
    ]) {
      const name=start+'_'+side,a=point(name),delta=point(end+'_'+side).sub(a),length=delta.length();
      const rotation=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,-1,0),delta.clone().normalize());
      const g=assembly(name,a,rotation);
      joint(g,radius,axleWidth,[0,0,0],axis);
      const paired=start==='lowerarm'||start==='calf';
      for(const z of paired?[-width*.31,width*.31]:[0])boneBeam(g,[0,-.027,z],[0,-length+.026,z],width*(paired?.24:.49));
    }
    const hand=assembly('hand_'+side,point('hand_'+side),anchors['lowerarm_'+side].quaternion);
    // A solid, softly bevelled palm replaces the exposed metacarpal struts.
    joint(hand,.023,.042,[0,.004,0],'z');
    const palmOutline=new THREE.Shape();
    const palmPoints=[[.024,-.012],[.037,-.048],[.041,-.096],[.035,-.115],
      [.008,-.119],[-.021,-.116],[-.046,-.104],[-.049,-.060],[-.026,-.015]];
    palmOutline.moveTo(...palmPoints[0]);
    for(const p of palmPoints.slice(1))palmOutline.lineTo(...p);
    palmOutline.closePath();
    const palmGeometry=new THREE.ExtrudeGeometry(palmOutline,{depth:.026,steps:1,bevelEnabled:true,bevelThickness:.005,bevelSize:.004,bevelSegments:1});
    palmGeometry.translate(0,0,-.013);palmGeometry.rotateY(-Math.PI/2);
    for(let i=0;i<palmGeometry.attributes.position.count;i++)palmGeometry.attributes.uv.setXY(i,palmGeometry.attributes.position.getZ(i)/.14+.5,palmGeometry.attributes.position.getY(i)/.14+.95);
    mesh(hand,palmGeometry,iron);
    const thumbWeb=mesh(hand,new THREE.SphereGeometry(1,8,4),iron,[side==='l'?-.023:.023,-.039,.028]);
    thumbWeb.scale.set(.020,.034,.026);
    for(const finger of ['thumb','index','middle','ring','pinky']) {
      for(let segment=1;segment<=3;segment++) {
        const name=finger+'_0'+segment+'_'+side, end=finger+(segment===3?'_04_leaf_':'_0'+(segment+1)+'_')+side;
        const a=point(name),delta=point(end).sub(a),g=assembly(name,a);
        // Full-width rounded fingers retain the rig's three bending segments.
        const radius=(finger==='thumb'?.013:finger==='pinky'?.009:.0105)*(1-(segment-1)*.065);
        const length=delta.length(),lo=-length*.5+.0003,hi=length*.5-.0003;
        const profile=[[0,lo],[radius*.88,lo],[radius,lo+.002],
          [radius,hi-(segment===3?radius*.7:.002)],[radius*(segment===3?.55:.88),hi],[0,hi]];
        const skin=new THREE.LatheGeometry(profile.map(p=>new THREE.Vector2(...p)),6);
        const fingerShell=mesh(g,skin,iron,delta.clone().multiplyScalar(.5).toArray());
        fingerShell.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());
      }
    }
    const foot=assembly('foot_'+side);
    joint(foot,.029,.060,[0,0,0],'x');
    box(foot,[.026,.055,.033],[0,-.038,.003],iron);
    const bootPaint=salvageMetal('iron','foot');
    function wedge(size,pos,drop,mat=bootPaint,chamfer=false){
      let geometry;
      if(chamfer){
        const [w,h,d]=size,c=.014,outline=new THREE.Shape();
        const corners=[[-w*.43,-d/2+c],[-w*.43+c,-d/2],[w*.43-c,-d/2],[w*.43,-d/2+c],
          [w/2,d/2-c],[w/2-c,d/2],[-w/2+c,d/2],[-w/2,d/2-c]];
        corners.forEach(([x,z],i)=>i?outline.lineTo(x,-z):outline.moveTo(x,-z));outline.closePath();
        geometry=new THREE.ExtrudeGeometry(outline,{depth:h,steps:1,bevelEnabled:false});
        geometry.translate(0,0,-h/2);geometry.rotateX(-Math.PI/2);
      }else geometry=new THREE.BoxGeometry(...size);
      const m=mesh(foot,geometry,mat,pos),p=geometry.attributes.position;
      for(let i=0;i<p.count;i++){
        if(p.getY(i)>0)p.setY(i,p.getY(i)-drop*(p.getZ(i)/size[2]+.5));
        if(!chamfer&&p.getZ(i)<0)p.setX(i,p.getX(i)*.86);
        if(chamfer){
          const n=geometry.attributes.normal;
          geometry.attributes.uv.setXY(i,Math.abs(n.getX(i))>.5?p.getZ(i)/size[2]+.5:p.getX(i)/size[0]+.5,Math.abs(n.getY(i))>.5?p.getZ(i)/size[2]+.5:p.getY(i)/size[1]+.5);
        }
      }
      m.geometry.computeVertexNormals();return m;
    }
    // Low sloped toe, raised instep and an open ankle cuff, like a work boot.
    wedge([.104,.015,.211],[0,-.0865,.041],0,salvageRubber,true);
    wedge([.101,.053,.202],[0,-.0535,.040],.032,bootPaint,true);
    wedge([.077,.009,.067],[0,-.050,.100],.010);
    for(const x of [-.041,.041])wedge([.014,.043,.074],[x,-.029,-.003],.008);
    wedge([.089,.033,.015],[0,-.023,.040],.005);
  }
  const neckStep=.043,neck=assembly('neck_01');
  boneBeam(neck,[0,-.023,0],[0,.128-neckStep,0],.019,iron);
  joint(neck,.026,.019,[0,.033,0],'y');
  const loweredHead=head.getWorldPosition(new THREE.Vector3());loweredHead.y-=neckStep;
  head.position.copy(head.parent.worldToLocal(loweredHead));
  // A curved forehead, orbital rims and short maxilla; no lower jaw.
  head.geometry=jawlessSkullGeometry();
  head.userData.cosmetic=true;head.scale.setScalar(1);head.material=iron;
  const skull=assembly('Head',head.getWorldPosition(new THREE.Vector3()));
  // One closed dark core replaces the separate eye plugs and fills the skull.
  const coreGeometry=new THREE.SphereGeometry(1,16,7);coreGeometry.scale(.112,.100,.077);coreGeometry.translate(0,.017,.003);
  const coreVertices=coreGeometry.attributes.position;
  // Fit the front just behind the curved mask, closing oblique eye/nose views
  // without letting the spherical core intersect the outer forehead.
  for(let i=0;i<coreVertices.count;i++)if(coreVertices.getZ(i)>.0031){
    const x=coreVertices.getX(i),y=coreVertices.getY(i);
    coreVertices.setZ(i,.104*Math.sqrt(Math.max(.025,1-(x/.122)**2-((Math.max(y,-.005)-.020)/.117)**2))-.024);
  }
  coreGeometry.computeVertexNormals();mesh(skull,coreGeometry,skullCoreMaterial);
  box(skull,[.026,.035,.018],[0,-.051,.066],skullCoreMaterial);
  const eyes=[-.049,.049].map(x=>{const geometry=new THREE.SphereGeometry(.013,8,6);geometry.scale(1,1,.45);geometry.translate(x,-.004,.075);return geometry;});
  visor.geometry=mergeGeometries(eyes);eyes.forEach(g=>g.dispose());visor.userData.cosmetic=true;
  motion.attach(visor);visor.position.copy(skull.position);visor.quaternion.identity();visor.scale.setScalar(1);visor.material=salvageOptic;bones.Head.attach(visor);

  // Merge the few simple solids per bone and material.
  for (const {group, bone} of assemblies) {
    const buckets = new Map();
    for (const child of [...group.children].filter(o=>o.isMesh)) {
      child.updateMatrix(); const geometry = child.geometry.index ? child.geometry.toNonIndexed() : child.geometry.clone();
      geometry.applyMatrix4(child.matrix);
      if (!buckets.has(child.material)) buckets.set(child.material, []);
      buckets.get(child.material).push(geometry); child.geometry.dispose(); group.remove(child);
    }
    for (const [material, geometries] of buckets) {
      const geometry = mergeGeometries(geometries); geometries.forEach(g => g.dispose());
      const m = new THREE.Mesh(geometry, material); m.name = group.name + '-' + material.name;
      m.castShadow = m.receiveShadow = true; m.userData.cosmetic = true; m.userData.salvageFrame = true; group.add(m);
    }
    motion.updateMatrixWorld(true); bone.attach(group);
  }
  // Set the thumb's relaxed bind pose after its rigid shells are attached.
  // Finger tracks are absent from the motion clips, so this also survives pose().
  for(const side of ['l','r']){
    const sign=side==='l'?1:-1,handRotation=anchors['hand_'+side].getWorldQuaternion(new THREE.Quaternion());
    const directions=[[-sign*.12,-1,.32],[sign*.05,-1,.12],[sign*.20,-.98,-.10]];
    for(let segment=1;segment<=3;segment++){
      const name='thumb_0'+segment+'_'+side,end='thumb_'+(segment===3?'04_leaf':'0'+(segment+1))+'_'+side;
      const bone=bones[name],direction=point(end).sub(point(name)).normalize();
      const target=new THREE.Vector3(...directions[segment-1]).normalize().applyQuaternion(handRotation);
      const rotation=new THREE.Quaternion().setFromUnitVectors(direction,target).multiply(bone.getWorldQuaternion(new THREE.Quaternion()));
      bone.quaternion.copy(bone.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(rotation));
      bone.updateWorldMatrix(false,true);
    }
  }
  // Limb equipment uses a consistent local +Z front and +Y toward the joint.
  // The legacy capsule's Y-to-bone rotation put leg plates on the back.
  const equipmentAnchors = {spine_03:anchors.spine_03};
  for (const name of Object.keys(anchors).filter(name => /^(upperarm|lowerarm|thigh|calf)_/.test(name))) {
    const base = bones[name].children.find(o => o.userData.frameAnchor && !o.userData.cosmetic);
    const anchor = new THREE.Object3D(); anchor.name = 'reclaimed-equipment-anchor-' + name;
    anchor.position.copy(base.position); anchor.quaternion.copy(anchors[name].quaternion); bones[name].add(anchor);
    equipmentAnchors[name] = anchor;
  }
  for(const side of ['l','r'])for(const part of ['hand','foot'])equipmentAnchors[part+'_'+side]=anchors[part+'_'+side];
  const armorPieces = [];
  for (const [name, size, offset, level] of [
    ['spine_03', [.29, .23, .03], [0, 0, .111], 1],
    ['lowerarm_l', [.115, .18, .025], [0, 0, .075], 2],
    ['lowerarm_r', [.115, .18, .025], [0, 0, .075], 2],
    ['calf_l', [.13, .14, .025], [0, .03, .079], 3],
    ['calf_r', [.13, .14, .025], [0, .03, .079], 3],
  ]) {
    const base = equipmentAnchors[name] || bones[name].children.find(o => o.userData.frameAnchor && !o.userData.cosmetic);
    const holder = new THREE.Group(); holder.position.copy(base.position); holder.quaternion.copy(base.quaternion);
    holder.name = 'arena-armor-' + name; holder.visible = false; bones[name].add(holder);
    const plates = name==='spine_03'
      ? [mesh(holder,chestArmorGeometry(),salvageMetal('iron'))]
      : [box(holder, size, offset, salvageMetal('iron'))];
    for(const plate of plates){plate.userData.cosmetic=true;plate.castShadow=true;}
    armorPieces.push({holder, level});
  }
  return {assemblies: assemblies.map(a => a.group), sockets, anchors, equipmentAnchors, armorPieces, chestMechanism};
}

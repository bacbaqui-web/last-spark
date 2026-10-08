import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {createRobot, animateRobot} from './robot.js';
import {applyFrameVisual} from './frame-preview.js';
import {frameStats,PARTS} from './salvage-campaign.js';
import {EQUIPMENT,EQUIPMENT_SLOTS} from './equipment.js';
import {EQUIPMENT_STUDIES,MODULE_STUDIES,attachEquipmentStudies} from './equipment-studies.js';
import {EQUIPMENT_PAINTS} from './exoskeleton-surface.js';
import {EXOSKELETON_CONCEPTS, attachExoskeleton, removeExoskeleton} from './exoskeleton-concepts.js';
import {loadTorsoTextures} from './torso-textures.js';

const host = document.querySelector('#scene');
const renderer = new THREE.WebGLRenderer({antialias: true, alpha: true});
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.3;
host.append(renderer.domElement);
const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer), room = new RoomEnvironment();
scene.environment = pmrem.fromScene(room, .04).texture; scene.environmentIntensity = .72;
room.dispose(); pmrem.dispose();
scene.add(new THREE.HemisphereLight(0xe5f0e9, 0x6d6957, 2.3));
const key = new THREE.DirectionalLight(0xffeed1, 3.5); key.position.set(-3, 5, 4); key.castShadow = true;
key.shadow.mapSize.set(2048, 2048); key.shadow.camera.left = key.shadow.camera.bottom = -2.4;
key.shadow.camera.right = key.shadow.camera.top = 2.4; key.shadow.normalBias = .014;
scene.add(key);
const rim = new THREE.DirectionalLight(0xd8eef5, 2.3); rim.position.set(2, 3, -3); scene.add(rim);
const floor = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.ShadowMaterial({color: 0x5c6852, opacity: .2}));
floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
const ring = new THREE.Mesh(new THREE.RingGeometry(.69, .695, 96), new THREE.MeshBasicMaterial({color: 0xa1a893, transparent: true, opacity: .42, side: THREE.DoubleSide}));
ring.rotation.x = -Math.PI / 2; ring.position.y = .001; scene.add(ring);
const camera = new THREE.PerspectiveCamera(32, 1, .01, 100);
const controls = new OrbitControls(camera, renderer.domElement); controls.enableDamping = true;
controls.target.set(0, 1.02, 0); controls.minDistance = .55; controls.maxDistance = 7;
controls.maxPolarAngle = Math.PI * .52; controls.minPolarAngle = .2;
controls.autoRotateSpeed = .8;
const robot = createRobot(false, 'player', 1);
robot.blaster.visible = false; scene.add(robot.root);
const equipmentTypes = {head: 'tactical', chest: 'vest', arms: 'marksman', legs: 'runner', back: 'batteryPack'};
let parts = [], equipment = {}, walking = false, chestTarget = 0, chestAmount = 0;
let conceptId = 'halo', armStyle = 'standard', studyMode='items', paint='item';
const moduleTypes=['drive','reactor','weapon'];
const cleanMaterials = new Map(), originalMaterials = new WeakMap();

function alignSegment(name,endName,target){
    const bone = robot.bones.find(n => n.name === name), end = robot.bones.find(n => n.name === endName);
    robot.root.updateMatrixWorld(true);
    const direction = end.getWorldPosition(new THREE.Vector3()).sub(bone.getWorldPosition(new THREE.Vector3())).normalize();
    const world = bone.getWorldQuaternion(new THREE.Quaternion()).premultiply(new THREE.Quaternion().setFromUnitVectors(direction, target));
    bone.quaternion.copy(bone.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(world));
}
function stand() {
  robot.mixer.stopAllAction(); robot.skeleton.pose(); robot.root.position.set(0, 0, 0); robot.motion.rotation.set(0, 0, 0);
  for (const side of ['l', 'r']) for (const [a, b] of [['upperarm_', 'lowerarm_'], ['lowerarm_', 'hand_'], ['thigh_', 'calf_'], ['calf_', 'foot_']]) {
    alignSegment(a+side,b+side,new THREE.Vector3((side === 'l' ? 1 : -1) * (a === 'upperarm_' ? .20 : a === 'thigh_' ? .14 : .06), -1, 0).normalize());
  }
  if(document.querySelector('#jointPose').checked){
    for(const side of['l','r'])alignSegment('lowerarm_'+side,'hand_'+side,new THREE.Vector3(side==='l'?.12:-.12,.08,1).normalize());
    alignSegment('calf_r','foot_r',new THREE.Vector3(-.03,-.55,-.83).normalize());
  }
  robot.lookForward(0); robot.root.updateMatrixWorld(true);
  const bounds = new THREE.Box3();
  for (const foot of robot.bones.filter(n => /^foot_[lr]$/.test(n.name))) foot.traverseVisible(o=>{
    if(!o.isMesh)return;
    if(!o.geometry.boundingBox)o.geometry.computeBoundingBox();
    bounds.union(o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld));
  });
  robot.root.position.y = -bounds.min.y + .006; robot.root.updateMatrixWorld(true);
}
function surface() {
  const worn = document.querySelector('#weathered').checked;
  robot.root.traverse(o => {
    if (!o.isMesh) return;
    if (!originalMaterials.has(o)) originalMaterials.set(o, o.material);
    const original = originalMaterials.get(o);
    if (!original.userData.sharedSalvageMaterial || !original.map) return;
    if (!cleanMaterials.has(original)) {
      const material = original.clone(); material.map = material.normalMap = material.bumpMap = material.roughnessMap = material.metalnessMap = null;
      material.color.copy(original.userData.salvageColor || new THREE.Color(0x9da497));
      material.metalness = original.userData.surfaceKind==='fabric'?0:.6; material.roughness = original.userData.surfaceKind==='fabric'?.98:.48; cleanMaterials.set(original, material);
    }
    o.material = worn ? original : cleanMaterials.get(original);
  });
}
function refresh() {
  // Restore shared originals before disposing a previous equipment set.
  robot.root.traverse(o => { if (o.isMesh && originalMaterials.has(o)) o.material = originalMaterials.get(o); });
  removeExoskeleton(robot);
  applyFrameVisual(robot, frameStats({parts:studyMode==='items'?[]:parts, equipment: {}}));
  if(studyMode==='items')attachEquipmentStudies(robot,equipment,parts,{paint});
  else attachExoskeleton(robot, conceptId, Object.keys(equipment),{armStyle});
  surface();
  document.querySelector('#partCount').textContent = `${Object.keys(equipment).length} / 5`;
  for (const button of document.querySelectorAll('[data-slot]')) {
    const active = !!equipment[button.dataset.slot]; button.setAttribute('aria-pressed', active); button.querySelector('i').textContent = active ? '−' : '+';
  }
  document.querySelector('#moduleCount').textContent=`${parts.length} / 3`;
  for(const button of document.querySelectorAll('[data-module]')) {
    const active=parts.some(p=>p.slot===Number(button.dataset.module));
    button.setAttribute('aria-pressed',active);button.querySelector('i').textContent=active?'−':'+';
  }
  syncItemControls();
  const motionQuery=new URLSearchParams({paint});
  for(const slot of Object.keys(EQUIPMENT_SLOTS))motionQuery.set(slot,equipment[slot]?.type||'none');
  document.querySelector('#motionPreview').href='./robot-motion.html?'+motionQuery;
  if (!walking) stand();
  document.querySelector('#armSlotLabel').textContent=armStyle==='melee'?'어깨부터 손등까지 · 근접용 중장갑':'어깨부터 손목까지 · 관절 덮개';
  document.querySelector('#conceptStats').textContent = `외장 ${robot.exoskeletonPreview.triangles.toLocaleString()} 삼각형 · ${Object.keys(equipment).length} / 5 부위`;
}
function stage(name) {
  parts = name === 'bare' ? [] : name === 'salvaged' ? [{type: 'drive', level: 1,slot:0}, {type: 'reactor', level: 1,slot:1}] : [{type: 'drive', level: 1,slot:0}, {type: 'reactor', level: 1,slot:1}, {type: 'weapon', level: 1,slot:2}];
  equipment = name === 'equipped' ? Object.fromEntries(Object.entries(equipmentTypes).map(([slot, type]) => [slot, {type, level: 1}])) : name === 'salvaged' ? {arms: {type: 'brawler', level: 1}} : {};
  for (const button of document.querySelectorAll('[data-stage]')) button.setAttribute('aria-pressed', button.dataset.stage === name);
  document.querySelector('#viewName').textContent = {bare: 'BARE FRAME', salvaged: 'FIELD REPAIR', equipped: 'READY FOR SALVAGE'}[name]; refresh();
}
const conceptSelect=document.querySelector('#conceptSelect'),conceptGrid=document.querySelector('#conceptGrid');
for(const [index,concept] of EXOSKELETON_CONCEPTS.entries()){
  const option=document.createElement('option');option.value=concept.id;option.textContent=`${String(index+1).padStart(2,'0')} ${concept.name}`;conceptSelect.append(option);
  const button=document.createElement('button');button.type='button';button.dataset.concept=concept.id;button.setAttribute('aria-pressed',String(concept.id===conceptId));
  const img=document.createElement('img');img.alt=`${concept.name} 외골격 전신 시안`;img.width=300;img.height=360;
  const label=document.createElement('span');label.className='concept-card-title';label.textContent=`${String(index+1).padStart(2,'0')} / ${concept.name}`;
  const description=document.createElement('small');description.textContent=concept.summary;
  button.append(img,label,description);button.addEventListener('click',()=>{selectConcept(concept.id);document.querySelector('.viewport').scrollIntoView({behavior:'smooth',block:'center'});});conceptGrid.append(button);
}
function selectConcept(id){
  if(!EXOSKELETON_CONCEPTS.some(c=>c.id===id))return;
  studyMode='concepts';conceptId=id;conceptSelect.value=id;syncStudyMode();
  const concept=EXOSKELETON_CONCEPTS.find(c=>c.id===id);
  document.querySelector('#conceptDescription').textContent=concept.summary;
  for(const button of conceptGrid.querySelectorAll('button'))button.setAttribute('aria-pressed',String(button.dataset.concept===id));
  openChest(false);stage('equipped');view('reset');
  document.querySelector('#viewName').textContent=`${String(EXOSKELETON_CONCEPTS.indexOf(concept)+1).padStart(2,'0')} / ${concept.name}`;
}
conceptSelect.addEventListener('change',()=>selectConcept(conceptSelect.value));
for(const [selector,direction]of[['#previousConcept',-1],['#nextConcept',1]])document.querySelector(selector).addEventListener('click',()=>{
  const index=EXOSKELETON_CONCEPTS.findIndex(c=>c.id===conceptId);selectConcept(EXOSKELETON_CONCEPTS[(index+direction+EXOSKELETON_CONCEPTS.length)%EXOSKELETON_CONCEPTS.length].id);
});
for (const button of document.querySelectorAll('[data-stage]')) button.addEventListener('click', () => stage(button.dataset.stage));
function openChest(open) {
  chestTarget=open?1:0;
  const button=document.querySelector('#chestDoor');button.textContent=open?'가슴 닫기':'가슴 열기';button.setAttribute('aria-expanded',open);
}
document.querySelector('#chestDoor').addEventListener('click',()=>{openChest(!chestTarget);view('chest');});
for(const button of document.querySelectorAll('[data-module]'))button.addEventListener('click',()=>{
  const slot=Number(button.dataset.module),index=parts.findIndex(p=>p.slot===slot);
  if(index>=0)parts.splice(index,1);else parts.push({type:moduleTypes[slot],level:1,slot});
  document.querySelectorAll('[data-stage]').forEach(b=>b.setAttribute('aria-pressed',false));
  document.querySelector('#viewName').textContent='CUSTOM ASSEMBLY';refresh();openChest(true);
});
for (const button of document.querySelectorAll('[data-slot]')) button.addEventListener('click', () => {
  const slot = button.dataset.slot; if (equipment[slot]) delete equipment[slot]; else equipment[slot] = {type: equipmentTypes[slot], level: 1};
  document.querySelectorAll('[data-stage]').forEach(b => b.setAttribute('aria-pressed', false));
  document.querySelector('#viewName').textContent = 'CUSTOM ASSEMBLY'; refresh();
});
for(const button of document.querySelectorAll('[data-arm-style]'))button.addEventListener('click',()=>{
  armStyle=button.dataset.armStyle;
  for(const control of document.querySelectorAll('[data-arm-style]'))control.setAttribute('aria-pressed',String(control.dataset.armStyle===armStyle));
  if(!equipment.arms){document.querySelectorAll('[data-stage]').forEach(b=>b.setAttribute('aria-pressed',false));document.querySelector('#viewName').textContent='CUSTOM ASSEMBLY';}
  equipmentTypes.arms=armStyle==='melee'?'brawler':'marksman';equipment.arms={type:equipmentTypes.arms,level:1};refresh();
});
function view(name) {
  if(name==='chest') {
    robot.root.updateMatrixWorld(true);controls.target.copy(robot.salvageFrame.anchors.spine_03.getWorldPosition(new THREE.Vector3()));
    controls.target.y+=studyMode==='items'?.045:.012;camera.position.copy(controls.target).add(new THREE.Vector3(.20,.07,studyMode==='items'?1.55:1.10));controls.update();return;
  }
  if(name==='hand'||name==='feet') {
    const bone=robot.bones.find(b=>b.name===(name==='hand'?'middle_01_l':'foot_l'));
    robot.root.updateMatrixWorld(true);controls.target.copy(bone.getWorldPosition(new THREE.Vector3()));
    camera.position.copy(controls.target).add(new THREE.Vector3(...(name==='hand'?[.8,.10,.67]:[.8,.35,.7])));
    controls.update();return;
  }
  controls.target.set(0, name === 'detail' ? 1.67 : 1.04, 0);
  camera.position.set(...({front: [0, 1.45, 4.45], side: [4.45, 1.04, 0], back: [0, 1.45, -4.45], detail: [.95, 1.95, 1.82], reset: [2.35, 1.8, 3.8]}[name]));
  controls.update();
}
for (const name of ['front', 'side', 'back', 'detail', 'chest', 'hand', 'feet', 'reset']) document.querySelector('#' + name).addEventListener('click', () => view(name));
document.querySelector('#rotating').addEventListener('change', e => controls.autoRotate = e.target.checked);
document.querySelector('#weathered').addEventListener('change', surface);
document.querySelector('#walking').addEventListener('change', e => {
  walking = e.target.checked;
  if (walking) {
    document.querySelector('#jointPose').checked=false;
    robot.root.position.y = 0;
    for (const name of ['Idle_Loop', 'Walk_Loop', 'Jog_Fwd_Loop', 'Sprint_Loop', 'Idle_Loop_Upper', 'Walk_Loop_Upper', 'Jog_Fwd_Loop_Upper', 'Sprint_Loop_Upper']) robot.actions[name].reset().play();
  } else stand();
});
document.querySelector('#jointPose').addEventListener('change',()=>{
  walking=false;document.querySelector('#walking').checked=false;stand();view('reset');
});
async function exportModel() {
  await loadTorsoTextures();
  const {GLTFExporter} = await import('three/addons/exporters/GLTFExporter.js');
  const snapshot = robot.root.clone(true); snapshot.rotation.y = 0;
  return new GLTFExporter().parseAsync(snapshot, {binary: true, onlyVisible: true});
}
document.querySelector('#export').addEventListener('click', async e => {
  const button = e.currentTarget, message = document.querySelector('#message'); button.disabled = true; message.textContent = '금속 텍스처와 부품을 묶고 있습니다…';
  try {
    const result = await exportModel();
    const url = URL.createObjectURL(new Blob([result], {type: 'model/gltf-binary'})), a = document.createElement('a');
    a.href = url; a.download = `last-spark-r01-${studyMode==='items'?'items-'+paint:conceptId+'-'+armStyle}.glb`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 10000);
    message.textContent = '현재 자세의 모델과 PBR 텍스처를 저장했습니다.';
  } catch (error) { message.textContent = '저장 실패: ' + error.message; console.error(error); }
  finally { button.disabled = false; }
});
function resize() { const w = host.clientWidth, h = host.clientHeight; renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); }
new ResizeObserver(resize).observe(host); resize(); initItemControls();syncStudyMode();stage('equipped');view('reset');
let last = performance.now(), measured = false;
function draw(now) {
  requestAnimationFrame(draw); const dt = Math.min((now - last) / 1000, .04); last = now;
  if (walking) animateRobot(robot, dt, {speed: 1.5});
  chestAmount=Math.abs(chestAmount-chestTarget)<.001?chestTarget:THREE.MathUtils.damp(chestAmount,chestTarget,9,dt);
  robot.salvageFrame.chestMechanism.setOpen(chestAmount);
  controls.update(); renderer.render(scene, camera);
  if (!measured) { document.querySelector('#renderStatus').textContent = 'R-01 / 3D LIVE'; measured = true; }
}
requestAnimationFrame(draw);
// Read-only inspection handles for local rendering QA.
window.robotWorkshop = {robot, scene, camera, controls, renderer, exportModel, get studyMode(){return studyMode;},get paint(){return paint;}, get conceptId(){return conceptId;}, get armStyle(){return armStyle;}, get equipment() { return equipment; }, get parts() { return parts; }};

// Render thumbnails from the actual articulated meshes with one shared renderer.
// A separate robot and scene prevent gallery generation from changing the live preview.
async function createConceptThumbnails(){
  await loadTorsoTextures();
  const {disposeRobot}=await import('./robot.js');
  const preview=createRobot(false,'player');preview.blaster.visible=false;
  preview.mixer.stopAllAction();preview.skeleton.pose();
  // Reuse the visible robot's neutral pose, including its shortened neck and relaxed thumbs.
  for(const bone of preview.bones){const source=robot.bones.find(b=>b.name===bone.name);bone.position.copy(source.position);bone.quaternion.copy(source.quaternion);}
  preview.root.position.copy(robot.root.position);preview.root.updateMatrixWorld(true);
  const thumbnailScene=new THREE.Scene();thumbnailScene.environment=scene.environment;thumbnailScene.environmentIntensity=scene.environmentIntensity;thumbnailScene.add(preview.root);
  for(const light of scene.children.filter(c=>c.isLight)){const clone=light.clone();clone.castShadow=false;thumbnailScene.add(clone);}
  const thumbnailCamera=new THREE.PerspectiveCamera(32,300/360,.01,100);thumbnailCamera.position.set(2.3,1.72,3.85);thumbnailCamera.lookAt(0,1.03,0);
  const target=new THREE.WebGLRenderTarget(300,360),buffer=new Uint8Array(300*360*4),canvas=document.createElement('canvas');canvas.width=300;canvas.height=360;
  target.texture.colorSpace=THREE.SRGBColorSpace;
  const context=canvas.getContext('2d'),flipped=new Uint8ClampedArray(buffer.length);
  try{
    const cards=[...Object.keys(EQUIPMENT_STUDIES).map(id=>({id,item:true})),...EXOSKELETON_CONCEPTS];
    for(const concept of cards){
      if(concept.item){
        const slot=EQUIPMENT[concept.id].slot;attachEquipmentStudies(preview,{[slot]:{type:concept.id}},[],{paint:'item'});
        const target=preview.salvageFrame.anchors[slot==='head'?'Head':slot==='legs'?'pelvis':'spine_03'].getWorldPosition(new THREE.Vector3());
        const distance=slot==='head'?.78:slot==='arms'?1.9:slot==='legs'?2.35:concept.id==='autoTurret'?1.85:1.35;
        if(slot==='legs')target.y-=.38;if(slot==='arms')target.y-=.18;if(slot==='chest')target.y-=.045;
        if(concept.id==='autoTurret')target.y+=.09;
        thumbnailCamera.position.copy(target).add(new THREE.Vector3(slot==='head'?.15:slot==='back'?.36:.35,.12,(slot==='back'?-1:1)*distance));thumbnailCamera.lookAt(target);
      }else{attachExoskeleton(preview,concept.id);thumbnailCamera.position.set(2.3,1.72,3.85);thumbnailCamera.lookAt(0,1.03,0);}
      preview.root.updateMatrixWorld(true);
      const oldTarget=renderer.getRenderTarget(),oldColor=renderer.getClearColor(new THREE.Color()),oldAlpha=renderer.getClearAlpha();
      try{
        renderer.setRenderTarget(target);renderer.setClearColor(0xe3e4dc,1);renderer.render(thumbnailScene,thumbnailCamera);renderer.readRenderTargetPixels(target,0,0,300,360,buffer);
      }finally{renderer.setRenderTarget(oldTarget);renderer.setClearColor(oldColor,oldAlpha);}
      for(let y=0;y<360;y++)flipped.set(buffer.subarray((359-y)*300*4,(360-y)*300*4),y*300*4);
      context.putImageData(new ImageData(flipped,300,360),0,0);
      (concept.item?document.querySelector(`#itemGrid [data-item="${concept.id}"] img`):conceptGrid.querySelector(`[data-concept="${concept.id}"] img`)).src=canvas.toDataURL('image/webp',.88);
      await new Promise(resolve=>requestAnimationFrame(resolve));
    }
    document.querySelector('#itemGalleryStatus').textContent='장비를 선택하면 현재 기체의 해당 부위에 장착됩니다. 도색은 위에서 바꿀 수 있습니다.';
    document.querySelector('#galleryStatus').textContent='일반형 팔을 장착한 10종입니다. 시안을 선택한 뒤 근접형 팔로 바꾸거나 부위를 탈착할 수 있습니다.';
  }finally{removeExoskeleton(preview);disposeRobot(preview);target.dispose();}
}
createConceptThumbnails().catch(error=>{console.error(error);document.querySelector('#galleryStatus').textContent='일부 미리보기 이미지를 만들지 못했습니다. 번호를 선택하면 3D 모델을 직접 볼 수 있습니다.';});

function syncStudyMode(){
  document.body.dataset.studyMode=studyMode;
  for(const b of document.querySelectorAll('[data-study-mode]'))b.setAttribute('aria-pressed',String(b.dataset.studyMode===studyMode));
  if(studyMode==='concepts'){
    conceptSelect.value=conceptId;
    document.querySelector('#conceptDescription').textContent=EXOSKELETON_CONCEPTS.find(c=>c.id===conceptId).summary;
  }
}
function syncItemControls(){
  for(const slot of Object.keys(EQUIPMENT_SLOTS)){
    const select=document.querySelector(`[data-item-select="${slot}"]`);if(select)select.value=equipmentTypes[slot];
    const name=document.querySelector(`[data-slot-name="${slot}"]`);if(name)name.textContent=studyMode==='items'?EQUIPMENT_STUDIES[equipmentTypes[slot]].name:{head:'헬멧',chest:'흉갑',arms:'팔 보호대',legs:'다리 외장',back:'배터리팩'}[slot];
  }
  document.querySelector('[data-slot="head"] small').textContent=studyMode==='items'?EQUIPMENT_STUDIES[equipmentTypes.head].summary:'머리를 감싸는 보호 외피';
  for(const select of document.querySelectorAll('[data-module-select]')){
    const slot=Number(select.dataset.moduleSelect),part=parts.find(p=>p.slot===slot);select.value=part?.type||'';
    document.querySelector(`[data-module="${slot}"] b`).textContent={repair:'안정화',armor:'장갑',drive:'구동',reactor:'축전',weapon:'제어',core:'코어'}[part?.type||moduleTypes[slot]];
  }
  for(const b of document.querySelectorAll('[data-item]'))b.setAttribute('aria-pressed',String(equipment[EQUIPMENT[b.dataset.item].slot]?.type===b.dataset.item&&studyMode==='items'));
  if(studyMode==='items'){
    armStyle=equipmentTypes.arms==='brawler'?'melee':'standard';
    for(const b of document.querySelectorAll('[data-arm-style]'))b.setAttribute('aria-pressed',String(b.dataset.armStyle===armStyle));
  }
}
function customize(){
  for(const b of document.querySelectorAll('[data-stage]'))b.setAttribute('aria-pressed','false');
  document.querySelector('#viewName').textContent='ITEM ASSEMBLY';
}
function chooseItem(type){
  const slot=EQUIPMENT[type].slot;studyMode='items';syncStudyMode();equipmentTypes[slot]=type;equipment[slot]={type,level:1};customize();refresh();
}
function initItemControls(){
  for(const b of document.querySelectorAll('[data-study-mode]'))b.addEventListener('click',()=>{
    studyMode=b.dataset.studyMode;syncStudyMode();refresh();
  });
  const paints=document.querySelector('#paintChoices');
  for(const [id,d]of Object.entries({item:{name:'부위별',color:'linear-gradient(135deg,#477c83 0 33%,#b4753d 33% 66%,#77805a 66%)'},...EQUIPMENT_PAINTS})){
    const b=document.createElement('button');b.dataset.paint=id;b.setAttribute('aria-label',d.name+' 도색');b.setAttribute('aria-pressed',String(id===paint));b.title=d.name;
    b.innerHTML=`<i style="background:${d.color}"></i><span>${d.name}</span>`;
    b.addEventListener('click',()=>{paint=id;studyMode='items';syncStudyMode();for(const c of paints.children)c.setAttribute('aria-pressed',String(c.dataset.paint===id));document.querySelector('#paintDescription').textContent=d.name+' 도색 · 녹슨 모서리와 벗겨진 금속';refresh();});paints.append(b);
  }
  for(const slot of Object.keys(EQUIPMENT_SLOTS)){
    const select=document.createElement('select');select.dataset.itemSelect=slot;select.className='item-select';select.setAttribute('aria-label',EQUIPMENT_SLOTS[slot]+' 아이템');
    for(const [type,d]of Object.entries(EQUIPMENT_STUDIES).filter(([type])=>EQUIPMENT[type].slot===slot)){
      const o=document.createElement('option');o.value=type;o.textContent=d.name;select.append(o);
    }
    select.addEventListener('change',()=>chooseItem(select.value));document.querySelector(`[data-slot="${slot}"]`).after(select);
  }
  const modules=document.createElement('div');modules.className='module-selects';
  for(let slot=0;slot<3;slot++){
    const select=document.createElement('select');select.dataset.moduleSelect=slot;select.setAttribute('aria-label',`모듈 ${slot+1} 종류`);
    select.innerHTML='<option value="">빈 슬롯</option>'+Object.keys(MODULE_STUDIES).map(type=>`<option value="${type}">${PARTS[type].name}</option>`).join('');
    const label=document.createElement('label');label.textContent=`0${slot+1}`;label.append(select);modules.append(label);
    select.addEventListener('change',()=>{parts=parts.filter(p=>p.slot!==slot);if(select.value){moduleTypes[slot]=select.value;parts.push({type:select.value,slot,level:1});}studyMode='items';syncStudyMode();customize();refresh();openChest(true);view('chest');});
  }
  document.querySelector('.module-slots').after(modules);
  const grid=document.querySelector('#itemGrid');
  for(const [type,d]of Object.entries(EQUIPMENT_STUDIES)){
    const b=document.createElement('button');b.dataset.item=type;b.dataset.itemSlot=EQUIPMENT[type].slot;b.setAttribute('aria-pressed','false');
    b.innerHTML=`<img alt="${d.name} 모델" width="300" height="360"><span class="concept-card-title">${d.name}</span><small>${d.summary}</small>`;
    b.addEventListener('click',()=>{chooseItem(type);openChest(false);view(EQUIPMENT[type].slot==='back'?'back':EQUIPMENT[type].slot==='head'?'detail':'reset');document.querySelector('.viewport').scrollIntoView({behavior:'smooth',block:'center'});});grid.append(b);
  }
  const filters=document.querySelector('#itemFilters');
  for(const [slot,name]of Object.entries({all:'전체 16종',...EQUIPMENT_SLOTS})){
    const b=document.createElement('button');b.textContent=name;b.setAttribute('aria-pressed',String(slot==='all'));
    b.addEventListener('click',()=>{for(const c of filters.children)c.setAttribute('aria-pressed',String(c===b));for(const card of grid.children)card.hidden=slot!=='all'&&card.dataset.itemSlot!==slot;});filters.append(b);
  }
}

import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {createRobot} from './robot.js';
import {applyFrameVisual} from './frame-preview.js';
import {frameStats} from './salvage-campaign.js';
import {EQUIPMENT,EQUIPMENT_SLOTS} from './equipment.js';
import {EQUIPMENT_STUDIES,attachEquipmentStudies} from './equipment-studies.js';
import {EQUIPMENT_PAINTS} from './exoskeleton-surface.js';
import {loadTorsoTextures} from './torso-textures.js';
import {FPS} from './motion-frame-timeline.js';
import {MOTION_STUDIES,createPreviewClock} from './robot-motion-player.js';
import {MOTION_WEAPONS,createArmedMotionSampler} from './robot-motion-weapons.js';

const $=selector=>document.querySelector(selector),host=$('#scene');
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.3;
host.append(renderer.domElement);
const scene=new THREE.Scene(),pmrem=new THREE.PMREMGenerator(renderer),room=new RoomEnvironment();
scene.environment=pmrem.fromScene(room,.04).texture;scene.environmentIntensity=.72;
room.dispose();pmrem.dispose();
scene.add(new THREE.HemisphereLight(0xe5f0e9,0x6d6957,2.3));
const key=new THREE.DirectionalLight(0xffeed1,3.5);key.position.set(-3,5,4);key.castShadow=true;
key.shadow.mapSize.set(2048,2048);key.shadow.camera.left=key.shadow.camera.bottom=-3;
key.shadow.camera.right=key.shadow.camera.top=3;key.shadow.normalBias=.014;scene.add(key);
const rim=new THREE.DirectionalLight(0xd8eef5,2.3);rim.position.set(2,3,-3);scene.add(rim);
const floor=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.ShadowMaterial({color:0x5c6852,opacity:.20}));
floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;scene.add(floor);
const grid=new THREE.GridHelper(12,48,0xb4beaa,0xc5cdbb);
grid.position.y=.001;grid.material.transparent=true;grid.material.opacity=.32;scene.add(grid);
const camera=new THREE.OrthographicCamera(-2,2,1.6,-1.6,.01,100);
const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;
controls.minZoom=.55;controls.maxZoom=3.8;controls.minPolarAngle=.15;controls.maxPolarAngle=Math.PI*.52;

const robots=[createRobot(false,'player',1),createRobot(false,'player',1)];
for(const robot of robots){
  robot.blaster.visible=false;
  applyFrameVisual(robot,frameStats({parts:[],equipment:{}}));
  scene.add(robot.root);
}
const samplers=robots.map(createArmedMotionSampler),clock=createPreviewClock();
const params=new URLSearchParams(location.search),outfit={head:'tactical',chest:'vest',arms:'marksman',legs:'runner',back:'batteryPack'};
let paint=params.get('paint')||'item';if(paint!=='item'&&!EQUIPMENT_PAINTS[paint])paint='item';
for(const slot of Object.keys(outfit))if(params.has(slot)){
  const type=params.get(slot);if(type==='none')outfit[slot]='';else if(EQUIPMENT[type]?.slot===slot)outfit[slot]=type;
}
const parts=['drive','reactor','weapon'].map((type,slot)=>({type,slot,level:1}));
// One baseline, measured on the bare idle pose; no per-frame foot snapping.
const footBounds=new THREE.Box3();
for(const bone of robots[0].bones.filter(b=>/^foot_[lr]$/.test(b.name)))bone.traverseVisible(o=>{
  if(!o.isMesh)return;
  if(!o.geometry.boundingBox)o.geometry.computeBoundingBox();
  footBounds.union(o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld));
});
for(const robot of robots)robot.root.position.y=-footBounds.min.y+.006;
const jointHelpers=robots.map(robot=>{
  const helper=new THREE.SkeletonHelper(robot.motion);helper.visible=false;
  helper.material.depthTest=false;helper.material.transparent=true;helper.material.opacity=.7;
  helper.renderOrder=9;scene.add(helper);return helper;
});
let display='equipped',view='three',lastFrame=0;

for(const [id,name]of Object.entries(MOTION_WEAPONS))$('#weapon').add(new Option(name,id));
$('#weapon').value=MOTION_WEAPONS[params.get('weapon')]?params.get('weapon'):'pistol';
samplers.forEach(s=>s.setWeapon($('#weapon').value));
$('#weapon').addEventListener('change',e=>{
  samplers.forEach(s=>s.setWeapon(e.target.value));selectMotion(samplers[0].study.id);
});
function setAim(value){
  $('#aim').checked=value;samplers.forEach(s=>s.setAim(value));lastFrame=0;syncFrame();
}
$('#aim').addEventListener('change',e=>setAim(e.target.checked));
controls.mouseButtons.RIGHT=null;
let heldAim=false,previousAim=false;
renderer.domElement.addEventListener('contextmenu',e=>e.preventDefault());
renderer.domElement.addEventListener('pointerdown',e=>{
  if(e.button!==2)return;e.preventDefault();previousAim=$('#aim').checked;heldAim=true;setAim(true);
});
function releaseAim(){if(heldAim){heldAim=false;setAim(previousAim);}}
window.addEventListener('pointerup',e=>{if(e.button===2)releaseAim();});
window.addEventListener('pointercancel',releaseAim);window.addEventListener('blur',releaseAim);


function equip(){
  const equipment=Object.fromEntries(Object.entries(outfit).filter(([,type])=>type).map(([slot,type])=>[slot,{type,level:1}]));
  attachEquipmentStudies(robots[1],equipment,parts,{paint});
  samplers[1].sample(clock.frame);
}
for(const [slot,label]of Object.entries(EQUIPMENT_SLOTS)){
  const wrapper=document.createElement('label');wrapper.textContent=label;
  const select=document.createElement('select');select.setAttribute('aria-label',label+' 장비');
  select.add(new Option('장착 안 함',''));
  for(const [id,item]of Object.entries(EQUIPMENT_STUDIES))if(EQUIPMENT[id].slot===slot)select.add(new Option(item.name,id));
  select.value=outfit[slot];wrapper.append(select);$('#equipment').append(wrapper);
  select.addEventListener('change',()=>{outfit[slot]=select.value;equip();});
}
for(const [index,motion]of MOTION_STUDIES.entries()){
  $('#motionSelect').add(new Option(motion.name,motion.id));
  const button=document.createElement('button');button.dataset.motion=motion.id;
  button.innerHTML=`${motion.name}<span>${String(index+1).padStart(2,'0')}</span>`;
  button.addEventListener('click',()=>selectMotion(motion.id));$('#motions').append(button);
}
$('#motionSelect').addEventListener('change',e=>selectMotion(e.target.value));
function syncFrame(){
  const frame=clock.frame;$('#frame').value=frame;$('#scrub').value=frame;
  const active=clock.playing;
  $('#play').innerHTML=active?'Ⅱ <span>일시정지</span>':'▶ <span>재생</span>';
  $('#play').setAttribute('aria-label',active?'일시정지':'재생');
  $('#status').textContent=active?'● REPLAY / 30 FPS':'Ⅱ PAUSED / 30 FPS';
  if(frame!==lastFrame){samplers.forEach(s=>s.sample(frame));lastFrame=frame;}
}
function selectMotion(id){
  if($('#weapon').value==='rapid'&&id==='sprint')id='walk';
  const walkingOnly=$('#weapon').value==='rapid';
  document.querySelector('[data-motion="sprint"]').disabled=walkingOnly;
  $('#motionSelect').querySelector('option[value="sprint"]').disabled=walkingOnly;
  samplers.forEach(s=>s.select(id));clock.reset(samplers[0].frames);lastFrame=0;
  clock.rate=id==='sprint'?.9:1;$('#rate').value=String(clock.rate);
  const motion=samplers[0].study;
  $('#motionSelect').value=id;
  $('#motionName').textContent=motion.name;$('#motionNote').textContent=walkingOnly?'미니건은 걷기만 가능합니다. 뒤쪽 손잡이와 위쪽 손잡이의 양손 파지를 살펴보세요.':motion.note;
  $('#motionNumber').textContent=String(MOTION_STUDIES.indexOf(motion)+1).padStart(2,'0');
  $('#frame').max=$('#scrub').max=clock.total;
  $('#total').textContent='/ '+clock.total;$('#lastFrame').textContent=clock.total;
  $('#duration').textContent=`30 FPS · ${(clock.total/FPS).toFixed(2)}초 · 반복`;
  for(const button of document.querySelectorAll('[data-motion]'))button.setAttribute('aria-pressed',String(button.dataset.motion===id));
  syncFrame();
}
function seek(frame){clock.playing=false;clock.seek(frame);syncFrame();}
$('#play').addEventListener('click',()=>{clock.playing=!clock.playing;syncFrame();});
$('#previous').addEventListener('click',()=>{clock.step(-1);syncFrame();});
$('#next').addEventListener('click',()=>{clock.step(1);syncFrame();});
$('#frame').addEventListener('change',e=>seek(Number(e.target.value)));
$('#frame').addEventListener('input',e=>{if(e.target.value!=='')seek(Number(e.target.value));});
$('#frame').addEventListener('focus',()=>{clock.playing=false;syncFrame();});
$('#scrub').addEventListener('input',e=>seek(Number(e.target.value)));
$('#rate').addEventListener('change',e=>clock.rate=Number(e.target.value));
document.addEventListener('keydown',e=>{
  if(e.target.closest('input,select,textarea,button,summary,a')||e.altKey||e.ctrlKey||e.metaKey)return;
  if(e.code==='Space'){e.preventDefault();clock.playing=!clock.playing;syncFrame();}
  if(e.code==='ArrowLeft'||e.code==='ArrowRight'){e.preventDefault();clock.step(e.code==='ArrowLeft'?-1:1);syncFrame();}
});
function frameCamera(){
  const aspect=host.clientWidth/Math.max(1,host.clientHeight);
  const height=Math.max(3.05,(display==='compare'?3.1:1.8)/aspect);
  camera.left=-height*aspect/2;camera.right=height*aspect/2;camera.top=height/2;camera.bottom=-height/2;
  camera.updateProjectionMatrix();
}
function setView(name){
  view=name;camera.zoom=name==='hands'?2.8:name==='upper'?1.8:name==='feet'?2.15:1;
  const y=name==='upper'?1.67:name==='feet'?.36:1.12;
  controls.target.set(0,y,0);
  if(name==='hands'){const robot=robots[display==='bare'?0:1];controls.target.copy(robot.arms[0].hand.getWorldPosition(new THREE.Vector3())).add(robot.arms[1].hand.getWorldPosition(new THREE.Vector3())).multiplyScalar(.5);}
  const offsets={three:[3,.95,5],front:[0,.12,5],side:[5,.12,0],back:[0,.12,-5],upper:[1.3,.2,5],hands:[-3,.4,4],feet:[3,1.2,5]};
  camera.position.copy(controls.target).add(new THREE.Vector3(...offsets[name]));
  controls.update();frameCamera();
  for(const button of document.querySelectorAll('[data-view]'))button.setAttribute('aria-pressed',String(button.dataset.view===name));
}
for(const button of document.querySelectorAll('[data-view]'))button.addEventListener('click',()=>setView(button.dataset.view));
function updateVisibility(){
  robots[0].root.visible=display!=='equipped';robots[1].root.visible=display!=='bare';
  jointHelpers.forEach((h,i)=>h.visible=$('#joints').checked&&robots[i].root.visible);
}
for(const button of document.querySelectorAll('[data-display]'))button.addEventListener('click',()=>{
  display=button.dataset.display;
  for(const b of document.querySelectorAll('[data-display]'))b.setAttribute('aria-pressed',String(b===button));
  $('.compare-labels').hidden=display!=='compare';updateVisibility();setView(view);
});
$('#joints').addEventListener('change',updateVisibility);
function resize(){renderer.setSize(host.clientWidth,host.clientHeight);frameCamera();}
new ResizeObserver(resize).observe(host);
equip();selectMotion('walk');updateVisibility();setView('three');resize();
if(matchMedia('(prefers-reduced-motion: reduce)').matches){clock.playing=false;syncFrame();}
await loadTorsoTextures();
let previous=performance.now();
document.addEventListener('visibilitychange',()=>previous=performance.now());
const side=new THREE.Vector3();
function draw(now){
  requestAnimationFrame(draw);
  const dt=Math.min((now-previous)/1000,.1);previous=now;
  const frame=clock.update(dt);if(frame!==lastFrame)syncFrame();
  controls.update();
  // Keep the comparison side by side even in a true side view; poses stay identical.
  side.set(1,0,0).applyQuaternion(camera.quaternion);side.y=0;side.normalize();
  robots.forEach((robot,i)=>{
    const offset=display==='compare'?(i===0?-.80:.80):0;
    robot.root.position.x=side.x*offset;robot.root.position.z=side.z*offset;
  });
  renderer.render(scene,camera);
}
requestAnimationFrame(draw);
window.robotMotion={scene,camera,renderer,controls,robots,samplers,clock,get outfit(){return {...outfit};},get display(){return display;}};

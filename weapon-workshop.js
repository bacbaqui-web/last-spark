import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {createWeaponModel} from './weapon-models.js';
import {RECLAIMED_GUNS} from './reclaimed-weapons.js';
import {createRobot} from './robot.js';
import {applyFrameVisual} from './frame-preview.js';
import {frameStats} from './salvage-campaign.js';
import {attachEquipmentStudies} from './equipment-studies.js';
import {loadTorsoTextures} from './torso-textures.js';
import {createMotionSampler} from './robot-motion-player.js';

const $=s=>document.querySelector(s),host=$('#scene'),ids=Object.keys(RECLAIMED_GUNS);
const renderer=new T.WebGLRenderer({antialias:true,alpha:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;host.append(renderer.domElement);
const scene=new T.Scene(),pmrem=new T.PMREMGenerator(renderer),room=new RoomEnvironment();scene.environment=pmrem.fromScene(room,.04).texture;room.dispose();pmrem.dispose();scene.environmentIntensity=.85;
scene.add(new T.HemisphereLight(0xe3eadd,0x757d65,2.0));const key=new T.DirectionalLight(0xfff1db,3.4);key.position.set(-1.5,3,3);key.castShadow=true;key.shadow.mapSize.set(2048,2048);key.shadow.camera.left=key.shadow.camera.bottom=-3;key.shadow.camera.right=key.shadow.camera.top=3;key.shadow.normalBias=.004;scene.add(key);const rim=new T.DirectionalLight(0xd5e6f1,2);rim.position.set(2,2,-2);scene.add(rim);
const floor=new T.Mesh(new T.PlaneGeometry(200,200),new T.ShadowMaterial({color:0x5c684f,opacity:.19}));floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;scene.add(floor);
const camera=new T.OrthographicCamera(-1,1,1,-1,.01,30),controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.minZoom=.55;controls.maxZoom=4;controls.maxPolarAngle=Math.PI*.66;
const holder=new T.Group();holder.rotation.y=Math.PI/2;scene.add(holder);
const models=Object.fromEntries(ids.map(id=>{const model=createWeaponModel(id),center=new T.Box3().setFromObject(model).getCenter(new T.Vector3());model.position.sub(center);model.visible=false;holder.add(model);return [id,model];}));

const robot=createRobot(false,'player',1);applyFrameVisual(robot,frameStats({parts:[],equipment:{}}));createMotionSampler(robot).sample(1);
attachEquipmentStudies(robot,{head:{type:'tactical'},chest:{type:'vest'},arms:{type:'marksman'},legs:{type:'runner'},back:{type:'batteryPack'}},['drive','reactor','weapon'].map((type,slot)=>({type,slot,level:1})),{paint:'item'});robot.blaster.visible=false;robot.root.updateMatrixWorld(true);
function visibleBounds(object){const bounds=new T.Box3();object.traverseVisible(o=>{if(o.isMesh){o.geometry.computeBoundingBox();bounds.union(o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld));}});return bounds;}
const robotBounds=visibleBounds(robot.root),robotHeight=robotBounds.max.y-robotBounds.min.y;robot.root.position.set(-.61,-robotBounds.min.y+.005,0);robot.root.visible=false;scene.add(robot.root);loadTorsoTextures().catch(error=>console.warn('흉갑 텍스처를 불러오지 못했습니다.',error));
// 10 cm ticks have real world dimensions, shared by the gun and the robot.
const ticks=new T.Group(),tickMat=new T.LineBasicMaterial({color:0xa2af95});for(let i=0;i<=20;i++){const y=i*.1,g=new T.BufferGeometry().setFromPoints([new T.Vector3(-1,y,0),new T.Vector3(-1+(i%5===0?.08:.035),y,0)]);ticks.add(new T.Line(g,tickMat));}ticks.visible=false;scene.add(ticks);
let selected=ids.includes(new URLSearchParams(location.search).get('weapon'))?new URLSearchParams(location.search).get('weapon'):'pistol',mode='weapon',view='angle';
function fit(){const aspect=host.clientWidth/host.clientHeight,height=mode==='scale'?Math.max(2.55,2.18/aspect):Math.max(.85,1.32/aspect);camera.left=-height*aspect/2;camera.right=height*aspect/2;camera.top=height/2;camera.bottom=-height/2;camera.updateProjectionMatrix();}
function setView(next='angle'){
 view=next;camera.zoom=1;const target=mode==='scale'?new T.Vector3(-.02,1.01,0):new T.Vector3(0,.30,0);
 camera.position.copy(target).add(view==='side'?new T.Vector3(0,.06,3):mode==='scale'?new T.Vector3(.55,.16,3):new T.Vector3(.72,.48,2));controls.target.copy(target);controls.update();fit();
}
function setMode(next){mode=next;robot.root.visible=ticks.visible=mode==='scale';holder.position.set(mode==='scale'?.48:0,mode==='scale'?1.16:.30,0);holder.rotation.y=Math.PI/2;$('#scaleNote').textContent=mode==='scale'?'기체와 동일 배율 · 눈금 10 cm':'8종 공통 배율';for(const b of document.querySelectorAll('[data-mode]'))b.setAttribute('aria-pressed',String(b.dataset.mode===mode));setView();}
function select(id){
 selected=id;$('#weaponChoice').value=id;for(const [key,m]of Object.entries(models))m.visible=key===id;const spec=RECLAIMED_GUNS[id],model=models[id],[w,,l]=model.userData.dimensions;let triangles=0,draws=0;model.traverse(o=>{if(o.isMesh){triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;draws++;}});
 $('#name').textContent=spec.name;$('#code').textContent=spec.code;$('#index').textContent=String(ids.indexOf(id)+1).padStart(2,'0')+' / 08';$('#role').textContent=spec.role;$('#note').textContent=spec.note;
 $('#length').textContent=(l*100).toFixed(1)+' cm';$('#width').textContent=(w*100).toFixed(1)+' cm';$('#ratio').textContent=Math.round(l/robotHeight*100)+'%';$('#stats').textContent=triangles.toLocaleString()+' triangles · '+draws+' mesh';$('#motionLink').href='./robot-motion.html?weapon='+id;
 for(const b of document.querySelectorAll('[data-weapon]'))b.setAttribute('aria-pressed',String(b.dataset.weapon===id));history.replaceState(null,'','?weapon='+id);
}
for(const id of ids)$('#weaponChoice').add(new Option(RECLAIMED_GUNS[id].name,id));$('#weaponChoice').onchange=e=>select(e.target.value);
for(const b of document.querySelectorAll('[data-mode]'))b.addEventListener('click',()=>setMode(b.dataset.mode));$('#side').onclick=()=>setView('side');$('#angle').onclick=()=>setView('angle');$('#reset').onclick=()=>setView(view);
$('#wire').onchange=e=>{for(const m of Object.values(models))m.traverse(o=>{if(o.isMesh)for(const mat of [o.material].flat())mat.wireframe=e.target.checked;});};

// Thumbnails come from these exact mesh instances, with one fixed camera scale.
// Only one extra renderer is used and it is disposed after all eight captures.
function buildCatalog(){
 const preview=new T.WebGLRenderer({antialias:true,alpha:true});preview.setSize(560,274);preview.setPixelRatio(1);preview.toneMapping=renderer.toneMapping;preview.toneMappingExposure=renderer.toneMappingExposure;
 const thumbScene=new T.Scene();thumbScene.environment=scene.environment;thumbScene.environmentIntensity=.85;for(const l of scene.children.filter(o=>o.isLight)){const copy=l.clone();copy.castShadow=false;thumbScene.add(copy);}
 const c=new T.OrthographicCamera(-.67,.67,.328,-.328,.01,20);c.position.set(.25,.35,2.5);c.lookAt(0,0,0);
 for(const [i,id]of ids.entries()){
  const group=new T.Group(),model=models[id].clone();model.visible=true;group.rotation.y=Math.PI/2;group.add(model);thumbScene.add(group);preview.render(thumbScene,c);
  const button=document.createElement('button');button.className='gun-card';button.dataset.weapon=id;button.setAttribute('aria-pressed',String(id===selected));button.setAttribute('aria-label',RECLAIMED_GUNS[id].name+' 선택');
  const image=new Image();image.src=preview.domElement.toDataURL('image/png');image.alt=RECLAIMED_GUNS[id].name+' 3D 모델';button.append(image);
  const spec=RECLAIMED_GUNS[id];button.insertAdjacentHTML('beforeend',`<span class="card-id">${String(i+1).padStart(2,'0')}</span><span class="card-length">${(models[id].userData.dimensions[2]*100).toFixed(0)} cm</span><span class="card-label"><strong>${spec.name}</strong><span>${spec.code}</span></span>`);
  button.onclick=()=>{select(id);$('.workspace').scrollIntoView({behavior:'smooth',block:'start'});};$('#guns').append(button);thumbScene.remove(group);
 }
 preview.dispose();preview.forceContextLoss();
}
function effects(time){
 const model=models[selected],active=$('#active').checked,charge=active?.65+.35*Math.sin(time*2):0;
 if(model.userData.rotor)model.userData.rotor.rotation.z=active?time*9:0;
 if(model.userData.pilotFlame)model.userData.pilotFlame.scale.setScalar(active?1.4+.2*Math.sin(time*24):.8);
 for(const [i,cell]of (model.userData.chargeRings||[]).entries()){const lit=active&&i<=Math.floor(charge*5);cell.material.color.setHex(lit?0x65e8ff:0x37424c);cell.material.emissiveIntensity=lit?2:.08;}
 for(const {vent,spill}of model.userData.chargeVents||[]){vent.material.emissiveIntensity=charge*2;spill.visible=active;}
 if(model.userData.chargeGlowMaterial)model.userData.chargeGlowMaterial.opacity=charge*.14;
 if(model.userData.chargeLight)model.userData.chargeLight.intensity=charge*.55;
}
new ResizeObserver(()=>{renderer.setSize(host.clientWidth,host.clientHeight);fit();}).observe(host);
buildCatalog();setMode('weapon');select(selected);let last=performance.now();renderer.setAnimationLoop(time=>{const dt=Math.min((time-last)/1000,.05);last=time;if($('#auto').checked)holder.rotation.y+=dt*.3;controls.update();effects(time/1000);renderer.render(scene,camera);});
window.weaponWorkshop={scene,renderer,camera,controls,models,robot,robotHeight,holder,select,setMode,setView,get selected(){return selected;},get mode(){return mode;}};

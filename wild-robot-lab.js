import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {loadWildTemplate,createWildEnemy,animateWildEnemy,animateWildAttack,fireWildEnemy,dieWildEnemy,disposeWildEnemy,resetWildDestruction} from './wild-enemy-models.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';

const $=id=>document.getElementById(id);
const base=new URL('./models/wild-robots-v1/',document.baseURI);
const conceptBase=new URL('./output/imagegen/wild-robots-2026-10-08/refined-v2/',document.baseURI);
const descriptions={
  'rust-wasp-drone':'큰 보호 링 프로펠라 2개, 붉은 외눈, 접힌 여섯 다리와 앞으로 말린 배 총구를 가진 말벌형 드론입니다. 게임의 정찰 드론과 드론 보스에 적용했습니다. 프로펠라 회전·체공·사격을 확인할 수 있습니다.',
  'rust-scout':'큰 상자형 외눈 머리, 두 다리의 역관절, 짧은 팔 기관총과 집게손을 살렸습니다.',
  'forest-warden':'좁은 골반 양옆에서 다리가 이어지는 중장갑 기체입니다. 왼손 포로 원거리 사격하고 가까이 오면 오른팔 집게로 내려찍습니다. 공격 미리보기에서 두 동작을 번갈아 보여 줍니다.',
  'iron-beetle':'낮은 몸체 위에 갈라진 등껍질을 올리고, 여섯 다리와 앞쪽 충돌 장갑을 배치했습니다.',
  'wall-sniper-spider':'여덟 개의 긴 다리, 벽면 고정 패드와 집게발, 등 위 회전식 저격총을 갖췄습니다.',
  'assault-mantis':'상완·하완·손목을 나눈 3단 팔입니다. 양쪽 칼등은 위로, 절삭날은 아래로 향하며, 공격할 때 들어 올려 수직으로 내려칩니다.'
};
const scene=new THREE.Scene();scene.background=new THREE.Color('#171e15');
const camera=new THREE.PerspectiveCamera(38,1,.015,100);
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
$('viewport').prepend(renderer.domElement);
renderer.domElement.setAttribute('aria-label','회전과 확대가 가능한 실제 3D 로봇 메쉬');
renderer.domElement.setAttribute('role','img');
const envGenerator=new THREE.PMREMGenerator(renderer),room=new RoomEnvironment();
const environment=envGenerator.fromScene(room,.04);scene.environment=environment.texture;scene.environmentIntensity=.5;
room.dispose();envGenerator.dispose();
scene.add(new THREE.HemisphereLight(0xcce5bb,0x303428,.65));
const key=new THREE.DirectionalLight(0xffe5c3,2.8);key.position.set(4,7,6);key.castShadow=true;
key.shadow.mapSize.set(2048,2048);key.shadow.camera.left=-5;key.shadow.camera.right=5;key.shadow.camera.top=6;key.shadow.camera.bottom=-5;key.shadow.normalBias=.015;key.shadow.bias=-.0001;scene.add(key);
const fill=new THREE.DirectionalLight(0xc2d9ff,.85);fill.position.set(-5,3,3);scene.add(fill);
const rim=new THREE.DirectionalLight(0xedffc9,1.6);rim.position.set(1,4,-5);scene.add(rim);
const ground=new THREE.Mesh(new THREE.PlaneGeometry(30,30),new THREE.MeshStandardMaterial({color:0x293423,roughness:.95}));ground.rotation.x=-Math.PI/2;ground.position.y=-.012;ground.receiveShadow=true;scene.add(ground);
const grid=new THREE.GridHelper(12,24,0x5d704c,0x394830);grid.position.y=-.005;grid.material.transparent=true;grid.material.opacity=.27;scene.add(grid);
const wall=new THREE.Mesh(new THREE.BoxGeometry(.12,4.3,3.7),new THREE.MeshStandardMaterial({color:0x68705d,roughness:1}));wall.position.set(-.075,2.1,0);wall.receiveShadow=true;wall.castShadow=true;wall.visible=false;scene.add(wall);
const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.075;controls.minDistance=.5;controls.maxDistance=16;controls.maxPolarAngle=Math.PI*.51;controls.autoRotateSpeed=.8;
let selected=null,model=null,robot=null,request=0,wire=false,clay=false,wallPose=false,motionAge=0;let motionMode='walk',shotAge=null,pointerStart=null,slowDeath=false;
const clayMaterial=new THREE.MeshStandardMaterial({color:0xaab6a0,roughness:.55,metalness:.12});

function resize(){const rect=$('viewport').getBoundingClientRect();renderer.setSize(rect.width,rect.height,false);camera.aspect=rect.width/rect.height;camera.updateProjectionMatrix();}
new ResizeObserver(resize).observe($('viewport'));resize();
function setPressed(id,value){$(id).setAttribute('aria-pressed',String(value));}
function appearance(){if(!model)return;for(const o of robot.hitMeshes){o.material=clay?clayMaterial:o.userData.originalMaterial;for(const m of[].concat(o.material))m.wireframe=wire;}}
function fit(){
  if(!model)return;const box=new THREE.Box3().setFromObject(robot.asset);
  // Leave room for the wider running stride, especially the front insect feet.
  box.expandByVector(new THREE.Vector3(.12,.14,robot.spec.count?.22:.32));
  // The mantis raises its new wrist-mounted blades above the neutral silhouette.
  if(robot.wildId==='assault-mantis'&&motionMode==='attack')box.expandByPoint(model.localToWorld(new THREE.Vector3(0,3.55,.8)));
  if(['death','shot'].includes(motionMode))box.union(new THREE.Box3(new THREE.Vector3(-2.1,0,-2.1),new THREE.Vector3(2.1,wallPose?4.5:3.5,2.1)));
  const size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());
  const radius=Math.max(size.y,size.x/Math.max(.65,camera.aspect),size.z*.85)*.69;
  const distance=radius/Math.tan(THREE.MathUtils.degToRad(camera.fov/2));
  controls.target.copy(center);camera.position.copy(center).add(new THREE.Vector3(.63,.32,1).normalize().multiplyScalar(distance));
  controls.update();controls.saveState();
}
function pose(){
  if(!model)return;model.position.set(0,0,0);robot.mount.rotation.set(0,0,0);robot.wallMounted=wallPose;wall.visible=wallPose;
  if(wallPose){robot.mount.rotation.z=-Math.PI/2;model.position.y=1.65;}
  fit();
}
async function select(info){
  const token=++request;selected=info;wallPose=false;setPressed('wall',false);$('wall').disabled=info.id!=='wall-sniper-spider';wall.visible=false;
  $('loading').hidden=false;$('status').textContent='메쉬와 텍스처 로딩 중';$('error').textContent='';
  for(const button of $('models').children)button.setAttribute('aria-pressed',String(button.dataset.model===info.id));
  for(const [value,label] of Object.entries(info.id==='rust-wasp-drone'?{idle:'체공',walk:'순항',run:'고속 비행'}:{idle:'대기',walk:'걷기',run:'달리기'}))$('motion').querySelector(`option[value="${value}"]`).textContent=label;
  $('name').textContent=info.name;$('role').textContent=info.role;$('description').textContent=descriptions[info.id];
  $('reference').src=new URL(info.id==='rust-wasp-drone'?info.concept.replace(/^\//,''):info.concept,info.id==='rust-wasp-drone'?document.baseURI:conceptBase).href;$('reference').alt=info.name+' 2차 디자인 원본';$('reference-link').href=$('reference').src;
  $('download').href=new URL(info.glb,base).href;$('download').download=info.glb;
  try{
    await loadWildTemplate(info.id);if(token!==request)return;
    if(robot)disposeWildEnemy(robot);robot=createWildEnemy(info.id,{scale:1});model=robot.root;
    model.traverse(o=>{if(o.isMesh)o.userData.originalMaterial=o.material;});
    motionAge=0;shotAge=null;scene.add(model);pose();appearance();
    $('triangles').textContent=info.triangles.toLocaleString('ko-KR')+' 삼각형';$('assemblies').textContent=info.rigidAssemblies+'개 기계식 파츠';
    $('status').textContent=info.id==='rust-wasp-drone'?'게임 적용 · 체공 / 사격':motionMode==='shot'?'로봇의 부위를 클릭해 보세요':'게임 적용 · 검은 파츠 흩어짐';$('viewport').dataset.model=info.id;$('viewport').dataset.status='ready';$('loading').hidden=true;
  }catch(error){if(token!==request)return;$('loading').textContent='모델을 불러오지 못했습니다.';$('status').textContent='로드 실패';$('error').textContent=error.message;$('viewport').dataset.status='error';console.error(error);}
}
$('home').addEventListener('click',fit);
$('spin').addEventListener('click',()=>{controls.autoRotate=!controls.autoRotate;setPressed('spin',controls.autoRotate);});
$('wire').addEventListener('click',()=>{wire=!wire;setPressed('wire',wire);appearance();});
$('clay').addEventListener('click',()=>{clay=!clay;setPressed('clay',clay);appearance();});
$('wall').addEventListener('click',()=>{if(selected?.id!=='wall-sniper-spider')return;resetWildDestruction(robot);motionAge=0;shotAge=null;wallPose=!wallPose;setPressed('wall',wallPose);pose();});
$('motion').addEventListener('change',()=>{motionMode=$('motion').value;motionAge=0;shotAge=null;$('replay-death').hidden=$('slow-death').hidden=!['death','shot'].includes(motionMode);$('replay-death').textContent=motionMode==='shot'?'로봇 복구':'다시 파괴';$('status').textContent=selected?.id==='rust-wasp-drone'?'게임 적용 · 체공 / 사격':motionMode==='shot'?'로봇의 부위를 클릭해 보세요':'게임 적용 · 검은 파츠 흩어짐';document.querySelector('.gesture').textContent=motionMode==='shot'?'몸을 클릭 · 피격 파괴 / 드래그 · 회전':'드래그 · 회전 / 휠 · 확대 / 우클릭 · 이동';if(robot){resetWildDestruction(robot);animateWildEnemy(robot,0);fit();}});
$('replay-death').addEventListener('click',()=>{if(robot)resetWildDestruction(robot);motionAge=0;shotAge=null;});
$('slow-death').addEventListener('click',()=>{slowDeath=!slowDeath;setPressed('slow-death',slowDeath);});
renderer.domElement.addEventListener('pointerdown',event=>{pointerStart=event.button===0?{x:event.clientX,y:event.clientY}:null;});
renderer.domElement.addEventListener('pointerup',event=>{
  const start=pointerStart;pointerStart=null;
  if(!start||motionMode!=='shot'||!robot||robot.destruction||Math.hypot(event.clientX-start.x,event.clientY-start.y)>5)return;
  const rect=renderer.domElement.getBoundingClientRect(),ray=new THREE.Raycaster();
  ray.setFromCamera(new THREE.Vector2((event.clientX-rect.left)/rect.width*2-1,1-(event.clientY-rect.top)/rect.height*2),camera);model.updateMatrixWorld(true);
  const hit=ray.intersectObjects(robot.hitMeshes,false)[0];if(!hit)return;
  robot.recordImpact(hit.point,ray.ray.direction,1,hit.object);shotAge=0;dieWildEnemy(robot,0);$('status').textContent='즉시 파괴 · 검은 파츠가 사방으로 흩어집니다';$('viewport').dataset.hitPoint=hit.point.toArray().map(v=>v.toFixed(3)).join(',');$('viewport').dataset.hitPart=hit.object.name;
});
const clock=new THREE.Clock();
function animate(){requestAnimationFrame(animate);const dt=Math.min(.05,clock.getDelta());if(document.hidden)return;
  if(robot){const mode=motionMode,motionDt=slowDeath&&['death','shot'].includes(mode)?dt*.35:dt;motionAge+=motionDt;
    if(mode==='death'){const age=motionAge%(robot.deathDuration+.75);if(age<.55){resetWildDestruction(robot);animateWildEnemy(robot,dt);}else dieWildEnemy(robot,age-.55);$('viewport').dataset.deathAge=Math.max(0,age-.55).toFixed(3);}
    else if(mode==='shot'){if(shotAge===null)animateWildEnemy(robot,dt);else{shotAge+=motionDt;dieWildEnemy(robot,shotAge);if(shotAge>robot.deathDuration+.3){resetWildDestruction(robot);shotAge=null;$('status').textContent='로봇의 부위를 클릭해 보세요';}}$('viewport').dataset.deathAge=(shotAge??0).toFixed(3);}
    else{animateWildEnemy(robot,dt,{speed:mode==='walk'?2.3:mode==='run'?6:0,aim:mode==='attack'?1:0,hit:mode==='hit'?Math.max(0,.3-(motionAge%1.2)):0});
      if(mode==='attack'){if(robot.wildId==='forest-warden'&&motionAge%4>=2){animateWildAttack(robot,Math.max(0,.65-((motionAge-2)%2)));}else if(['rust-scout','wall-sniper-spider','forest-warden','rust-wasp-drone'].includes(robot.wildId)){if(Math.floor(motionAge/.8)!==Math.floor((motionAge-dt)/.8))fireWildEnemy(robot);if(['wall-sniper-spider','forest-warden'].includes(robot.wildId))robot.aimAt(new THREE.Vector3(2,wallPose?1.2:.6,9));}
        else if(robot.wildId==='iron-beetle'){const t=(motionAge%1.8)/1.8;robot.motion.position.y=Math.sin(t*Math.PI)*.35;robot.motion.rotation.x=-Math.sin(t*Math.PI)*.25;}
        else animateWildAttack(robot,Math.max(0,.65-(motionAge%1.25)));}
    }
    $('viewport').dataset.failure=robot.destruction?'burst':'none';$('viewport').dataset.motion=mode;$('viewport').dataset.muzzleFlash=robot.muzzleFlash.visible?'on':'off';$('viewport').dataset.aim=robot.aimBlend.toFixed(2);$('viewport').dataset.phase=robot.phase.toFixed(3);$('viewport').dataset.electric=robot.destruction?.fx?.arcs.visible?'on':'off';
    $('viewport').dataset.destructionStage=!robot.destruction?'intact':robot.destruction.group.visible?'burst':'finished';
  }controls.update();renderer.render(scene,camera);
}animate();
try{
  const response=await fetch(new URL('manifest.json',base));if(!response.ok)throw Error('모델 목록을 불러오지 못했습니다.');const manifest=await response.json();
  for(const info of manifest.models){const button=document.createElement('button');button.type='button';button.dataset.model=info.id;button.setAttribute('aria-pressed','false');button.setAttribute('aria-label',info.name+' 선택');
    const img=document.createElement('img');img.src=new URL(info.preview,base).href;img.alt='';const label=document.createElement('span'),strong=document.createElement('strong'),small=document.createElement('small');strong.textContent=info.name;small.textContent=info.role;label.append(strong,small);button.append(img,label);button.addEventListener('click',()=>select(info));$('models').append(button);}
  if(!manifest.models.length)throw Error('완료된 모델이 없습니다.');await select(manifest.models[0]);
}catch(error){$('status').textContent='불러오기 실패';$('error').textContent=error.message;$('loading').textContent=error.message;}

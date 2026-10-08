import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {fleet,createFleetVehicle} from './vehicle-fleet-models.js';
import {VEHICLE_PAINTS,vehiclePaint} from './vehicle-paints.js';

const $=selector=>document.querySelector(selector);
const canvas=$('canvas'),viewport=$('#viewport');
const renderer=new T.WebGLRenderer({canvas,antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
renderer.outputColorSpace=T.SRGBColorSpace;
renderer.toneMapping=T.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.05;
const scene=new T.Scene();
scene.background=new T.Color('#727b70');
scene.add(new T.HemisphereLight(0xe4edf0,0x484932,2));
const sun=new T.DirectionalLight(0xfff0d9,2.3);
sun.position.set(-8,12,6);scene.add(sun);
const floor=new T.Mesh(new T.PlaneGeometry(90,65),new T.MeshStandardMaterial({color:'#727668',roughness:1}));
floor.rotation.x=-Math.PI/2;floor.position.y=-.02;scene.add(floor);
const camera=new T.OrthographicCamera(-10,10,10,-10,.1,160);
const controls=new OrbitControls(camera,canvas);
controls.enableDamping=false;controls.maxPolarAngle=Math.PI*.49;
controls.addEventListener('change',render);
const meshes=fleet.map(d=>createFleetVehicle(d));
const colorVariants=new Map(),box=new T.Box3(),target=new T.Vector3();
let selected=-1,mode='all',visibleMeshes=meshes,labels=[],currentView='perspective';
meshes.forEach(m=>scene.add(m));

function render(){
 renderer.render(scene,camera);
 for(const {mesh,element} of labels){
  const position=mesh.position.clone();position.y=-.1;position.z+=fleet[selected]?.length/2||2.8;
  position.project(camera);
  element.style.left=`${(position.x*.5+.5)*viewport.clientWidth}px`;
  element.style.top=`${(-position.y*.5+.5)*viewport.clientHeight}px`;
  element.hidden=Math.abs(position.x)>1||Math.abs(position.y)>1||position.z>1;
 }
}

function fit(view=currentView){
 currentView=view;box.makeEmpty();visibleMeshes.forEach(m=>box.expandByObject(m));box.getCenter(target);
 controls.target.copy(target);
 const delta=view==='front'?new T.Vector3(0,.001,1):view==='side'?new T.Vector3(-1,.001,0):view==='top'?new T.Vector3(0,1,.001):mode==='single'?new T.Vector3(-1,.62,1):new T.Vector3(-.32,.85,1);
 camera.position.copy(target).addScaledVector(delta.normalize(),60);camera.lookAt(target);camera.updateMatrixWorld();
 const right=new T.Vector3(1,0,0).applyQuaternion(camera.quaternion),up=new T.Vector3(0,1,0).applyQuaternion(camera.quaternion);
 let ex=0,ey=0;
 for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){
  const v=new T.Vector3(x,y,z).sub(target);ex=Math.max(ex,Math.abs(v.dot(right)));ey=Math.max(ey,Math.abs(v.dot(up)));
 }
 const aspect=viewport.clientWidth/viewport.clientHeight,h=Math.max(ey,ex/aspect)*1.2;
 camera.top=h;camera.bottom=-h;camera.left=-h*aspect;camera.right=h*aspect;camera.zoom=1;camera.updateProjectionMatrix();controls.update();render();
}

function updatePaintControls(){
 const mesh=selected>=0?meshes[selected]:null;
 $('#paint').disabled=!mesh;
 if(mesh)$('#paint').value='#'+mesh.material.userData.paint.value.getHexString();
 $('#paint-name').textContent=mode==='colors'?'8가지 기본 도장 비교':mesh?(VEHICLE_PAINTS.find(p=>p.id===mesh.userData.paintId)?.name||'직접 선택'):'차종을 고르면 도장색을 바꿀 수 있습니다.';
 document.querySelectorAll('[data-paint]').forEach(b=>{
  b.disabled=!mesh;
  b.setAttribute('aria-pressed',String(mode==='single'&&b.dataset.paint===mesh?.userData.paintId));
 });
}

function select(index,nextMode=index<0?'all':'single'){
 selected=index;mode=nextMode;
 [...meshes,...[...colorVariants.values()].flat()].forEach(m=>m.visible=false);
 if(mode==='colors'){
  if(!colorVariants.has(index))colorVariants.set(index,VEHICLE_PAINTS.map(p=>{
   const m=createFleetVehicle(fleet[index],{paintId:p.id});scene.add(m);return m;
  }));
  visibleMeshes=colorVariants.get(index);
 }else visibleMeshes=index<0?meshes:[meshes[index]];
 const columns=viewport.clientWidth<650?2:mode==='colors'?4:5;
 const rows=Math.ceil(visibleMeshes.length/columns),spacing=mode==='colors'?fleet[index].length+1.8:8.2;
 visibleMeshes.forEach((m,i)=>{
  m.visible=true;m.material.wireframe=$('#wire').checked;
  m.position.set(mode==='single'?0:(i%columns-(columns-1)/2)*3.9,0,mode==='single'?0:(Math.floor(i/columns)-(rows-1)/2)*spacing);
 });
 $('#labels').replaceChildren();labels=[];
 if(mode==='colors')labels=visibleMeshes.map((mesh,i)=>{
  const element=document.createElement('span');element.className='paint-label';element.textContent=VEHICLE_PAINTS[i].name;$('#labels').append(element);return {mesh,element};
 });
 document.querySelectorAll('[data-index]').forEach(b=>b.classList.toggle('active',Number(b.dataset.index)===index));
 $('#all').classList.toggle('active',mode==='all');$('#compare-colors').classList.toggle('active',mode==='colors');
 $('#caption').textContent=mode==='all'?'10개 차종 · 차종마다 8가지 도장':`${fleet[index].name} · ${mode==='colors'?'8가지 색상 비교':fleet[index].id}`;
 $('#stats').textContent=mode==='single'?`${meshes[index].geometry.attributes.position.count/3} 삼각형 · 1 메시 · 1 재질`:`${visibleMeshes.length}대 비교 · 동일 축척`;
 updatePaintControls();fit();
}

function setPaint(color,paintId='custom'){
 if(selected<0)return;
 const mesh=meshes[selected];mesh.material.userData.paint.value.set(color);mesh.userData.paintId=paintId;
 if(mode==='colors')select(selected,'single');else{updatePaintControls();render();}
}

$('#list').innerHTML=fleet.map((d,i)=>`<article class="card"><button class="choose" data-index="${i}">${String(i+1).padStart(2,'0')} · ${d.name}</button><h2>${d.id.split('-').map(x=>x.toUpperCase()).join(' ')}</h2><p>${d.length} × ${d.width} × ${d.height} m · 8색</p><a href="${d.source}" target="_blank" rel="noopener">참고 도면 ↗</a> · <a href="./textures/vehicles/fleet/${d.id}.jpg" target="_blank" rel="noopener">원본 텍스처 ↗</a></article>`).join('');
$('#quick').innerHTML=fleet.map((d,i)=>`<button data-index="${i}">${d.name}</button>`).join('');
$('#palette').innerHTML=VEHICLE_PAINTS.map(p=>`<button data-paint="${p.id}" aria-pressed="false"><span style="background:${p.color}" aria-hidden="true"></span>${p.name}</button>`).join('');
document.querySelectorAll('[data-index]').forEach(b=>b.onclick=()=>select(Number(b.dataset.index),mode==='colors'?'colors':'single'));
document.querySelectorAll('[data-paint]').forEach(b=>b.onclick=()=>{const p=vehiclePaint(b.dataset.paint);setPaint(p.color,p.id);});
$('#all').onclick=()=>select(-1);
$('#compare-colors').onclick=()=>select(Math.max(0,selected),'colors');
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>fit(b.dataset.view));
$('#paint').oninput=e=>setPaint(e.target.value);
$('#wire').onchange=e=>{visibleMeshes.forEach(m=>m.material.wireframe=e.target.checked);render();};
new ResizeObserver(()=>{renderer.setSize(viewport.clientWidth,viewport.clientHeight,false);select(selected,mode);}).observe(viewport);
T.DefaultLoadingManager.onLoad=render;
select(-1);
window.fleetReview={count:fleet.length,meshes,select,get colorVariants(){return colorVariants;}};

import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {createCityAsset,cityAssets} from './city-assets.js';
const gallery=document.querySelector('#gallery'),filters=document.querySelector('#filters');
// One shared WebGL context; each card receives a rendered snapshot on its own canvas.
const renderer=new T.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;
const views=[];
for(const [index,asset] of cityAssets.entries()){
 const card=document.createElement('article');card.className='card';card.dataset.category=asset.category;
 card.innerHTML=`<div class="viewport"><span class="badge">${String(index+1).padStart(2,'0')} / ${asset.category}</span><canvas tabindex="0" aria-label="${asset.name}: 드래그 또는 방향키로 회전, 휠로 확대"></canvas><button class="reset" aria-label="${asset.name} 시점 초기화">시점 초기화</button></div><div class="info"><small>${asset.id.toUpperCase()}</small><h2>${asset.name}</h2><p>${asset.description}</p></div>`;gallery.append(card);
 const canvas=card.querySelector('canvas'),ctx=canvas.getContext('2d'),scene=new T.Scene();scene.background=new T.Color(0xdce1d3);
 scene.add(new T.HemisphereLight(0xffefdb,0x7e9683,2.4));const light=new T.DirectionalLight(0xffdfae,3.2);light.position.set(-5,9,6);light.castShadow=true;light.shadow.mapSize.set(1024,1024);Object.assign(light.shadow.camera,{left:-9,right:9,top:9,bottom:-9});light.shadow.bias=-.001;scene.add(light);
 const model=createCityAsset(asset.id);scene.add(model);const bounds=new T.Box3().setFromObject(model),size=bounds.getSize(new T.Vector3()),center=bounds.getCenter(new T.Vector3());
 const radius=Math.max(size.x,size.y,size.z)*.8,camera=new T.PerspectiveCamera(38,1,.05,150);camera.position.set(center.x+radius*1.6,center.y+radius*.85,center.z+radius*1.9);
 const floor=new T.Mesh(new T.CylinderGeometry(Math.max(size.x,size.z)*.8+1,Math.max(size.x,size.z)*.8+1,.12,64),new T.MeshStandardMaterial({color:0xc4cbb8,roughness:1}));floor.position.y=-.09;floor.receiveShadow=true;scene.add(floor);
 const controls=new OrbitControls(camera,canvas);controls.target.copy(center);controls.enablePan=false;controls.minDistance=radius*.65;controls.maxDistance=radius*5;controls.maxPolarAngle=Math.PI*.49;controls.update();controls.saveState();
 const view={card,canvas,ctx,scene,camera,controls,dirty:true,visible:false};views.push(view);controls.addEventListener('change',()=>view.dirty=true);card.querySelector('button').onclick=()=>controls.reset();
 canvas.addEventListener('keydown',event=>{const deltas={ArrowLeft:[-.15,0],ArrowRight:[.15,0],ArrowUp:[0,-.1],ArrowDown:[0,.1]};if(!deltas[event.key])return;event.preventDefault();const offset=camera.position.clone().sub(controls.target),s=new T.Spherical().setFromVector3(offset);s.theta+=deltas[event.key][0];s.phi=T.MathUtils.clamp(s.phi+deltas[event.key][1],.15,controls.maxPolarAngle);camera.position.copy(controls.target).add(offset.setFromSpherical(s));controls.update();view.dirty=true;});
 new ResizeObserver(()=>view.dirty=true).observe(canvas);
}
const observer=new IntersectionObserver(entries=>{for(const entry of entries){const view=views.find(v=>v.card===entry.target);view.visible=entry.isIntersecting;if(view.visible)view.dirty=true;}},{rootMargin:'100px'});views.forEach(v=>observer.observe(v.card));
for(const category of ['전체',...new Set(cityAssets.map(a=>a.category))]){const b=document.createElement('button');b.textContent=category;b.classList.toggle('active',category==='전체');b.setAttribute('aria-pressed',String(category==='전체'));b.onclick=()=>{for(const button of filters.children){const active=button===b;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));}for(const view of views){view.card.hidden=category!=='전체'&&view.card.dataset.category!==category;view.dirty=true;}};filters.append(b);}
function render(){for(const v of views){if((!v.visible&&v.rendered)||!v.dirty||v.card.hidden)continue;const w=v.canvas.clientWidth,h=v.canvas.clientHeight;if(!w||!h)continue;renderer.setSize(w,h,false);v.camera.aspect=w/h;v.camera.updateProjectionMatrix();renderer.render(v.scene,v.camera);v.canvas.width=renderer.domElement.width;v.canvas.height=renderer.domElement.height;v.ctx.drawImage(renderer.domElement,0,0);v.dirty=false;v.rendered=true;}requestAnimationFrame(render);}render();
window.assetGallery={views,renderer};

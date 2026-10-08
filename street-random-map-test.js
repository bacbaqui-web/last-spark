import {createRandomStreetMap} from './street-random-map.js';
import * as T from 'three';
import {createSatelliteCrashBlock} from './satellite-crash-block.js';
import {createRoadShapeBlock,roadShapes} from './street-road-shapes.js';
import {buildWalkCollision} from './street-walk-collision.js';
import {prepareVegetation} from './street-vegetation-runtime.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {createSalvageStreetBlock,disposeStreetBlock,streetLayouts} from './salvage-street-block.js';
const viewport=document.querySelector('#viewport'),canvas=document.querySelector('canvas'),renderer=new T.WebGLRenderer({canvas,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
const scene=new T.Scene();scene.background=new T.Color('#2589df');scene.fog=new T.Fog(0xb5d8ed,160,380);renderer.toneMappingExposure=1.08;renderer.shadowMap.autoUpdate=false;scene.add(new T.HemisphereLight(0xeff6ff,0x566049,1.7));const sun=new T.DirectionalLight(0xfff1d7,2.6);sun.position.set(-150,350,150);sun.castShadow=true;sun.shadow.mapSize.set(4096,4096);Object.assign(sun.shadow.camera,{left:-350,right:350,top:350,bottom:-350,near:1,far:1000});sun.shadow.bias=-.0005;sun.shadow.normalBias=.03;scene.add(sun);
// A single distant sky dome; clouds are painted once, with no per-frame particles.
const skyCanvas=document.createElement('canvas');skyCanvas.width=2048;skyCanvas.height=1024;
const skyCtx=skyCanvas.getContext('2d'),skyGradient=skyCtx.createLinearGradient(0,0,0,1024);
skyGradient.addColorStop(0,'#176dcc');skyGradient.addColorStop(.45,'#389ee9');skyGradient.addColorStop(.75,'#96c9ee');skyGradient.addColorStop(1,'#d3e7f2');skyCtx.fillStyle=skyGradient;skyCtx.fillRect(0,0,2048,1024);
let skySeed=8513;const skyRandom=()=>{skySeed=(Math.imul(skySeed,1664525)+1013904223)>>>0;return skySeed/4294967296;};
for(let n=0;n<19;n++){const x=100+skyRandom()*1848,y=190+skyRandom()*470,w=95+skyRandom()*170;for(let k=0;k<13;k++){const cx=x+(skyRandom()-.5)*w,cy=y+(skyRandom()-.5)*24,rx=24+skyRandom()*48,ry=12+skyRandom()*22;skyCtx.save();skyCtx.translate(cx,cy);skyCtx.scale(rx,ry);const g=skyCtx.createRadialGradient(0,-.15,.05,0,0,1);g.addColorStop(0,'rgba(255,255,255,.86)');g.addColorStop(.55,'rgba(250,253,255,.66)');g.addColorStop(1,'rgba(255,255,255,0)');skyCtx.fillStyle=g;skyCtx.fillRect(-1,-1,2,2);skyCtx.restore();}}
const skyTexture=new T.CanvasTexture(skyCanvas);skyTexture.colorSpace=T.SRGBColorSpace;
const sky=new T.Mesh(new T.SphereGeometry(300,32,16),new T.MeshBasicMaterial({map:skyTexture,side:T.BackSide,depthWrite:false,fog:false,toneMapped:false}));sky.renderOrder=-10;scene.add(sky);

const camera=new T.PerspectiveCamera(46,1,.1,400),controls=new OrbitControls(camera,canvas);controls.maxPolarAngle=Math.PI*.49;controls.minDistance=5;controls.maxDistance=160;controls.enableDamping=false;controls.addEventListener('change',render);let walkCollision,walkFoot=.025,vegetationUpdate,root,collisionOverlay,showCollision=false,view='perspective';let walking=false,yaw=0,pitch=0;const walkKeys=new Set();
function render(){sky.position.copy(camera.position);renderer.render(scene,camera);}
function fit(next=view){if(walking)return;view=next;document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===view));const bounds=new T.Box3().setFromObject(root),center=bounds.getCenter(new T.Vector3()),size=bounds.getSize(new T.Vector3()),span=Math.max(size.x,size.z),aspect=viewport.clientWidth/viewport.clientHeight,extra=Math.max(1,1/aspect);controls.maxDistance=1200;camera.far=2000;scene.fog.near=500;scene.fog.far=1800;camera.fov=view==='street'?62:46;camera.updateProjectionMatrix();if(view==='street'){camera.position.set(0,4.5,34);controls.target.set(0,1.8,-12);}else if(view==='top'){camera.position.set(center.x,span*1.15*extra,center.z+.01);controls.target.set(center.x,0,center.z);}else{camera.position.set(center.x+span*.8*extra,span*.85*extra,center.z+span*.9*extra);controls.target.set(center.x,2,center.z);}camera.lookAt(controls.target);controls.update();render();}
function rebuildCollisionOverlay(){
 if(collisionOverlay){scene.remove(collisionOverlay);collisionOverlay.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});}
 collisionOverlay=new T.Group();
 const colors={building:0xffad45,car:0xff4b55,tree:0x64ff88,ride:0x58bfff};
 const edges=new Map(),groups=new Map(),point=new T.Vector3();for(const surface of walkCollision?.surfaces??[]){if(!edges.has(surface.geometry))edges.set(surface.geometry,new T.EdgesGeometry(surface.geometry,28));if(!groups.has(surface.kind))groups.set(surface.kind,[]);const values=groups.get(surface.kind),p=edges.get(surface.geometry).attributes.position;for(let i=0;i<p.count;i++){point.fromBufferAttribute(p,i).applyMatrix4(surface.matrix);values.push(point.x,point.y,point.z);}}
 edges.forEach(g=>g.dispose());for(const [kind,values] of groups){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(values,3));const mat=new T.LineBasicMaterial({color:colors[kind]??0xd68cff,depthTest:true,transparent:true,opacity:.9});const lines=new T.LineSegments(g,mat);lines.renderOrder=100;collisionOverlay.add(lines);}

 collisionOverlay.visible=showCollision;scene.add(collisionOverlay);
}
const collisionButton=document.querySelector('#collision');collisionButton.onclick=()=>{if(!walkCollision){walkCollision=buildWalkCollision(root);rebuildCollisionOverlay();}showCollision=!showCollision;collisionOverlay.visible=showCollision;collisionButton.setAttribute('aria-pressed',String(showCollision));collisionButton.classList.toggle('active',showCollision);collisionButton.textContent=showCollision?'충돌 영역 숨기기':'충돌 영역 보기';document.querySelector('#collision-note').hidden=!showCollision;render();};
function rebuild(){if(walking)exitWalk();const seed=Number(document.querySelector('#seed').value)>>>0;if(root){scene.remove(root);disposeStreetBlock(root);}root=createRandomStreetMap(seed);scene.add(root);walkCollision=undefined;vegetationUpdate=prepareVegetation(root);rebuildCollisionOverlay();renderer.shadowMap.needsUpdate=true;const d=root.userData;document.querySelector('#caption').textContent=`랜덤 연결 거리 · 시드 ${seed}`;document.querySelector('#stats').textContent=`${d.tiles.length}개 구역 · 건물 ${d.houses.length}채 · 차량 ${d.cars.length}대 · 막다른 갈림길 ${d.tiles.filter(t=>t.role==='deadend').length}곳`;document.querySelector('#stage-note').textContent='T자와 십자 갈림길은 진입로 외 한 방향만 다음 거리로 이어집니다. 나머지 방향은 무너진 건물로 막힌 구역입니다. 시드마다 연결 방향과 구역별 배치가 바뀝니다.';fit();}
document.querySelector('#boss-preview').onclick=()=>{root.userData.previewBossDefeat?.();walkCollision=buildWalkCollision(root);rebuildCollisionOverlay();renderer.shadowMap.needsUpdate=true;document.querySelector('#caption').textContent='토벌 미리보기 · 위성 내부 희귀 모듈 노출';render();};
document.querySelector('#random').onclick=()=>{document.querySelector('#seed').value=1+Math.floor(Math.random()*999999);rebuild();};document.querySelector('#apply').onclick=rebuild;document.querySelector('#layout').onchange=rebuild;document.querySelector('#shape').onchange=rebuild;document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>fit(b.dataset.view));new ResizeObserver(()=>{renderer.setSize(viewport.clientWidth,viewport.clientHeight,false);camera.aspect=viewport.clientWidth/viewport.clientHeight;camera.updateProjectionMatrix();fit();}).observe(viewport);T.DefaultLoadingManager.onLoad=render;rebuild();

const walkButton=document.querySelector('#walk'),walkHelp=document.querySelector('#walk-help');
function exitWalk(){walking=false;walkKeys.clear();controls.enabled=true;walkHelp.hidden=true;walkButton.classList.remove('active');walkButton.textContent='게임 시점으로 걷기';if(document.pointerLockElement===canvas)document.exitPointerLock();fit('street');}
walkButton.onclick=()=>{if(walking){exitWalk();return;}walking=true;controls.enabled=false;walkKeys.clear();yaw=0;pitch=0;walkCollision??=buildWalkCollision(root);walkFoot=.025;camera.position.set(0,1.7,32);camera.fov=72;camera.updateProjectionMatrix();camera.rotation.order='YXZ';camera.rotation.set(0,0,0);walkHelp.hidden=false;walkButton.classList.add('active');walkButton.textContent='걷기 종료';render();};
canvas.addEventListener('click',()=>{if(walking){canvas.focus();canvas.requestPointerLock?.()?.catch?.(()=>{});}});
document.addEventListener('mousemove',e=>{if(!walking||(document.pointerLockElement!==canvas&&!(e.buttons===1&&e.target===canvas)))return;yaw-=e.movementX*.002;pitch=T.MathUtils.clamp(pitch-e.movementY*.002,-1.35,1.35);camera.rotation.set(pitch,yaw,0,'YXZ');});
document.addEventListener('keydown',e=>{if(!walking||/INPUT|SELECT|TEXTAREA/.test(e.target.tagName))return;if(e.code==='Escape'){exitWalk();return;}if(['KeyW','KeyA','KeyS','KeyD','ShiftLeft','ShiftRight'].includes(e.code)){e.preventDefault();walkKeys.add(e.code);}});
document.addEventListener('keyup',e=>walkKeys.delete(e.code));window.addEventListener('blur',()=>walkKeys.clear());
document.addEventListener('pointerlockchange',()=>{if(walking&&document.pointerLockElement!==canvas)walkKeys.clear();});
function walkStep(dt){if(!walking)return;const forward=Number(walkKeys.has('KeyW'))-Number(walkKeys.has('KeyS')),side=Number(walkKeys.has('KeyD'))-Number(walkKeys.has('KeyA')),length=Math.hypot(forward,side);if(length){
 const speed=walkKeys.has('ShiftLeft')||walkKeys.has('ShiftRight')?5:2.8,step=speed*dt/length;
 const dx=(side*Math.cos(yaw)-forward*Math.sin(yaw))*step,dz=(-forward*Math.cos(yaw)-side*Math.sin(yaw))*step;
 walkFoot=walkCollision.move(camera.position,dx,dz,walkFoot);
 }
 const targetY=walkFoot+1.675;camera.position.y=T.MathUtils.lerp(camera.position.y,targetY,Math.min(1,dt*12));
}
let lastFrame=0;function animate(now){requestAnimationFrame(animate);if(document.hidden||now-lastFrame<33.3)return;const dt=Math.min(.05,(now-lastFrame)*.001);lastFrame=now;walkStep(dt);vegetationUpdate?.(now*.001,camera,walking);root?.userData.updateLife?.(now*.001,walking?camera:null);root?.userData.updateImpactFire?.(now*.001);render();}requestAnimationFrame(animate);

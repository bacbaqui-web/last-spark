import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {createSalvageStreetBlock,disposeStreetBlock,streetLayouts} from './salvage-street-block.js';
const viewport=document.querySelector('#viewport'),canvas=document.querySelector('canvas'),renderer=new T.WebGLRenderer({canvas,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
const scene=new T.Scene();scene.background=new T.Color('#2589df');scene.fog=new T.Fog(0xb5d8ed,160,380);renderer.toneMappingExposure=1.08;renderer.shadowMap.autoUpdate=false;scene.add(new T.HemisphereLight(0xeff6ff,0x566049,1.7));const sun=new T.DirectionalLight(0xfff1d7,2.6);sun.position.set(-30,65,35);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-60,right:60,top:60,bottom:-60,near:1,far:160});sun.shadow.bias=-.0005;sun.shadow.normalBias=.03;scene.add(sun);
// A single distant sky dome; clouds are painted once, with no per-frame particles.
const skyCanvas=document.createElement('canvas');skyCanvas.width=2048;skyCanvas.height=1024;
const skyCtx=skyCanvas.getContext('2d'),skyGradient=skyCtx.createLinearGradient(0,0,0,1024);
skyGradient.addColorStop(0,'#176dcc');skyGradient.addColorStop(.45,'#389ee9');skyGradient.addColorStop(.75,'#96c9ee');skyGradient.addColorStop(1,'#d3e7f2');skyCtx.fillStyle=skyGradient;skyCtx.fillRect(0,0,2048,1024);
let skySeed=8513;const skyRandom=()=>{skySeed=(Math.imul(skySeed,1664525)+1013904223)>>>0;return skySeed/4294967296;};
for(let n=0;n<19;n++){const x=100+skyRandom()*1848,y=190+skyRandom()*470,w=95+skyRandom()*170;for(let k=0;k<13;k++){const cx=x+(skyRandom()-.5)*w,cy=y+(skyRandom()-.5)*24,rx=24+skyRandom()*48,ry=12+skyRandom()*22;skyCtx.save();skyCtx.translate(cx,cy);skyCtx.scale(rx,ry);const g=skyCtx.createRadialGradient(0,-.15,.05,0,0,1);g.addColorStop(0,'rgba(255,255,255,.86)');g.addColorStop(.55,'rgba(250,253,255,.66)');g.addColorStop(1,'rgba(255,255,255,0)');skyCtx.fillStyle=g;skyCtx.fillRect(-1,-1,2,2);skyCtx.restore();}}
const skyTexture=new T.CanvasTexture(skyCanvas);skyTexture.colorSpace=T.SRGBColorSpace;
const sky=new T.Mesh(new T.SphereGeometry(300,32,16),new T.MeshBasicMaterial({map:skyTexture,side:T.BackSide,depthWrite:false,fog:false,toneMapped:false}));sky.renderOrder=-10;scene.add(sky);

const camera=new T.PerspectiveCamera(46,1,.1,400),controls=new OrbitControls(camera,canvas);controls.maxPolarAngle=Math.PI*.49;controls.minDistance=5;controls.maxDistance=160;controls.enableDamping=false;controls.addEventListener('change',render);let root,collisionOverlay,showCollision=false,view='perspective';let walking=false,yaw=0,pitch=0;const walkKeys=new Set();
function render(){sky.position.copy(camera.position);renderer.render(scene,camera);}
function fit(next=view){if(walking)return;view=next;document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===view));const aspect=viewport.clientWidth/viewport.clientHeight,extra=Math.max(1,1/aspect);camera.fov=view==='street'?62:46;camera.updateProjectionMatrix();if(view==='street'){camera.position.set(0,4.5,34);controls.target.set(0,1.8,-12);}else if(view==='top'){camera.position.set(0,99*extra,.01);controls.target.set(0,0,0);}else{camera.position.set(58*extra,62*extra,67*extra);controls.target.set(0,2,0);}camera.lookAt(controls.target);controls.update();render();}
function rebuildCollisionOverlay(){
 if(collisionOverlay){scene.remove(collisionOverlay);collisionOverlay.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});}
 collisionOverlay=new T.Group();
 const colors={building:0xffad45,car:0xff4b55,tree:0x64ff88,ride:0x58bfff};
 root.updateMatrixWorld(true);
 // The debug surfaces use the same local geometry and world transform as each solid model.
 root.traverse(object=>{const kind=object.userData.collisionKind;if(!kind)return;
 object.traverse(mesh=>{if(!mesh.isMesh||!mesh.visible)return;
  const g=new T.EdgesGeometry(mesh.geometry,28),mat=new T.LineBasicMaterial({color:colors[kind]??0xd68cff,depthTest:true,transparent:true,opacity:.95});
  const lines=new T.LineSegments(g,mat);lines.matrixAutoUpdate=false;lines.matrix.copy(mesh.matrixWorld);lines.renderOrder=100;collisionOverlay.add(lines);
 });
 });
 collisionOverlay.visible=showCollision;scene.add(collisionOverlay);
}
const collisionButton=document.querySelector('#collision');collisionButton.onclick=()=>{showCollision=!showCollision;collisionOverlay.visible=showCollision;collisionButton.setAttribute('aria-pressed',String(showCollision));collisionButton.classList.toggle('active',showCollision);collisionButton.textContent=showCollision?'충돌 영역 숨기기':'충돌 영역 보기';document.querySelector('#collision-note').hidden=!showCollision;render();};
function rebuild(){if(walking)exitWalk();const seed=Number(document.querySelector('#seed').value)>>>0,index=Number(document.querySelector('#layout').value);if(root){scene.remove(root);disposeStreetBlock(root);}root=createSalvageStreetBlock(seed,index);scene.add(root);rebuildCollisionOverlay();renderer.shadowMap.needsUpdate=true;const d=root.userData;document.querySelector('#caption').textContent=`${streetLayouts[index].name} · 시드 ${seed}`;document.querySelector('#stats').textContent=`72 × 72m · 건물 ${d.houses.length}채 · 가로수 ${d.trees.length}그루 · 차량 ${d.cars.length}대 · 기타 탈것 ${d.smallRides.length}대 · 잔해 ${d.debris}개`;fit();}
document.querySelector('#random').onclick=()=>{document.querySelector('#seed').value=1+Math.floor(Math.random()*999999);rebuild();};document.querySelector('#apply').onclick=rebuild;document.querySelector('#layout').onchange=rebuild;document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>fit(b.dataset.view));new ResizeObserver(()=>{renderer.setSize(viewport.clientWidth,viewport.clientHeight,false);camera.aspect=viewport.clientWidth/viewport.clientHeight;camera.updateProjectionMatrix();fit();}).observe(viewport);T.DefaultLoadingManager.onLoad=render;rebuild();

const walkButton=document.querySelector('#walk'),walkHelp=document.querySelector('#walk-help');
function exitWalk(){walking=false;walkKeys.clear();controls.enabled=true;walkHelp.hidden=true;walkButton.classList.remove('active');walkButton.textContent='게임 시점으로 걷기';if(document.pointerLockElement===canvas)document.exitPointerLock();fit('street');}
walkButton.onclick=()=>{if(walking){exitWalk();return;}walking=true;controls.enabled=false;walkKeys.clear();yaw=0;pitch=0;camera.position.set(0,1.7,32);camera.fov=72;camera.updateProjectionMatrix();camera.rotation.order='YXZ';camera.rotation.set(0,0,0);walkHelp.hidden=false;walkButton.classList.add('active');walkButton.textContent='걷기 종료';render();};
canvas.addEventListener('click',()=>{if(walking){canvas.focus();canvas.requestPointerLock?.()?.catch?.(()=>{});}});
document.addEventListener('mousemove',e=>{if(!walking||(document.pointerLockElement!==canvas&&!(e.buttons===1&&e.target===canvas)))return;yaw-=e.movementX*.002;pitch=T.MathUtils.clamp(pitch-e.movementY*.002,-1.35,1.35);camera.rotation.set(pitch,yaw,0,'YXZ');});
document.addEventListener('keydown',e=>{if(!walking||/INPUT|SELECT|TEXTAREA/.test(e.target.tagName))return;if(e.code==='Escape'){exitWalk();return;}if(['KeyW','KeyA','KeyS','KeyD','ShiftLeft','ShiftRight'].includes(e.code)){e.preventDefault();walkKeys.add(e.code);}});
document.addEventListener('keyup',e=>walkKeys.delete(e.code));window.addEventListener('blur',()=>walkKeys.clear());
document.addEventListener('pointerlockchange',()=>{if(walking&&document.pointerLockElement!==canvas)walkKeys.clear();});
function walkStep(dt){if(!walking)return;const forward=Number(walkKeys.has('KeyW'))-Number(walkKeys.has('KeyS')),side=Number(walkKeys.has('KeyD'))-Number(walkKeys.has('KeyA')),length=Math.hypot(forward,side);if(!length)return;
 const speed=walkKeys.has('ShiftLeft')||walkKeys.has('ShiftRight')?5:2.8,step=speed*dt/length;
 const dx=(side*Math.cos(yaw)-forward*Math.sin(yaw))*step,dz=(-forward*Math.cos(yaw)-side*Math.sin(yaw))*step;
 const blocked=(x,z)=>Math.abs(x)>8.25||Math.abs(z)>35||root.userData.obstacles.some(o=>Math.abs(o.x-x)<o.w/2+.28&&Math.abs(o.z-z)<o.d/2+.28);
 if(!blocked(camera.position.x+dx,camera.position.z))camera.position.x+=dx;if(!blocked(camera.position.x,camera.position.z+dz))camera.position.z+=dz;
 const targetY=1.7+(Math.abs(camera.position.x)>3.6?.2:0);camera.position.y=T.MathUtils.lerp(camera.position.y,targetY,Math.min(1,dt*12));
}
let lastFrame=0;function animate(now){requestAnimationFrame(animate);if(document.hidden||now-lastFrame<33.3)return;const dt=Math.min(.05,(now-lastFrame)*.001);lastFrame=now;walkStep(dt);root?.userData.updateLife?.(now*.001);render();}requestAnimationFrame(animate);

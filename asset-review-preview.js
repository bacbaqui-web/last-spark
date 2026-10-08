import * as T from 'three';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {getRuinedVehicle} from './ruined-vehicles.js';
import {createStreetProps} from './street-props.js';
import {createCityAsset} from './city-assets.js';
import {createWeaponModel} from './weapon-models.js';
import {createEquipmentModel} from './equipment-models.js';
import {createRobot,createSpider} from './robot.js';
import {createBoss,createAssassin} from './boss-models.js';
import {loadPurchasedModels} from './purchased-model-library.js';
import {composeReferenceAssets} from './reference-buildings.js';
import {buildBrickStreet,createStreetDetailPreview} from './brick-street-scene.js';
import {generateBrickBlock} from './brick-street-layout.js';
import {groupFromTemplate,getUpgradedTemplate} from './asset-upgrades.js';
let renderer,library,referenceLibrary,environment;
function engine(){if(!renderer){renderer=new T.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.2;}return renderer;}
async function makeReviewModel(target,original=true){const previous=globalThis.__assetReviewOriginal;globalThis.__assetReviewOriginal=original;try{
 if(target.adapter==='material'||['street-grass','street-ivy','street-rubble'].includes(target.id))return createStreetDetailPreview(target.id);
 if(target.adapter==='gallery')return createCityAsset(target.assetKey);
 if(target.id.startsWith('weapon-'))return createWeaponModel(target.id.slice(7));
 if(target.id.startsWith('equipment-'))return createEquipmentModel(target.id.slice(10),target.adapter==='segmented'?(target.id==='equipment-tshirt'?'spine_03':target.id.includes('runner')||target.id.includes('exoleg')?'thigh_l':'upperarm_l'):'');
 if(target.id==='robot-drone')return createBoss('drone').root;
 if(target.id==='robot-spider')return createSpider().root;
 if(target.id==='robot-blade')return createBoss('blade').root;
 if(target.id==='robot-assassin')return createAssassin().root;
 if(target.adapter==='rigged')return createRobot(target.id==='robot-destroyer',target.id.slice(6)).root;
 if(target.id.startsWith('ref-')){library??=await loadPurchasedModels();referenceLibrary=composeReferenceAssets(library);const t=referenceLibrary.get(target.id);if(!t)throw Error('원본 조립 모델이 없습니다.');return groupFromTemplate(t);}
 if(target.id==='lush-tree'){const upgraded=getUpgradedTemplate(target.id);if(upgraded)return groupFromTemplate(upgraded);const b=generateBrickBlock(41);b.buildings=[];b.rubble=[];b.vehicles=[];return buildBrickStreet(b,new Map(),{reviewTarget:'lush-tree'});}
 const vehicle=getRuinedVehicle(target.id,0);if(vehicle)return groupFromTemplate(vehicle);
 const props=createStreetProps();if(props.has(target.id))return groupFromTemplate(props.get(target.id));throw Error('원본 미리보기를 만들 수 없습니다.');
 }finally{globalThis.__assetReviewOriginal=previous;}}
let modelQueue=Promise.resolve();
export function createReviewModel(target,original=true){const result=modelQueue.catch(()=>{}).then(()=>makeReviewModel(target,original));modelQueue=result;return result;}
function sceneFor(model){const scene=new T.Scene();if(!environment){const room=new RoomEnvironment(),pmrem=new T.PMREMGenerator(engine());environment=pmrem.fromScene(room).texture;room.dispose();pmrem.dispose();}scene.environment=environment;scene.environmentIntensity=.7;scene.add(new T.HemisphereLight(0xe6f1e7,0x4e6050,2.4));const sun=new T.DirectionalLight(0xfff5dd,3.7);sun.position.set(3,7,5);scene.add(sun);const rim=new T.DirectionalLight(0xb9dbf5,2);rim.position.set(-5,3,-5);scene.add(rim);const holder=new T.Group();holder.add(model);scene.add(holder);holder.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(holder),size=bounds.getSize(new T.Vector3()),center=bounds.getCenter(new T.Vector3()),radius=Math.max(...size.toArray(),.01);holder.position.sub(center);const camera=new T.PerspectiveCamera(38,1,.001,Math.max(1000,radius*20));camera.position.set(radius*1.05,radius*.66,radius*1.5);camera.lookAt(0,0,0);return {scene,camera,holder,radius};}
export function drawThumbnail(model,canvas){const view=sceneFor(model),r=engine(),width=Math.max(120,canvas.clientWidth||350),height=Math.max(100,canvas.clientHeight||186);r.setSize(width,height,false);view.camera.aspect=width/height;view.camera.updateProjectionMatrix();r.render(view.scene,view.camera);canvas.width=r.domElement.width;canvas.height=r.domElement.height;canvas.getContext('2d').clearRect(0,0,canvas.width,canvas.height);canvas.getContext('2d').drawImage(r.domElement,0,0);return view;}
export function interactiveView(model,canvas){const view=sceneFor(model),controls=new OrbitControls(view.camera,canvas);controls.enableDamping=true;controls.minDistance=view.radius*.25;controls.maxDistance=view.radius*5;controls.enablePan=false;controls.update();return {...view,controls,canvas};}
export function renderViews(views){const r=engine();for(const v of views){v.controls.update();const width=Math.max(1,v.canvas.clientWidth),height=Math.max(1,v.canvas.clientHeight);r.setSize(width,height,false);v.camera.aspect=width/height;v.camera.updateProjectionMatrix();r.render(v.scene,v.camera);if(v.canvas.width!==r.domElement.width||v.canvas.height!==r.domElement.height){v.canvas.width=r.domElement.width;v.canvas.height=r.domElement.height;}v.canvas.getContext('2d').clearRect(0,0,v.canvas.width,v.canvas.height);v.canvas.getContext('2d').drawImage(r.domElement,0,0);}}

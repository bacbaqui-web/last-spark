import assert from 'node:assert/strict';
import * as T from 'three';
import {createShadowBudget,createWeaponPass,installQualityControls} from '../runtime-performance.js';

const renderer={shadowMap:{enabled:true,needsUpdate:false}},budget=createShadowBudget(renderer);
let draws=0;
for(let i=0;i<600;i++){if(budget.prepare(i*1000/60,'same-cell',20))draws++;renderer.shadowMap.needsUpdate=false;}
assert.equal(draws,200,'60 Hz movement needs only 20 Hz shadow draws');
assert(budget.prepare(9990,'new-cell',20),'new sun/visibility cell refreshes immediately');renderer.shadowMap.needsUpdate=false;
budget.invalidate();assert(budget.prepare(9991,'new-cell',20),'reset/context restore refreshes immediately');renderer.shadowMap.needsUpdate=false;
renderer.shadowMap.enabled=false;assert(!budget.prepare(10000,'new-cell',20));renderer.shadowMap.enabled=true;assert(budget.prepare(10001,'new-cell',20),'quality re-enable refreshes');

const scene=new T.Scene(),camera=new T.PerspectiveCamera(),sun=new T.DirectionalLight(),world=new T.Group(),hidden=new T.Group();
hidden.visible=false;scene.background=new T.Color(0x2589df);scene.add(camera,sun,world,hidden);
let throwRender=false,visited=0;const fakeRenderer={render(s,c){assert.equal(s,scene);assert.equal(c,camera);assert(camera.visible&&sun.visible);assert(!world.visible&&!hidden.visible);assert.equal(camera.layers.mask,2);assert.equal(scene.background,null);assert.equal(scene.matrixWorldAutoUpdate,false);visited++;if(throwRender)throw Error('test failure');}};
const pass=createWeaponPass(scene,camera,fakeRenderer),background=scene.background;
pass();assert(world.visible&&!hidden.visible);assert.equal(scene.background,background);assert.equal(scene.matrixWorldAutoUpdate,true);assert.equal(camera.layers.mask,1);
throwRender=true;assert.throws(pass,/test failure/);assert(world.visible&&!hidden.visible);assert.equal(scene.background,background);assert.equal(camera.layers.mask,1);assert.equal(visited,2,'failed render restores original scene');

const prior={document:globalThis.document,localStorage:globalThis.localStorage,devicePixelRatio:globalThis.devicePixelRatio,innerWidth:globalThis.innerWidth,innerHeight:globalThis.innerHeight};
const elements=[],element=()=>({appendChild(){},setAttribute(){}});globalThis.document={body:{appendChild(){}},createElement(name){const e=element();if(name==='select')elements.push(e);return e;}};globalThis.localStorage={getItem(){return null;},setItem(){}};globalThis.devicePixelRatio=2;globalThis.innerWidth=1280;globalThis.innerHeight=720;
const makeRenderer=()=>({shadowMap:{},ratio:0,setPixelRatio(n){this.ratio=n;},setSize(){}}),worldRenderer=makeRenderer(),weaponRenderer=makeRenderer();
try{
 const quality=installQualityControls([worldRenderer,weaponRenderer]);assert.equal(worldRenderer.ratio,1);assert(worldRenderer.shadowMap.enabled&&!weaponRenderer.shadowMap.enabled,'weapon pass never renders a second shadow map');
 for(let i=0;i<90;i++)quality.sample(33,4000+i*33);assert.equal(worldRenderer.ratio,.85,'auto reduces costly pixel workload promptly');
 const selector=elements[0];selector.value='high';selector.onchange();assert.equal(worldRenderer.ratio,1.5);assert.equal(weaponRenderer.ratio,1);assert(!weaponRenderer.shadowMap.enabled);
 selector.value='low';selector.onchange();assert(!worldRenderer.shadowMap.enabled);
}finally{for(const [key,value]of Object.entries(prior))if(value===undefined)delete globalThis[key];else globalThis[key]=value;}
console.log('PASS 20 Hz cached shadows, invalidation/re-enable, isolated weapon traversal, exception restore and adaptive quality');

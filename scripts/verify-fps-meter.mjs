import assert from 'node:assert/strict';
import {installFPSMeter} from '../runtime-performance.js';
const prior=globalThis.document;let text='',writes=0,appends=0;
const node={hidden:false,setAttribute(){},get textContent(){return text;},set textContent(value){writes++;text=value;}};
globalThis.document={createElement(){return node;},body:{appendChild(){appends++;}}};
try{
 const meter=installFPSMeter();assert(node.hidden);assert.equal(appends,1);
 for(const fps of [30,60,144]){meter.reset();for(let i=0;i<fps;i++)meter.sample(1000/fps);assert.equal(text,`${fps} FPS`);assert(!node.hidden);}
 meter.reset();for(let i=0;i<20;i++)meter.sample(10);meter.sample(300);assert.equal(text,'42 FPS','slow frames contribute to actual elapsed time');
 meter.sample(16,false);assert(node.hidden);meter.sample(NaN);meter.sample(0);assert(node.hidden);
 for(let i=0;i<60;i++)meter.sample(1000/60);assert.equal(text,'60 FPS','resume starts a fresh sample');
 const before=writes;for(let i=0;i<600;i++)meter.sample(1000/60);assert.equal(writes,before,'steady FPS does not rewrite unchanged text');assert.equal(appends,1);
}finally{if(prior===undefined)delete globalThis.document;else globalThis.document=prior;}
console.log('PASS FPS cadence, elapsed-time averaging, hitch visibility, pause/resume and stable DOM');

import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {packMotionData} from './pack-motion-data.mjs';
for(const file of ['rig-data.json','third-person-motion-data.json','side-locomotion-data.json']){const input=JSON.parse(await readFile(file,'utf8')),code=packMotionData(input),{default:output}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
 function compare(a,b,key){if((key==='times'||key==='values')&&Array.isArray(a)){assert.deepEqual(b,Float32Array.from(a));return;}if(a&&typeof a==='object'){assert.deepEqual(Object.keys(a),Object.keys(b));for(const k of Object.keys(a))compare(a[k],b[k],k);}else assert.equal(a,b);}compare(input,output);assert(code.length<JSON.stringify(input).length,file+' is smaller');console.log('PASS exact Float32 animation data: '+file+' '+code.length+' bytes');}

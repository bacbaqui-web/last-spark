import assert from 'node:assert/strict';
import {readdir,stat,readFile} from 'node:fs/promises';
import {join} from 'node:path';
let total=0,models=0;const files=[];async function walk(dir){for(const entry of await readdir(dir,{withFileTypes:true})){const path=join(dir,entry.name);if(entry.isDirectory())await walk(path);else{const size=(await stat(path)).size;total+=size;files.push({path,size});assert(!/\.(zip|blend|psd)$/i.test(path),'source archives must not ship: '+path);if(path.includes('/models/wild-robots-v1/')&&/\.(glb|png)$/.test(path))models+=size;}}}await walk('dist');
assert(total<220*1024*1024,`release exceeds 220 MiB: ${total}`);
for(const {path,size} of files.filter(f=>/\.js$/.test(f.path)))assert(size<2.2*1024*1024,'JS chunk exceeds 2.2 MiB: '+path);
for(const {path} of files.filter(f=>f.path.includes('/wild-robots-v1/')&&f.path.endsWith('.glb'))){const data=await readFile(path),json=JSON.parse(data.subarray(20,20+data.readUInt32LE(12)));assert.equal(data.readUInt32LE(8),data.length);for(const view of json.bufferViews)assert((view.byteOffset||0)+view.byteLength<=json.buffers[view.buffer].byteLength);for(const image of json.images||[])if(image.uri)assert((await stat(join(path.slice(0,path.lastIndexOf('/')),image.uri))).size>0);}
console.log(JSON.stringify({pass:true,totalMiB:total/1048576,wildAssetMiB:models/1048576,files:files.length},null,2));

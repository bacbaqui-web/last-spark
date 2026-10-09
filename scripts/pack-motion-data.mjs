import {readFile} from 'node:fs/promises';
import {basename,dirname,resolve} from 'node:path';
const motionFiles=new Set(['rig-data.json','third-person-motion-data.json','side-locomotion-data.json']);
// Three.js stores keyframe times/values as Float32Array. Pack that exact data,
// avoiding thousands of numeric JS literals without changing sampled poses.
export function packMotionData(data){
 const blocks=[];let floats=0;
 const pack=(value,key)=>{if((key==='times'||key==='values')&&Array.isArray(value)&&value.every(Number.isFinite)){const array=Float32Array.from(value),ref={__motionFloat32:[floats,array.length]};blocks.push(Buffer.from(array.buffer));floats+=array.length;return ref;}if(Array.isArray(value))return value.map(v=>pack(v));if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,pack(v,k)]));return value;};
 const metadata=pack(data),base64=Buffer.concat(blocks).toString('base64');
 return `const bytes=Uint8Array.from(atob(${JSON.stringify(base64)}),c=>c.charCodeAt(0));const revive=v=>{if(v&&v.__motionFloat32)return new Float32Array(bytes.buffer,v.__motionFloat32[0]*4,v.__motionFloat32[1]);if(Array.isArray(v))return v.map(revive);if(v&&typeof v==='object')for(const k of Object.keys(v))v[k]=revive(v[k]);return v;};export default revive(${JSON.stringify(metadata)});`;
}
export function packedMotionPlugin(){return {name:'packed-motion-data',apply:'build',enforce:'pre',resolveId(source,importer){if(importer&&motionFiles.has(basename(source)))return '\0packed-motion:'+resolve(dirname(importer),source).replace(/\.json$/,'.packed');},async load(id){if(!id.startsWith('\0packed-motion:'))return null;const file=id.slice(15).replace(/\.packed$/,'.json');this.addWatchFile(file);return packMotionData(JSON.parse(await readFile(file,'utf8')));}};}

import {readFile,writeFile,readdir,rm,cp} from 'node:fs/promises';
import {join,relative} from 'node:path';
import {createHash} from 'node:crypto';
export async function optimizeReleaseAssets(outDir,excluded=[]){
 const removed=[...excluded],atlases=new Map();let savedBytes=0;
 async function visit(dir){for(const entry of await readdir(dir,{withFileTypes:true})){const path=join(dir,entry.name);if(entry.isDirectory())await visit(path);else if(/\.(zip|blend|psd)$/i.test(entry.name)){removed.push(relative(outDir,path));await rm(path);}}}
 await visit(outDir);
 const directory=join(outDir,'models/wild-robots-v1');
 for(const file of await readdir(directory)){if(!file.endsWith('.glb'))continue;const source=await readFile(join(directory,file)),jsonLength=source.readUInt32LE(12),json=JSON.parse(source.subarray(20,20+jsonLength)),bin=source.subarray(28+jsonLength);if(!json.images?.some(image=>image.bufferView!==undefined))continue;
  const imageViews=new Set();for(const image of json.images){if(image.bufferView===undefined)continue;const view=json.bufferViews[image.bufferView],bytes=bin.subarray(view.byteOffset||0,(view.byteOffset||0)+view.byteLength),hash=createHash('sha256').update(bytes).digest('hex').slice(0,16),extension=image.mimeType==='image/jpeg'?'jpg':'png',name=`shared-${hash}.${extension}`;
   if(!atlases.has(name)){await writeFile(join(directory,name),bytes);atlases.set(name,bytes.length);}imageViews.add(image.bufferView);image.uri=name;delete image.bufferView;delete image.mimeType;
  }
  const chunks=[];let offset=0;for(let i=0;i<json.bufferViews.length;i++){const view=json.bufferViews[i];if(imageViews.has(i)){view.byteOffset=0;view.byteLength=4;continue;}const bytes=bin.subarray(view.byteOffset||0,(view.byteOffset||0)+view.byteLength),padded=Buffer.alloc(Math.ceil(bytes.length/4)*4);bytes.copy(padded);view.byteOffset=offset;chunks.push(padded);offset+=padded.length;}
  json.buffers[0].byteLength=offset;const data=Buffer.from(JSON.stringify(json)),header=Buffer.alloc(20+Math.ceil(data.length/4)*4,32),body=Buffer.concat(chunks),binHeader=Buffer.alloc(8);source.copy(header,0,0,12);header.writeUInt32LE(header.length+8+body.length,8);header.writeUInt32LE(header.length-20,12);header.writeUInt32LE(0x4e4f534a,16);data.copy(header,20);binHeader.writeUInt32LE(body.length,0);binHeader.writeUInt32LE(0x004e4942,4);const result=Buffer.concat([header,binHeader,body]);await writeFile(join(directory,file),result);savedBytes+=source.length-result.length;
 }
 const report={removedArchives:removed,uniqueAtlases:atlases.size,netModelBytesSaved:savedBytes-[...atlases.values()].reduce((a,b)=>a+b,0)};await writeFile(join(outDir,'release-assets.json'),JSON.stringify(report,null,2));console.log('Release assets:',report);return report;
}
export function releaseAssetsPlugin(){let outDir,publicDir;return {name:'last-spark-release-assets',apply:'build',configResolved(config){outDir=join(config.root,config.build.outDir);publicDir=config.publicDir;},async closeBundle(){const excluded=[];await cp(publicDir,outDir,{recursive:true,filter:path=>{if(/\.(zip|blend|psd)$/i.test(path)){excluded.push(relative(publicDir,path));return false;}return true;}});await optimizeReleaseAssets(outDir,excluded);}};}

import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {readFile,stat} from 'node:fs/promises';
import path from 'node:path';
const run=promisify(execFile);
let queue=Promise.resolve();
export async function convertBlend(input,folder,budget){
 const task=queue.catch(()=>{}).then(async()=>{
  const blender=process.env.LAST_SPARK_BLENDER||'/Applications/Blender.app/Contents/MacOS/Blender';
  try{await stat(blender);}catch{throw Error('Blender를 찾지 못했습니다. GLB 파일을 가져오거나 LAST_SPARK_BLENDER 경로를 지정해주세요.');}
  const output=path.join(folder,'converted.glb'),report=path.join(folder,'conversion.json');
  try{await run(blender,['--background','--factory-startup','--disable-autoexec',input,'--python-exit-code','1','--python',new URL('./convert-review-model.py',import.meta.url).pathname,'--',output,report,String(budget)],{timeout:180000,maxBuffer:2*1024*1024});}
  catch(e){throw Error('Blender 변환 실패: '+(e.stdout||e.stderr||e.message).slice(-1200));}
  return {file:'converted.glb',conversion:JSON.parse(await readFile(report,'utf8'))};
 });queue=task;return task;
}

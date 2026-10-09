import {readFileSync} from 'node:fs';
const profile=JSON.parse(readFileSync(process.argv[2],'utf8'));
const nodes=new Map(profile.nodes.map(n=>[n.id,n])),parents=new Map(),exclusive=new Map(),inclusive=new Map();
for(const node of profile.nodes)for(const child of node.children||[])parents.set(child,node.id);
let total=0;
for(let index=0;index<profile.samples.length;index++){
 let id=profile.samples[index];const dt=profile.timeDeltas[index]||0;total+=dt;exclusive.set(id,(exclusive.get(id)||0)+dt);
 const visited=new Set();
 while(id){const frame=nodes.get(id).callFrame,key=JSON.stringify([frame.functionName,frame.url,frame.lineNumber]);if(!visited.has(key)){inclusive.set(key,(inclusive.get(key)||0)+dt);visited.add(key);}id=parents.get(id);}
}
const functions=new Map();
for(const node of profile.nodes){const f=node.callFrame,key=JSON.stringify([f.functionName,f.url,f.lineNumber]);let row=functions.get(key);if(!row){row={name:f.functionName||'(anonymous)',file:f.url.split('/').at(-1),line:f.lineNumber+1,exclusiveUs:0,inclusiveUs:inclusive.get(key)||0};functions.set(key,row);}row.exclusiveUs+=exclusive.get(node.id)||0;}
const rows=[...functions.values()].map(({exclusiveUs,inclusiveUs,...row})=>({...row,exclusiveMs:Math.round(exclusiveUs/1000),inclusiveMs:Math.round(inclusiveUs/1000),totalPercent:Math.round(inclusiveUs/total*1000)/10}));
console.log(JSON.stringify({durationMs:total/1000,exclusive:rows.toSorted((a,b)=>b.exclusiveMs-a.exclusiveMs).slice(0,40),inclusive:rows.filter(r=>!['(root)','(idle)'].includes(r.name)).toSorted((a,b)=>b.inclusiveMs-a.inclusiveMs).slice(0,40)},null,2));

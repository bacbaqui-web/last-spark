import * as T from 'three';
import {applyRigidUpgrade} from './asset-upgrades.js';
const palette={sand:0xb8a58b,wall:0xd1bda0,teal:0x618c83,rust:0xb56f49,dark:0x343e41,glass:0x426367,leaf:0x788b55,wood:0x77604c,cream:0xe5d5ac};
export function createCityAsset(id){
 const g=new T.Group(),materials={};
 const mat=c=>materials[c]??=new T.MeshStandardMaterial({color:palette[c]??c,roughness:.95,flatShading:true});
 function box(w,h,d,x,y,z,c='sand',rz=0){const m=new T.Mesh(new T.BoxGeometry(w,h,d),mat(c));m.position.set(x,y,z);m.rotation.z=rz;m.castShadow=m.receiveShadow=true;g.add(m);return m;}
 function cyl(r,h,x,y,z,c,n=8){const m=new T.Mesh(new T.CylinderGeometry(r,r,h,n),mat(c));m.position.set(x,y,z);m.castShadow=true;g.add(m);return m;}
 function sign(text,w,h,x,y,z){const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;const ctx=canvas.getContext('2d');ctx.fillStyle='#618c83';ctx.fillRect(0,0,512,128);ctx.fillStyle='#e5d5ac';ctx.font='bold 65px sans-serif';ctx.textAlign='center';ctx.fillText(text,256,88);const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;const m=new T.Mesh(new T.BoxGeometry(w,h,.12),[mat('teal'),mat('teal'),mat('teal'),mat('teal'),new T.MeshStandardMaterial({map:texture}),mat('teal')]);m.position.set(x,y,z);g.add(m);}
 const rubble=(count=9)=>{for(let i=0;i<count;i++){const a=i*2.399,x=Math.cos(a)*(1+i%3)*.52,z=Math.sin(a)*(1+i%3)*.52;const m=box(.35+i%3*.18,.22+i%2*.18,.4,x,.16,z,i%3?'sand':'rust',i*.3);m.rotation.y=a;}};
 if(id==='apartment'){
  box(5,5.8,3.8,0,2.9,0,'wall');box(5.2,.25,4,0,.15,0,'dark');
  for(let f=0;f<3;f++){const y=1+f*1.65;box(5.16,.13,3.94,0,y-.6,0,'sand');for(const x of[-1.6,0,1.6]){box(1,1.1,.09,x,y,1.94,'dark');box(.8,.86,.05,x,y,2,'glass');box(1.2,.13,.3,x,y-.55,2.02,'cream');if(f===1)box(.12,1.3,.12,x,y,2.07,'wood',.5);}}
  for(const x of[-2.3,-.8,.8,2.3])box(.35,1+(x<0?.6:0),.4,x,6.25,-1.6,'wall');box(2.2,.2,2, -1.2,5.9,0,'dark',-.16);rubble();
  for(let i=0;i<10;i++)box(.38,.6,.14,2.25-i%2*.35,5.4-i*.45,2.04,'leaf',.3);
 }else if(id==='shop'){
  box(5,2.9,3.2,0,1.45,0,'wall');box(5.3,.2,3.5,0,3,0,'rust');for(const x of[-1.55,1.55])box(1.65,1.45,.1,x,1.25,1.65,'glass');box(.85,2.1,.12,0,1.05,1.66,'dark');sign('LAST STOP',4.5,.58,0,2.52,1.72);
  for(let i=0;i<8;i++)box(.65,.1,1.05,-2.3+i*.65,2.1,2.13,i%2?'cream':'teal',-.1);box(.12,1.3,.15,-1.6,1.2,1.78,'wood',.6);rubble(5);
 }else if(id==='ruin'){
  for(let f=0;f<3;f++){box(4.5,.2,3.5,0,.2+f*1.7,0,'sand');for(const x of[-2,2])for(const z of[-1.5,1.5])box(.32,1.7,.32,x,1+f*1.7,z,'wall');}box(.25,4.8,3.5,-2.1,2.4,0,'wall');box(2.2,2.6,.25,-1.1,1.3,-1.6,'wall');box(2.3,.22,2,1,3.05,.7,'sand',-.45);for(let i=0;i<5;i++)box(.045,1,.045,-1.9+i*.3,4.1,1.4,'rust',.15);rubble(15);
 }else if(id==='car'||id==='van'){
 const van=id==='van';box(1.9,.65,3.7,0,.8,0,van?'cream':'teal');box(1.7,van?1.4:.8,van?2.7:1.9,0,van?1.65:1.4,-.2,van?'teal':'sand');box(1.5,.6,.07,0,1.5,van?1.18:.79,'glass');for(const x of[-.86,.86])box(.07,.5,1.25,x,1.5,-.2,'glass');for(const x of[-1,1])for(const z of[-1.2,1.2]){const m=cyl(.4,.26,x,.45,z,'dark',10);m.rotation.z=Math.PI/2;const hub=cyl(.19,.28,x,.45,z,'rust');hub.rotation.z=Math.PI/2;}for(const x of[-.65,.65])box(.35,.18,.09,x,.85,1.9,'cream');box(1.95,.13,.15,0,.55,1.94,'rust');box(.45,.1,.8,-.4,1.16,1.35,'rust',.1);box(.9,.1,.8,.2,van?2.38:1.86,-.2,'rust',.12);
 }else if(id==='tree'||id==='dead-tree'){
 cyl(.22,2.7,0,1.35,0,'wood',6);for(const side of[-1,1]){const m=cyl(.1,1.5,side*.4,2.1,0,'wood',5);m.rotation.z=side*-.6;}if(id==='tree')for(let i=0;i<5;i++){const m=new T.Mesh(new T.IcosahedronGeometry(1,0),mat(i%2?'leaf':0x96a16a));m.position.set(Math.sin(i*2)*.65,2.8+i*.23,Math.cos(i*2)*.55);m.scale.set(1.25,1.05,1.1);m.castShadow=true;g.add(m);}else box(.11,1,.12,.32,3.1,0,'wood',-.3);
 }else if(id==='signal'){
 cyl(.075,4.4,0,2.2,0,'dark');box(2,.1,.1,.85,4.3,0,'dark');box(.5,1.2,.38,1.7,3.85,0,'dark');for(let i=0;i<3;i++){const m=cyl(.14,.06,1.7,4.2-i*.35,.22,[0xc07855,0xd4ba72,0x749480][i]);m.rotation.x=Math.PI/2;}box(.3,.15,.3,0,.08,0,'sand');
 }else if(id==='barrels'){
 for(let i=0;i<3;i++){const x=(i-1)*.8,z=i===1?-.6:0;cyl(.36,1,x,.5,z,i===1?'teal':'rust',10);for(const y of[.17,.82])cyl(.38,.065,x,y,z,'dark',10);box(.24,.23,.025,x,.53,z+.36,'cream');}
 }else if(id==='barricade'){
 box(3,.9,.65,0,.55,0,'sand');box(3.3,.2,.9,0,.1,0,'dark');for(let i=0;i<6;i++)box(.23,.55,.03,-1.2+i*.46,.56,.34,i%2?'cream':'rust',-.4);box(.5,.08,.35,.8,1.03,0,'rust',.08);
 }else if(id==='container'){
 box(4.5,2.2,2,0,1.1,0,'teal');for(let i=0;i<15;i++)box(.07,2.1,.07,-2.1+i*.3,1.1,1.03,'dark');for(const x of[-1.1,1.1]){box(2.1,2,.06,x,1.1,-1.03,'teal');box(.06,1.9,.08,x,1.1,-1.1,'rust');}box(1,.15,.7,1.5,2.25,.4,'rust');
 }else rubble(18);
 g.name=id;g.userData.assetId=id;return applyRigidUpgrade(g,'gallery-'+id);
}
export const cityAssets=[
 ['apartment','덩굴 아파트','건물','바랜 외벽, 판자로 막은 창문, 부서진 옥상과 덩굴.'],['shop','마지막 정류장 상점','건물','청록색 간판과 줄무늬 차양을 갖춘 작은 거리 상점.'],['ruin','붕괴한 콘크리트 골조','건물','노출된 기둥과 철근, 기울어진 바닥판과 잔해.'],['car','방치된 세단','차량','바랜 청록 차체, 녹슨 보닛과 각진 바퀴.'],['van','폐배달 밴','차량','높은 적재실과 낡은 투톤 도장의 배달 차량.'],['tree','도시를 되찾는 나무','자연','다섯 덩어리의 각진 수관과 갈라진 가지.'],['dead-tree','마른 나무','자연','잎이 사라지고 가지가 드러난 거리의 고목.'],['signal','낡은 신호등','거리 소품','긴 가로대와 바랜 삼색 신호등.'],['barrels','녹슨 드럼통 묶음','거리 소품','청록과 적갈색 드럼통, 금속 띠와 작은 라벨.'],['barricade','도로 차단물','거리 소품','콘크리트 받침과 비스듬한 경고 무늬.'],['container','방치된 화물 컨테이너','거리 소품','골판 외벽, 문 잠금봉과 녹슨 지붕.'],['rubble','붕괴 잔해 더미','거리 소품','크기와 각도가 다른 콘크리트·벽돌 조각.']
].map(([id,name,category,description])=>({id,name,category,description}));

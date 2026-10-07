import * as T from 'three';

export const houseVariants=[
 {name:'벽돌 연립주택',use:'주택',width:8,depth:8.5,floors:3,columns:3,damage:[3,3,3],seed:31,escape:true},
 {name:'지붕이 무너진 주택',use:'주택',width:8.4,depth:8,floors:3,columns:3,damage:[3,3,2],seed:73},
 {name:'코너 식료품점',use:'가게 · GROCERY',width:10,depth:9,floors:3,columns:4,damage:[3,3,3,2],seed:117,shop:'GROCERY'},
 {name:'폐업한 세탁소',use:'가게 · LAUNDRY',width:9,depth:8,floors:2,columns:3,damage:[2,2,2],seed:159,shop:'LAUNDRY'},
 {name:'외벽이 뜯긴 주택',use:'주택 · 내부 노출',width:8.6,depth:8.8,floors:4,columns:3,damage:[4,2,3],seed:203,escape:true,sideHole:true},
 {name:'무너진 작은 식당',use:'가게 · DINER',width:9.5,depth:9,floors:2,columns:3,damage:[2,2,1],seed:247,shop:'DINER'},
 {name:'한쪽이 붕괴한 아파트',use:'주택 · 반파',width:10.4,depth:9.5,floors:4,columns:4,damage:[4,3,1,1],seed:293,sideHole:true},
 {name:'폐허가 된 서점',use:'가게 · BOOKS',width:8.8,depth:8.4,floors:3,columns:3,damage:[2,1,1],seed:337,shop:'BOOKS',sideHole:true},
 {name:'벽만 남은 주택',use:'주택 · 잔존 벽',width:8.3,depth:8.6,floors:3,columns:3,damage:[1,0,1],seed:379,ruin:true,sideHole:true},
 {name:'완전히 붕괴한 건물',use:'완전 붕괴 · 잔해',width:10,depth:9,floors:3,columns:4,damage:[0,1,0,0],seed:421,ruin:true,sideHole:true},
];
const cache=new Map();let materials;
function random(seed){return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
function mats(){if(materials)return materials;const brick=new T.MeshStandardMaterial({color:0xffffff,roughness:1,vertexColors:true}),detail=new T.MeshStandardMaterial({color:0xffffff,roughness:1,side:T.DoubleSide,vertexColors:true});if(typeof document!=='undefined'){const loader=new T.TextureLoader();brick.map=loader.load(new URL('./textures/houses/red-brick.jpg',document.baseURI).href);brick.map.wrapS=brick.map.wrapT=T.RepeatWrapping;brick.map.colorSpace=T.SRGBColorSpace;brick.map.anisotropy=4;detail.map=loader.load(new URL('./textures/houses/ruined-details.jpg',document.baseURI).href);detail.map.colorSpace=T.SRGBColorSpace;detail.map.anisotropy=4;}const signMaterial=new T.MeshStandardMaterial({color:0xffffff,roughness:1,vertexColors:true});if(typeof document!=='undefined'){const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=256;const ctx=canvas.getContext('2d');['GROCERY','LAUNDRY','DINER','BOOKS'].forEach((word,i)=>{ctx.fillStyle=['#343e32','#283b41','#5a3330','#46342c'][i];ctx.fillRect(0,i*64,1024,64);ctx.strokeStyle='#b9a98d';ctx.strokeRect(10,i*64+6,1004,52);ctx.fillStyle='#bbae92';ctx.font='bold 45px Georgia';ctx.textAlign='center';ctx.fillText(word,512,i*64+49);for(let j=0;j<140;j++){ctx.fillStyle='rgba(20,17,15,.24)';ctx.fillRect((j*137+i*73)%1024,i*64+(j*31)%64,3+(j%8),2);}});signMaterial.map=new T.CanvasTexture(canvas);signMaterial.map.colorSpace=T.SRGBColorSpace;}materials=[brick,detail,new T.MeshStandardMaterial({color:0x827d70,roughness:1,vertexColors:true}),new T.MeshStandardMaterial({color:0x28282a,roughness:1,vertexColors:true}),new T.MeshStandardMaterial({color:0x514439,roughness:1,vertexColors:true}),signMaterial];return materials;}
class Parts{
 constructor(){this.p=[];this.uv=[];this.c=[];}
 face(points,uv,tint=[1,1,1]){for(const k of [0,1,2,0,2,3]){this.p.push(...points[k]);this.uv.push(...uv[k]);this.c.push(...tint);}}
 box(x,y,z,w,h,d,tint=[1,1,1],rotation=0){const points=[[-w/2,-h/2,-d/2],[w/2,-h/2,-d/2],[w/2,h/2,-d/2],[-w/2,h/2,-d/2],[-w/2,-h/2,d/2],[w/2,-h/2,d/2],[w/2,h/2,d/2],[-w/2,h/2,d/2]].map(([a,b,c])=>[x+a*Math.cos(rotation)+c*Math.sin(rotation),y+b,z-a*Math.sin(rotation)+c*Math.cos(rotation)]);for(const [face,u,v] of [[[4,5,6,7],w,h],[[1,0,3,2],w,h],[[5,1,2,6],d,h],[[0,4,7,3],d,h],[[7,6,2,3],w,d],[[0,1,5,4],w,d]])this.face(face.map(k=>points[k]),[[0,0],[u/2.2,0],[u/2.2,v/2.2],[0,v/2.2]],tint);}
 decal(x,y,z,w,h,tile,tint=[1,1,1]){const col=tile%3,row=Math.floor(tile/3),pad=.004,u=col/3,v=1-(row+1)/2;this.face([[x-w/2,y-h/2,z],[x+w/2,y-h/2,z],[x+w/2,y+h/2,z],[x-w/2,y+h/2,z]],[[u+pad,v+pad],[u+1/3-pad,v+pad],[u+1/3-pad,v+.5-pad],[u+pad,v+.5-pad]],tint);}
 geometry(){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(this.p,3));g.setAttribute('uv',new T.Float32BufferAttribute(this.uv,2));g.setAttribute('color',new T.Float32BufferAttribute(this.c,3));g.computeVertexNormals();g.computeBoundingBox();g.computeBoundingSphere();return g;}
}
function build(index){const d=houseVariants[index],r=random(d.seed),parts=Array.from({length:6},()=>new Parts()),[brick,detail,stone,iron,wood,sign]=parts,w=d.width,depth=d.depth,cw=w/d.columns,story=3.2,front=depth/2,shade=.9+(index%3)*.04;
 stone.box(0,.12,0,w+.5,.24,depth+.5);
 if(d.ruin){
  const height=index===8?1.7:1.05;
  for(let j=0;j<7;j++){const x=-w/2+(j+.5)*w/7;if(j%3===1)continue;const h=.35+r()*height;brick.box(x,.24+h/2,front,w/7-.05,h,.34,[.80,.80,.80]);for(let k=0;k<3;k++)brick.box(x+(k-1)*w/22,.24+h+.05+r()*.15,front,.26,.12+r()*.18,.34,[.78,.78,.78]);}
  for(const side of [-1,1])for(let j=0;j<5;j++){if(j%3===1)continue;const z=-depth/2+(j+.5)*depth/5,h=.3+r()*height;brick.box(side*w/2,.24+h/2,z,.35,h,depth/5-.1,[.76,.76,.76]);}
  if(index===8){brick.box(-w*.28,1.45,-depth/2,w*.34,2.42,.35,[.74,.74,.74]);detail.decal(-w*.28,1.62,-depth/2+.18,1.4,1.65,2,[.78,.78,.78]);}
  for(let i=0;i<100;i++){const x=(r()-.5)*(w+1.8),z=(r()-.5)*(depth+1.8),h=.12+r()*.3,mound=Math.max(0,1-Math.hypot(x/w,z/depth)*2)*r()*.6;const target=i%5===0?stone:brick;target.box(x,.24+h/2+mound,z,.18+r()*.50,h,.20+r()*.5,[.70,.68,.66],r()*Math.PI);}
  for(let i=0;i<6;i++){const x=(r()-.5)*w*.8,z=(r()-.5)*depth*.8;stone.box(x,.35+r()*.12,z,1+r()*1.3,.18,1+r()*.9,[.7,.7,.7],r()*Math.PI);wood.box(x,.48,z,.12,.14,1.6+r()*1.7,[.7,.7,.7],r()*Math.PI);}
  return parts.map(p=>p.geometry());
 }
 for(let c=0;c<d.columns;c++){const x=-w/2+cw*(c+.5),height=d.damage[c];for(let f=0;f<height;f++){const y=.24+f*story,shop=f===0&&d.shop,door=f===0&&!d.shop&&c===1,openingW=cw*(shop?.77:.56),openingH=shop?2.35:door?2.4:1.85,lower=door||shop?.16:.75,upper=story-lower-openingH,pillar=(cw-openingW)/2;
   brick.box(x,y+lower/2,front,cw,lower,.30,[shade,shade,shade]);brick.box(x,y+lower+openingH+upper/2,front,cw,upper,.30,[shade,shade,shade]);for(const sign of [-1,1])brick.box(x+sign*(cw-pillar)/2,y+lower+openingH/2,front,pillar,openingH,.30,[shade,shade,shade]);
   detail.decal(x,y+lower+openingH/2,front-.06,openingW,openingH,shop?(c===1?4:3):door?5:(f+c+index)%3);
   stone.box(x,y+lower-.025,front+.08,openingW+.20,.10,.40);if(!shop&&!door)stone.box(x,y+lower+openingH+.06,front+.08,openingW+.22,.15,.40);
   // Interior floor fragments remain visible through missing exterior walls.
   stone.box(x,y+.10,0,cw-.12,.16,depth-.38,[.7,.7,.7]);for(let j=0;j<2;j++)wood.box(x+(j-.5)*cw*.44,y+.23,0,.10,.17,depth-.48);
 }
 if(height>0){const cap=.24+height*story;const broken=height<d.floors,roofDepth=d.ruin?depth*.25:broken?depth*.42:depth*.94;iron.box(x,cap+.05,-depth/2+roofDepth/2+.2,cw-.06,.14,roofDepth);if(!broken){brick.box(x,cap+.27,front,cw,.38,.34,[shade,shade,shade]);stone.box(x,cap+.49,front+.03,cw+.08,.11,.46);}}
 }
 // Side/back walls are subdivided so damage produces real open silhouettes.
 for(const sign of [-1,1])for(let j=0;j<4;j++){const z=-depth/2+depth/4*(j+.5);let levels=Math.min(d.floors,d.damage[sign<0?0:d.columns-1]);if(d.ruin)levels=j%2?0:1;for(let f=0;f<levels;f++){if(d.sideHole&&((j===2&&f===1)||(j===1&&f===2))){const bottom=.24+f*story,edge=depth/4;for(let k=0;k<7;k++){const zz=z-edge/2+(k+.5)*edge/7,chip=.10+r()*.28;brick.box(sign*w/2,bottom+chip/2,zz,.32,chip,edge/7);brick.box(sign*w/2,bottom+story-chip/2,zz,.32,chip,edge/7);}for(let k=0;k<6;k++){const yy=bottom+(k+.5)*story/6,chip=.07+r()*.18;for(const e of [-1,1])brick.box(sign*w/2,yy,z+e*(edge/2-chip/2),.31,story/6,chip);}continue;}brick.box(sign*w/2,.24+(f+.5)*story,z,.30,story,depth/4,[shade*.94,shade*.94,shade*.94]);if(!d.ruin&&j%2===0){const sx=sign*(w/2+.153),y=.24+f*story+1.70,hw=.60,hh=.88,tile=(j+f+index)%3,u=tile/3,v=.5,pad=.004;const points=[[sx,y-hh,z+sign*hw],[sx,y-hh,z-sign*hw],[sx,y+hh,z-sign*hw],[sx,y+hh,z+sign*hw]];detail.face(points,[[u+pad,v+pad],[u+1/3-pad,v+pad],[u+1/3-pad,1-pad],[u+pad,1-pad]]);}}}
 for(let c=0;c<d.columns;c++)for(let f=0;f<d.damage[c];f++){if(d.ruin&&c%2===0)continue;brick.box(-w/2+cw*(c+.5),.24+(f+.5)*story,-depth/2,cw,story,.30,[shade*.86,shade*.86,shade*.86]);}
 // Ragged masonry crowns and scattered collapse rubble, all merged by material.
 for(let c=0;c<d.columns;c++){if(d.damage[c]===d.floors)continue;const y=.24+d.damage[c]*story;for(let j=0;j<6;j++)brick.box(-w/2+cw*(c+(j+.5)/6),y+.10+r()*.17,front,.30+r()*.1,.18+r()*.25,.32,[.8,.8,.8],(r()-.5)*.15);}
 const debris=d.ruin?85:d.sideHole?40:22;for(let i=0;i<debris;i++){const x=(r()-.5)*(w+2.2),z=(r()-.5)*(depth+2.2),h=.14+r()*.35;const material=i%4===0?stone:brick;material.box(x,.24+h/2,z,.25+r()*.48,h,.24+r()*.52,[.7+r()*.2,.7,.68],r()*Math.PI);}
 if(d.escape){const x=-w/2+cw*.5;for(let f=1;f<d.damage[0];f++){const y=.24+f*story+.56;iron.box(x,y,front+.65,1.8,.10,1.2);for(const sign of [-1,1]){iron.box(x+sign*.87,y+.46,front+1.19,.05,.90,.05);iron.box(x+sign*.87,y+.92,front+.65,.05,.05,1.2);}iron.box(x,y+.92,front+1.19,1.8,.05,.05);for(let k=0;k<6;k++)iron.box(x-.75+k*.30,y+.46,front+1.19,.035,.9,.035);for(const sign of [-1,1])iron.box(x+sign*.34,y-1.25,front+.80,.06,2.7,.07);for(let k=0;k<9;k++)iron.box(x,y-2.4+k*.29,front+.80,.75,.05,.08);}}
 if(d.shop){iron.box(0,3.15,front+.23,w*.84,.40,.10);const row=['GROCERY','LAUNDRY','DINER','BOOKS'].indexOf(d.shop),v=1-(row+1)/4;sign.face([[-w*.41,2.98,front+.29],[w*.41,2.98,front+.29],[w*.41,3.32,front+.29],[-w*.41,3.32,front+.29]],[[0,v],[1,v],[1,v+.25],[0,v+.25]]);}
 return parts.map(p=>p.geometry());
}
export function createBrickHouse(index=0){index=((index%10)+10)%10;if(!cache.has(index))cache.set(index,build(index));const root=new T.Group(),materials=mats();cache.get(index).forEach((g,i)=>{if(!g.attributes.position.count)return;const mesh=new T.Mesh(g,materials[i]);mesh.castShadow=mesh.receiveShadow=true;root.add(mesh);});root.name=houseVariants[index].name;root.userData={variant:index,triangles:root.children.reduce((n,m)=>n+m.geometry.attributes.position.count/3,0)};return root;}

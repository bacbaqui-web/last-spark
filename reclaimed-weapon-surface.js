import * as THREE from 'three';

// Small shared PBR atlases: seams, recessed fasteners, vents and rubbed paint
// live in the maps instead of adding a mesh for every surface detail.
const cache=new Map(),size=256;
const colors={sage:[82,100,88],slate:[65,96,105],sand:[137,128,106],ochre:[144,105,61],red:[114,67,58]};
const hash=(x,y)=>{const n=Math.sin(x*127.1+y*311.7)*43758.5453;return n-Math.floor(n);};
export function weaponPaint(tone='sage',panel=false){
 const key=tone+(panel?'-panel':'');if(cache.has(key))return cache.get(key);
 const rgb=new Uint8Array(size*size*4),packed=new Uint8Array(rgb.length),height=new Float32Array(size*size),base=colors[tone]||colors.sage;
 const paint=(x,y,color,h=.5,r=.73,m=.42)=>{
  if(x<0||y<0||x>=size||y>=size)return;const p=y*size+x,i=p*4,g=hash(x,y);
  for(let c=0;c<3;c++)rgb[i+c]=color[c]*(.94+g*.085);
  rgb[i+3]=packed[i+3]=255;packed[i]=255;packed[i+1]=r*255;packed[i+2]=m*255;height[p]=h;
 };
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const g=hash(x,y),cloud=hash(Math.floor(x/15),Math.floor(y/15)),edge=Math.min(x,y,size-1-x,size-1-y);
  const chip=(edge<2&&g>.57)||(g>.998&&cloud>.7);
  const rust=chip&&cloud>.78;
  paint(x,y,rust?[103,72,48]:chip?[157,160,150]:base.map(c=>c*(.93+cloud*.10)),.5+(g-.5)*.012,chip?.49:.73,rust?.06:chip?.85:.42);
 }
 const rect=(x,y,w,h,c,z=.5,r=.73,m=.42)=>{for(let py=y;py<y+h;py++)for(let px=x;px<x+w;px++)paint(px,py,c,z,r,m);};
 if(panel){
  const dark=base.map(c=>c*.46),light=base.map(c=>c*1.21);
  for(const y of[19,229]){rect(15,y,226,2,dark,.35);rect(17,y+2,222,1,light,.55);}
  for(const x of[15,240])rect(x,20,1,209,dark,.35);
  // Offset service hatch, a short serial strip and six recessed cooling slots.
  rect(148,124,75,73,dark,.37);rect(150,126,71,69,base.map(c=>c*.90),.47);
  for(let i=0;i<6;i++){rect(159,136+i*8,54,3,[31,39,37],.16,.89,.12);rect(159,139+i*8,54,1,light,.52);}
  rect(32,169,78,22,[177,176,153],.51,.85,.05);
  for(let i=0;i<17;i++)rect(38+i*4,174,1+i%2,12-i%4,[44,52,47],.51);
  rect(34,60,72,4,dark,.40);rect(34,68,43,2,dark,.40);
  rect(34,96,180,12,dark,.30);rect(37,100,148,3,light,.51);rect(190,88,13,29,[58,67,61],.61,.42,.77);
  for(const [x,y]of[[26,31],[230,31],[26,218],[230,218],[158,73],[211,178]])for(let dy=-4;dy<=4;dy++)for(let dx=-4;dx<=4;dx++){
   const r=Math.hypot(dx,dy);if(r>4)continue;paint(x+dx,y+dy,r>3?dark:Math.abs(dy)<.8&&Math.abs(dx)<2.7?[39,44,42]:[144,151,142],r>3?.2:.6,.45,.85);
  }
 }
 // Restrained individual scuffs, no blanket orange rust.
 for(let i=0;i<115;i++){
  const x=Math.floor(hash(i,32)*size),y=Math.floor(hash(i,74)*size),len=2+Math.floor(hash(i,8)*19);
  for(let k=0;k<len;k++)if(hash(i,k)>.24)paint(x+k,y+Math.floor(k*.2),[151,153,140],.42,.55,.82);
 }
 const normal=new Uint8Array(rgb.length);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const h=(a,b)=>height[((b+size)%size)*size+(a+size)%size],n=new THREE.Vector3((h(x-1,y)-h(x+1,y))*.9,(h(x,y-1)-h(x,y+1))*.9,1).normalize(),i=(y*size+x)*4;
  normal[i]=(n.x*.5+.5)*255;normal[i+1]=(n.y*.5+.5)*255;normal[i+2]=(n.z*.5+.5)*255;normal[i+3]=255;
 }
 function tex(data,srgb=false){const t=new THREE.DataTexture(data,size,size);t.colorSpace=srgb?THREE.SRGBColorSpace:THREE.NoColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.magFilter=THREE.LinearFilter;t.minFilter=THREE.LinearMipmapLinearFilter;t.generateMipmaps=true;t.needsUpdate=true;return t;}
 const surface=tex(packed),material=new THREE.MeshStandardMaterial({name:'weapon-'+key,map:tex(rgb,true),normalMap:tex(normal),normalScale:new THREE.Vector2(.48,.48),roughnessMap:surface,metalnessMap:surface,roughness:1,metalness:1});
 material.userData.sharedWeaponMaterial=true;cache.set(key,material);return material;
}

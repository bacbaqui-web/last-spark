import * as THREE from 'three';
import {EQUIPMENT_PAINTS} from './exoskeleton-surface.js';
const cache=new Map(),fract=n=>n-Math.floor(n),hash=(x,y)=>fract(Math.sin(x*127.1+y*311.7)*43758.5453);
// Cotton twill / Cordura: woven fibers, dye wear and stitches, with no metallic rust on cloth.
export function equipmentFabric(paint='teal',{camo=false,trim=false,knit=false}={}){
 const key=`${paint}-${camo}-${trim}-${knit}`;if(cache.has(key))return cache.get(key);
 const size=512,pixels=size*size,color=new Uint8Array(pixels*4),normal=new Uint8Array(pixels*4),rough=new Uint8Array(pixels*4);
 const rgb=new THREE.Color(EQUIPMENT_PAINTS[paint]?.color||EQUIPMENT_PAINTS.teal.color).convertLinearToSRGB().toArray().map(v=>v*255);
 const yarnHeight=(u,v)=>{
   const x=fract(u*64)-.5,y=fract(v*72)-.5;
   const distance=(ax,ay,bx,by)=>{const dx=bx-ax,dy=by-ay,t=THREE.MathUtils.clamp(((x-ax)*dx+(y-ay)*dy)/(dx*dx+dy*dy),0,1);return Math.hypot(x-ax-t*dx,y-ay-t*dy);};
   const d=Math.min(distance(-.31,.46,0,-.40),distance(.31,.46,0,-.40));
   return Math.exp(-d*d/.016)*(trim?.80+.20*Math.cos(u*Math.PI*64*2):1);
 };
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
   const i=(y*size+x)*4,u=x/size,v=y/size,grain=hash(x,y),weave=((x+Math.floor(y/2))%4<2?1:-1)*.035;
   const fade=(camo?.72:.86)+.017*Math.sin(x*.027+y*.010)+.012*Math.sin(y*.012-x*.009),edge=Math.min(u,1-u,v,1-v);
   let shade=fade+weave+(grain-.5)*.055+(edge<.018?.08:0);
   if(trim)shade*=.58;
   if(camo){
     const patch=hash(Math.floor(x/28),Math.floor(y/23)),fine=hash(Math.floor(x/9),Math.floor(y/9));
     shade*=patch>.72&&fine>.24?.55:patch<.25&&fine>.32?1.20:patch>.45? .84:1;
   }
   const seam=(x>17&&x<24||x>size-25&&x<size-18||y>17&&y<24||y>size-25&&y<size-18);
   const stitch=seam&&((x+y)%15<7);
   for(let c=0;c<3;c++)color[i+c]=stitch?rgb[c]*1.19:rgb[c]*shade;
   color[i+3]=255;normal[i]=128+Math.sin(x*Math.PI/2)*7;normal[i+1]=128+Math.sin(y*Math.PI/2)*7;normal[i+2]=254;normal[i+3]=255;
   rough[i]=rough[i+2]=255;rough[i+1]=239+grain*15;rough[i+3]=255;
   if(knit){
     const h=yarnHeight(u,v),fiber=Math.sin((x+y*.34)*2.8)*.021+(grain-.5)*.065;
     const shade=(.68+h*.30+fiber)*(trim?.83:1);
     for(let c=0;c<3;c++)color[i+c]=rgb[c]*shade;
     const dx=(yarnHeight(u-1/size,v)-yarnHeight(u+1/size,v))*.65,dy=(yarnHeight(u,v-1/size)-yarnHeight(u,v+1/size))*.65,length=Math.hypot(dx,dy,1);
     normal[i]=(dx/length*.5+.5)*255;normal[i+1]=(dy/length*.5+.5)*255;normal[i+2]=(1/length*.5+.5)*255;
     rough[i+1]=248+grain*7;
   }
 }
 const texture=(data,srgb=false)=>{const t=new THREE.DataTexture(data,size,size);t.colorSpace=srgb?THREE.SRGBColorSpace:THREE.NoColorSpace;t.generateMipmaps=true;t.minFilter=THREE.LinearMipmapLinearFilter;t.magFilter=THREE.LinearFilter;t.needsUpdate=true;return t;};
 const m=new THREE.MeshStandardMaterial({name:'fabric-'+key,map:texture(color,true),normalMap:texture(normal),roughnessMap:texture(rough),roughness:1,metalness:0,normalScale:new THREE.Vector2(.32,.32)});
 m.userData.sharedSalvageMaterial=true;m.userData.surfaceKind='fabric';m.userData.paint=paint;m.userData.weave=knit?'knit':'twill';m.userData.salvageColor=new THREE.Color(EQUIPMENT_PAINTS[paint]?.color||EQUIPMENT_PAINTS.teal.color).multiplyScalar(trim?(knit?.72:.55):.86);cache.set(key,m);return m;
}

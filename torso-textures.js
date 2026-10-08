import * as THREE from 'three';
import {EQUIPMENT_PAINTS} from './exoskeleton-surface.js';

const cache=new Map(),assets=new Map(),types=['tshirt','vest','medic'];
let loading;
const fallback=new THREE.DataTexture(new Uint8Array([180,180,180,255]),1,1);
fallback.colorSpace=THREE.SRGBColorSpace;fallback.needsUpdate=true;
function texture(canvas,srgb=false){
  const t=new THREE.CanvasTexture(canvas);t.colorSpace=srgb?THREE.SRGBColorSpace:THREE.NoColorSpace;
  t.minFilter=THREE.LinearMipmapLinearFilter;t.anisotropy=4;return t;
}
function maps(image,type,plain,carrier=false,device=false){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=plain?512:1024;
  const context=canvas.getContext('2d',{willReadFrequently:true}),size=canvas.width;
  if(plain){
    // Sample only the unadorned margin for the back, sleeves and neck guard.
    // Repeating a narrow photographic patch retains the original fiber scale.
    const iw=image.width,ih=image.height;
    const [u,v,w,h]=type==='medic'?[.035,.022,.21,.11]:type==='tshirt'?[.012,.016,.075,.12]:[.012,.08,.080,.35];
    const tileHeight=type==='vest'?256:128;
    for(let y=0;y<size;y+=tileHeight)for(let x=0;x<size;x+=128)context.drawImage(image,iw*u,ih*v,iw*w,ih*h,x,y,128,tileHeight);
  }else if(device){
    // Reuse the photographed service panels on the projecting repair cartridge.
    context.drawImage(image,image.width*.11,image.height*.23,image.width*.78,image.height*.34,0,0,size,size);
    const cx=size*.5,cy=size*.49;
    context.fillStyle='#334943';context.fillRect(cx-size*.125,cy-size*.22,size*.25,size*.48);
    context.fillStyle='#87dbc0';context.fillRect(cx-size*.029,cy-size*.135,size*.058,size*.27);context.fillRect(cx-size*.092,cy-size*.042,size*.184,size*.084);
    context.textAlign='center';context.font=`600 ${size*.030}px sans-serif`;context.fillStyle='#43564f';context.fillText('AUTO REPAIR',cx,size*.17);
    context.font=`500 ${size*.022}px sans-serif`;context.fillText('R-01 / RESTORE',cx,size*.86);
    context.fillStyle='#87dbc0';for(let n=0;n<3;n++)context.fillRect(cx-size*.070+n*size*.051,size*.74,size*.037,size*.013);
  }else{
    context.drawImage(image,0,0,size,size);
    if(carrier){
      // The four pouches now have geometry. Fill their former printed silhouettes
      // with the same unadorned cloth so the carrier does not show duplicate pockets.
      const left=Math.round(size*.12),right=Math.round(size*.888),top=Math.round(size*.46),bottom=Math.round(size*.964);
      context.save();context.beginPath();context.rect(left,top,right-left,bottom-top);context.clip();
      for(let y=top;y<bottom;y+=128)for(let x=left;x<right;x+=96)
        context.drawImage(image,image.width*.012,image.height*.08,image.width*.080,image.height*.35,x,y,96,128);
      context.restore();
    }
  }
  const source=context.getImageData(0,0,size,size).data;
  const normalCanvas=document.createElement('canvas'),roughCanvas=document.createElement('canvas');
  normalCanvas.width=roughCanvas.width=normalCanvas.height=roughCanvas.height=size;
  const normalContext=normalCanvas.getContext('2d'),roughContext=roughCanvas.getContext('2d');
  const normals=normalContext.createImageData(size,size),rough=roughContext.createImageData(size,size);
  const at=(x,y)=>{const i=(Math.max(0,Math.min(size-1,y))*size+Math.max(0,Math.min(size-1,x)))*4;return (source[i]*.2126+source[i+1]*.7152+source[i+2]*.0722)/255;};
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const i=(y*size+x)*4,l=at(x,y),dx=(at(x-1,y)-at(x+1,y))*1.8,dy=(at(x,y+1)-at(x,y-1))*1.8;
    const length=Math.hypot(dx,dy,1);
    normals.data.set([(dx/length*.5+.5)*255,(dy/length*.5+.5)*255,(1/length*.5+.5)*255,255],i);
    const r=type==='medic'?173+(1-l)*48:232+(1-l)*22;rough.data.set([r,r,r,255],i);
  }
  normalContext.putImageData(normals,0,0);roughContext.putImageData(rough,0,0);
  return {map:texture(canvas,true),normalMap:texture(normalCanvas),roughnessMap:texture(roughCanvas)};
}
export function loadTorsoTextures(){
  if(typeof document==='undefined')return Promise.resolve();
  if(loading)return loading;
  loading=Promise.all(types.map(async type=>{
    const image=await new THREE.ImageLoader().loadAsync(`${import.meta.env?.BASE_URL||'/'}textures/torso/${type}-front-v1.png`);
    const set={front:maps(image,type,false),plain:maps(image,type,true)};
    if(type==='vest')set.carrier=maps(image,type,false,true);assets.set(type,set);
    if(type==='medic')set.device=maps(image,type,false,false,true);
    for(const material of cache.values())if(material.userData.torsoType===type){Object.assign(material,set[material.userData.torsoRegion]);material.needsUpdate=true;}
  }));
  return loading;
}
export function torsoSurface(type,paint,region='front'){
  const key=`${type}-${paint}-${region}`;if(cache.has(key))return cache.get(key);
  const cloth=type!=='medic',base=new THREE.Color(EQUIPMENT_PAINTS[paint]?.color||EQUIPMENT_PAINTS.steel.color);
  const material=new THREE.MeshStandardMaterial({name:'photo-torso-'+key,color:base.clone().multiplyScalar(cloth?2.3:1.45),
    map:fallback,roughness:cloth?1:.88,metalness:cloth?0:.25,normalScale:new THREE.Vector2(cloth?.55:.4,cloth?.55:.4)});
  for(const channel of['r','g','b'])material.color[channel]=Math.min(1,material.color[channel]);
  Object.assign(material.userData,{sharedSalvageMaterial:true,surfaceKind:cloth?'fabric':'painted-metal',salvageColor:base,
    torsoType:type,torsoRegion:region,textureDetail:'photographic-torso'});
  if(assets.has(type))Object.assign(material,assets.get(type)[region]);
  cache.set(key,material);return material;
}

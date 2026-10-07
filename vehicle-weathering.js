import * as T from 'three';
let rustTexture;
export function weatherVehicleMaterial(material,{paint=false}={}){
 if(typeof document==='undefined')return material;
 rustTexture??=new T.TextureLoader().load(new URL(import.meta.env.BASE_URL+'textures/vehicles/rusted-paint-v1.png',location.origin).href,()=>window.dispatchEvent(new Event('vehicle-texture-ready')));
 rustTexture.colorSpace=T.SRGBColorSpace;rustTexture.wrapS=rustTexture.wrapT=T.RepeatWrapping;rustTexture.anisotropy=4;
 material.map=rustTexture;material.roughness=.94;material.metalness=.08;
 if(paint){
  // Tint surviving pale paint only; corrosion keeps its brown/orange hue.
  material.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#ifdef USE_MAP
   vec4 weather=texture2D(map,vMapUv);
   float intact=smoothstep(0.18,0.50,dot(weather.rgb,vec3(0.2126,0.7152,0.0722)));
   diffuseColor.rgb=weather.rgb*mix(vec3(1.0),diffuseColor.rgb,intact);
  #endif`);};material.customProgramCacheKey=()=> 'weathered-car-paint-v1';
 }
 material.needsUpdate=true;return material;
}
export function vehicleSurfaceUV(geometry){
 const p=geometry.getAttribute('position'),n=geometry.getAttribute('normal'),uv=[];
 for(let i=0;i<p.count;i++){
  const x=Math.abs(n.getX(i)),y=Math.abs(n.getY(i)),z=Math.abs(n.getZ(i));
  const u=y>=x&&y>=z?p.getX(i):x>=z?p.getZ(i):p.getX(i),v=y>=x&&y>=z?p.getZ(i):p.getY(i);
  uv.push(u/2.6+.37,v/2.6+.19);
 }
 geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));return geometry;
}

import * as T from 'three';
const textures=new Map();
function texture(file){if(!textures.has(file)){const map=new T.TextureLoader().load(new URL('./textures/vehicles/'+file,document.baseURI).href);map.colorSpace=T.SRGBColorSpace;map.wrapS=map.wrapT=T.RepeatWrapping;map.anisotropy=4;textures.set(file,map);}return textures.get(file);}
export function createRecolorableCarMaterial(color,rust){
 const material=new T.MeshStandardMaterial({color:0xffffff,roughness:.9,metalness:.12,vertexColors:true,side:T.DoubleSide}),paint={value:new T.Color(color)},amount={value:rust};material.userData.paint=paint;material.userData.rust=amount;
 if(typeof document==='undefined')return material;
 material.map=texture('suv-planar-atlas-v2.png');const rustMap=texture('rotten-steel-v2.png');
 material.onBeforeCompile=shader=>{
  shader.uniforms.carPaint=paint;shader.uniforms.carRustAmount=amount;shader.uniforms.carRustMap={value:rustMap};
  shader.vertexShader='varying vec3 carSurface;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ncarSurface=position;');
  shader.fragmentShader='uniform vec3 carPaint; uniform float carRustAmount; uniform sampler2D carRustMap; varying vec3 carSurface;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#ifdef USE_MAP
   vec4 base=texture2D(map,vMapUv);
   float painted=smoothstep(.035,.18,min(base.g,base.b)-base.r);
   float shade=clamp((base.g+base.b)*1.4,.12,1.2);
   vec3 surface=mix(base.rgb,carPaint*shade,painted);
   vec2 rustUV=abs(dFdx(carSurface.x))+abs(dFdy(carSurface.x))<abs(dFdx(carSurface.z))+abs(dFdy(carSurface.z))?carSurface.zy:carSurface.xy;
   if(abs(dFdx(carSurface.y))+abs(dFdy(carSurface.y))<.01)rustUV=carSurface.xz;
   vec3 corrosion=texture2D(carRustMap,rustUV/2.0+vec2(.37,.19)).rgb;
   float grain=dot(corrosion,vec3(.2126,.7152,.0722));
   float pattern=clamp(grain*3.0+.35+.15*sin(carSurface.y*3.0+carSurface.z*2.0),0.0,1.0);
   float coverage=smoothstep(1.0-carRustAmount-.10,1.0-carRustAmount+.10,pattern);
   coverage=max(coverage,smoothstep(.80,1.0,carRustAmount));
   coverage*=smoothstep(0.0,.05,carRustAmount);
   vec3 rustColor=corrosion;
   surface=mix(surface,rustColor,coverage*painted);
   diffuseColor.rgb*=surface;
  #endif`);
 };material.customProgramCacheKey=()=> 'planar-car-paint-rotten-steel-v2';return material;
}

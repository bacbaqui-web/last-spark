import * as T from 'three';
const textures=new Map();
function texture(file){if(!textures.has(file)){const map=new T.TextureLoader().load(new URL('./textures/vehicles/'+file,document.baseURI).href);map.colorSpace=T.SRGBColorSpace;map.wrapS=map.wrapT=T.RepeatWrapping;map.anisotropy=4;textures.set(file,map);}return textures.get(file);}
export function createRecolorableCarMaterial(color,rust){
 const material=new T.MeshStandardMaterial({color:0xffffff,roughness:.9,metalness:.12,vertexColors:true,side:T.DoubleSide}),paint={value:new T.Color(color)},amount={value:rust};material.userData.paint=paint;material.userData.rust=amount;
 if(typeof document==='undefined')return material;
 material.map=texture('suv-clean-atlas-v1.png');const rustMap=texture('rusted-paint-v1.png');
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
   float rustMask=smoothstep(.03,.14,corrosion.r-corrosion.b)*(1.0-smoothstep(.18,.42,dot(corrosion,vec3(.2126,.7152,.0722))));
   vec3 rustColor=mix(vec3(.075,.026,.009),vec3(.32,.105,.025),clamp(corrosion.r*2.0,0.0,1.0));
   float lower=.35+.65*(1.0-clamp((carSurface.y-.3)/1.4,0.0,1.0));
   surface=mix(surface,rustColor,rustMask*carRustAmount*lower*painted);
   diffuseColor.rgb*=surface;
  #endif`);
 };material.customProgramCacheKey=()=> 'separate-car-paint-rust-v1';return material;
}

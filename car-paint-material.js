import * as T from 'three';
const textures=new Map();
function texture(file){if(!textures.has(file)){const map=new T.TextureLoader().load(new URL('./textures/vehicles/'+file,document.baseURI).href);map.colorSpace=T.SRGBColorSpace;map.wrapS=map.wrapT=T.RepeatWrapping;map.anisotropy=4;textures.set(file,map);}return textures.get(file);}
export function createRecolorableCarMaterial(color){
 const material=new T.MeshStandardMaterial({color:0xffffff,roughness:1,metalness:.04,vertexColors:true,side:T.DoubleSide}),paint={value:new T.Color(color)};material.userData.paint=paint;
 if(typeof document==='undefined')return material;
 material.map=texture('suv-weathered-atlas-v3.png');
 material.onBeforeCompile=shader=>{
  shader.uniforms.carPaint=paint;
  shader.fragmentShader='uniform vec3 carPaint;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#ifdef USE_MAP
   vec4 base=texture2D(map,vMapUv);
   float painted=smoothstep(.035,.18,min(base.g,base.b)-base.r);
   float shade=clamp((base.g+base.b)*1.4,.12,1.2);
   diffuseColor.rgb*=mix(base.rgb,carPaint*shade,painted);
  #endif`);
 };material.customProgramCacheKey=()=> 'fixed-weathered-car-v3';return material;
}

import * as T from 'three';
const textures=new Map();
function texture(file){if(!textures.has(file)){const map=new T.TextureLoader().load(new URL('./textures/vehicles/'+file,document.baseURI).href);map.colorSpace=T.SRGBColorSpace;map.wrapS=map.wrapT=T.RepeatWrapping;map.anisotropy=4;textures.set(file,map);}return textures.get(file);}
export function createRecolorableCarMaterial(color,file='suv-weathered-atlas-v3.png',atlas=null){
 const material=new T.MeshStandardMaterial({color:0xffffff,roughness:1,metalness:.04,vertexColors:true,side:T.DoubleSide}),paint={value:new T.Color(color)};material.userData.paint=paint;
 if(typeof document!=='undefined')material.map=texture(file);
 material.onBeforeCompile=shader=>{
  shader.uniforms.carPaint=paint;
  if(atlas)shader.uniforms.carPaintAtlas={value:new T.Vector2(atlas.columns[2],1-atlas.bottom)};
  shader.fragmentShader='uniform vec3 carPaint;\n'+(atlas?'uniform vec2 carPaintAtlas;\n':'')+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#ifdef USE_MAP
   vec4 base=texture2D(map,vMapUv);
   ${atlas?`// Relative cyan chroma also identifies faded paint in shadow.
   float cool=max(base.g,base.b);
   float cyan=(min(base.g,base.b)-base.r)/max(cool,.001);
   float body=1.0-step(carPaintAtlas.x,vMapUv.x)*step(vMapUv.y,carPaintAtlas.y);
   float painted=smoothstep(.07,.26,cyan)*smoothstep(.018,.065,cool)*body;
   float shade=clamp(dot(base.rgb,vec3(.2126,.7152,.0722))/.30,.12,1.2);`:`
   float painted=smoothstep(.035,.18,min(base.g,base.b)-base.r);
   float shade=clamp((base.g+base.b)*1.4,.12,1.2);`}
   diffuseColor.rgb*=mix(base.rgb,carPaint*shade,painted);
   diffuseColor.a*=base.a;
  #endif`);
 };material.customProgramCacheKey=()=>atlas?'fleet-weathered-paint-v4':'fixed-weathered-car-v3';return material;
}

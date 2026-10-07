import * as T from 'three';
let texture;
export function mossMaterial(material,strength=.65){
 if(typeof document!=='undefined'&&!texture){texture=new T.TextureLoader().load(new URL('./textures/street/natural-moss-lichen.jpg',document.baseURI).href);texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.colorSpace=T.SRGBColorSpace;}
 const previousCompile=material.onBeforeCompile,previousKey=material.customProgramCacheKey();
 material.onBeforeCompile=shader=>{
  previousCompile.call(material,shader);
  shader.uniforms.streetMoss={value:texture};shader.uniforms.mossStrength={value:strength};
  shader.vertexShader='varying vec3 mossWorld; varying vec3 mossNormal;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <worldpos_vertex>',`#include <worldpos_vertex>
   vec4 mossPosition=vec4(transformed,1.0);
   #ifdef USE_INSTANCING
    mossPosition=instanceMatrix*mossPosition;
   #endif
   mossWorld=(modelMatrix*mossPosition).xyz;
   mossNormal=normalize(mat3(modelMatrix)*objectNormal);`);
  shader.fragmentShader='varying vec3 mossWorld; varying vec3 mossNormal; uniform sampler2D streetMoss; uniform float mossStrength;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   vec3 mn=abs(normalize(mossNormal));
   vec2 mossUV=mn.y>max(mn.x,mn.z)?mossWorld.xz:mn.x>mn.z?mossWorld.zy:mossWorld.xy;
   vec3 mossSample=texture2D(streetMoss,mossUV*.85).rgb;
   vec3 broadSample=texture2D(streetMoss,mossUV*.19+vec2(.31,.67)).rgb;
   float mossChroma=(mossSample.g-mossSample.b)/max(.025,mossSample.r+mossSample.g+mossSample.b);
   float broadChroma=(broadSample.g-broadSample.b)/max(.025,broadSample.r+broadSample.g+broadSample.b);
   float mossMask=smoothstep(.06,.20,mossChroma)*(.25+.75*smoothstep(.04,.18,broadChroma))*mossStrength;
   vec3 mossColor=mossSample*vec3(.85,1.03,.82);
   diffuseColor.rgb=mix(diffuseColor.rgb,mossColor,mossMask);
`);
 };material.customProgramCacheKey=()=>`street-natural-moss-v3-${strength}-${previousKey}`;return material;
}

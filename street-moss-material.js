import * as T from 'three';
let texture;
export function mossMaterial(material,strength=.65){
 if(typeof document!=='undefined'&&!texture){texture=new T.TextureLoader().load(new URL('./textures/street/mossy-asphalt.jpg',document.baseURI).href);texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.colorSpace=T.SRGBColorSpace;}
 material.onBeforeCompile=shader=>{
  shader.uniforms.streetMoss={value:texture};shader.uniforms.mossStrength={value:strength};
  shader.vertexShader='varying vec3 mossWorld;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <worldpos_vertex>',`#include <worldpos_vertex>
   vec4 mossPosition=vec4(transformed,1.0);
   #ifdef USE_INSTANCING
    mossPosition=instanceMatrix*mossPosition;
   #endif
   mossWorld=(modelMatrix*mossPosition).xyz;`);
  shader.fragmentShader='varying vec3 mossWorld; uniform sampler2D streetMoss; uniform float mossStrength;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   vec3 mossSample=texture2D(streetMoss,(mossWorld.xz+mossWorld.y*vec2(.37,.61))*.48).rgb;
   float mossChroma=(mossSample.g-mossSample.b)/max(.025,mossSample.r+mossSample.g+mossSample.b);
   float mossMask=smoothstep(.07,.19,mossChroma)*mossStrength;
   vec3 mossColor=mix(vec3(.025,.065,.008),vec3(.13,.23,.035),clamp(dot(mossSample,vec3(.8)),0.0,1.0));
   diffuseColor.rgb=mix(diffuseColor.rgb,mossColor,mossMask);
   diffuseColor.rgb*=.83+.17*clamp(dot(mossSample,vec3(.333)),0.0,1.0);`);
 };material.customProgramCacheKey=()=>`street-moss-v2-${strength}`;return material;
}

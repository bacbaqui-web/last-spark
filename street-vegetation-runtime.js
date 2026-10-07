import * as T from 'three';
const sparseCache=new Map();
function sparseLeaves(source){if(sparseCache.has(source.uuid))return sparseCache.get(source.uuid);const g=new T.BufferGeometry();for(const [name,attribute] of Object.entries(source.attributes)){const values=[];for(let i=0;i<attribute.count;i+=12)for(let j=0;j<6&&i+j<attribute.count;j++)for(let k=0;k<attribute.itemSize;k++)values.push(attribute.array[(i+j)*attribute.itemSize+k]);g.setAttribute(name,new T.Float32BufferAttribute(values,attribute.itemSize));}g.computeBoundingSphere();g.boundingSphere.radius+=.25;sparseCache.set(source.uuid,g);return g;}
export const windTime={value:0};
export function windMaterial(material,kind){
 if(material.userData.streetWind)return;material.userData.streetWind=true;
 const previous=material.onBeforeCompile,previousKey=material.customProgramCacheKey();
 material.onBeforeCompile=shader=>{previous.call(material,shader);shader.uniforms.streetWindTime=windTime;shader.vertexShader='uniform float streetWindTime;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
 vec3 windWorld=(modelMatrix*vec4(position,1.0)).xyz;
 float windNear=1.0-smoothstep(25.0,65.0,distance(cameraPosition,windWorld));
 float windWeight=${kind==='grass'?'uv.y * uv.y':'0.65'};
 float breeze=sin(streetWindTime*1.3+windWorld.x*.47+windWorld.z*.31)+.35*sin(streetWindTime*2.1+windWorld.z*.8);
 transformed.x+=breeze*windWeight*windNear*${kind==='grass'?'.13':'.045'};
 transformed.z+=breeze*windWeight*windNear*${kind==='grass'?'.065':'.025'};
`);};material.customProgramCacheKey=()=>previousKey+'street-wind-'+kind;material.needsUpdate=true;
}
export function prepareVegetation(root){
 root.traverse(o=>{if(o.userData.lod){const leaves=o.children[1];windMaterial(leaves.material,'leaves');leaves.userData.vegetation=true;leaves.userData.treeLeaves=true;leaves.userData.fullLeaves=leaves.geometry;leaves.userData.sparseLeaves=sparseLeaves(leaves.geometry);leaves.userData.originalVisible=leaves.visible;leaves.castShadow=false;}});
 root.updateMatrixWorld(true);
 const items=[],walls=[];const a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3();
 root.traverse(o=>{if(o.userData.vegetation){const box=new T.Box3().setFromObject(o);box.expandByScalar(.25);items.push({mesh:o,box,center:box.getCenter(new T.Vector3()),hidden:0});}
 if(o.userData.collisionKind==='building')o.traverse(m=>{if(!m.isMesh)return;const p=m.geometry.attributes.position,index=m.geometry.index;for(let i=0;i<(index?index.count:p.count);i+=3){a.fromBufferAttribute(p,index?index.getX(i):i).applyMatrix4(m.matrixWorld);b.fromBufferAttribute(p,index?index.getX(i+1):i+1).applyMatrix4(m.matrixWorld);c.fromBufferAttribute(p,index?index.getX(i+2):i+2).applyMatrix4(m.matrixWorld);const area=b.clone().sub(a).cross(c.clone().sub(a)).length()/2;if(area>4)walls.push({a:a.clone(),b:b.clone(),c:c.clone(),area});}});
 });walls.sort((a,b)=>b.area-a.area);walls.length=Math.min(64,walls.length);
 let cursor=0,lastCheck=-1;const ray=new T.Ray(),hit=new T.Vector3(),direction=new T.Vector3();
 return (time,camera,walking)=>{windTime.value=time;
  for(const item of items){const distance=item.center.distanceTo(camera.position),limit=item.mesh.userData.grass?70:110;if(item.mesh.userData.treeLeaves)item.mesh.geometry=walking&&distance>40?item.mesh.userData.sparseLeaves:item.mesh.userData.fullLeaves;item.mesh.visible=item.mesh.userData.originalVisible!==false&&(!walking||(distance<limit&&item.hidden<2));}
  if(!walking){items.forEach(i=>i.hidden=0);return;}if(time-lastCheck<.15||!items.length)return;lastCheck=time;
  // At most two cells per check. Only a single solid wall triangle covering all 8 corners can hide a cell.
  for(let n=0;n<2;n++){const item=items[cursor++%items.length];if(item.center.distanceTo(camera.position)<22){item.hidden=0;continue;}let covered=false;
   for(const wall of walls){let all=true;for(const x of [item.box.min.x,item.box.max.x])for(const y of [item.box.min.y,item.box.max.y])for(const z of [item.box.min.z,item.box.max.z]){direction.set(x,y,z).sub(camera.position);const length=direction.length();ray.set(camera.position,direction.normalize());if(!ray.intersectTriangle(wall.a,wall.b,wall.c,false,hit)||hit.distanceTo(camera.position)>=length-.4)all=false;}if(all){covered=true;break;}}
   item.hidden=covered?item.hidden+1:0;
  }
 };
}

import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {createThreeSedan} from './sedan-mesh.js';
export function createSingleMeshCar(){
 const source=createThreeSedan({weather:false}),geometries=[];
 source.updateMatrixWorld(true);
 const tileUV=(col,row,u,v)=>{const edges=[0,.254,.532,1];return [(col+T.MathUtils.clamp(u,.015,.985))/2,1-edges[row+1]+T.MathUtils.clamp(v,.015,.985)*(edges[row+1]-edges[row])];};
 for(const part of source.children){
  if(!/^(Cutout_fender_|Sculpted_deck|Sloping_cabin|Front_bumper|Rear_bumper|Profiled_tire|Wheel_disc)/.test(part.name))continue;
  const g=part.geometry.clone().applyMatrix4(part.matrixWorld),p=g.attributes.position,n=g.attributes.normal,uv=[];
  let wheelZ=0;if(/tire|disc/.test(part.name)){g.computeBoundingBox();wheelZ=(g.boundingBox.min.z+g.boundingBox.max.z)/2;}
  for(let i=0;i<p.count;i++){
   const x=p.getX(i),y=p.getY(i),z=p.getZ(i),nx=Math.abs(n.getX(i)),ny=Math.abs(n.getY(i)),nz=Math.abs(n.getZ(i));let col,row,u,v;
   if(part.name==='Wheel_disc'){col=0;row=2;u=.5+(z-wheelZ)/1.1;v=.5+(y-.47)/1.1;}
   else if(part.name==='Profiled_tire'){col=1;row=2;u=(Math.atan2(y-.47,z-wheelZ)+Math.PI)/(Math.PI*2);v=(x-Math.sign(x)*.94+.16)/.32;}
   else if(ny>=nx&&ny>=nz||part.name==='Sloping_cabin'&&nz>nx){col=1;row=0;u=(2.4-z)/4.8;v=(x+1.02)/2.04;}
   else if(nx>=nz){col=0;row=0;u=(2.4-z)/4.8;v=y/2.5;}
   else{col=z>0?0:1;row=1;u=(x+1.02)/2.04;v=(y-.25)/1.0;}
   uv.push(...tileUV(col,row,u,v));
  }
  g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geometries.push(g);
 }
 const geometry=mergeGeometries(geometries,false);for(const g of geometries)g.dispose();
 const material=new T.MeshStandardMaterial({color:0xffffff,roughness:.88,metalness:.12,side:T.DoubleSide});
 if(typeof document!=='undefined'){
  const map=new T.TextureLoader().load(new URL('./textures/vehicles/sedan-atlas-v1.png',document.baseURI).href);map.colorSpace=T.SRGBColorSpace;map.anisotropy=4;material.map=map;
 }
 const car=new T.Mesh(geometry,material);car.name='single-mesh-textured-sedan';car.castShadow=car.receiveShadow=true;return car;
}

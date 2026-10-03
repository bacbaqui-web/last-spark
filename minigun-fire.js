import * as THREE from 'three';
export function decorateMinigunFlash(flash){
 const glow=new THREE.MeshBasicMaterial({color:0xff801b,transparent:true,opacity:.8,blending:THREE.AdditiveBlending,depthWrite:false});
 for(let i=0;i<5;i++){const petal=new THREE.Mesh(new THREE.ConeGeometry(.045,.32,5),glow);const a=i*Math.PI*2/5;petal.position.set(Math.cos(a)*.075,0,Math.sin(a)*.075);petal.rotation.z=Math.sin(a)*.3;petal.rotation.x=Math.cos(a)*.3;flash.add(petal);}
 const light=new THREE.PointLight(0xffad43,0,4);flash.add(light);return light;
}

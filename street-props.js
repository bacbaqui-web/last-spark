import * as T from 'three';
import {replaceTemplates} from './asset-upgrades.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
// Shared low-poly meshes supplement the purchased kit's missing street furniture.
export function createStreetProps(){
 const out=new Map(),steel=new T.MeshStandardMaterial({color:0x4c514a,roughness:1}),rust=new T.MeshStandardMaterial({color:0x725542,roughness:1}),yellow=new T.MeshStandardMaterial({color:0xa08b43,roughness:1}),dark=new T.MeshStandardMaterial({color:0x25332f,roughness:1}),stone=new T.MeshStandardMaterial({color:0x69695b,roughness:1}),red=new T.MeshStandardMaterial({color:0x743c31}),green=new T.MeshStandardMaterial({color:0x516249});
 for(const id of ['wreck-bus','wreck-truck','traffic-light','street-lamp','ruin-wall','pavement-break','lush-tree']){
  const groups=new Map();function add(g,m,x=0,y=0,z=0,rx=0,rz=0){g.rotateX(rx);g.rotateZ(rz);g.translate(x,y,z);if(g.index){const old=g;g=g.toNonIndexed();old.dispose();}if(!groups.has(m))groups.set(m,[]);groups.get(m).push(g);}
  function box(w,h,d,x,y,z,m=steel){add(new T.BoxGeometry(w,h,d),m,x,y,z);}
  function rod(a,b,r=.05,m=steel){const va=new T.Vector3(...a),vb=new T.Vector3(...b),v=vb.clone().sub(va);const g=new T.CylinderGeometry(r,r,v.length(),8);g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),v.normalize()));const c=va.add(vb).multiplyScalar(.5);add(g,m,c.x,c.y,c.z);}
  if(id==='lush-tree'){
   const bark=new T.MeshStandardMaterial({color:0x655744,roughness:1}),leaves=[0x315b36,0x44763e,0x598747].map(color=>new T.MeshStandardMaterial({color,roughness:1,flatShading:true}));
   rod([0,0,0],[.15,8.5,.1],.28,bark);for(let i=0;i<9;i++){const a=i*2.4,x=Math.cos(a)*(1.5+i%3*.4),z=Math.sin(a)*(1.5+i%3*.4),y=6+i*.55;rod([.1,y-2,0],[x,y+.7,z],.12,bark);}
   for(let i=0;i<25;i++){const a=i*2.4,r=i%5*.72,x=Math.cos(a)*r,z=Math.sin(a)*r,y=7.5+(i%4)*1.15;const g=new T.IcosahedronGeometry(1,1);g.scale(1.7+i%3*.25,1.8,1.65+i%2*.35);add(g,leaves[i%3],x,y,z);} 
  }else if(id.startsWith('wreck-')){
   const bus=id==='wreck-bus',len=bus?10.5:7.5;box(2.4,.7,len,0,.85,0,rust);box(2.25,.12,len-.15,0,3.05,0,bus?steel:stone);
   if(bus){for(const side of[-1,1]){box(.12,.65,len,side*1.16,1.55,0,stone);for(let i=0;i<10;i++){const z=-4.7+i*1.04;box(.1,1.25,.12,side*1.13,2.36,z);if(i%3!==1)box(.045,.9,.78,side*1.15,2.4,z+.45,dark);}}box(2.2,1.6,.12,0,1.9,-5.2,stone);box(2.2,.6,.14,0,1.5,5.2,stone);box(1.9,.88,.05,0,2.35,5.2,dark);}else{box(2.2,1.5,4.8,0,2.25,-1.25,stone);for(let i=0;i<10;i++)box(2.24,.05,.08,0,1.6+i*.14,-1.25,rust);box(2.25,.9,1.7,0,1.55,2.7,rust);box(1.95,.85,.06,0,2.4,3.52,dark);for(const x of[-1.08,1.08]){box(.06,.9,1.5,x,2.4,2.7,dark);rod([x,1.95,2],[x,2.95,2],.045);}}
   for(const x of[-1.2,1.2])for(const z of[-len*.32,len*.32]){add(new T.CylinderGeometry(.5,.48,.24,10),dark,x,.48,z,0,Math.PI/2);add(new T.CylinderGeometry(.24,.24,.26,8),rust,x,.48,z,0,Math.PI/2);}for(let i=0;i<7;i++)box(.45,.18,.35,(i%2?1:-1)*.85,1.22,-len/2+i*.85,rust);
  }else if(id==='traffic-light'){
   rod([0,0,0],[0,5.5,0],.1);rod([0,5.4,0],[3.8,5.4,0],.09);box(.5,1.55,.38,3.6,4.65,0,yellow);for(let i=0;i<3;i++)add(new T.CylinderGeometry(.15,.15,.06,10),[red,yellow,green][i],3.6,5.1-i*.45,.22,Math.PI/2);box(.65,.35,.12,1.25,4.5,0,stone);
  }else if(id==='street-lamp'){rod([0,0,0],[0,5,0],.085);rod([0,5,0],[1.2,5.4,0],.065);rod([1.2,5.4,0],[1.8,5,0],.065);add(new T.ConeGeometry(.38,.3,10),steel,1.8,4.95,0);}
  else if(id==='pavement-break'){const shape=new T.Shape();for(let i=0;i<9;i++){const a=i*Math.PI*2/9,r=i%2?.85:1.2;const x=Math.cos(a)*r,z=Math.sin(a)*r;if(i===0)shape.moveTo(x,z);else shape.lineTo(x,z);}shape.closePath();const g=new T.ExtrudeGeometry(shape,{depth:.025,bevelEnabled:false});add(g,dark,0,.045,0,-Math.PI/2);for(let i=0;i<4;i++)box(.7,.08,.14,Math.sin(i*2)*.6,.09,Math.cos(i*2)*.6,stone);}
  else{box(1.5,4.2,1.5,0,2.1,0,stone);box(1.6,.25,1.6,0,4.22,0,rust);box(.8,.6,.6,.3,4.5,.1,stone);}
  const parts=[...groups].map(([material,geos])=>{const geometry=mergeGeometries(geos,false);geos.forEach(g=>g.dispose());return {material,geometry};}),bounds=new T.Box3();for(const p of parts){p.geometry.computeBoundingBox();bounds.union(p.geometry.boundingBox);}const size=bounds.getSize(new T.Vector3()),center=bounds.getCenter(new T.Vector3());for(const p of parts)p.geometry.translate(-center.x,-bounds.min.y,-center.z);out.set(id,{parts,size,maxSize:Math.max(size.x,size.y,size.z)});
 }
 return replaceTemplates(out);
}

import * as THREE from 'three';
import {mergeGeometries, mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';

// Keep the shell, rim and mounted accessories together while fitting the skull.
export function fitHelmetToSkull(group,lightweight=false){
  const [x,y,z]=lightweight?[.85,.86,.84]:[.83,.80,.82];
  group.scale.set(x,y,z);group.position.y+=.014*(1-y);group.position.z-=.016*(1-z);
}

// An elliptical crown with a raised brow and a lower rear edge. The open face
// follows the skull instead of cutting an otherwise round helmet with a plane.
export function roundedHeadShell({rx=.136,ry=.131,rz=.122,cy=.020,cz=-.016,
  frontY=.049,sideY=-.034,backY=-.070,segments=24,rows=9,thickness=.005,rim=0,edgeY=null}={}) {
  const p=[],uv=[],ix=[],cols=segments+1,span=(rows+1)*cols;
  for(let layer=0;layer<2;layer++)for(let row=0;row<=rows;row++)for(let col=0;col<=segments;col++){
    const phi=col/segments*Math.PI*2,c=Math.cos(phi);
    const bottom=edgeY?edgeY(phi):sideY+(frontY-sideY)*Math.max(0,c)+(backY-sideY)*Math.max(0,-c);
    const end=Math.acos(THREE.MathUtils.clamp((bottom-cy)/ry,-1,1));
    const start=rim?Math.acos(THREE.MathUtils.clamp((bottom+rim-cy)/ry,-1,1)):0;
    const theta=start+(end-start)*row/rows,s=Math.sin(theta),t=layer*thickness;
    p.push((rx-t)*Math.sin(phi)*s,cy+(ry-t)*Math.cos(theta),cz+(rz-t)*c*s);
    uv.push(col/segments,1-theta/Math.PI);
  }
  for(let layer=0;layer<2;layer++)for(let row=0;row<rows;row++)for(let col=0;col<segments;col++){
    const a=layer*span+row*cols+col,b=a+1,c=a+cols,d=c+1;
    if(layer===0)ix.push(a,c,b,b,c,d);else ix.push(a,b,c,b,d,c);
  }
  for(let col=0;col<segments;col++){
    const a=rows*cols+col,b=a+1;ix.push(a,a+span,b,b,a+span,b+span);
    if(rim)ix.push(col,col+1,col+span,col+1,col+span+1,col+span);
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(p,3));
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(ix);geometry.computeVertexNormals();
  // Identical seam vertices need identical normals for an uninterrupted crown.
  const normals=geometry.attributes.normal;
  for(let layer=0;layer<2;layer++)for(let row=0;row<=rows;row++){
    const a=layer*span+row*cols,b=a+segments,n=new THREE.Vector3().fromBufferAttribute(normals,a).add(new THREE.Vector3().fromBufferAttribute(normals,b)).normalize();
    normals.setXYZ(a,n.x,n.y,n.z);normals.setXYZ(b,n.x,n.y,n.z);
  }
  return geometry;
}

function curvedFace(){
  const face=new THREE.Shape();face.moveTo(0,.066);
  face.bezierCurveTo(.048,.066,.088,.058,.109,.024);
  face.quadraticCurveTo(.117,-.013,.101,-.045);
  face.quadraticCurveTo(.088,-.058,.063,-.050);
  face.quadraticCurveTo(.044,-.054,.039,-.081);
  face.quadraticCurveTo(0,-.093,-.039,-.081);
  face.quadraticCurveTo(-.044,-.054,-.063,-.050);
  face.quadraticCurveTo(-.088,-.058,-.101,-.045);
  face.quadraticCurveTo(-.117,-.013,-.109,.024);
  face.bezierCurveTo(-.088,.058,-.048,.066,0,.066);
  for(const x of[-.049,.049]){const hole=new THREE.Path();hole.absellipse(x,-.004,.033,.031,0,Math.PI*2,true);face.holes.push(hole);}
  const nose=new THREE.Path();nose.moveTo(0,-.034);nose.quadraticCurveTo(-.007,-.037,-.012,-.060);nose.quadraticCurveTo(0,-.056,.012,-.060);nose.quadraticCurveTo(.007,-.037,0,-.034);face.holes.push(nose);
  const source=new THREE.ExtrudeGeometry(face,{depth:.009,bevelEnabled:true,bevelSize:.002,bevelThickness:.002,bevelSegments:1,curveSegments:7,steps:1});
  const vertices=[],positions=source.attributes.position;
  function split(a,b,c,depth=0){
    if(depth<3&&Math.max(a.distanceToSquared(b),b.distanceToSquared(c),c.distanceToSquared(a))>.034**2){
      const ab=a.clone().lerp(b,.5),bc=b.clone().lerp(c,.5),ca=c.clone().lerp(a,.5);
      split(a,ab,ca,depth+1);split(ab,b,bc,depth+1);split(ca,bc,c,depth+1);split(ab,bc,ca,depth+1);
    }else for(const v of[a,b,c])vertices.push(v.x,v.y,v.z);
  }
  for(let i=0;i<positions.count;i+=3)split(...[0,1,2].map(n=>new THREE.Vector3().fromBufferAttribute(positions,i+n)));
  source.dispose();const g=new THREE.BufferGeometry(),uv=[];
  for(let i=0;i<vertices.length;i+=3){
    const x=vertices[i],y=vertices[i+1];
    const forehead=.104*Math.sqrt(Math.max(.025,1-(x/.122)**2-((Math.max(y,-.005)-.020)/.117)**2))-.015;
    const noseBridge=.014*Math.exp(-((x/.024)**2)-((y+.037)/.035)**2);
    const cheek=.007*Math.exp(-(((Math.abs(x)-.082)/.028)**2)-((y+.039)/.027)**2);
    vertices[i+2]+=forehead+noseBridge+cheek-.006;
    uv.push(x/.29+.5,y/.29+.45);
  }
  g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
  const smooth=mergeVertices(g,1e-5);g.dispose();smooth.computeVertexNormals();return smooth;
}

export function jawlessSkullGeometry(){
  const crown=roundedHeadShell({rx:.119,ry:.116,rz:.104,frontY:.040,sideY:-.041,backY:-.062,thickness:.005});
  const face=curvedFace(),pieces=[crown.toNonIndexed(),face.toNonIndexed()];
  // Small circular temple housings connect the cheek to the rounded rear skull.
  for(const sign of[-1,1]){
    const temple=new THREE.CylinderGeometry(.025,.028,.013,12);temple.rotateZ(Math.PI/2);temple.translate(sign*.109,-.015,-.017);pieces.push(temple.toNonIndexed());temple.dispose();
  }
  const result=mergeGeometries(pieces);pieces.forEach(g=>g.dispose());crown.dispose();face.dispose();return result;
}

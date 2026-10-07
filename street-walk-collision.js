import * as T from 'three';

// Static triangle surfaces indexed in 2m cells. The same surfaces drive debug display and walking.
export function buildWalkCollision(root){
 root.updateMatrixWorld(true);const triangles=[],cells=new Map(),surfaces=[];
 const instance=new T.Matrix4(),world=new T.Matrix4(),a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3();
 function add(mesh,kind){const geometry=mesh.geometry,p=geometry.attributes.position,index=geometry.index,count=index?index.count:p.count;
  const instances=mesh.isInstancedMesh?mesh.count:1;for(let n=0;n<instances;n++){
   if(mesh.isInstancedMesh){mesh.getMatrixAt(n,instance);world.multiplyMatrices(mesh.matrixWorld,instance);}else world.copy(mesh.matrixWorld);
   surfaces.push({geometry,matrix:world.clone(),kind});
   for(let i=0;i<count;i+=3){a.fromBufferAttribute(p,index?index.getX(i):i).applyMatrix4(world);b.fromBufferAttribute(p,index?index.getX(i+1):i+1).applyMatrix4(world);c.fromBufferAttribute(p,index?index.getX(i+2):i+2).applyMatrix4(world);
    const minX=Math.min(a.x,b.x,c.x),maxX=Math.max(a.x,b.x,c.x),minZ=Math.min(a.z,b.z,c.z),maxZ=Math.max(a.z,b.z,c.z);
    if(minX>9||maxX< -9||minZ>36||maxZ< -36)continue;
    const triangle=new T.Triangle(a.clone(),b.clone(),c.clone()),normal=triangle.getNormal(new T.Vector3());if(normal.lengthSq()<.5)continue;
    const id=triangles.length;triangles.push({triangle,normal,minY:Math.min(a.y,b.y,c.y),maxY:Math.max(a.y,b.y,c.y)});
    for(let x=Math.floor(Math.max(-9,minX)/2);x<=Math.floor(Math.min(9,maxX)/2);x++)for(let z=Math.floor(Math.max(-36,minZ)/2);z<=Math.floor(Math.min(36,maxZ)/2);z++){const key=x+':'+z;if(!cells.has(key))cells.set(key,[]);cells.get(key).push(id);}
   }
  }
 }
 root.traverse(o=>{if(o.userData.collisionKind)o.traverse(m=>{if(m.isMesh&&m.visible)add(m,o.userData.collisionKind);});});
 const ray=new T.Ray(),hit=new T.Vector3(),center=new T.Vector3(),closest=new T.Vector3(),down=new T.Vector3(0,-1,0);const radius=.27,stepHeight=.45;
 function nearby(x,z){const ids=new Set();for(let xx=Math.floor((x-radius)/2);xx<=Math.floor((x+radius)/2);xx++)for(let zz=Math.floor((z-radius)/2);zz<=Math.floor((z+radius)/2);zz++)for(const id of cells.get(xx+':'+zz)||[])ids.add(id);return ids;}
 function support(x,z,foot,ids){let height=Math.abs(x)>3.65?.205:.025;
  for(const [ox,oz] of [[0,0],[radius,0],[-radius,0],[0,radius],[0,-radius]]){ray.set(center.set(x+ox,foot+stepHeight+.02,z+oz),down);
  for(const id of ids){const t=triangles[id];if(Math.abs(t.normal.y)<.55||t.minY>foot+stepHeight+.02)continue;if(ray.intersectTriangle(t.triangle.a,t.triangle.b,t.triangle.c,false,hit)&&hit.y<=foot+stepHeight+.001)height=Math.max(height,hit.y);}
  }return height;
 }
 function blocked(x,z,foot,ids){for(const id of ids){const t=triangles[id];if(t.maxY<foot+.025||t.minY>foot+1.75)continue;
   for(let i=0;i<6;i++){center.set(x,foot+radius+i*(1.65-radius*2)/5,z);t.triangle.closestPointToPoint(center,closest);if(closest.y<=foot+.035)continue;if(center.distanceToSquared(closest)<radius*radius-.0001)return true;}
  }return false;}
 function move(position,dx,dz,foot){let next=foot;for(const axis of ['x','z']){const x=position.x+(axis==='x'?dx:0),z=position.z+(axis==='z'?dz:0);if(Math.abs(x)>8.2||Math.abs(z)>35)continue;const ids=nearby(x,z),height=support(x,z,next,ids);if(height-next>stepHeight+.01||blocked(x,z,height,ids))continue;position.x=x;position.z=z;next=height;}return next;}
 return {surfaces,move,triangleCount:triangles.length,cellCount:cells.size,stepHeight};
}

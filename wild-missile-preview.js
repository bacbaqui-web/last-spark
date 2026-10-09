import * as THREE from 'three';

// Workshop-only projectile display; gameplay damage belongs to the combat system.
export function createMissilePreview(scene){
  const missiles=[],smoke=[],geometry=new THREE.CylinderGeometry(.045,.045,.30,10),nose=new THREE.ConeGeometry(.046,.13,10),puff=new THREE.SphereGeometry(.065,6,4);
  const metal=new THREE.MeshStandardMaterial({color:0x35382b,metalness:.7,roughness:.6}),tip=new THREE.MeshStandardMaterial({color:0xc28839,metalness:.5,roughness:.7});
  const flameGeometry=new THREE.ConeGeometry(.07,.30,8),flameMaterial=new THREE.MeshBasicMaterial({color:0xffa52a,toneMapped:false});
  function launch(robot){
    robot.root.updateWorldMatrix(true,true);
    const group=new THREE.Group(),body=new THREE.Mesh(geometry,metal),head=new THREE.Mesh(nose,tip),flame=new THREE.Mesh(flameGeometry,flameMaterial);
    body.rotation.x=Math.PI/2;head.rotation.x=Math.PI/2;head.position.z=.21;
    flame.rotation.x=-Math.PI/2;flame.position.z=-.28;group.add(body,head,flame);
    robot.muzzle.getWorldPosition(group.position);robot.muzzle.getWorldQuaternion(group.quaternion);
    scene.add(group);missiles.push({group,flame,age:0,trail:0,direction:new THREE.Vector3(0,0,1).applyQuaternion(group.quaternion)});
  }
  function update(dt){
    for(let i=missiles.length-1;i>=0;i--){const m=missiles[i];m.age+=dt;m.trail+=dt;
      m.group.position.addScaledVector(m.direction,(2.2+Math.min(1,m.age)*9)*dt);m.flame.scale.setScalar(.85+Math.sin(m.age*80)*.15);
      if(m.trail>.035){m.trail%=.035;const mesh=new THREE.Mesh(puff,new THREE.MeshBasicMaterial({color:0x777b72,transparent:true,opacity:.42,depthWrite:false}));mesh.position.copy(m.group.position).addScaledVector(m.direction,-.25);scene.add(mesh);smoke.push({mesh,age:0});}
      if(m.age>1.3){m.group.removeFromParent();missiles.splice(i,1);}
    }
    for(let i=smoke.length-1;i>=0;i--){const p=smoke[i];p.age+=dt;p.mesh.position.y+=dt*.15;p.mesh.scale.setScalar(1+p.age*2.4);p.mesh.material.opacity=.42*Math.max(0,1-p.age/.8);if(p.age>.8){p.mesh.removeFromParent();p.mesh.material.dispose();smoke.splice(i,1);}}
  }
  function clear(){for(const m of missiles)m.group.removeFromParent();missiles.length=0;for(const p of smoke){p.mesh.removeFromParent();p.mesh.material.dispose();}smoke.length=0;}
  return {launch,update,clear};
}

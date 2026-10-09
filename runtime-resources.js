// Shared templates outlive individual actors. Everything else belongs to the
// removed object, including proxy meshes, cloned materials and skeleton textures.
export function disposeObjectResources(root,{sharedMaterials=[]}={}){
 const geometries=new Set(),materials=new Set(),skeletons=new Set();
 root.removeFromParent();
 root.traverse(object=>{
  const geometry=object.geometry;
  if(geometry&&!geometry.userData.sharedModelGeometry)geometries.add(geometry);
  for(const material of [].concat(object.material||[]))if(!material.userData.sharedWeaponMaterial&&!material.userData.sharedSalvageMaterial&&!sharedMaterials.includes(material))materials.add(material);
  if(object.skeleton)skeletons.add(object.skeleton);
  if(object.isInstancedMesh||object.isLight)object.dispose?.();
  if(object.userData.enemyOwner)object.userData.enemyOwner=null;
 });
 for(const resource of [...geometries,...materials,...skeletons])resource.dispose();
}

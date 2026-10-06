export const TREE_LOCAL_SCALE=1/1.2;
export const CITY_SCALE=1.44;
// Scale the rendered city and its navigation/collision data together once per rebuild.
export function scaleCityWorld(root,platforms,route,...markers){
 const k=CITY_SCALE,sample=route.sample,progress=route.progress;
 root.scale.setScalar(k);
 for(const p of platforms)for(const key of ['x','z','w','d','h'])p[key]*=k;
 route.points=route.points.map(p=>({...p,x:p.x*k,z:p.z*k}));
 route.segments=route.segments.map(seg=>({...seg,a:{...seg.a,x:seg.a.x*k,z:seg.a.z*k},b:{...seg.b,x:seg.b.x*k,z:seg.b.z*k},distance:seg.distance*k,s:seg.s*k}));
 route.length*=k;route.width*=k;
 route.bounds={x:route.bounds.x*k,z:route.bounds.z*k};platforms.bounds=route.bounds;
 route.sample=(s,offset=0)=>{const p=sample(s/k,offset/k);return {...p,x:p.x*k,z:p.z*k};};
 route.progress=p=>progress({...p,x:p.x/k,z:p.z/k})*k;
 route.start=route.sample(0);route.end=route.sample(route.length);
 for(const marker of markers)marker.position.multiplyScalar(k);
 root.updateMatrixWorld(true);
}

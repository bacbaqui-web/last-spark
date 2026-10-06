// Bounded local A*: distant goals become intermediate waypoints and are replanned.
export function localRoute(start,target,obstacles,pad,clear){
 const distance=Math.hypot(target.x-start.x,target.z-start.z),horizon=Math.min(distance,28),goal=distance>28?{x:start.x+(target.x-start.x)*horizon/distance,z:start.z+(target.z-start.z)*horizon/distance}:target,margin=8,step=1;
 const minX=Math.min(start.x,goal.x)-margin,maxX=Math.max(start.x,goal.x)+margin,minZ=Math.min(start.z,goal.z)-margin,maxZ=Math.max(start.z,goal.z)+margin;
 const local=obstacles.filter(p=>p.x+p.w/2+pad>=minX&&p.x-p.w/2-pad<=maxX&&p.z+p.d/2+pad>=minZ&&p.z-p.d/2-pad<=maxZ);
 if(clear(start,goal,local,pad))return {route:[goal],distance:horizon};
 const heap=[],nodes=new Map(),key=(x,z)=>x+','+z,heuristic=p=>Math.hypot(p.x-goal.x,p.z-goal.z);
 function push(n){heap.push(n);let i=heap.length-1;while(i){const p=(i-1)>>1;if(heap[p].f<=n.f)break;heap[i]=heap[p];i=p;}heap[i]=n;}
 function pop(){const top=heap[0],last=heap.pop();if(heap.length){let i=0;while(i*2+1<heap.length){let c=i*2+1;if(c+1<heap.length&&heap[c+1].f<heap[c].f)c++;if(heap[c].f>=last.f)break;heap[i]=heap[c];i=c;}heap[i]=last;}return top;}
 const initial={x:start.x,z:start.z,ix:0,iz:0,g:0,f:heuristic(start)};nodes.set('0,0',initial);push(initial);
 for(let budget=0;heap.length&&budget<1600;budget++){
  const n=pop();if(n.closed||nodes.get(key(n.ix,n.iz))!==n)continue;n.closed=true;
  if(heuristic(n)<1.5&&clear(n,goal,local,pad)){
   const route=[goal];for(let p=n;p.parent;p=p.parent)route.unshift({x:p.x,z:p.z});let total=0,previous=start;for(const p of route){total+=Math.hypot(p.x-previous.x,p.z-previous.z);previous=p;}return {route,distance:total};
  }
  for(const dx of [-1,0,1])for(const dz of [-1,0,1]){if(!dx&&!dz)continue;const ix=n.ix+dx,iz=n.iz+dz,x=start.x+ix*step,z=start.z+iz*step;
   if(x<minX||x>maxX||z<minZ||z>maxZ||Math.abs(x)>(obstacles.bounds?.x||Infinity)||Math.abs(z)>(obstacles.bounds?.z||Infinity))continue;
   const id=key(ix,iz),old=nodes.get(id),g=n.g+Math.hypot(dx,dz)*step;if(old?.closed||old&&g>=old.g||!clear(n,{x,z},local,pad))continue;
   const next={x,z,ix,iz,g,f:g+heuristic({x,z}),parent:n};nodes.set(id,next);push(next);
  }
 }
 return null;
}

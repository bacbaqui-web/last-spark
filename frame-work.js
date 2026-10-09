// Simulation still advances in small steps. Display work only needs its latest
// state at the end of a rendered frame. Outside a frame, diagnostics stay immediate.
let pending=null;
export function inFrameWork(){return pending!==null;}
export function scheduleFrameWork(key,work){if(pending)pending.set(key,work);else work();}
export function cancelFrameWork(key){pending?.delete(key);}
export function flushFrameWork(key){const work=pending?.get(key);if(work){pending.delete(key);work();}}
export function withFrameWork(work){
 const parent=pending,queue=new Map();pending=queue;
 let result,error,failed=false;
 try{result=work();}catch(cause){failed=true;error=cause;}
 pending=parent;
 // A failed pose must not strand other actors in the pending set.
 for(const finish of queue.values())try{finish();}catch(cause){if(!failed){failed=true;error=cause;}}
 if(failed)throw error;return result;
}

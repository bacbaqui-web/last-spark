import * as THREE from 'three';
// Full speed is reserved for straight forward travel; diagonal/side/back travel walks.
export function directionalRunWeight(direction,yaw=0){
 const local=direction.clone().setY(0).applyAxisAngle(new THREE.Vector3(0,1,0),-yaw);
 if(local.lengthSq()<.0001)return 0;
 const forward=-local.normalize().z;
 return THREE.MathUtils.smoothstep(forward,.80,.98);
}
export function directionalCadence(speed,direction,yaw=0){
 const run=directionalRunWeight(direction,yaw);
 return THREE.MathUtils.clamp(speed/(run>0?9.8:5.4)*THREE.MathUtils.lerp(.64,speed>=3?1.25:1,run),.25,1.6);
}
// Select authored steps by support foot; never generate ankle targets at runtime.
export function supportFoot(phase){return ((phase%1)+1)%1<.5?'left':'right';}
export function createStepLocomotion(){
 let accepted=new THREE.Vector3(),pending=null,action=null,wasMoving=false,gaitPhase=0;
 function reset(){accepted.set(0,0,0);pending=null;action=null;wasMoving=false;gaitPhase=0;}
 function update({dt=0,intent,yaw=0,speed=0,stridePhase,grounded=true,interrupted=false}){
  gaitPhase=typeof stridePhase==='number'?stridePhase:(gaitPhase+dt*directionalCadence(speed,intent,yaw)/.666667)%1;
  const requested=intent.clone().setY(0),moving=requested.lengthSq()>.01,foot=action? (action.age/action.duration<.5?action.support:action.support==='left'?'right':'left'):supportFoot(gaitPhase);
  if(!grounded||interrupted){reset();return {direction:requested,action:null,pending:null,support:foot};}
  if(action){action.age+=dt;if(action.age>=action.duration)action=null;}
  if(!moving){
   pending=null;
   if(wasMoving&&speed>2){action={name:foot==='left'?'StopRight':'StopLeft',age:0,duration:.38,support:foot};}
   accepted.set(0,0,0);
  }else{
   if(!wasMoving){action=null;accepted.copy(requested);pending=null;}
   const local=requested.clone().applyAxisAngle(new THREE.Vector3(0,1,0),-yaw);
   const sideways=Math.abs(local.x)>.45;
   if(sideways&&accepted.lengthSq()>.01&&accepted.dot(requested)<.94){
    const side=local.x<0?'left':'right',required=side==='left'?'right':'left';
    if(!pending||pending.side!==side)pending={side,required,direction:requested.clone(),age:0};
    pending.age+=dt;
    // Only wait a fraction of a stride; rapid input changes stay responsive.
    if(foot===required||pending.age>=.16){accepted.copy(pending.direction);action={name:side==='left'?'StepLeft':'StepRight',age:0,duration:.26,support:required};pending=null;}
   }else if(!pending){accepted.copy(requested);}
   if(pending&&requested.dot(pending.direction)<.94){pending=null;accepted.copy(requested);}
   if(action?.name.startsWith('Stop'))action=null;
  }
  wasMoving=moving;
  return {direction:accepted.clone(),action:action?{...action,phase:Math.min(1,action.age/action.duration)}:null,pending:pending?.side??null,support:foot};
 }
 return {update,reset,speedFor:(direction,yaw,precision=false)=>precision?2:THREE.MathUtils.lerp(5.4,10.8,directionalRunWeight(direction,yaw))};
}

import * as THREE from 'three';
export function directionalRunWeight(){return 1;}
export function directionalCadence(speed){return THREE.MathUtils.clamp(speed/9.8*(speed>=3?1.25:1),.35,1.6);}
export function supportFoot(phase){return ((phase%1)+1)%1<.5?'left':'right';}
// Walking is the default. Sprint is an explicit held input in every direction.
export function createStepLocomotion(){
 let action=null,wasMoving=false,gaitPhase=0;
 function reset(){action=null;wasMoving=false;gaitPhase=0;}
 function update({dt=0,intent,speed=0,stridePhase,grounded=true,interrupted=false}){
  gaitPhase=typeof stridePhase==='number'?stridePhase:(gaitPhase+dt*directionalCadence(speed)/.666667)%1;
  const direction=intent.clone().setY(0),moving=direction.lengthSq()>.01,foot=supportFoot(gaitPhase);
  if(!grounded||interrupted){reset();return {direction,action:null,pending:null,support:foot};}
  if(action){action.age+=dt;if(action.age>=action.duration)action=null;}
  if(moving)action=null;
  else if(wasMoving&&speed>2)action={name:foot==='left'?'StopRight':'StopLeft',age:0,duration:.38,support:foot};
  wasMoving=moving;
  return {direction,action:action?{...action,phase:Math.min(1,action.age/action.duration)}:null,pending:null,support:foot};
 }
 return {update,reset,speedFor:(_direction,_yaw,precision=false,sprinting=false)=>precision?2:sprinting?4.2:2.4};
}

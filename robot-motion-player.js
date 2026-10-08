import * as THREE from 'three';
import {FPS, frameTime} from './motion-frame-timeline.js';

export const MOTION_STUDIES = [
  {id:'idle', name:'대기', clip:'Idle_Loop', note:'숨 쉬듯 움직이는 몸통과 손의 긴장을 살펴보세요.'},
  {id:'walk', name:'걷기', clip:'Walk_Loop', note:'무기를 받치는 양팔과 흉갑, 골반의 회전, 발끝을 살펴보세요.'},
  {id:'sprint', name:'달리기', clip:'Sprint_Loop', note:'앞으로 숙인 상체와 발이 닿을 때의 묵직한 충격을 살펴보세요.'},
  {id:'crouch', name:'앉아 대기', clip:'Crouch_Idle_Loop', note:'접힌 골반과 복부, 허벅지 사이의 여유를 살펴보세요.'},
  {id:'crouchWalk', name:'앉아 걷기', clip:'Crouch_Fwd_Loop', note:'낮은 자세에서 발목과 무릎이 이어지는 모습을 살펴보세요.'},
];

// Sample the existing retargeted clips, including both halves of locomotion.
// Absolute time + update(0) makes scrubbing independent of playback history.
export function createMotionSampler(robot) {
  const scales = robot.bones.map(b=>b.scale.clone());
  let active = [], study, frames = 1;
  function sample(frame) {
    const index = Math.max(1, Math.min(frames, Math.round(frame)||1));
    for (const action of active) action.time = frameTime(index);
    robot.mixer.update(0);
    robot.lookForward(0);
    robot.root.updateMatrixWorld(true);
    return index;
  }
  function select(id) {
    const next = MOTION_STUDIES.find(m=>m.id===id);
    if (!next) throw new Error('Unknown motion: '+id);
    robot.mixer.stopAllAction(); robot.skeleton.pose();
    robot.bones.forEach((b,i)=>b.scale.copy(scales[i]));
    robot.motion.rotation.set(0,0,0);
    study = next;
    active = [robot.actions[next.clip], robot.actions[next.clip+'_Upper']].filter(Boolean);
    frames = Math.round(active[0].getClip().duration*FPS);
    for (const action of active) {
      action.reset().setLoop(THREE.LoopRepeat,Infinity).setEffectiveWeight(1).play();
      action.paused = true;
    }
    sample(1);
    return frames;
  }
  select('idle');
  return {select,sample,get study(){return study;},get frames(){return frames;}};
}

export function createPreviewClock(total=1) {
  let count=total, index=0, fraction=0, playing=true, rate=1;
  return {
    get frame(){return index+1;}, get total(){return count;},
    get playing(){return playing;}, set playing(value){playing=!!value;},
    get rate(){return rate;}, set rate(value){if(Number.isFinite(value)&&value>0)rate=value;},
    reset(total){count=Math.max(1,Math.round(total));index=0;fraction=0;},
    seek(frame){index=Math.max(0,Math.min(count-1,Math.round(frame)-1||0));fraction=0;return index+1;},
    step(delta){this.playing=false;return this.seek(this.frame+delta);},
    update(dt){
      if(!playing||!Number.isFinite(dt)||dt<=0)return this.frame;
      fraction+=dt*FPS*rate;
      const whole=Math.floor(fraction+1e-9);fraction-=whole;
      index=(index+whole)%count;
      return this.frame;
    },
  };
}

import {MathUtils} from 'three';

// Like the player's third-person-motion sampler, pace is bounded and eased;
// speed opens the stride before it accelerates the animation clock.
const profiles={
  'rust-scout':          {pace:[1.05,1.85],stride:[.32,.55],lift:[.16,.28],support:[.66,.54],crouch:.045,press:.07,sway:.035},
  'forest-warden':       {pace:[.78,1.35],stride:[.43,.72],lift:[.15,.25],support:[.72,.62],crouch:.07,press:.12,sway:.055},
  'assault-mantis':      {pace:[1.1,1.95],stride:[.42,.70],lift:[.20,.36],support:[.64,.52],crouch:.065,press:.09,sway:.04},
  'iron-beetle':         {pace:[1.15,2.05],stride:[.22,.37],lift:[.10,.17],support:[.72,.64],crouch:.025,press:.035,sway:.02},
  'wall-sniper-spider':  {pace:[.9,1.6],stride:[.30,.49],lift:[.13,.22],support:[.76,.68],crouch:.035,press:.045,sway:.025}
};
export function wildGait(id,speed){
  const p=profiles[id],run=MathUtils.smoothstep(speed,2.3,6),mix=range=>MathUtils.lerp(...range,run);
  return {...p,run,pace:mix(p.pace)*MathUtils.clamp(speed/2.3,0,1),stride:mix(p.stride),lift:mix(p.lift),support:mix(p.support)};
}
export function wildFootfall(phase,support){
  const cycle=MathUtils.euclideanModulo(phase/(Math.PI*2),1),planted=cycle<support;
  if(planted){
    const t=cycle/support;
    // A long, level push; compression peaks just AFTER contact, then releases.
    const load=t<.18?MathUtils.smoothstep(t,0,.18):1-MathUtils.smoothstep(t,.18,.85);
    return {planted,travel:1-2*t,height:0,load};
  }
  const t=(cycle-support)/(1-support),advance=MathUtils.smootherstep(t,0,1);
  // Lift decisively, carry the foot forward, then put it down without hovering.
  const height=t<.38?MathUtils.smoothstep(t,0,.38):1-MathUtils.smoothstep(t,.38,1);
  return {planted,travel:2*advance-1,height,load:0};
}
export function wildLegPhase(r,leg){
  // Alternating tripod (beetle) / tetrapod (spider) groups always leave support.
  return r.phase+(r.spec.count?(leg.index%2+(leg.side>0?1:0)):leg.side>0?1:0)*Math.PI;
}

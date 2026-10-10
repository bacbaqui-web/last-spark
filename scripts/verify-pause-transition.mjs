import assert from 'node:assert/strict';
import {createPauseTransition} from '../runtime-performance.js';
for(const fps of [30,60,144]){
 const motion=createPauseTransition();motion.pause();let simulated=0;
 for(let i=0;i<fps*2;i++)simulated+=motion.advance(1/fps);
 assert(Math.abs(simulated-.6)<1e-8,'deceleration advances the same half-second-distance at all frame rates');assert.equal(motion.rate,0);assert.equal(motion.advance(1),0,'fully paused time is frozen');
 motion.resume();simulated=0;for(let i=0;i<fps*2;i++)simulated+=motion.advance(1/fps);assert(Math.abs(simulated-1.4)<1e-8);assert.equal(motion.rate,1);
 motion.pause();motion.advance(.3);const rate=motion.rate;motion.resume();assert.equal(motion.rate,rate,'rapid resume does not jump speed');motion.advance(.3);assert.equal(motion.rate,1);motion.pause(false);assert.equal(motion.advance(1),0,'safety pause is immediate');assert.equal(motion.coasting,false);motion.reset();assert.equal(motion.rate,1);
}
console.log('PASS smooth pause/resume timing at 30/60/144 fps, complete freeze, rapid reversals and immediate safety pause');

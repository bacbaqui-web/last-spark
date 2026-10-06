import assert from 'node:assert/strict';
import {coverRoute,clearRoute} from '../enemy-ai.js';
import {localRoute} from '../bounded-route.js';
const start={x:-5,z:0},goal={x:5,z:0},wall={x:0,z:0,w:2,d:6,h:2};
const route=coverRoute(start,goal,[wall]);assert(route,'find a detour');let previous=start;for(const p of route.route){assert(clearRoute(previous,p,[wall]),'detour cannot cross solid cover');previous=p;}
const distant=coverRoute({x:0,z:0},{x:0,z:200},[]);assert.equal(distant.route[0].z,28,'distant pursuit uses local waypoints');
const many=[wall,...Array.from({length:6000},(_,i)=>({x:100+i%100,z:50+Math.floor(i/100)*2,w:1,d:1,h:2}))];let calls=0;const t=performance.now(),bounded=localRoute(start,goal,many,.6,(a,b,boxes,pad)=>{calls++;return clearRoute(a,b,boxes,pad);});assert(bounded);assert(calls<=14401,'search has a strict work limit');console.log(`PASS bounded detours, collision-safe edges and long-range waypoints; 6001 obstacles ${(performance.now()-t).toFixed(1)}ms, ${calls} visibility checks`);

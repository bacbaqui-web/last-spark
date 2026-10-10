import assert from 'node:assert/strict';
import {gameMode,gameModeURL,recoveryRewards,trainingWaveSize,trainingWaveRoster} from '../game-modes.js';
import {acquireCampaignOwner} from '../campaign-owner.js';
import {sortieMission} from '../sortie-mission.js';
import {makeCoreWeapon} from '../salvage-campaign.js';

assert.equal(gameMode(''),'recovery');
assert.equal(gameMode('?arena'),'arena');
assert.equal(gameMode('?training'),'training');
assert.equal(gameMode('?arena&training&workshopCheck'),'training');
assert.equal(gameModeURL('training','https://example.org/last-spark/?workshopCheck#test'),'https://example.org/last-spark/?training=');
assert.equal(gameModeURL('recovery','https://example.org/last-spark/?training'),'https://example.org/last-spark/');
for(let stage=1;stage<=12;stage++){
 const mission=sortieMission({stage}),reward=recoveryRewards(mission);
 assert.equal(reward.coreLevel,mission.lootLevel);
 assert.equal(reward.weaponMinLevel,makeCoreWeapon(()=>0).level+mission.lootLevel-1);
 assert.equal(reward.weaponMaxLevel,makeCoreWeapon(()=>.99999).level+mission.lootLevel-1);
 assert.equal(reward.nextStage,stage===12?null:stage+1);
}
assert.equal(trainingWaveSize(1),7);
assert.equal(trainingWaveSize(2),9);
assert.equal(trainingWaveSize(10000),40,'endless training must retain a bounded enemy population');

const originals=new Map(['navigator','location','window'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
let locks=0,release;
try{
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{locks:{request:async(_name,_options,handler)=>{locks++;return handler({});}}}});
 Object.defineProperty(globalThis,'window',{configurable:true,value:{addEventListener:(_name,callback)=>{release=callback;}}});
 Object.defineProperty(globalThis,'location',{configurable:true,value:{search:'?training'}});
 assert.equal(await acquireCampaignOwner(),null);assert.equal(locks,0);
 location.search='?arena';assert.equal(await acquireCampaignOwner(),null);assert.equal(locks,0);
 location.search='?arena&training';assert.equal(await acquireCampaignOwner(),null);assert.equal(locks,0);
 location.search='';assert.equal(await acquireCampaignOwner(),true);assert.equal(locks,1);release();
}finally{for(const [key,descriptor]of originals){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}}
console.log('PASS mode URL isolation, training bypasses campaign locks, all stage rewards match actual drops, bounded endless-wave population');

const signatures=new Set(),types=new Set();
for(let seed=1;seed<=100;seed++){
 let state=seed;const random=()=>((state=Math.imul(state,1664525)+1013904223>>>0)/2**32);
 for(let wave=1;wave<=12;wave++){
  const roster=trainingWaveRoster(wave,random);
  assert.equal(roster.length,trainingWaveSize(wave),'random composition preserves the stage population');
  const counts=['trooper','scoutDrone','assassin','spider','sniper','mortar','pillbug'].map(type=>roster.filter(t=>t===type).length);assert(Math.max(...counts)-Math.min(...counts)<=2,'composition stays balanced within two enemies');
  roster.forEach(type=>types.add(type));if(wave===1)signatures.add(roster.join(','));
 }
}
assert.equal(types.size,7,'all ordinary enemy types can appear');assert(signatures.size>90,'fresh runs vary the composition');
for(const random of [()=>0,()=>.99999])assert(new Set(trainingWaveRoster(1,random)).size>=4,'even extreme random draws cannot fill the stage with one type');
const survivors=Array(8).fill('sniper'),fill=trainingWaveRoster(5,()=>0,survivors);assert.equal(fill.length,trainingWaveSize(5)-8);assert(!fill.includes('sniper'),'overrepresented survivors are not replenished');
assert.equal(trainingWaveRoster(1,Math.random,Array(8).fill('trooper')).length,0,'never remove survivors or overfill the cap');
console.log('PASS 100 seeded training runs: random enemy compositions, all 7 types, exact growing stage counts');

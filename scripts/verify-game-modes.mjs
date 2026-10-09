import assert from 'node:assert/strict';
import {gameMode,gameModeURL,recoveryRewards,trainingWaveSize} from '../game-modes.js';
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

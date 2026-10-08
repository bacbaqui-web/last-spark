import assert from 'node:assert/strict';
import {createCampaign,SAVE_KEY} from '../salvage-campaign.js';
import {sortieMission} from '../sortie-mission.js';
import {briefingMap} from '../sortie-briefing-map.js';
let saved=null;const storage={getItem:()=>saved,setItem:(key,value)=>{assert.equal(key,SAVE_KEY);saved=value;}};
let campaign=createCampaign(storage);assert.equal(campaign.state.unlockedStage,1);
assert.equal(campaign.launch(['rifle'],{},sortieMission({stage:2})),null);
function finish(stage,core,success=true){const run=campaign.launch(campaign.frame().loadout,{},sortieMission({stage}));assert.ok(run);run.core=core;campaign.finish(run,success,100,'test');}
finish(1,false);assert.equal(campaign.state.unlockedStage,1);
finish(1,true);assert.equal(campaign.state.unlockedStage,2);
finish(1,true);assert.equal(campaign.state.unlockedStage,2);assert.deepEqual(campaign.state.clearedStages,[1]);
campaign=createCampaign(storage);assert.equal(campaign.state.unlockedStage,2);
finish(2,true,false);assert.equal(campaign.state.unlockedStage,2);
finish(2,true);assert.equal(campaign.state.unlockedStage,3);
for(let stage=2;stage<=12;stage++){const a=sortieMission({stage:stage-1}),b=sortieMission({stage,seed:42});assert.ok(b.difficulty>a.difficulty);assert.ok(b.lootLevel>a.lootLevel);assert.equal(b.seed,42);assert.ok(b.mapLevel>=a.mapLevel);}
assert.match(briefingMap([{x:0,z:0,shape:5,rotation:0,role:'start'},{x:0,z:1,shape:6,rotation:2,role:'finish'}]),/RETURN/);
console.log('PASS stage locks, core extraction requirement, repeat/failure rules, persistence, increasing difficulty and loot, preview markers');

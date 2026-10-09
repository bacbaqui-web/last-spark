import assert from 'node:assert/strict';
import {createCampaign,tickBattery,SALVAGE_DROPS} from '../salvage-campaign.js';
let saved;const c=createCampaign({getItem:()=>saved,setItem:(_,v)=>saved=v});
let run=c.launch(['rifle'],{});assert.equal(run.materials,0);run.materials=7;const before=c.state.materials;assert.equal(c.state.materials,before);c.finish(run,true,100,'return');assert.equal(c.state.materials,before+7);assert.equal(c.state.lastReport.materials,7);assert(!c.finish(run,true,100,'duplicate'));assert.equal(c.state.materials,before+7);assert.equal(createCampaign({getItem:()=>saved,setItem(){}}).state.materials,before+7);
run=c.launch(['rifle'],{});run.materials=9;c.finish(run,false,0,'lost');assert.equal(c.state.materials,before+7);assert.equal(c.state.lastReport.materials,9);
const moving={battery:100,stats:{drain:1},time:0};tickBattery(moving,10,8);assert.equal(moving.battery,79.2);assert.equal(moving.energyUsed,20.8);assert.equal(SALVAGE_DROPS.batteryCharge,8);
console.log('PASS gear materials remain at risk, return once, persist and are lost on defeat; doubled idle/movement drain and battery pickup charge');

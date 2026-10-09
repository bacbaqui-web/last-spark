import assert from 'node:assert/strict';
import {createCampaign,frameStats,makePart} from '../salvage-campaign.js';
import {makeEquipment} from '../equipment.js';
let saved=null,fail=false;const storage={getItem:()=>saved,setItem:(_,value)=>{if(fail)throw Error('disk');saved=value;}};
const c=createCampaign(storage);c.state.materials=100;c.frame().parts.push({...makePart('reactor','installed-module'),slot:1});c.frame().equipment.head=makeEquipment('moto','installed-head',()=>.5);c.save();
for(const [kind,slot,get] of [['module',1,()=>c.frame().parts[0]],['weapon',0,()=>c.frame().weaponSlots[0]],['equipment','head',()=>c.frame().equipment.head]]){const id=get().id,before=c.state.materials,level=get().level;assert.equal(c.upgradeInstalled(kind,slot),true);assert.equal(get().id,id);assert.equal(get().level,level+1);assert.equal(c.state.materials,before-8*level);}
assert.equal(frameStats(c.frame()).battery,170);assert.equal(c.frame().parts[0].slot,1);assert.equal(c.state.stash.length,0);assert.equal(createCampaign(storage).frame().parts[0].level,2);
const before=JSON.stringify(c.state);fail=true;assert.equal(c.upgradeInstalled('module',1),false);assert.equal(JSON.stringify(c.state),before);fail=false;
const poor=createCampaign({getItem:()=>null,setItem(){}});assert.equal(poor.upgradeInstalled('weapon',0),false);assert.equal(poor.frame().weaponSlots[0].level,1);poor.state.materials=100;assert.equal(poor.upgradeInstalled('weapon',1),false);poor.launch(['rifle'],{rifle:120});assert.equal(poor.upgradeInstalled('weapon',0),false);
const readonly=createCampaign(storage,{readOnly:true});assert.equal(readonly.upgradeInstalled('weapon',0),false);
console.log('PASS installed upgrades preserve slots and IDs, spend correct materials, update effects, persist, rollback failed save, and reject empty/poor/deployed/read-only changes');

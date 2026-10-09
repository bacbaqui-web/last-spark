import assert from 'node:assert/strict';
import {createCampaign,freshCampaign,SAVE_KEY} from '../salvage-campaign.js';
const store=()=>{const data=new Map();return {data,getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};};
for(const mutate of [s=>s.clearedStages={},s=>s.stashWeapons={},s=>s.frames[0].weaponSlots={},s=>s.frames=[],s=>s.frames[0].parts=[null,{type:'alien'}],s=>s.frames[0].weaponSlots=[{type:'alien'}],s=>s.ammo={rifle:-999},s=>s.lastReport={items:{}}]){
 const storage=store(),s=freshCampaign();mutate(s);storage.setItem(SAVE_KEY,JSON.stringify(s));const c=createCampaign(storage,{backups:true});assert(c.frame());assert.doesNotThrow(()=>JSON.stringify(c.state));assert(Array.isArray(c.state.clearedStages));assert(c.state.ammo.rifle>=0);
}
{
 const storage=store();storage.setItem(SAVE_KEY,'{bad');storage.setItem(SAVE_KEY+'-backup',JSON.stringify({...freshCampaign(),materials:73}));const c=createCampaign(storage,{backups:true});assert.equal(c.state.materials,73);assert.equal(storage.getItem(SAVE_KEY+'-damaged'),'{bad');assert(!c.storageError);
}
{
 const storage=store(),c=createCampaign(storage,{backups:true}),before=JSON.stringify(c.state),real=storage.setItem;storage.setItem=()=>{throw Error('QuotaExceededError');};assert.equal(c.launch(c.frame().loadout,{rifle:60}),null);assert.equal(JSON.stringify(c.state),before);assert(c.storageError);storage.setItem=real;assert(c.save());const run=c.launch(c.frame().loadout,{rifle:60});assert(run);storage.setItem=()=>{throw Error('QuotaExceededError');};run.lootWeapons=[{id:'one-reward',type:'rifle',level:2}];assert.equal(c.finish(run,true,100,'test'),false);assert(c.pendingSave);assert.equal(c.launch(c.frame().loadout,{rifle:60}),null);storage.setItem=real;assert(c.save());assert(!c.pendingSave);assert.equal(c.state.stashWeapons.filter(w=>w.id==='one-reward').length,1);assert.equal(c.finish(run,true,100,'test'),false);
}
{
 const storage=store(),one=createCampaign(storage,{ownerId:'one'});assert(one.launch(one.frame().loadout,{rifle:60}));const before=storage.getItem(SAVE_KEY),two=createCampaign(storage,{ownerId:'two'});assert(two.storageMessage.includes('다른 탭'));assert.equal(two.launch(two.frame().loadout,{rifle:60}),null);assert.equal(storage.getItem(SAVE_KEY),before);assert(one.heartbeat());
}
{
 const storage=store(),one=createCampaign(storage),two=createCampaign(storage);assert(one.rename('changed'));assert.equal(two.rename('stale'),false);assert.equal(JSON.parse(storage.getItem(SAVE_KEY)).frames[0].name,'changed');
}
console.log('PASS nested corruption, damaged-original backup/recovery, transactional launch, finish retry, duplicate-tab ownership and stale-write protection');

{const storage=store(),first=createCampaign(storage),raw=storage.getItem(SAVE_KEY),other=createCampaign(storage,{readOnly:true});assert(other.storageError);assert.equal(other.rename('overwrite'),false);assert.equal(other.launch(other.frame().loadout,{rifle:120}),null);assert.equal(storage.getItem(SAVE_KEY),raw);console.log('PASS browser-exclusive ownership also protects hangar edits');}

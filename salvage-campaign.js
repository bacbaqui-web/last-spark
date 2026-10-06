export const SAVE_KEY='last-spark-salvage-v1';
export const PARTS={
 repair:{name:'정비용 관절 묶음',slot:'repair',tier:1,value:1,description:'본거지에서 기체 체력 35 수리'},
 armor:{name:'경량 복합 장갑',slot:'armor',tier:1,value:2,description:'받는 피해 −12% · 외장 장갑 추가'},
 drive:{name:'효율 구동 관절',slot:'drive',tier:1,value:2,description:'이동 속도 +10% · 이동 배터리 소모 −15%'},
 reactor:{name:'보조 축전기',slot:'reactor',tier:1,value:2,description:'배터리 용량 +35'},
 weapon:{name:'무기 제어 회로',slot:'weapon',tier:1,value:2,description:'무기 피해 +15%'},
 jet:{name:'추진 제어 모듈',slot:'jet',tier:2,value:4,description:'제트 대시와 이단 점프 활성화'},
 core:{name:'고밀도 발전 코어',slot:'reactor',tier:3,value:8,description:'목표 핵심 부품 · 배터리 +100 · 이동 소모 −30%'},
};
const freshFrame=(id)=>({id,name:`FRAME ${String(id).padStart(2,'0')}`,hp:100,parts:[],loadout:['shotgun','bow']});
export function freshCampaign(){return {version:1,nextId:3,selected:1,frames:[freshFrame(1),freshFrame(2)],stash:[],weapons:['shotgun','bow','knife'],weaponStock:{shotgun:2,bow:2,knife:2},ammo:{shotgun:24,bow:30,knife:60},sorties:0,lastReport:null,deployed:null};}
export function frameStats(frame){const stats={damage:1,speed:1,damageTaken:1,battery:100,drain:1,jet:false,armor:0};for(const part of frame.parts){if(part.type==='armor'){stats.damageTaken*=.88;stats.armor++;}if(part.type==='drive'){stats.speed*=1.1;stats.drain*=.85;}if(part.type==='reactor')stats.battery+=35;if(part.type==='core'){stats.battery+=100;stats.drain*=.7;}if(part.type==='weapon')stats.damage*=1.15;if(part.type==='jet')stats.jet=true;}return stats;}
export function makePart(type,id){return {id,type,identified:false};}
export function createCampaign(storage){let state;try{const parsed=JSON.parse(storage?.getItem(SAVE_KEY)||'null');if(parsed?.version===1&&Number.isFinite(parsed.nextId)&&parsed.ammo&&parsed.weaponStock&&Array.isArray(parsed.weapons)&&Array.isArray(parsed.frames)&&Array.isArray(parsed.stash)&&parsed.frames.every(f=>Number.isFinite(f.id)&&Number.isFinite(f.hp)&&Array.isArray(f.parts)&&f.parts.every(p=>PARTS[p.type]))&&parsed.stash.every(p=>PARTS[p.type]))state=parsed;}catch{}state ||=freshCampaign();let storageError=!storage;
 function save(){try{if(!storage)throw Error('storage unavailable');storage.setItem(SAVE_KEY,JSON.stringify(state));storageError=false;}catch{storageError=true;}return !storageError;}
 function frame(){return state.frames.find(f=>f.id===state.selected)||state.frames[0];}
 function finish(run,success,hp,reason){if(!run||run.finished)return false;run.finished=true;const robot=state.frames.find(f=>f.id===run.frameId);if(success&&robot){robot.hp=Math.max(1,Math.min(100,hp));state.stash.push(...run.cargo);for(const w of run.weapons)if(!state.weapons.includes(w))state.weapons.push(w);for(const w of run.weapons)state.weaponStock[w]=(state.weaponStock[w]||0)+1;for(const [w,n]of Object.entries(run.ammo||{}))state.ammo[w]=(state.ammo[w]||0)+Math.max(0,Math.floor(n));}else state.frames=state.frames.filter(f=>f.id!==run.frameId);
 state.lastReport={success,reason,frame:run.name,parts:success?run.cargo.map(p=>p.type):[],lost:success?0:run.cargo.length,kills:run.kills||0,core:run.core,time:Math.floor(run.time||0)};state.deployed=null;if(!state.frames.length){state.frames.push(freshFrame(state.nextId++));state.lastReport.replacement=true;}if(Object.values(state.weaponStock).filter(n=>n>0).length<2){for(const w of['bow','knife'])state.weaponStock[w]=Math.max(1,state.weaponStock[w]||0);state.ammo.bow=Math.max(10,state.ammo.bow||0);state.ammo.knife=Math.max(30,state.ammo.knife||0);}state.selected=state.frames.some(f=>f.id===state.selected)?state.selected:state.frames[0].id;save();return true;}
 // A reloaded or closed sortie has no remotely recoverable robot. Preserve the hangar.
 if(state.deployed){const old=state.deployed;finish({...old,cargo:[],weapons:[],finished:false},false,0,'출격 중 원격 연결 종료');}
 return {get state(){return state;},get storageError(){return storageError;},save,frame,
 select(id){if(state.frames.some(f=>f.id===id)){state.selected=id;save();}},
 build(){const spare=state.stash.findIndex(p=>p.identified);if(spare<0)return false;state.stash.splice(spare,1);const f=freshFrame(state.nextId++);state.frames.push(f);state.selected=f.id;save();return true;},
 identify(id){const p=state.stash.find(p=>p.id===id);if(p){p.identified=true;save();}},
 install(id){const f=frame(),i=state.stash.findIndex(p=>p.id===id&&p.identified);if(i<0)return false;const p=state.stash[i],info=PARTS[p.type];if(info.slot==='repair'){if(f.hp>=100)return false;f.hp=Math.min(100,f.hp+35);}else{const old=f.parts.findIndex(q=>PARTS[q.type].slot===info.slot);if(old>=0)state.stash.push(f.parts.splice(old,1)[0]);f.parts.push(p);}state.stash.splice(i,1);save();return true;},
 uninstall(id){const f=frame(),i=f.parts.findIndex(p=>p.id===id);if(i<0)return false;state.stash.push(f.parts.splice(i,1)[0]);save();return true;},
 launch(loadout,ammoCaps){if(state.deployed||loadout.length!==2||new Set(loadout).size!==2||loadout.some(w=>!state.weapons.includes(w)||!(state.weaponStock[w]>0)))return null;const f=frame();f.loadout=[...loadout];const stats=frameStats(f),run={frameId:f.id,name:f.name,stats,battery:stats.battery,cargo:[],weapons:[...loadout],ammo:{},outbound:0,returnAmbush:0,core:false,bossSpawned:false,leftStart:false,finished:false,kills:0,time:0};for(const w of loadout){state.weaponStock[w]--;const n=Math.min(state.ammo[w]||0,ammoCaps[w]||0);run.ammo[w]=n;state.ammo[w]=(state.ammo[w]||0)-n;}state.sorties++;state.deployed={frameId:f.id,name:f.name,core:false};save();return run;},finish};}
export function spendBattery(run,amount){if(!run||run.finished)return false;if(run.battery+1e-7<amount)return false;run.battery=Math.max(0,run.battery-amount);return true;}
export function tickBattery(run,dt,speed){if(!run||run.finished)return;run.time+=dt;run.battery=Math.max(0,run.battery-dt*(.08+speed*.12*run.stats.drain));}
export function lootPart(random=Math.random){const n=random();return n<.34?'repair':n<.54?'armor':n<.72?'drive':n<.86?'reactor':n<.96?'weapon':'jet';}

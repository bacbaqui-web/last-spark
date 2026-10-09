const object = value => value && typeof value === 'object' && !Array.isArray(value);
const array = value => Array.isArray(value) ? value : [];
const count = (value, fallback = 0, max = 1e7) => Number.isFinite(value) ? Math.max(0, Math.min(max, Math.floor(value))) : fallback;

// Validate before migrations or UI code touch nested values. Keep valid inventory.
export function sanitizeCampaign(input, {fresh, parts, equipment, weapons}) {
  if (!object(input) || input.version !== 1 || !Array.isArray(input.frames)) return null;
  const state = {...input};let damagedWeapons=false;
  const item = (value, catalog, kind) => {
    if (!object(value) || !catalog.includes(value.type)) {if(kind==='weapon'&&value!=null)damagedWeapons=true;return null;}
    const result = {...value, id: typeof value.id === 'string' ? value.id.slice(0,160) : `recovered-${kind}-${Math.random().toString(36).slice(2)}`, level: Math.max(1,count(value.level,1,100))};
    if (kind === 'equipment') result.options = Object.fromEntries(Object.entries(equipment[value.type].options).map(([key,base]) => [key,Number.isFinite(value.options?.[key]) ? Math.max(0, Math.min(base*2, value.options[key])) : base]));
    return result;
  };
  const module = value => item(value,[...Object.keys(parts),'jet'],'module');
  const gun = value => item(value,weapons,'weapon');
  const gear = value => item(value,Object.keys(equipment),'equipment');
  state.stash = array(state.stash).map(module).filter(Boolean);
  state.stashWeapons = array(state.stashWeapons).map(gun).filter(Boolean);
  state.stashEquipment = array(state.stashEquipment).map(gear).filter(Boolean);
  const ids = new Set();
  state.frames = state.frames.filter(object).map(frame => {
    let id = count(frame.id,0); if (!id || ids.has(id)) return null; ids.add(id);
    const normalized = {...frame,id,name:typeof frame.name==='string'?frame.name.slice(0,24):`FRAME ${id}`,hp:Number.isFinite(frame.hp)?Math.max(1,Math.min(100,frame.hp)):100,parts:array(frame.parts).map(module).filter(Boolean),equipment:{},loadout:array(frame.loadout).filter(w=>weapons.includes(w)).slice(0,2)};
    for(const [slot,value] of Object.entries(object(frame.equipment)?frame.equipment:{})) {const valid=gear(value);if(valid&&equipment[valid.type].slot===slot)normalized.equipment[slot]=valid;}
    if(state.inventoryVersion===2&&!Array.isArray(frame.weaponSlots))damagedWeapons=true;
    if(state.inventoryVersion===2)normalized.weaponSlots=Array.from({length:2},(_,i)=>gun(array(frame.weaponSlots)[i]));
    return normalized;
  }).filter(Boolean);
  if(!state.frames.length) state.frames=fresh().frames;
  state.nextId=Math.max(count(state.nextId,1),...state.frames.map(f=>f.id+1));
  state.selected=state.frames.some(f=>f.id===state.selected)?state.selected:state.frames[0].id;
  state.ammo=Object.fromEntries(weapons.map(w=>[w,count(state.ammo?.[w])]));
  state.weaponStock=Object.fromEntries(weapons.map(w=>[w,count(state.weaponStock?.[w],0,1000)]));
  state.weapons=weapons;
  state.materials=count(state.materials);state.sorties=count(state.sorties);
  state.unlockedStage=Math.max(1,count(state.unlockedStage,1,12));
  state.clearedStages=[...new Set(array(state.clearedStages).filter(n=>Number.isInteger(n)&&n>=1&&n<=12))];
  if(!object(state.deployed)||!state.frames.some(f=>f.id===state.deployed.frameId))state.deployed=null;
  if(!object(state.lastReport))state.lastReport=null;
  else state.lastReport={...state.lastReport,items:array(state.lastReport.items).flatMap(value=>{const normalized=value?.kind==='module'?module(value):value?.kind==='equipment'?gear(value):value?.kind==='weapon'?gun(value):null;return normalized?[{...normalized,kind:value.kind}]:[];})};
  // One item ID may occur in exactly one inventory location (reports are history).
  const used=new Set(),unique=value=>{if(!value)return null;if(used.has(value.id))return null;used.add(value.id);return value;};
  for(const frame of state.frames){frame.parts=frame.parts.map(unique).filter(Boolean);if(frame.weaponSlots)frame.weaponSlots=frame.weaponSlots.map(unique);frame.equipment=Object.fromEntries(Object.entries(frame.equipment).filter(([,v])=>unique(v)));}
  for(const key of ['stash','stashWeapons','stashEquipment'])state[key]=state[key].map(unique).filter(Boolean);
  if(damagedWeapons&&!state.stashWeapons.length&&!state.frames.some(f=>f.weaponSlots?.some(Boolean))){const starter=fresh().frames[0].weaponSlots[0];starter.id='recovered-starter-'+state.frames[0].id;state.frames[0].weaponSlots=[starter,null];state.ammo.rifle=Math.max(120,state.ammo.rifle||0);}
  return state;
}

export function campaignTabId() {
  try {let id=sessionStorage.getItem('last-spark-tab');if(!id){id=crypto.randomUUID();sessionStorage.setItem('last-spark-tab',id);}return id;} catch {return null;}
}

export function createCampaignStorage(storage, key, sanitize, {backups=typeof window!=='undefined'}={}) {
  let expected=null,blocked=false,message='',recovered=false,state=null,accessFailed=false,recoveryNotice='';
  const read=()=>storage?.getItem(key)??null;
  const parse=raw=>{try{return sanitize(JSON.parse(raw));}catch{return null;}};
  try {
    expected=read();state=expected?parse(expected):null;
    if(expected&&!state){
      // Preserve the damaged original before any write to the live key.
      if(backups){storage.setItem(key+'-damaged',expected);state=parse(storage.getItem(key+'-backup'));recovered=!!state;}
      else blocked=true;
      recoveryNotice=recovered?'이전 정상 저장본을 복구했습니다. 손상된 원본도 별도로 보관했습니다.':'손상된 저장 원본을 별도로 보관하고 새 기체로 복구했습니다. 데이터 내보내기로 원본을 확인할 수 있습니다.';message=recoveryNotice;
    }
  } catch {blocked=true;accessFailed=true;message='저장 공간에 접근할 수 없습니다. 저장 데이터를 덮어쓰지 않았습니다.';}
  return {
    state,get message(){return message||recoveryNotice;},get blocked(){return blocked;},get recovered(){return recovered;},
    write(value){
      try {
        if(accessFailed){const current=read();if(current!==expected)throw Error('저장 데이터가 바뀌었습니다. 새로고침 후 다시 시도해 주세요.');blocked=false;accessFailed=false;}
        if(!storage||blocked)throw Error(message||'브라우저 저장 공간을 사용할 수 없습니다.');
        const current=read();if(current!==expected&&JSON.stringify(parse(current))!==JSON.stringify(parse(expected)))throw Error('다른 탭에서 저장 데이터가 변경됐습니다. 이 화면의 결과를 내보낸 뒤 새로고침해 주세요.');
        const raw=JSON.stringify(value);
        if(raw!==current){
          if(backups&&current&&parse(current))storage.setItem(key+'-backup',current);
          storage.setItem(key,raw);
        }
        expected=read();message='';return true;
      }catch(error){message=error.message;return false;}
    },
    exportOriginal(){return expected;},
  };
}

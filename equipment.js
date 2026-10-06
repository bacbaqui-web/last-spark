export const EQUIPMENT_SLOTS={head:'머리',chest:'가슴',arms:'팔',legs:'다리',back:'등'};
export const EQUIPMENT={
 beanie:{name:'털모자',slot:'head',color:0xa95443,shape:'beanie',options:{maxHP:12,accuracy:.06}},
 cycle:{name:'자전거 헬멧',slot:'head',color:0xe0bd52,shape:'cycle',options:{accuracy:.12,evasion:.03}},
 moto:{name:'오토바이 헬멧',slot:'head',color:0x41759b,shape:'moto',options:{maxHP:20,headshot:.12}},
 tactical:{name:'전술 헬멧',slot:'head',color:0x698968,shape:'tactical',options:{accuracy:.08,headshot:.2}},
 tshirt:{name:'정비용 티셔츠',slot:'chest',color:0x568290,shape:'tshirt',options:{maxHP:15,evasion:.05}},
 vest:{name:'방탄조끼',slot:'chest',color:0x72704c,shape:'vest',options:{defense:.15,maxHP:20}},
 medic:{name:'자가 수복 흉갑',slot:'chest',color:0xc6c7bc,shape:'medic',options:{defense:.06,regen:.5}},
 marksman:{name:'조준 보조 팔 보호대',slot:'arms',color:0x477eae,shape:'marksman',options:{accuracy:.15,crit:.06}},
 brawler:{name:'타격 강화 건틀릿',slot:'arms',color:0xb87845,shape:'brawler',options:{melee:.25,crit:.04}},
 runner:{name:'경량 러닝 외장',slot:'legs',color:0x7a9e68,shape:'runner',options:{speed:.12,evasion:.03}},
 exoleg:{name:'동력 보조 각반',slot:'legs',color:0x778b9c,shape:'exoleg',options:{speed:.06,drain:.18}},
 batteryPack:{name:'예비 배터리팩',slot:'back',color:0x4f9da8,shape:'batteryPack',options:{battery:40,drain:.08}},
 jetPack:{name:'제트팩',slot:'back',color:0xb47d4c,shape:'jetPack',options:{jet:1,dashEfficiency:.25}},
 shieldPack:{name:'방어막 발생기',slot:'back',color:0x548dd0,shape:'shieldPack',options:{shield:40}},
 autoTurret:{name:'자동 사격 팔',slot:'back',color:0x8ca371,shape:'autoTurret',options:{autoDamage:12}},
 houndPack:{name:'로봇 사냥개',slot:'back',color:0xd79b55,shape:'houndPack',options:{houndDamage:22}},
};
const labels={shield:['방어막 내구도',''],autoDamage:['자동 사격 피해',''],houndDamage:['사냥개 공격력',''],maxHP:['최대 HP',''],accuracy:['에임 보정','%'],headshot:['헤드샷 피해','%'],defense:['받는 피해 감소','%'],evasion:['회피율','%'],regen:['HP 회복','/초'],crit:['치명타 확률','%'],melee:['근접 피해','%'],speed:['이동속도','%'],drain:['이동 배터리 절약','%'],battery:['배터리',''],dashEfficiency:['대시 배터리 절약','%']};
export function makeEquipment(type,id=`gear-${Date.now()}-${Math.random().toString(36).slice(2)}`,random=Math.random){const def=EQUIPMENT[type];if(!def)throw Error('Unknown equipment');const quality=.85+random()*.3;return {id,type,level:1,options:Object.fromEntries(Object.entries(def.options).map(([k,v])=>[k,k==='jet'?v:Math.round(v*quality*1000)/1000]))};}
export function equipmentOptions(item){return Object.fromEntries(Object.entries(item.options||EQUIPMENT[item.type].options).map(([k,v])=>[k,k==='jet'?v:v*(1+.15*((item.level||1)-1))]));}
export function equipmentDescription(item){return Object.entries(equipmentOptions(item)).map(([k,v])=>k==='jet'?'제트 대시 / 이단 점프':`${labels[k][0]} +${labels[k][1]==='%'?Math.round(v*100):Math.round(v*10)/10}${labels[k][1]}`).join(' · ');}
export function lootEquipment(random=Math.random){const types=Object.keys(EQUIPMENT);return types[Math.min(types.length-1,Math.floor(random()*types.length))];}
export function applyEquipmentStats(stats,items=[]){stats.maxHP=100;stats.shield=stats.autoDamage=stats.houndDamage=0;stats.accuracy=stats.headshot=stats.crit=stats.evasion=stats.regen=0;stats.melee=stats.dashEfficiency=1;stats.visualEquipment=items.map(p=>({type:p.type,level:p.level}));for(const item of items)for(const [k,v]of Object.entries(equipmentOptions(item))){if(k==='defense')stats.damageTaken*=1-Math.min(.6,v);else if(k==='speed')stats.speed*=1+v;else if(k==='drain')stats.drain*=1-Math.min(.6,v);else if(k==='dashEfficiency')stats.dashEfficiency*=1-Math.min(.6,v);else if(k==='jet')stats.jet=true;else if(k==='melee')stats.melee*=1+v;else stats[k]=(stats[k]||0)+v;}stats.accuracy=Math.min(.65,stats.accuracy);stats.crit=Math.min(.4,stats.crit);stats.evasion=Math.min(.35,stats.evasion);return stats;}
export function equipmentIcon(item){const d=EQUIPMENT[item.type],c='#'+d.color.toString(16).padStart(6,'0');const shape=d.shape==='shieldPack'?'<path d="M32 9 51 17v16c0 12-19 23-19 23S13 45 13 33V17z"/><path d="M32 18v26M21 30h22" fill="none"/>':d.shape==='autoTurret'?'<path d="M16 50V32h10V19h25v10H35v12H26v9z"/><path d="M46 19h11v7H46z"/>':d.shape==='houndPack'?'<path d="M14 25h25l5-9h11v17H44l-4 10v10h-7V40H22v13h-7V35z"/><circle cx="49" cy="22" r="2" fill="#7ee4f4"/>':d.shape==='jetPack'?'<rect x="21" y="15" width="22" height="29" rx="6"/><path d="M12 20h10v28H12zM42 20h10v28H42zM14 49l3 9 3-9M44 49l3 9 3-9"/>':d.slot==='head'?'<path d="M16 42V31a16 16 0 0 1 32 0v11z"/><path d="M20 35h24v9H20z" fill="#172330"/>':d.slot==='chest'?'<path d="M22 14l10 5 10-5 12 13-8 7v18H18V34l-8-7z"/>':d.slot==='arms'?'<path d="M19 12h15l4 23 8 11-9 9-18-13-5-24z"/>':d.slot==='legs'?'<path d="M17 12h30l-3 25 4 15H35l-3-22-3 22H16l4-15z"/>':'<rect x="17" y="12" width="30" height="40" rx="8"/><path d="M23 22h18v20H23z" fill="#7ee4f4"/>';return 'data:image/svg+xml,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="12" fill="#17212b"/><g fill="${c}" stroke="#b9cbd4" stroke-width="2">${shape}</g></svg>`);}

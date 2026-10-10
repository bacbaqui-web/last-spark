// Training reads the current frame without acquiring ownership or writing campaign data.
export function gameMode(search=''){
 const params=new URLSearchParams(search);
 return params.has('training')?'training':params.has('arena')?'arena':'recovery';
}
export function gameModeURL(mode,href){
 const url=new URL(href);url.search='';url.hash='';
 if(mode==='training')url.searchParams.set('training','');
 else if(mode==='arena')url.searchParams.set('arena','');
 return url.href;
}
export function recoveryRewards(mission){
 const level=mission.lootLevel;
 return {coreLevel:level,weaponMinLevel:level+2,weaponMaxLevel:level+4,nextStage:mission.stage<12?mission.stage+1:null};
}
export const trainingWaveSize=wave=>Math.min(40,5+wave*2);

const trainingEnemyTypes=['trooper','scoutDrone','assassin','spider','sniper','mortar','pillbug'];
// Keep small random variation, while limiting new imbalances to two enemies.
// Survivors count toward the next wave; only vacant population slots are returned.
export function trainingWaveRoster(wave,random=Math.random,survivors=[]){
 const counts=Object.fromEntries(trainingEnemyTypes.map(type=>[type,0]));
 for(const type of survivors)if(type in counts)counts[type]++;
 const roster=[],vacancies=Math.max(0,trainingWaveSize(wave)-survivors.length);
 for(let i=0;i<vacancies;i++){
  const minimum=Math.min(...Object.values(counts));
  const candidates=trainingEnemyTypes.filter(type=>counts[type]<minimum+2);
  const type=candidates[Math.min(candidates.length-1,Math.floor(random()*candidates.length))];
  counts[type]++;roster.push(type);
 }
 return roster;
}

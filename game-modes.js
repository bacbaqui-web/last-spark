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
export function trainingWaveRoster(wave,random=Math.random){
 return Array.from({length:trainingWaveSize(wave)},()=>trainingEnemyTypes[Math.floor(random()*trainingEnemyTypes.length)]);
}

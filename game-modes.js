// Training never acquires campaign ownership or creates a persistent campaign.
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

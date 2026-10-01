export const upgradeOptions=[
 {id:'power',name:'화력 증폭',symbol:'✦',description:'총기·폭발·근접 공격력 +15%',enemyDescription:'모든 적의 공격력 +15%',stat:'damage',factor:1.15},
 {id:'speed',name:'기동 강화',symbol:'➤',description:'이동·돌진 속도 +10%',enemyDescription:'이동 가능한 적의 이동 속도 +10%',stat:'speed',factor:1.1},
 {id:'vitality',name:'생명력 확장',symbol:'♡',description:'최대 체력 +20% · 늘어난 만큼 즉시 회복',enemyDescription:'모든 적 최대 체력 +20% · 남은 체력 비율 유지',stat:'maxHealth',factor:1.2},
 {id:'armor',name:'장갑 강화',symbol:'⬡',description:'받는 피해 10% 감소',enemyDescription:'모든 적이 받는 피해 10% 감소',stat:'damageTaken',factor:.9},
 {id:'haste',name:'공격 가속',symbol:'»',description:'총기 연사 속도 +12% · 수류탄 쿨타임 감소',enemyDescription:'사격·폭격·근접 공격 간격 감소',stat:'attackRate',factor:1.12},
 {id:'projectile',name:'투사체 가속',symbol:'↗',description:'광자탄·수류탄 속도 +15%',enemyDescription:'탄환·미사일 속도 +15% · 히트스캔 제외',stat:'projectileSpeed',factor:1.15},
 {id:'blast',name:'폭발 확장',symbol:'◎',description:'광자탄·수류탄 폭발 반경 +15%',enemyDescription:'미사일·거미 폭발 반경 +15%',stat:'blast',factor:1.15},
 {id:'regen',name:'자동 수복',symbol:'+',description:'매초 최대 체력의 0.5% 회복',enemyDescription:'모든 적 매초 최대 체력의 0.5% 회복',stat:'regen',add:.005},
];
export function createProgression(){const build=()=>({damage:1,speed:1,maxHealth:1,damageTaken:1,attackRate:1,projectileSpeed:1,blast:1,regen:0});return {player:build(),enemy:build(),history:[]};}
export function randomUpgradePair(random=Math.random){const first=Math.min(upgradeOptions.length-1,Math.floor(random()*upgradeOptions.length));let second=Math.min(upgradeOptions.length-2,Math.floor(random()*(upgradeOptions.length-1)));if(second>=first)second++;return [upgradeOptions[first],upgradeOptions[second]];}
export function applyUpgrade(build,option){if(option.factor)build[option.stat]*=option.factor;else build[option.stat]+=option.add;}
export function buildSummary(build){return `공격 ×${build.damage.toFixed(2)} · 이동 ×${build.speed.toFixed(2)} · 체력 ×${build.maxHealth.toFixed(2)} · 피해 감소 ${Math.round((1-build.damageTaken)*100)}% · 연사 ×${build.attackRate.toFixed(2)} · 투사체 ×${build.projectileSpeed.toFixed(2)} · 폭발 ×${build.blast.toFixed(2)} · 회복 ${(build.regen*100).toFixed(1)}%/초`;}

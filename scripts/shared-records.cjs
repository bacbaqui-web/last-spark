const weaponNames={rapid:'미니건',shotgun:'샷건',sniper:'저격총',rail:'광자포',rocket:'추적미사일'};
function parseRecord(issue){
 if(issue.pull_request||!issue.title?.startsWith('[Last Spark Record]'))return null;
 const match=issue.body?.match(/LAST_SPARK_RECORD_BEGIN\s*([\s\S]*?)\s*LAST_SPARK_RECORD_END/);if(!match)return null;
 try{const r=JSON.parse(match[1]);if(typeof r.nickname!=='string'||!r.nickname.trim()||r.nickname.length>20||/[\x00-\x1f\x7f]/.test(r.nickname))return null;
 for(const [key,max]of [['time',864000],['wave',10000],['kills',10000000]])if(!Number.isInteger(r[key])||r[key]<0||r[key]>max)return null;
 if(!Array.isArray(r.weapons)||r.weapons.length!==2||new Set(r.weapons).size!==2||r.weapons.some(w=>!Object.hasOwn(weaponNames,w)))return null;
 return {nickname:r.nickname.trim(),time:r.time,wave:r.wave,kills:r.kills,weapons:r.weapons,issue:issue.number,url:issue.html_url,date:issue.created_at};
 }catch{return null;}
}
function safe(text){return String(text).replace(/[&<>|\[\]\\`*_]/g,c=>`&#${c.charCodeAt(0)};`).replace(/[\r\n]/g,' ');}
function renderRecords(records){return '# LAST SPARK 공유 생존 기록\n\n게임 결과창에서 닉네임을 입력하고 공유 제출하면 이 문서가 자동 갱신됩니다. 생존 시간 순이며 기록은 플레이어가 제출한 값입니다.\n\n| 순위 | 닉네임 | 생존 시간 | 웨이브 | 킬 수 | 특수무기 | 제출 |\n| --- | --- | --- | --- | --- | --- | --- |\n'+records.map((r,i)=>`| ${i+1} | ${safe(r.nickname)} | ${Math.floor(r.time/60)}:${String(r.time%60).padStart(2,'0')} | ${r.wave} | ${r.kills} | ${r.weapons.map(w=>weaponNames[w]).join(' · ')} | [#${r.issue}](https://github.com/bacbaqui-web/last-spark/issues/${r.issue}) |`).join('\n')+'\n\n'+(records.length?'':'아직 공유된 기록이 없습니다.\n');}
module.exports={parseRecord,renderRecords};

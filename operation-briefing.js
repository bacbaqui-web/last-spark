import {sortieMission} from './sortie-mission.js';
import {briefingMap} from './sortie-briefing-map.js';
import {recoveryRewards} from './game-modes.js';

const arenaDiagram=`<svg viewBox="0 0 360 280" role="img" aria-label="사각 훈련장: 중앙 엄폐물, 네 모서리 저격탑, 양쪽 적 진입 지점">
 <defs><pattern id="trainingGrid" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0H0V20" fill="none" stroke="#28434e" stroke-width=".7"/></pattern></defs>
 <rect x="59" y="19" width="242" height="242" rx="4" fill="url(#trainingGrid)" stroke="#76d9ec" stroke-width="2"/>
 <g fill="#254d5d" stroke="#5d9cac"><rect x="82" y="42" width="20" height="20"/><rect x="258" y="42" width="20" height="20"/><rect x="82" y="218" width="20" height="20"/><rect x="258" y="218" width="20" height="20"/><rect x="125" y="96" width="38" height="25"/><rect x="191" y="147" width="43" height="28"/><rect x="155" y="69" width="45" height="15"/><rect x="124" y="176" width="27" height="27"/><rect x="236" y="96" width="12" height="32"/><rect x="101" y="141" width="20" height="11"/></g>
 <g fill="none" stroke="#eea46d" stroke-width="2"><path d="M29 74h52m-8-7 8 7-8 7M331 206h-52m8-7-8 7 8 7"/></g>
 <circle cx="180" cy="184" r="5" fill="#b9ed90"/><path d="m173 173 7-9 7 9" fill="none" stroke="#b9ed90" stroke-width="2"/>
 <text x="180" y="248" text-anchor="middle" fill="#88c3d0" font-size="9" letter-spacing="2">SIMULATION / 86 × 86</text>
</svg>`;

export function showOperationBriefing(root,{campaign,prepareMission,launch,training,back,frameHTML}){
 let revision=0,mission=null,launching=false,previewStarted=false;
 root.innerHTML=`<div class="briefShell operationBrief modeBrief"><header class="operationHeading"><small>REMOTE OPERATIONS</small><h1>출격 준비</h1><p>플레이할 모드를 선택하세요.</p></header>
  <div class="operationModes" role="group" aria-label="게임모드 선택">
   <button id="recoveryMode" class="operationMode" aria-pressed="false" aria-controls="recoveryBrief"><small>01 / FIELD OPERATION</small><b>전쟁위성 회수작전</b><span>실제 기체로 출격해 위성 코어와 장비를 회수합니다.</span><em>회수작전 선택 →</em></button>
   <button id="trainingMode" class="operationMode trainingModeCard" aria-pressed="false" aria-controls="trainingBrief"><small>02 / NETWORK SIMULATION</small><b>전투훈련장</b><span>가상 아레나에서 밀려오는 적과 전투합니다. 아이템 손실이 없습니다.</span><em>전투훈련장 선택 →</em></button>
  </div>
  <div id="modeChoiceBack" class="briefButtons"><button data-brief-back>← 기체 정비로</button></div>
  <section id="recoveryBrief" aria-labelledby="recoveryMode" hidden>
   <div class="recoveryLayout"><div class="recoveryMapColumn"><label class="missionField">작전 단계<select id="missionStage">${Array.from({length:12},(_,i)=>`<option value="${i+1}" ${i+1>campaign.state.unlockedStage?'disabled':''} ${i+1===campaign.state.unlockedStage?'selected':''}>STAGE ${i+1} ${i+1>campaign.state.unlockedStage?'· 잠김':campaign.state.clearedStages.includes(i+1)?'· 클리어':'· 출격 가능'}</option>`).join('')}</select></label>
    <div id="operationMap" aria-live="polite">도시 지도를 생성하는 중…</div><p class="mapLegend">● 연두: 투입 / 귀환 지점　● 주황: 위성 추락지</p>
    <div class="operationStory"><small>MISSION BRIEF</small><h2>추락한 위성의 마지막 신호</h2><p>구시가지에 전쟁위성이 추락했습니다. 신호를 쫓아 모여든 야생 로봇을 뚫고, 잔해 속 발전 코어와 무기를 회수하세요. 사람 대신 원격 기체가 투입됩니다.</p><p>회수를 마치면 <b>처음 도착한 RETURN 드론</b>으로 돌아와 철수하세요.</p></div>
   </div><aside class="recoveryDetails"><h2>클리어 보상</h2><p>코어 회수 후 무사 귀환하면 확보합니다.</p><ul id="missionRewards" class="missionRewards" aria-live="polite"></ul><div id="missionSummary" class="briefObjectives" aria-live="polite"></div><p class="operationRisk">실제 기체가 출격합니다. 파괴되면 기체·장착품·이번에 수집한 아이템을 잃습니다.</p></aside></div>
   <details class="operationFrame"><summary>투입 기체와 장착 장비 확인</summary>${frameHTML}</details>
   <p id="recoveryRequirement" class="operationRequirement" role="status"></p>
   <div class="briefButtons"><button data-brief-back>← 기체 정비로</button><button id="deploySortie" disabled>지도 생성 중…</button></div>
  </section>
  <section id="trainingBrief" aria-labelledby="trainingMode" hidden><div class="trainingLayout"><div class="trainingDiagram">${arenaDiagram}<p>사각 아레나 · 엄폐물 · 저격탑</p></div><div class="trainingStory"><small>VIRTUAL COMBAT / NO ITEM LOSS</small><h2>기체는 정비실에.<br>전투는 네트워크 안에서.</h2><p>관제망이 만들어 낸 가상 훈련장입니다. 실제 기체 대신 훈련용 가상 기체에 접속해, 끝없이 밀려오는 적과 싸웁니다.</p><ul><li><b>끝없는 웨이브</b><span>적과 보스를 모두 처치하면 다음 웨이브가 시작됩니다.</span></li><li><b>자유로운 가상 무장</b><span>기본 무기와 특수무기 2개로 시작합니다. 탄약과 HP팩을 주워 버티세요.</span></li><li><b>부담 없이 다시 도전</b><span>죽거나 중단해도 실제 기체·장비·창고 탄약은 그대로입니다.</span></li></ul><p class="trainingNote">훈련 중 얻은 아이템과 강화는 이번 훈련에서만 사용됩니다. 회수 보상과 작전 단계 해금은 없습니다.</p></div></div><div class="briefButtons"><button data-brief-back>← 기체 정비로</button><button id="connectTraining">훈련장 접속 →</button></div></section>
 </div>`;
 const $=selector=>root.querySelector(selector),deploy=$('#deploySortie'),stage=$('#missionStage');
 const unavailable=()=>campaign.pendingSave?'귀환 결과를 저장한 뒤 출격할 수 있습니다. 기체 정비실에서 저장을 재시도해 주세요.':campaign.storageError?'저장 상태를 확인한 뒤 출격할 수 있습니다.':!campaign.frame().weaponSlots.some(Boolean)?'회수작전에는 무기를 1개 이상 장착해 주세요. 전투훈련장은 바로 이용할 수 있습니다.':'';
 async function generate(){
  previewStarted=true;const current=++revision;mission=null;deploy.disabled=true;deploy.textContent='지도 생성 중…';$('#operationMap').textContent='도시 지도를 생성하는 중…';$('#missionSummary').textContent='';
  const next=sortieMission({stage:Number(stage.value),seed:crypto.getRandomValues(new Uint32Array(1))[0]}),rewards=recoveryRewards(next);
  $('#missionRewards').innerHTML=`<li><span>확정 회수</span><b>고밀도 발전 코어 ×1</b><small>Lv.${rewards.coreLevel}</small></li><li><span>확정 회수</span><b>고등급 무기 ×1</b><small>무작위 종류 · Lv.${rewards.weaponMinLevel}–${rewards.weaponMaxLevel}</small></li><li><span>현장 수집</span><b>모듈 · 무기 · 외장 장비</b><small>전투 중 획득한 수집품을 창고에 보관</small></li>${rewards.nextStage?`<li><span>진행 보상</span><b>STAGE ${rewards.nextStage} 해금</b><small>해당 단계 최초 클리어 시</small></li>`:'<li><span>최종 단계</span><b>STAGE 12 클리어 기록</b><small>최종 단계에서도 장비를 반복 회수할 수 있습니다.</small></li>'}`;
  $('#recoveryRequirement').textContent=unavailable();
  try{
   const preview=await prepareMission(next);if(current!==revision||root.hidden)return;
   mission=next;$('#operationMap').innerHTML=briefingMap(preview.tiles);
   $('#missionSummary').innerHTML=`<span>${preview.tiles.length}개 구역 · 보스 1체</span><span>적 체력 / 공격력 ×${next.difficulty.toFixed(2)}</span>`;
   deploy.disabled=!!unavailable();deploy.textContent=deploy.disabled?'출격 조건을 확인해 주세요':'회수작전 출격 →';
  }catch(error){if(current!==revision||root.hidden)return;$('#operationMap').textContent='지도 생성 실패 · '+error.message;deploy.disabled=false;deploy.textContent='지도 다시 불러오기';}
 }
 function select(mode){
  if(launching)return;const recovery=mode==='recovery';
  $('#recoveryMode').setAttribute('aria-pressed',String(recovery));$('#trainingMode').setAttribute('aria-pressed',String(!recovery));
  $('#recoveryBrief').hidden=!recovery;$('#trainingBrief').hidden=recovery;
  $('#modeChoiceBack').hidden=true;root.scrollTop=0;
  if(recovery&&!previewStarted)generate();
 }
 $('#recoveryMode').onclick=()=>select('recovery');$('#trainingMode').onclick=()=>select('training');
 root.querySelectorAll('[data-brief-back]').forEach(button=>button.onclick=()=>{if(launching)return;revision++;root.hidden=true;back();});
 $('#connectTraining').onclick=()=>{if(launching)return;revision++;training();};
 stage.onchange=generate;
 deploy.onclick=async()=>{
  if(launching||unavailable())return;if(!mission){generate();return;}
  launching=true;const buttons=[...root.querySelectorAll('button'),stage];buttons.forEach(button=>button.disabled=true);deploy.textContent='도시 구역 준비 중…';
  try{await launch(mission);revision++;root.hidden=true;}
  catch(error){launching=false;buttons.forEach(button=>button.disabled=false);deploy.textContent='다시 출격';$('#recoveryRequirement').textContent=error.message;}
 };
 root.scrollTop=0;$('#recoveryMode').focus({preventScroll:true});
 return ()=>{revision++;};
}

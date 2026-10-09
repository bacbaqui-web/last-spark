import {acquireCampaignOwner} from './campaign-owner.js';
import {preloadAssetUpgrades} from './asset-upgrades.js';
import {loadTorsoTextures} from './torso-textures.js';
const status=document.createElement('div');status.className='bootStatus';status.setAttribute('role','status');status.textContent=new URLSearchParams(location.search).has('training')?'LAST SPARK · 가상 전투훈련장을 준비하고 있습니다…':'LAST SPARK · 정비실을 준비하고 있습니다…';document.body.appendChild(status);
let timer;try{
 await Promise.all([loadTorsoTextures(),Promise.race([preloadAssetUpgrades(),new Promise(resolve=>{timer=setTimeout(resolve,12000);})])]);
 window.lastSparkStorageLock=await acquireCampaignOwner();
 await import('./main.js');status.remove();
}catch(error){console.error('Game startup failed',error);status.textContent='게임을 시작하지 못했습니다. 네트워크를 확인한 뒤 다시 시도해 주세요. ';const retry=document.createElement('button');retry.textContent='다시 불러오기';retry.onclick=()=>location.reload();status.appendChild(retry);}finally{clearTimeout(timer);}

window.addEventListener('pageshow',event=>{if(event.persisted)location.reload();});

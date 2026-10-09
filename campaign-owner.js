import {gameMode} from './game-modes.js';
// A browser lock survives timer throttling/sleep and is released when its page
// closes. The storage revision check remains the fallback on older browsers.
export async function acquireCampaignOwner(){
 if(typeof navigator==='undefined'||!navigator.locks||gameMode(location.search)!=='recovery')return null;
 return new Promise(resolve=>{navigator.locks.request('last-spark-campaign-owner',{ifAvailable:true},async lock=>{resolve(Boolean(lock));if(lock)await new Promise(release=>window.addEventListener('pagehide',release,{once:true}));}).catch(()=>resolve(null));});
}

// A single looping track survives hangar/briefing transitions without restarting.
export function createHangarMusic(){
 const audio=new Audio(new URL('./audio/hangar-chanson-dans-la-nuit.mp3',document.baseURI).href);audio.loop=true;audio.volume=.35;audio.preload='none';audio.hidden=true;audio.setAttribute?.('aria-label','정비실 BGM');document.body?.append(audio);let enabled=false;
 const sync=()=>{if(enabled&&!document.hidden)audio.play().catch(()=>{});else audio.pause();};
 document.addEventListener('click',sync);document.addEventListener('pointerdown',sync);document.addEventListener('keydown',sync);document.addEventListener('visibilitychange',sync);
 return {setActive(active){enabled=active;sync();},dispose(){enabled=false;audio.pause();audio.removeAttribute('src');audio.load();audio.remove?.();document.removeEventListener('click',sync);document.removeEventListener('pointerdown',sync);document.removeEventListener('keydown',sync);document.removeEventListener('visibilitychange',sync);}};
}

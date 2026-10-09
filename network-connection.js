let overlay;
export function showNetworkConnection(){
 if(overlay)return overlay;
 const root=document.createElement('section');root.className='networkConnection';root.setAttribute('role','status');root.setAttribute('aria-label','가상 훈련장에 접속 중');
 root.innerHTML='<div class="networkVortex">'+Array.from({length:16},(_,i)=>`<i style="--delay:${-i*.12}s;--spin:${i*7}deg"></i>`).join('')+'</div><div class="networkReticle"></div><header><small>NEURAL LINK / SIMULATION</small><h1>훈련장에 접속 중</h1><p>프레임 동기화 · 전투 데이터 수신 중…</p></header>';
 document.body.append(root);let closed=false;
 overlay={close(){if(closed)return;closed=true;root.remove();overlay=null;}};return overlay;
}

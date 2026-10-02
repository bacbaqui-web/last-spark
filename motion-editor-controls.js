export function bindNumberDrag(input,{begin,change,end,step=1}){
 let drag=null;
 input.title='좌우로 드래그하여 조절 · 클릭하면 숫자 입력 · Shift 미세 조절';
 input.addEventListener('pointerdown',e=>{if(input.disabled||e.button!==0)return;drag={x:e.clientX,y:e.clientY,value:Number(input.value)||0,active:false};});
 const move=e=>{if(!drag)return;const dx=e.clientX-drag.x;if(!drag.active&&Math.abs(dx)>4){drag.active=true;begin?.();input.blur();input.classList.add('numberDragging');}if(!drag.active)return;e.preventDefault();const value=drag.value+dx*step*(e.shiftKey?.1:1);input.value=String(Number(value.toFixed(4)));change(value);};
 const finish=()=>{if(!drag)return;if(drag.active){input.classList.remove('numberDragging');end?.();}drag=null;};
 addEventListener('pointermove',move);addEventListener('pointerup',finish);addEventListener('pointercancel',finish);
}
export function createPartMap(container,select){
 const layout=[['Head','머리',2,1],['neck_01','목',2,2],['clavicle_l','왼쪽 어깨',1,2],['clavicle_r','오른쪽 어깨',3,2],['spine_03','가슴',2,3],['upperarm_l','왼쪽 위팔',1,3],['upperarm_r','오른쪽 위팔',3,3],['spine_02','몸통',2,4],['lowerarm_l','왼쪽 아래팔',1,4],['lowerarm_r','오른쪽 아래팔',3,4],['spine_01','허리',2,5],['hand_l','왼손',1,5],['hand_r','오른손',3,5],['pelvis','골반',2,6],['thigh_l','왼쪽 허벅지',1,7],['thigh_r','오른쪽 허벅지',3,7],['calf_l','왼쪽 종아리',1,8],['calf_r','오른쪽 종아리',3,8],['foot_l','왼발',1,9],['foot_r','오른발',3,9],['$weapon','무기',2,8]];
 for(const [id,label,col,row]of layout){const button=document.createElement('button');button.textContent=label.replace('왼쪽 ','').replace('오른쪽 ','');button.title=label;button.dataset.part=id;button.style.gridColumn=col;button.style.gridRow=row;button.onclick=()=>select(id);button.setAttribute('aria-label',label+' 선택');container.append(button);}
 return id=>{for(const b of container.children){b.classList.toggle('selected',b.dataset.part===id);b.setAttribute('aria-pressed',String(b.dataset.part===id));}};
}

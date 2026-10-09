// Keep the slot nodes alive while ammunition changes. Rebuild only on loadout
// changes; repeated firing updates the number and arc, not the entire SVG tree.
export function createWeaponSlotHUD(host){
 let layout='',values='',nodes=null,builds=0,updates=0;
 const amount=item=>item.type==='pistol'?Infinity:Math.max(0,item.amount||0);
 const ratio=item=>item.type==='pistol'?1:Math.max(0,Math.min(1,amount(item)/item.max));
 const className=(item,index,equipped)=>`weaponSlot${equipped===index+1?' equipped':''}${amount(item)===0?' empty':''}`;
 const text=item=>item.type==='pistol'?'∞':amount(item)+' / '+item.max;
 function render(items,equipped,firstSlot=2){
  const nextLayout=JSON.stringify(items.map(item=>[item.type,item.name,item.color,item.max]))+':'+firstSlot;
  const nextValues=items.map(amount).join(',')+':'+equipped;
  if(layout===nextLayout&&values===nextValues)return;
  if(layout!==nextLayout||!nodes){
   host.innerHTML=items.map((item,i)=>`<span style="color:#${item.color.toString(16)}" class="${className(item,i,equipped)}"><svg class="slotBar" viewBox="0 0 130 240" aria-hidden="true"><path class="slotTrack" d="${i===0?'M4 12 A108 108 0 0 1 4 228':'M4 22 A98 98 0 0 1 4 218'}"/><path class="slotFill" pathLength="100" style="stroke-dashoffset:${(1-ratio(item))*100}" d="${i===0?'M4 12 A108 108 0 0 1 4 228':'M4 22 A98 98 0 0 1 4 218'}"/></svg><div class="slotValue"><b>${i+firstSlot} · ${item.name}</b><strong>${text(item)}</strong></div></span>`).join('');
   nodes=host.querySelectorAll?[...host.querySelectorAll('.weaponSlot')].map(root=>({root,number:root.querySelector('strong'),arc:root.querySelector('.slotFill')})):null;builds++;
  }else{
   items.forEach((item,i)=>{const node=nodes[i],label=text(item),state=className(item,i,equipped),offset=String((1-ratio(item))*100);if(node.root.className!==state)node.root.className=state;if(node.number.textContent!==label)node.number.textContent=label;if(node.arc.style.strokeDashoffset!==offset)node.arc.style.strokeDashoffset=offset;});updates++;
  }
  layout=nextLayout;values=nextValues;
 }
 return {render,snapshot:()=>({weaponHUDBuilds:builds,weaponHUDUpdates:updates})};
}

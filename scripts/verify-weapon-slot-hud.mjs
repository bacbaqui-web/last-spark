import assert from 'node:assert/strict';
import {createWeaponSlotHUD} from '../weapon-slot-hud.js';
// Minimal DOM contract; browser integration separately verifies the real SVG.
let html='',writes=0,nodes=[];
const host={set innerHTML(value){writes++;html=value;nodes=Array.from({length:(value.match(/class="weaponSlot/g)||[]).length},()=>{const number={textContent:''},arc={style:{}};return {className:'',querySelector:selector=>selector==='strong'?number:arc,number,arc};});},get innerHTML(){return html;},querySelectorAll:()=>nodes};
const hud=createWeaponSlotHUD(host),items=[{type:'rapid',name:'미니건',color:0x56dfff,max:240,amount:240},{type:'shotgun',name:'산탄총',color:0xffac52,max:24,amount:24}];
hud.render(items,1);const original=nodes[0];
for(let ammo=239;ammo>=0;ammo--){items[0].amount=ammo;hud.render(items,1);}
assert.equal(writes,1,'an entire magazine must not rebuild the SVG or slot DOM');assert.equal(nodes[0],original);
assert.equal(original.number.textContent,'0 / 240');assert.equal(original.arc.style.strokeDashoffset,'100');assert.match(original.className,/equipped empty/);
items[0].amount=80;hud.render(items,2);assert.equal(writes,1);assert.equal(original.number.textContent,'80 / 240');assert.doesNotMatch(original.className,/equipped|empty/);assert.match(nodes[1].className,/equipped/);
assert(Math.abs(Number(original.arc.style.strokeDashoffset)-100*2/3)<1e-9);
hud.render(items,2);assert.equal(hud.snapshot().weaponHUDUpdates,241,'unchanged ammo performs no update');
hud.render(items,2,1);assert.equal(writes,2);assert.match(html,/1 · 미니건/);
hud.render([{type:'pistol',name:'기본',color:0xffac52,amount:Infinity}],1,1);assert.equal(writes,3);assert.match(html,/∞/);assert.doesNotMatch(html,/NaN/);
hud.render([],0);assert.equal(html,'');
console.log('PASS stable slot nodes across 240 shots, empty/refill/switch arcs, mode slot numbering and infinite ammo');

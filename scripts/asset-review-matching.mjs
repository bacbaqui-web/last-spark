import {REVIEW_CURATED} from '../asset-review-curated.js';
// Provider search is broad ("car" can return a tyre). Match the subject as well.
const subjects={
 'street-sedan':'sedan|car|beetle', 'street-hatch':'hatchback|hatch|car|beetle', 'street-wagon':'wagon|estate',
 'street-suv':'suv|jeep|land rover|range rover', 'street-pickup':'pickup|pick up', 'street-taxi':'taxi|cab',
 'street-van':'van|minivan', 'street-ambulance':'ambulance', 'street-delivery':'truck|lorry', 'street-minibus':'minibus|bus',
 'wreck-bus':'bus', 'wreck-truck':'truck|lorry', 'traffic-light':'traffic light|traffic signal', 'street-lamp':'street lamp|street light|streetlight|lamp post|lamppost',
 'lush-tree':'tree|oak|pine|birch', 'pavement-break':'rubble|debris|broken concrete|damaged asphalt', 'ruin-wall':'concrete pillar|concrete column|damaged pillar',
 'surface-brick':'brick|bricks', 'surface-asphalt':'asphalt|road', 'surface-concrete':'concrete|pavement', 'surface-metal':'metal|rust|steel|iron', 'surface-wood':'wood|plank|timber', 'surface-roof':'roof|roofing',
 'street-rubble':'rubble|debris|rubble pile', 'street-grass':'grass|grasses|weeds', 'street-ivy':'ivy|vine|vines',
 'ref-bridge':'bridge', 'ref-warehouse':'warehouse|factory',
 'gallery-apartment':'apartment|building', 'gallery-shop':'shop|store|building', 'gallery-ruin':'ruin|ruins|building', 'gallery-car':'car|sedan|beetle', 'gallery-van':'van|minivan', 'gallery-tree':'tree|oak|pine', 'gallery-dead-tree':'dead tree|dry tree|tree', 'gallery-signal':'traffic light|traffic signal', 'gallery-barrels':'barrel|barrels|drum', 'gallery-barricade':'barrier|barricade', 'gallery-container':'shipping container|cargo container', 'gallery-rubble':'rubble|debris',
 'weapon-pistol':'assault rifle|ak ?47|m4|ar ?15', 'weapon-rapid':'minigun|gatling', 'weapon-shotgun':'shotgun', 'weapon-sniper':'sniper|rifle', 'weapon-rail':'railgun|rail gun', 'weapon-rocket':'rocket launcher|rpg|bazooka', 'weapon-flame':'flamethrower', 'weapon-bow':'bow|crossbow', 'weapon-laser':'laser gun|laser rifle|laser pistol|ray gun', 'weapon-knife':'knife|dagger', 'weapon-chainsaw':'chainsaw|chain saw', 'weapon-sword':'sword|katana',
 'equipment-beanie':'beanie|knit hat', 'equipment-cycle':'helmet', 'equipment-moto':'helmet', 'equipment-tactical':'helmet', 'equipment-vest':'vest|body armor', 'equipment-medic':'armor|armour|chestplate', 'equipment-batteryPack':'backpack|battery pack', 'equipment-jetPack':'jetpack|jet pack', 'equipment-shieldPack':'backpack|shield generator', 'equipment-autoTurret':'turret', 'equipment-houndPack':'robot dog|robotic dog', 'equipment-tshirt':'t shirt|tshirt|shirt', 'equipment-marksman':'arm armor|armour|bracer', 'equipment-brawler':'gauntlet|gauntlets', 'equipment-runner':'leg armor|greaves|boots', 'equipment-exoleg':'leg armor|greaves|boots',
 'robot-drone':'drone|quadcopter', 'robot-spider':'spider'
};
export function candidateScore(asset,target){
 if(REVIEW_CURATED[target.id]?.some(a=>a.id===asset.id))return 10;
 if(asset.price?.free!==true||!asset.downloadable||asset.type!==target.type)return -1;
 const title=(asset.title||'').toLowerCase().replace(/[_-]/g,' '),description=(asset.description||'').toLowerCase();
 const subject=subjects[target.id]||(target.id.startsWith('ref-')?'building|house|ruin|ruins':target.adapter==='rigged'?'robot|android|mech|cyborg':'');
 if(subject&&!new RegExp('\\b('+subject+')\\b','i').test(title))return -1;
 if(/cartoon|stylized|stylised|voxel|low poly art|jinx|litle robot|little robot/.test(title+' '+description)||asset.provider==='kenney')return -1;
 if(target.type==='model'){
  if(!asset.formats?.some(f=>['glb','gltf','zip','blend'].includes(f)))return -1;
  if(asset.polyCount>target.maxTriangles&&(!asset.formats.includes('blend')||target.adapter==='rigged'||asset.polyCount>target.maxTriangles*12))return -1;
  if((target.category==='차량'||['gallery-car','gallery-van'].includes(target.id))&&/\b(covered|tire|tyre|wheel|engine|rim|seat|toy|shoes|shoe|station|temple|painting|portrait|gogh|stop|shelter)\b/.test(title))return -1;
  if((target.category==='차량'||['gallery-car','gallery-van'].includes(target.id))&&/hand truck|pallet truck|truck crane/.test(title))return -1;
  if(target.category==='외장 장비'&&/\b(car|truck|tank|vehicle)\b/.test(title))return -1;
  if(target.id==='gallery-shop'&&/chair|shelf|counter|sign|cash register/.test(title))return -1;
  if(target.id==='gallery-dead-tree'&&/stump|log/.test(title))return -1;
  if(target.id==='weapon-knife'&&/fish|kitchen|bread|butter|cutlery/.test(title))return -1;
  if(target.id==='street-ivy'&&/\bleaf\b/.test(title))return -1;
  if(['lush-tree','gallery-tree'].includes(target.id)&&/\b(stump|trunk|branch|log|palm|quiver)\b/.test(title))return -1;
  if(target.adapter==='rigged'&&(asset.rigged===false||/articulated|industrial|kuka|robot arm/.test(title)))return -1;
  if((target.id.startsWith('ref-')||['gallery-apartment','gallery-ruin'].includes(target.id))&&title.trim()==='building')return -1;
  if(['ref-brownstone','ref-alley'].includes(target.id)&&!/brick|brownstone/.test(title))return -1;
  if(target.id==='ref-tower'&&!/tower|skyscraper|high rise/.test(title))return -1;
  if(target.id==='ref-colonnade'&&!/colonnade|columned|classical ruin/.test(title))return -1;
  if(target.id==='equipment-medic'&&!/chest|torso|breastplate|vest/.test(title))return -1;
  if(target.id==='ref-alley'&&/scan old brick building/.test(title))return -1;
  if(target.id==='ref-warehouse'&&title==='industrial old warehouse')return -1;
 }
 const weathered=/abandoned|weathered|ruined|rusty|damaged|dirty|wreck|old/.test(title+' '+description);
 return (asset.score||0)+(weathered?.3:0)+(asset.provider==='polyhaven'?.15:0);
}
export function rankCandidates(assets,target){return assets.map(asset=>({asset,score:candidateScore(asset,target)})).filter(x=>x.score>=0).sort((a,b)=>b.score-a.score).map(x=>x.asset);}

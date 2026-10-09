import {createCombatPillbug} from './pillbug-combat.js';
import {disposeObjectResources} from './runtime-resources.js';
import {wildEnemyId,createWildEnemy,animateWildEnemy,fireWildEnemy,disposeWildEnemy} from './wild-enemy-models.js';
import {ENEMY_DEATH_DURATION,updateEnemyDeathBurst,resetEnemyDeathBurst} from './enemy-death-burst.js';
import {panelGeometry,panelTexture,detailBatch,decorateRobot} from './model-detail.js';
import * as THREE from 'three';
import {attachRobotUpgrade,updateRobotUpgrade,applyRigidUpgrade,attachSpiderUpgrade} from './asset-upgrades.js';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import rigData from './rig-data.json' with {type:'json'};
import {createSalvageFrame} from './salvage-robot-frame.js';
import {alignSalvageRig,alignSalvageClip} from './salvage-rig-alignment.js';
const cubeGeometry=panelGeometry;
const frameGeometry=new THREE.CapsuleGeometry(.5,1,8,20);
// Broad waist edge and a downward point between the two hip joints.
const pelvisOutline=new THREE.Shape();pelvisOutline.moveTo(-.5,.5);pelvisOutline.lineTo(.5,.5);pelvisOutline.lineTo(.42,-.08);pelvisOutline.lineTo(0,-.5);pelvisOutline.lineTo(-.42,-.08);pelvisOutline.closePath();
const pelvisGeometry=new THREE.ExtrudeGeometry(pelvisOutline,{depth:1,bevelEnabled:false,steps:1});pelvisGeometry.translate(0,0,-.5);
const armor=new THREE.MeshStandardMaterial({color:0x928775,metalness:.3,roughness:.65});
const bossArmor=new THREE.MeshStandardMaterial({color:0xad7852,metalness:.35,roughness:.65});
const joints=new THREE.MeshStandardMaterial({color:0x343b40,metalness:.5,roughness:.7});
const trim=new THREE.MeshStandardMaterial({color:0xb9b4a5,metalness:.4,roughness:.5});
const glow=new THREE.MeshBasicMaterial({color:0xff7851});
for(const geometry of [frameGeometry,pelvisGeometry])geometry.userData.sharedModelGeometry=true;
for(const material of [armor,bossArmor,joints,trim,glow])material.userData.sharedWeaponMaterial=true;
armor.map=bossArmor.map=trim.map=panelTexture;
const clips=rigData.clips.map(c=>new THREE.AnimationClip(c.name,-1,c.tracks.map(t=>new (t.type==='quaternion'?THREE.QuaternionKeyframeTrack:THREE.VectorKeyframeTrack)(t.name,t.times,t.values))));
const reverse=clips.find(c=>c.name==='Sword_Attack').clone();reverse.name='Sword_Attack_Reverse';for(const t of reverse.tracks){const size=t.getValueSize(),source=t.values.slice();for(let i=0;i<t.times.length;i++)for(let j=0;j<size;j++)t.values[i*size+j]=source[(t.times.length-1-i)*size+j];}clips.push(reverse);
const upper=/^(spine|neck|Head|clavicle|upperarm|lowerarm|hand)/;
function block(parent,material,size,pos){const m=new THREE.Mesh(cubeGeometry,material);m.scale.set(...size);m.position.set(...pos);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
export function createRobot(boss=false,type='trooper',headScale=1){
 if(type==='pillbug')return createCombatPillbug();
 const wildId=wildEnemyId(boss,type),wild=wildId&&createWildEnemy(wildId);if(wild)return wild;
 const root=new THREE.Group(),motion=new THREE.Group();root.add(motion);root.name=boss?'destroyer':'trooper';
 const bones=rigData.nodes.map(n=>{const b=new THREE.Bone();b.name=n.name;if(n.translation)b.position.fromArray(n.translation);if(n.rotation)b.quaternion.fromArray(n.rotation);if(n.scale)b.scale.fromArray(n.scale);return b;});
 rigData.nodes.forEach((n,i)=>(n.children||[]).forEach(c=>bones[i].add(bones[c])));motion.add(bones[64]);motion.updateMatrixWorld(true);
 const byName=Object.fromEntries(bones.map(b=>[b.name,b]));
 const bindPositionOffsets=type==='player'?alignSalvageRig(motion,byName):new Map();
 const upgradeBindPose=new Map(bones.map(b=>[b.name,b.getWorldQuaternion(new THREE.Quaternion())]));
 const mat=boss?bossArmor:armor,restGazeAxis=new THREE.Vector3(0,0,1).applyQuaternion(byName.Head.getWorldQuaternion(new THREE.Quaternion()).invert());
 // Rigid armor sections bind to actual animation bones in the rest pose.
 function bind(name,size,offset=[0,0,0],material=mat){const b=byName[name],pos=b.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(...offset));const m=block(motion,material,size,pos.toArray());motion.updateMatrixWorld(true);b.attach(m);return m;}
 function segment(name,end,width,depth){const b=byName[name],a=b.getWorldPosition(new THREE.Vector3()),z=byName[end].getWorldPosition(new THREE.Vector3()),delta=z.clone().sub(a);const m=block(motion,joints,[width,delta.length()*.48,depth],a.add(z).multiplyScalar(.5).toArray());m.geometry=frameGeometry;m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());motion.updateMatrixWorld(true);b.attach(m);}
 const pelvisShell=bind('pelvis',[.25,.16,.18],[0,0,-byName.pelvis.getWorldPosition(new THREE.Vector3()).z],joints);pelvisShell.geometry=pelvisGeometry;pelvisShell.userData.cosmetic=true;bind('spine_01',[.19,.18,.16],[0,.04,0],joints);bind('spine_03',[.32,.30,.20],[0,.015,0],joints);
 const neckShell=bind('Head',[.105,.065,.105],[0,-.045,0],joints);neckShell.geometry=frameGeometry;
 const head=bind('Head',[.28,.36,.255],[0,.135,0],joints);const visor=bind('Head',[.18,.035,.025],[0,.155,.133],glow);head.userData.weakPoint=visor.userData.weakPoint=true;
 for(const side of ['l','r']){if(!boss){segment('upperarm_'+side,'lowerarm_'+side,.175,.175);segment('lowerarm_'+side,'hand_'+side,.17,.17);bind('hand_'+side,[.13,.16,.13],[0,0,0],joints);}segment('thigh_'+side,'calf_'+side,.20,.20);segment('calf_'+side,'foot_'+side,.19,.19);const foot=bind('foot_'+side,[.145,.105,.235],[0,-.005,.04],joints);foot.geometry=new RoundedBoxGeometry(1,1,1,5,.28);foot.userData.cosmetic=true;}
 const salvageFrame=type==='player'?createSalvageFrame(motion,byName,head,visor):null;
 // Gun is mounted in the right-hand rest frame; animated aim points it forward.
 const weapon=new THREE.Group();byName.hand_r.add(weapon);weapon.position.set(0,.08,.025);block(weapon,joints,[.14,.16,.39],[0,.04,.09]);block(weapon,mat,[.16,.065,.28],[0,.14,.08]);const muzzle=new THREE.Group();muzzle.position.set(0,.045,.3);weapon.add(muzzle);
 const muzzleFlash=new THREE.Mesh(new THREE.ConeGeometry(.085,.22,5),new THREE.MeshBasicMaterial({color:0xffd497}));muzzleFlash.rotation.x=Math.PI/2;muzzleFlash.position.z=.08;muzzleFlash.visible=false;muzzle.add(muzzleFlash);
 // Existing gameplay height is preserved; width/depth are much slimmer.
 
 const hitMeshes=[];root.traverse(o=>{if(o.isMesh&&o!==muzzleFlash){o.userData.enemyPart=true;hitMeshes.push(o);}});
 let aimEmitter=null;const missileMuzzles=[];if(boss){weapon.visible=false;bind('spine_03',[.75,.5,.35],[0,.08,0],bossArmor);for(const side of [-1,1]){const pod=new THREE.Group();pod.position.set(side*.62,1.35,.06);motion.add(pod);block(pod,bossArmor,[.48,.65,.7],[0,0,0]);block(pod,joints,[.5,.67,.055],[0,0,.38]);detailBatch(pod,[[[.5,.075,.76],[0,.32,0],trim],[[.5,.075,.76],[0,-.32,0],trim],[[.075,.5,.045],[-.27,0,.34],trim],[[.075,.5,.045],[.27,0,.34],trim],[[.25,.36,.09],[0,0,-.4],joints]]);for(const x of [-.12,.12])for(const y of [-.19,0,.19]){const port=new THREE.Mesh(new THREE.CylinderGeometry(.075,.075,.1,8),glow);port.rotation.x=Math.PI/2;port.position.set(x,y,.43);pod.add(port);}const socket=new THREE.Group();socket.position.set(0,0,.5);pod.add(socket);missileMuzzles.push(socket);}}if(type==='sniper'){const sensor=bind('Head',[.14,.14,.08],[0,.17,.2],new THREE.MeshBasicMaterial({color:0xff182d}));sensor.userData.weakPoint=true;aimEmitter=new THREE.Group();sensor.add(aimEmitter);aimEmitter.position.z=.6;const glowLight=new THREE.PointLight(0xff1230,2.5,3);aimEmitter.add(glowLight);block(weapon,trim,[.09,.08,.85],[0,.06,.35]);block(weapon,glow,[.075,.06,.1],[0,.14,.2]);muzzle.position.z=.82;}
 root.traverse(o=>{if(o.isMesh&&o!==muzzleFlash&&!hitMeshes.includes(o)){o.userData.enemyPart=true;hitMeshes.push(o);}});
 if(boss){weapon.traverse(o=>{const index=hitMeshes.indexOf(o);if(index>=0)hitMeshes.splice(index,1);});}
 motion.scale.setScalar(1.17);if(boss)root.scale.setScalar(2.2);
 if(type==='sniper'){const headProxy=new THREE.Mesh(new THREE.BoxGeometry(1.25,1.25,1.25),new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false}));head.add(headProxy);headProxy.userData.weakPoint=true;headProxy.userData.enemyPart=true;hitMeshes.push(headProxy);const proxy=new THREE.Mesh(new THREE.BoxGeometry(.72,1.8,.65),new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false}));proxy.position.set(0,1.05,0);root.add(proxy);proxy.userData.enemyPart=true;hitMeshes.push(proxy);}
 const mixer=new THREE.AnimationMixer(motion),actions={};
 for(const clip of clips){const c=alignSalvageClip(clip.clone(),bindPositionOffsets);if(clip.name.startsWith('Pistol_')||clip.name.startsWith('Hit_')||clip.name.startsWith('Sword_'))c.tracks=c.tracks.filter(t=>upper.test(t.name));if(['Idle_Loop','Walk_Loop','Jog_Fwd_Loop','Sprint_Loop'].includes(c.name)){const u=c.clone();u.name=c.name+'_Upper';u.tracks=u.tracks.filter(t=>upper.test(t.name));actions[u.name]=mixer.clipAction(u);c.tracks=c.tracks.filter(t=>!upper.test(t.name));}actions[c.name]=mixer.clipAction(c);}
 const r={root,motion,body:byName.spine_03,neck:byName.neck_01,head,arms:['l','r'].map(s=>({shoulder:byName['upperarm_'+s],elbow:byName['lowerarm_'+s],hand:byName['hand_'+s]})),legs:['l','r'].map(s=>({hip:byName['thigh_'+s],knee:byName['calf_'+s]})),aimEmitter,missileMuzzles,hitMeshes,bones,bindPositionOffsets,upgradeBindPose,skeleton:new THREE.Skeleton(bones),mixer,actions,blaster:weapon,muzzle,muzzleFlash,walkBlend:0,aimBlend:0,recoil:0,flashTime:0,hitCooldown:0};
 for(const name of ['Idle_Loop','Walk_Loop','Jog_Fwd_Loop','Sprint_Loop','Pistol_Aim_Neutral','Pistol_Aim_Up','Pistol_Aim_Down'])actions[name].play().setEffectiveWeight(name==='Idle_Loop'?1:0);
 for(const name of ['Idle_Loop','Walk_Loop','Jog_Fwd_Loop','Sprint_Loop'])actions[name+'_Upper'].play().setEffectiveWeight(name==='Idle_Loop'?1:0);mixer.stopAllAction();actions.Pistol_Aim_Neutral.reset().play().setEffectiveWeight(1);mixer.update(.05);motion.updateMatrixWorld(true);weapon.quaternion.copy(byName.hand_r.getWorldQuaternion(new THREE.Quaternion())).invert();mixer.stopAllAction();for(const name of ['Idle_Loop','Walk_Loop','Jog_Fwd_Loop','Sprint_Loop','Pistol_Aim_Neutral','Pistol_Aim_Up','Pistol_Aim_Down'])actions[name].reset().play().setEffectiveWeight(name==='Idle_Loop'?1:0);for(const name of ['Idle_Loop','Walk_Loop','Jog_Fwd_Loop','Sprint_Loop'])actions[name+'_Upper'].reset().play().setEffectiveWeight(name==='Idle_Loop'?1:0);mixer.update(0);
 // Local gaze axis is derived from the helmet's original forward-facing frame.
 motion.updateMatrixWorld(true);const gazeAxis=restGazeAxis;
 r.lookForward=(pitch=0)=>{root.updateMatrixWorld(true);const headBone=byName.Head,target=root.getWorldQuaternion(new THREE.Quaternion()).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(-pitch,0,0))),world=target.multiply(head.quaternion.clone().invert());headBone.quaternion.copy(headBone.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(world));headBone.updateWorldMatrix(false,true);};r.gazeAxis=gazeAxis;
 if(salvageFrame){r.salvageFrame=salvageFrame;r.identityMaterial=visor.material;r.setArmorLevel=(level=0)=>{root.userData.armorLevel=Math.max(0,level);for(const piece of salvageFrame.armorPieces)piece.holder.visible=level>=piece.level;};root.name='reclaimed-player-frame';}
 else decorateRobot(r,boss,type);
 byName.Head.scale.multiplyScalar(headScale*.92);root.updateMatrixWorld(true);if(type!=='drone'&&!salvageFrame)attachRobotUpgrade(r,boss?'robot-destroyer':'robot-'+type);return r;
}
export function animateRobot(r,dt,{speed=0,aim=0,elevation=0,hit=0,velocityX,velocityZ,yaw=0,rolling=false,rollTime=0,grounded=true,stopping=false,sword=false,swinging=false,swordElapsed=0}={}){
 if(r.pillbug)return;
 if(r.wildId){animateWildEnemy(r,dt,{speed,aim,elevation,hit,rolling,rollTime,grounded,velocityX,velocityZ});return;}
 if(r.spider){r.phase+=speed*dt*4.5;for(const leg of r.legs){const phase=r.phase+leg.index*Math.PI*.7+(leg.side>0?Math.PI:0);leg.hip.rotation.y=Math.sin(phase)*.45;leg.hip.position.y=.35+Math.max(0,Math.cos(phase))*.10*Math.min(speed/4,1);leg.knee.rotation.z=leg.side*(.2+Math.sin(phase)*.15);}r.motion.position.y=Math.sin(r.phase*2)*.018;return;}
 const damp=(a,b,k=8)=>THREE.MathUtils.damp(a,b,k,dt);const deceleration=Math.max(0,((r.lastSpeed??speed)-speed)/Math.max(.001,dt));r.lastSpeed=speed;r.brakeBlend=damp(r.brakeBlend??0,stopping?Math.min(1,speed/2)*Math.min(1,deceleration/5):0,12);r.walkBlend=damp(r.walkBlend,Math.min(1,speed/1.1)*(1-r.brakeBlend*.85));r.aimBlend=damp(r.aimBlend,aim);
 const jog=THREE.MathUtils.clamp((speed-1.8)/1.4,0,1),sprint=THREE.MathUtils.clamp((speed-3.2)/1.8,0,1);
 const weights={Idle_Loop:1-r.walkBlend,Walk_Loop:r.walkBlend*(1-jog),Jog_Fwd_Loop:r.walkBlend*jog*(1-sprint),Sprint_Loop:r.walkBlend*jog*sprint};
 const forward=velocityX===undefined?1:(Math.sin(yaw)*velocityX+Math.cos(yaw)*velocityZ)/Math.max(.1,speed);
 const strideName=sprint>.5?'Sprint_Loop':jog>.5?'Jog_Fwd_Loop':'Walk_Loop',nominal=strideName==='Sprint_Loop'?4.5:strideName==='Jog_Fwd_Loop'?3:1.5;
 r.strideRate=damp(r.strideRate??1,THREE.MathUtils.clamp(speed/nominal,.15,1.4),10);r.stridePhase=((r.stridePhase||0)+dt*r.strideRate/r.actions[strideName].getClip().duration*(forward<-.2?-1:1)+1)%1;
 for(const [name,w]of Object.entries(weights))for(const suffix of['','_Upper']){const a=r.actions[name+suffix];a.setEffectiveWeight(w*(suffix?1-r.aimBlend:1));if(name==='Idle_Loop')a.setEffectiveTimeScale(1);else{a.time=r.stridePhase*a.getClip().duration;a.setEffectiveTimeScale(0);}}
 const up=THREE.MathUtils.clamp(elevation/.8,0,1),down=THREE.MathUtils.clamp(-elevation/.65,0,1);
 r.actions.Pistol_Aim_Neutral.setEffectiveWeight(r.aimBlend*(1-up-down));r.actions.Pistol_Aim_Up.setEffectiveWeight(r.aimBlend*up);r.actions.Pistol_Aim_Down.setEffectiveWeight(r.aimBlend*down);
 for(const name of ['Pistol_Shoot','Hit_Chest']){const a=r.actions[name];if(a.isRunning())a.setEffectiveWeight(Math.max(0,1-a.time/a.getClip().duration));else a.setEffectiveWeight(0);}
 r.hitCooldown=Math.max(0,r.hitCooldown-dt);if(hit>.1&&r.hitCooldown===0){oneShot(r,'Hit_Chest');r.hitCooldown=.3;}
 r.swordElapsed=swordElapsed;
 if(sword&&swinging){for(const name of ['Sword_Attack','Sword_Attack_Reverse']){r.actions[name].time=r.actions[name].getClip().duration*(swordElapsed<2/60?.12:.68);r.actions[name].setEffectiveTimeScale(0);}r.actions.Sword_Idle.time=0;r.actions.Sword_Idle.setEffectiveTimeScale(0);for(const name of ['Idle_Loop_Upper','Walk_Loop_Upper','Jog_Fwd_Loop_Upper','Sprint_Loop_Upper'])r.actions[name].setEffectiveWeight(0);}
 if(sword){for(const name of ['Pistol_Aim_Neutral','Pistol_Aim_Up','Pistol_Aim_Down'])r.actions[name].setEffectiveWeight(0);r.actions.Sword_Idle.play().setEffectiveWeight(swinging?.15:1);for(const name of ['Sword_Attack','Sword_Attack_Reverse'])r.actions[name].setEffectiveWeight(swinging&&name===r.swordAction?1:0);}else{r.actions.Sword_Idle.setEffectiveWeight(0);r.actions.Sword_Attack.setEffectiveWeight(0);r.actions.Sword_Attack_Reverse.setEffectiveWeight(0);}
 const roll=r.actions.Roll;
 if(rolling&&!r.wasRolling){roll.reset().setLoop(THREE.LoopOnce,1).play();roll.clampWhenFinished=true;}
 r.rollBlend=damp(r.rollBlend??0,rolling?1:0,24);r.wasRolling=rolling;
 for(const a of Object.values(r.actions))if(a!==roll)a.setEffectiveWeight(a.getEffectiveWeight()*(1-r.rollBlend));
 roll.setEffectiveWeight(r.rollBlend);if(rolling)roll.time=THREE.MathUtils.clamp(rollTime/.72,0,.999)*roll.getClip().duration;roll.setEffectiveTimeScale(0);
 r.mixer.update(dt);
 // Plant the stride and lean back during the short momentum slide into a stop.
 const localForward=velocityX===undefined?speed:Math.sin(yaw)*velocityX+Math.cos(yaw)*velocityZ;
 r.motion.rotation.x=damp(r.motion.rotation.x,(rolling?0:-(Math.sign(localForward)||1)*r.brakeBlend*.23+(Math.sign(localForward)||1)*Math.min(speed/6,1)*.09));
 if(r.brakeBlend>.01&&!rolling)for(const leg of r.legs)leg.knee.rotateX(r.brakeBlend*.22);
 r.lookForward?.(elevation);
 updateRobotUpgrade(r);
 r.recoil=damp(r.recoil,0,18);r.flashTime-=dt;r.muzzleFlash.visible=r.flashTime>0;
}
function oneShot(r,name){const a=r.actions[name];a.reset().setLoop(THREE.LoopOnce,1).setEffectiveWeight(1).play();a.clampWhenFinished=false;}
export function robotFired(r){if(r.wildId){fireWildEnemy(r);return;}oneShot(r,'Pistol_Shoot');r.recoil=.3;r.flashTime=.09;}
export function animateDeath(r,progress){if(!r.salvageFrame){r.deathDuration=ENEMY_DEATH_DURATION;updateEnemyDeathBurst(r,progress);return;}if(!r.deathStarted){r.deathStarted=true;r.mixer.stopAllAction();const a=r.actions.Death01;a.reset().setLoop(THREE.LoopOnce,1).play();a.clampWhenFinished=true;}r.mixer.setTime(progress*2);updateRobotUpgrade(r);r.muzzleFlash.visible=false;}
export function disposeRobot(r){if(r.disposed)return;r.disposed=true;if(r.pillbug){resetEnemyDeathBurst(r);r.dispose();return;}if(r.wildId){disposeWildEnemy(r);return;}resetEnemyDeathBurst(r);r.mixer?.stopAllAction();r.mixer?.uncacheRoot(r.motion);r.skeleton?.dispose();disposeObjectResources(r.root);}

export function swordFired(r,combo=1,duration=.5){r.swordAction=combo===2?'Sword_Attack_Reverse':'Sword_Attack';const old=r.lastSwordAction;if(old)r.actions[old].stop();oneShot(r,r.swordAction);r.actions[r.swordAction].setEffectiveTimeScale(r.actions[r.swordAction].getClip().duration/duration);r.lastSwordAction=r.swordAction;}

export function createSpider(){const wild=createWildEnemy('iron-beetle');if(wild)return wild;const root=new THREE.Group(),motion=new THREE.Group();root.add(motion);root.scale.setScalar(.65);detailBatch(motion,[[[.56,.09,.62],[0,.49,0],armor],[[.06,.06,.48],[-.16,.55,0],trim],[[.06,.06,.48],[.16,.55,0],trim],[[.10,.08,.10],[-.14,.4,.36],glow],[[.10,.08,.10],[.14,.4,.36],glow],[[.35,.12,.12],[0,.36,-.35],joints]]);const body=block(motion,joints,[.48,.24,.58],[0,.36,0]),head=block(motion,glow,[.25,.09,.06],[0,.38,.32]);head.userData.weakPoint=true;const legs=[];for(const side of[-1,1])for(let i=0;i<4;i++){const hip=new THREE.Group();hip.position.set(side*.22,.35,(i-1.5)*.15);motion.add(hip);block(hip,armor,[.36,.065,.07],[side*.16,0,0]);const knee=new THREE.Group();knee.position.set(side*.32,0,0);hip.add(knee);const lower=block(knee,joints,[.07,.32,.07],[side*.05,-.16,0]);lower.rotation.z=side*.3;detailBatch(knee,[[[.11,.08,.10],[0,0,0],trim],[[.035,.23,.025],[side*.06,-.12,.035],trim]]);legs.push({hip,knee,side,index:i});}const muzzle=new THREE.Group();motion.add(muzzle);const muzzleFlash=new THREE.Group();const hitMeshes=[];root.traverse(o=>{if(o.isMesh){o.userData.enemyPart=true;hitMeshes.push(o);}});const proxy=new THREE.Mesh(new THREE.BoxGeometry(1.5,.95,1.5),new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false}));proxy.position.set(0,.4,0);root.add(proxy);proxy.userData.enemyPart=true;hitMeshes.push(proxy);const robot={root,motion,body,head,neck:motion,arms:[{shoulder:motion},{shoulder:motion}],legs,muzzle,muzzleFlash,hitMeshes,spider:true,phase:0};attachSpiderUpgrade(robot);return robot;}

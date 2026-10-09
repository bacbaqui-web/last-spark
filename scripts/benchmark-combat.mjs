import {configureUpgradeLighting} from '../asset-upgrades.js';
import {sortieMission} from '../sortie-mission.js';
import * as SALVAGE from '../sortie-runtime.js';
import {createStepLocomotion} from '../step-locomotion.js';
import {decorateMinigunFlash} from '../minigun-fire.js';
import * as MOVE from '../player-movement.js';
import * as THIRD from '../third-person.js';
import * as MOTION from '../weapon-motion.js';
import * as VIEW from '../weapon-view.js';
import * as NAV from '../boss-navigation.js';
import * as PROGRESS from '../progression.js';
import * as DETAIL from '../model-detail.js';
import * as BOSSES from '../boss-models.js';
import {poseSword} from '../sword-combat.js';
import * as WM from '../weapon-models.js';
import * as REAL from '../node_modules/three/build/three.module.js';
import * as ROBOT from '../robot.js';import * as AI from '../enemy-ai.js';
import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const elements=new Map(),events=new Map();const element=()=>({style:{},textContent:'',innerHTML:'',querySelector:()=>({style:{}}),addEventListener(){},requestPointerLock:async()=>{}});
const context={configureUpgradeLighting,sortieMission,createStepLocomotion,decorateMinigunFlash,MOVE,events,THIRD,MOTION,VIEW,NAV,PROGRESS,DETAIL,BOSSES,REAL,ROBOT,AI,WM,poseSword,console,Math:Object.create(Math),performance,innerWidth:1200,innerHeight:800,devicePixelRatio:1,window:{addEventListener(){}},document:{body:{appendChild(){}},createElement:()=>({style:{},remove(){},addEventListener(){},getContext:()=>null}),getElementById(id){if(!elements.has(id))elements.set(id,element());return elements.get(id)},addEventListener(name,fn){events.set(name,fn)},exitPointerLock(){}},requestAnimationFrame(){}};
vm.createContext(context);let source=fs.readFileSync('main.js','utf8').replace("import {configureUpgradeLighting} from './asset-upgrades.js';",'').replace("import {sortieMission} from './sortie-mission.js';",'').replace("import './salvage.css';",'').replace("import * as SALVAGE from './sortie-runtime.js';",'').replace("import {createStepLocomotion} from './step-locomotion.js';",'').replace("import {decorateMinigunFlash} from './minigun-fire.js';",'').replace("import * as THREE from 'three';",`const THREE={...REAL,WebGLRenderer:class{constructor(){this.shadowMap={}}setPixelRatio(){}setSize(){}render(){}}};`);
source=source.replace("import {movePlayerWithSlide} from './player-movement.js';",'const {movePlayerWithSlide}=MOVE;');
source=source.replace("import {createThirdPersonView} from './third-person.js';",'const {createThirdPersonView}=THIRD;');
source=source.replace("import {createWeaponMotion} from './weapon-motion.js';",'const {createWeaponMotion}=MOTION;');
source=source.replace("import {poseSword} from './sword-combat.js';",'');
source=source.replace("import {createWeaponModel} from './weapon-models.js';",'const {createWeaponModel}=WM;');
source=source.replace("import {createRobot,animateRobot,robotFired,animateDeath,disposeRobot,swordFired,createSpider} from './robot.js';",'const {createRobot,animateRobot,robotFired,animateDeath,disposeRobot,swordFired,createSpider}=ROBOT;').replace("import {attachEnemyAI,updateEnemyAI,steerEnemy,chooseCover,coverRoute} from './enemy-ai.js';",'const {attachEnemyAI,updateEnemyAI,steerEnemy,chooseCover,coverRoute}=AI;');
source=source.replace("import {createBoss,animateBoss,createScoutDrone,createAssassin} from './boss-models.js';",'const {createBoss,animateBoss,createScoutDrone,createAssassin}=BOSSES;');
source=source.replace("import {panelTexture,decorateArena} from './model-detail.js';",'const {panelTexture,decorateArena}=DETAIL;');
source=source.replace("import {createProgression,randomUpgradePair,applyUpgrade,buildSummary} from './progression.js';",'const {createProgression,randomUpgradePair,applyUpgrade,buildSummary}=PROGRESS;');
source=source.replace("import {moveBladeBoss,tryBladeLeap,moveDroneBoss} from './boss-navigation.js';",'const {moveBladeBoss,tryBladeLeap,moveDroneBoss}=NAV;');
source=source.replace("import {ADS_POSES,keepAimClear} from './weapon-view.js';",'const {ADS_POSES,keepAimClear}=VIEW;');

context.SALVAGE={...SALVAGE,createSalvageWorld:(...args)=>SALVAGE.createSalvageWorld(...args,{legacyTestWorld:true})};context.URLSearchParams=URLSearchParams;const memory=new Map();context.window.location={search:''};context.window.localStorage={getItem:k=>memory.get(k),setItem:(k,v)=>memory.set(k,v)};
source=source.slice(0,source.lastIndexOf('if(salvageMode){\n makeWeaponImages();'))+source.slice(source.indexOf('let cargoRack=null'));
// Deterministic CPU/cleanup soak. Uses the real update loop, legacy test map,
// fake DOM/renderer and memory-only saves; this does not measure GPU or browser FPS.
context.benchmarkSeconds=Number(process.env.BENCH_SECONDS||600);
source+=String.raw`
baseUI={show(){},hide(){},root:{hidden:true}};sortieHUD={hidden:true};extractPrompt={hidden:true};baseBack={hidden:true};
campaign.frame().weaponSlots=[SALVAGE.makeWeapon('pistol','bench'),null];campaign.save();selectedWeapons=['pistol'];reset(false);launchRemoteFrame();
let seed=319;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
for(const e of enemies){scene.remove(e.group);disposeRobot(e.robot);}enemies.length=0;
player.pos.set(0,1.703,sortieWorld.route.start.z);player.vel.set(0,0,0);yaw=0;pitch=0;active=true;fallback=true;countdownTime=0;
const summaries=[],allTimes=[],windowTimes=[];let spawned=0;
const spawnTargets=()=>{for(let i=0;i<6;i++){spawn(false,'trooper');const e=enemies.at(-1);e.group.position.set((i%3-1)*3,0,player.pos.z-12-Math.floor(i/3)*8);e.hp=e.max=180;e.awareness={state:'combat'};spawned++;}};
for(let frame=0;frame<benchmarkSeconds*60;frame++){
 if(frame%480===0){for(const e of enemies)e.hp=0;spawnTargets();}
 // Alternating weapons exercises repeated allocations, wall rays, and cleanup.
 weapon=frame%1800<1200?'rapid':'shotgun';ammo=Infinity;equippedSlot=0;firing=true;damageGrace=999;sortie.battery=sortie.stats.battery;player.hp=maxPlayerHP();
 // Aim from the same place each step; remove random recoil drift from the workload.
 yaw=0;pitch=0;const start=performance.now();update(1/60);const cost=performance.now()-start;allTimes.push(cost);windowTimes.push(cost);
 if((frame+1)%3600===0){const sorted=windowTimes.sort((a,b)=>a-b);let nodes=0;scene.traverse(()=>nodes++);summaries.push({seconds:(frame+1)/60,averageUpdateMs:sorted.reduce((a,b)=>a+b,0)/sorted.length,p95UpdateMs:sorted[Math.floor(sorted.length*.95)],nodes,enemies:enemies.length,dying:dying.length,particles:particles.length,shots:shots.length,drops:drops.length});windowTimes.length=0;}
}
firing=false;for(const e of enemies)e.hp=0;for(let i=0;i<400;i++){damageGrace=999;update(1/60);}
const settled={enemies:enemies.length,dying:dying.length,particles:particles.length,shots:shots.length};
reset(false);let nodes=0;scene.traverse(()=>nodes++);
console.log(JSON.stringify({kind:'CPU-only accelerated simulation; no GPU/FPS measurement',simulatedSeconds:benchmarkSeconds,spawned,summaries,settled,reset:{enemies:enemies.length,dying:dying.length,particles:particles.length,shots:shots.length,drops:drops.length,nodes},averageUpdateMs:allTimes.reduce((a,b)=>a+b,0)/allTimes.length},null,2));
`;
vm.runInContext(source.replaceAll('import.meta.env.DEV','false'),context);

import {preloadWildEnemies} from './wild-enemy-models.js';
let combatAssets;
export function prepareCombatAssets(){if(typeof document==='undefined')return Promise.resolve([]);return combatAssets??=preloadWildEnemies();}

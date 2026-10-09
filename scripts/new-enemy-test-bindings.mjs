import {createSlagMortar,advanceMortar} from '../slag-mortar.js';
import {updateCombatPillbug} from '../pillbug-combat.js';
export function bindNewEnemyImports(source,context){
 Object.assign(context,{createSlagMortar,advanceMortar,updateCombatPillbug});
 return source.replace("import {createSlagMortar,advanceMortar} from './slag-mortar.js';",'').replace("import {updateCombatPillbug} from './pillbug-combat.js';",'');
}

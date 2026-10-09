// Wild robots and fallback/drone enemies use the same immediate black-parts
// burst. Keep these public names for the model lab and impact adapter.
export {
 ENEMY_DEATH_DURATION as WILD_DESTRUCTION_DURATION,
 recordEnemyImpact as recordWildImpact,
 updateEnemyDeathBurst as updateWildDestruction,
 resetEnemyDeathBurst as resetWildDestruction
} from './enemy-death-burst.js';

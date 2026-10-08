import {preloadAssetUpgrades} from './asset-upgrades.js';
import {preloadWildEnemies} from './wild-enemy-models.js';
const [,missing]=await Promise.all([preloadAssetUpgrades(),preloadWildEnemies()]);
if(missing.length)console.warn('Wild robot assets unavailable; using existing enemy models.',missing);
await import('./main.js');

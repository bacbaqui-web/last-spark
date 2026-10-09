import {packedMotionPlugin} from './scripts/pack-motion-data.mjs';
import {releaseAssetsPlugin} from './scripts/release-assets.mjs';
import { defineConfig } from 'vite';
import {assetReviewPlugin} from './scripts/asset-review-api.mjs';

export default defineConfig({ base: './', plugins: [assetReviewPlugin(),packedMotionPlugin(),releaseAssetsPlugin()], build: {copyPublicDir:false,target: 'es2022', rollupOptions: {input: {game: 'index.html', wildRobotLab: 'wild-robot-lab.html', pillbugLab: 'pillbug-lab.html', robotWorkshop: 'robot-workshop.html', robotMotion: 'robot-motion.html', weaponWorkshop: 'weapon-workshop.html', assetReview: 'asset-review.html', settings: 'settings.html', assets: 'asset-gallery.html', sedan: 'sedan-compare.html', carTexture: 'car-texture-test.html', blueprintCar: 'blueprint-car-test.html', fleet: 'vehicle-fleet.html',
        rideFleet: 'ride-fleet.html', treeVariants: 'tree-variants.html', brickHouses: 'brick-house-fleet.html', atomicMap: 'atomic-map.html', references: 'reference-assets.html', randomStreet: 'random-street.html', legacyBrickGenerator: 'brick-street-generator.html', streetProps: 'nyc-street-props.html', streetBlock: 'salvage-street-test.html', connectedStreet: 'street-random-map.html'}}} });

import { defineConfig } from 'vite';

export default defineConfig({ base: './', build: {rollupOptions: {input: {game: 'index.html', settings: 'settings.html', assets: 'asset-gallery.html', sedan: 'sedan-compare.html', carTexture: 'car-texture-test.html',
        blueprintCar: 'blueprint-car-test.html', fleet: 'vehicle-fleet.html', rideFleet: 'ride-fleet.html', treeVariants: 'tree-variants.html', brickHouses: 'brick-house-fleet.html', atomicMap: 'atomic-map.html', references: 'reference-assets.html', randomStreet: 'random-street.html', streetProps: 'nyc-street-props.html', streetBlock: 'salvage-street-test.html', connectedStreet: 'street-random-map.html'}}} });

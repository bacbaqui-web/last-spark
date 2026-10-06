import assert from 'node:assert/strict';
import {createCityLayout} from '../random-city-layout.js';
for(let seed=0;seed<100;seed++){
 const a=createCityLayout(seed),b=createCityLayout(seed);assert.deepEqual(a.items,b.items);assert.deepEqual(a.route.points,b.route.points);assert.ok(Math.abs(a.route.length-380)<1e-8);assert.ok(a.items.length>100);assert.equal(a.route.width,10);assert.ok(a.items.filter(i=>i.boundary).length>600);assert.ok(a.items.some(i=>i.id==='traffic-light'));for(const p of a.route.points){assert.ok(Math.abs(p.x)<100&&Math.abs(p.z)<210);}for(const item of a.items)assert.ok(item.id==='pavement-break'||Math.abs(item.offset)>=2.3);
}
assert.notDeepEqual(createCityLayout(123).route.points,createCityLayout(456).route.points);assert.notDeepEqual(createCityLayout(123).items,createCityLayout(456).items);
console.log('PASS: 100 deterministic seeds, different roads and placements, 380m routes within bounds');

import assert from 'node:assert/strict';
import * as T from 'three';
import {fleet,createFleetVehicle} from '../vehicle-fleet-models.js';
import {VEHICLE_PAINTS,pickVehiclePaint} from '../vehicle-paints.js';
import {mossMaterial} from '../street-moss-material.js';

for(const data of fleet){
 const variants=VEHICLE_PAINTS.map(p=>createFleetVehicle(data,{paintId:p.id}));
 assert.equal(new Set(variants.map(m=>m.geometry)).size,1,'geometry remains shared');
 assert.equal(new Set(variants.map(m=>m.material)).size,8,'each instance owns its paint');
 assert.equal(new Set(variants.map(m=>m.material.userData.paint.value.getHexString())).size,8);
 const before=variants[1].material.userData.paint.value.getHexString();
 variants[0].material.userData.paint.value.set('#ff0000');
 assert.equal(variants[1].material.userData.paint.value.getHexString(),before,'recoloring must not leak to another vehicle');
 const seen=new Set();
 for(let seed=0;seed<1000;seed++){
  const car=createFleetVehicle(data,{seed});
  const repeated=createFleetVehicle(data,{seed});
  assert.equal(car.userData.paintId,repeated.userData.paintId);
  seen.add(car.userData.paintId);car.material.dispose();repeated.material.dispose();
 }
 assert.equal(seen.size,8,`${data.id} supports all eight paints in streets`);
 const shader={uniforms:{},vertexShader:T.ShaderLib.standard.vertexShader,fragmentShader:T.ShaderLib.standard.fragmentShader};
 mossMaterial(variants[0].material).onBeforeCompile(shader);
 assert.equal(shader.uniforms.carPaint,variants[0].material.userData.paint);
 assert(shader.uniforms.streetMoss&&shader.uniforms.carPaintAtlas,'paint and moss compose');
 assert(shader.fragmentShader.includes('carPaint*shade')&&shader.fragmentShader.includes('mossColor'));
 variants.forEach(m=>m.material.dispose());
}
let neutral=0;
for(let seed=0;seed<10000;seed++)if(['white','black','silver','gray'].includes(pickVehiclePaint(seed).id))neutral++;
assert(neutral>7500&&neutral<8500,'neutral-biased deterministic palette');
assert.throws(()=>createFleetVehicle(fleet[0],{paintId:'unknown'}),/Unknown vehicle paint/);
console.log(`PASS 10 vehicle types × 8 paints; shared geometry, independent paint uniforms, deterministic street variation, moss composition; neutral paints ${neutral}/10000`);

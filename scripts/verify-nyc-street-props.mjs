import assert from 'node:assert/strict';
import * as T from 'three';
import {streetPropTypes,createNYCStreetProp,addNYCStreetProps} from '../nyc-street-props.js';
assert.equal(streetPropTypes.length,10);assert.equal(new Set(streetPropTypes.map(p=>p.id)).size,10);
for(let i=0;i<10;i++){const root=createNYCStreetProp(i),body=root.children.find(o=>o.userData.collisionKind==='prop');assert.ok(body.geometry.attributes.uv);assert.ok(body.geometry.attributes.position.count>100);assert.equal(body.material.emissive.getHex(),0);assert.ok(new T.Box3().setFromObject(root).getSize(new T.Vector3()).y>.5);}
const root=new T.Group();addNYCStreetProps(root);assert.equal(root.children.length,11);assert.equal(root.userData.streetProps,11);
console.log('10 textured unpowered props and 11 street placements passed.');

import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createRobot} from '../robot.js';
import {createThirdPersonView} from '../third-person.js';
const avatar=createRobot(),view=createThirdPersonView(avatar,['bow']);
const state={position:new THREE.Vector3(0,1.7,0),yaw:0,pitch:0,weapon:'bow',grounded:true,dt:1/60,motionPreview:true};
const position=part=>part.getWorldPosition(new THREE.Vector3());
function straight(){const arm=avatar.arms[0],length=position(arm.shoulder).distanceTo(position(arm.elbow))+position(arm.elbow).distanceTo(position(arm.hand));assert(position(arm.shoulder).distanceTo(position(arm.hand))/length>.9999);}
function direction(){return new THREE.Vector3(0,0,-1).applyQuaternion(view.models.bow.getWorldQuaternion(new THREE.Quaternion()));}
view.pose(state);straight();assert(Math.abs(direction().y+Math.sin(75*Math.PI/180))<.001);
view.pose({...state,bowDrawing:true,bowCharge:2.2});straight();assert(direction().z<-.999);
const string=view.models.bow.userData.string.geometry.attributes.position;
assert(view.models.bow.localToWorld(new THREE.Vector3().fromBufferAttribute(string,1)).distanceTo(position(avatar.arms[1].hand))<.001);
view.pose({...state,bowMotionClip:'BowRelease',bowMotionPhase:0});const before=position(avatar.arms[1].hand);
view.pose({...state,bowMotionClip:'BowRelease',bowMotionPhase:.65});const after=position(avatar.arms[1].hand);assert(after.y>before.y+.1&&after.z>before.z+.1);assert(direction().y<-.2);straight();
console.log('PASS: bow 75-degree carry, straight support arm, attached draw string, backward/upward release and bow drop');

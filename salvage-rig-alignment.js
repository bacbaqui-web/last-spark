import * as THREE from 'three';

// Use the reclaimed pelvis shell's center plane for the torso and limb roots.
// Apply this before binding meshes and calculating skeleton inverses.
export function alignSalvageRig(motion,bones){
 const offsets=new Map();
 for(const name of ['spine_01','spine_02','spine_03','upperarm_l','upperarm_r','thigh_l','thigh_r']){
   motion.updateMatrixWorld(true);
   const bone=bones[name],target=motion.worldToLocal(bone.getWorldPosition(new THREE.Vector3()));
   target.z=0;motion.localToWorld(target);bone.parent.worldToLocal(target);
   offsets.set(name,target.clone().sub(bone.position));bone.position.copy(target);
 }
 motion.updateMatrixWorld(true);return offsets;
}

// Translation keys are absolute local coordinates; move them with the new bind pose.
// Each caller passes a per-avatar clip clone, keeping shared source animations intact.
export function alignSalvageClip(clip,offsets){
 for(const track of clip.tracks){
   if(!track.name.endsWith('.position'))continue;
   const offset=offsets.get(track.name.slice(0,-9));if(!offset)continue;
   for(let i=0;i<track.values.length;i+=3){track.values[i]+=offset.x;track.values[i+1]+=offset.y;track.values[i+2]+=offset.z;}
 }
 return clip;
}

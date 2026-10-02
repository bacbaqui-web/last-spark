# Run with Blender after the source downloads/conversion described in README.
import bpy,pathlib,json,math
from mathutils import Matrix,Vector,Quaternion
out=json.loads(pathlib.Path('third-person-motion-data.json').read_text());rig=json.loads(pathlib.Path('rig-data.json').read_text());nodes={n['name']:n for n in rig['nodes']};parents={rig['nodes'][c]['name']:n['name'] for n in rig['nodes'] for c in n.get('children',[])}
def matrix(n):
 q=n.get('rotation',[0,0,0,1]);return Matrix.LocRotScale(Vector(n.get('translation',[0,0,0])),Quaternion((q[3],*q[:3])),Vector(n.get('scale',[1,1,1])))
target={}
def world(n):
 if n not in target:target[n]=(world(parents[n]) if n in parents else Matrix.Identity(4))@matrix(nodes[n])
 return target[n]
for n in nodes:world(n)
tps={'pelvis':'Pelvis','spine_01':'Spine1','spine_02':'Spine2','spine_03':'Spine3','neck_01':'Neck_Base','Head':'Head'}
for side,S in [('l','L'),('r','R')]:
 for t,s in [('clavicle','Clavicle'),('upperarm','Arm'),('lowerarm','Forearm'),('hand','Hand'),('thigh','Thigh'),('calf','Shin'),('foot','Ankle')]:tps[t+'_'+side]=S+'_'+s
mesh={n:('head' if n=='Head' else n) for n in tps}
end={}
for side in ['l','r']:
 for a,b in [('clavicle','upperarm'),('upperarm','lowerarm'),('lowerarm','hand'),('thigh','calf'),('calf','foot')]:end[a+'_'+side]=b+'_'+side
files=[('TPSAimIdle','RevolverAimIdle'),('TPSAimWalk','RevolverAimWalk'),('TPSAimUp','RevolverIdleL_CU'),('TPSAimDown','RevolverIdleL_CD'),('TPSAimShoot','RevolverAimShoot'),('TPSStartWalk','IdleToWalk'),('TPSStopWalk','WalkToIdle'),('TPSStartRun','IdleToRun'),('TPSStopRun','RunToIdle'),('TPSRun','Run'),('TPSWalk','Walk'),('TPSIdle','Idle')]
def bake(key,r,action,mapping,basis,rootName):
 r.animation_data.action=action
 if hasattr(action,'slots') and len(action.slots):r.animation_data.action_slot=action.slots[0]
 start,finish=action.frame_range;fps=bpy.context.scene.render.fps/bpy.context.scene.render.fps_base;times=[];vals={n:[] for n in mapping};hips=[];rootRest=r.data.bones[rootName].matrix_local.inverted();rest={n:rootRest@r.data.bones[s].matrix_local for n,s in mapping.items()}
 restQ={n:(basis@m.to_3x3()@basis.inverted()).to_quaternion() for n,m in rest.items()};restHip=(basis@rest['pelvis'].translation).y
 for i in range(math.ceil((finish-start)/fps*30)+1):
  frame=min(finish,start+i*fps/30);bpy.context.scene.frame_set(int(frame),subframe=frame-int(frame));times.append(round((frame-start)/fps,6));root=r.pose.bones[rootName].matrix.inverted();poses={n:root@r.pose.bones[s].matrix for n,s in mapping.items()};desired={}
  for n,m in poses.items():
   q=(basis@m.to_3x3()@basis.inverted()).to_quaternion();desired[n]=q@restQ[n].inverted()@target[n].to_quaternion()
  # The old TPS files store a posed skeleton rather than a clean T-pose. Use
  # animated joint directions for limbs so that initial aim never becomes a T-pose.
  if key.startswith('TPS'):
   for n,e in end.items():
    src=basis@(poses[e].translation-poses[n].translation);dst=target[e].translation-target[n].translation;desired[n]=dst.rotation_difference(src)@target[n].to_quaternion()
  hip=(basis@poses['pelvis'].translation).y;delta=(hip-restHip)/restHip*target['pelvis'].translation.y;hp=target[parents['pelvis']].inverted()@(target['pelvis'].translation+Vector((0,delta,0)));hips.extend(round(x,6) for x in hp)
  for n in mapping:
   p=parents.get(n);pq=desired.get(p,target[p].to_quaternion() if p else Quaternion());q=pq.inverted()@desired[n]
   if vals[n] and q.dot(Quaternion((vals[n][-1],*vals[n][-4:-1])))<0:q.negate()
   vals[n].extend(round(x,6) for x in (q.x,q.y,q.z,q.w))
 out[key]={'duration':times[-1],'tracks':[{'name':n+'.quaternion','type':'quaternion','times':times,'values':v} for n,v in vals.items()]+[{'name':'pelvis.position','type':'vector','times':times,'values':hips}]};print('BAKED',key,times[-1])
for key,file in files:
 bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=str(pathlib.Path('work/tps-source/'+file+'.glb').resolve()));r=next(o for o in bpy.data.objects if o.type=='ARMATURE');bake(key,r,list(bpy.data.actions)[0],tps,Matrix.Identity(3),'Root')
bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=str(pathlib.Path('work/mesh2motion/human-addon-animations.glb').resolve()));r=next(o for o in bpy.data.objects if o.type=='ARMATURE')
for key,clip in [('M2MBowIdle','Bow'),('M2MBowLoad','Bow Pull Back'),('M2MBowHold','Bow Pull Hold'),('M2MBowRelease','Bow Release')]:bake(key,r,bpy.data.actions[clip],mesh,Matrix(((1,0,0),(0,0,1),(0,-1,0))),'root')
bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=str(pathlib.Path('work/mesh2motion/human-base-animations.glb').resolve()));r=next(o for o in bpy.data.objects if o.type=='ARMATURE');bake('M2MSwordSlash',r,bpy.data.actions['Sword_Regular_C'],mesh,Matrix(((1,0,0),(0,0,1),(0,-1,0))),'root')
pathlib.Path('third-person-motion-data.json').write_text(json.dumps(out,separators=(',',':')))

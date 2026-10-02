import bpy,pathlib,json,math
from mathutils import Matrix,Vector,Quaternion
out=json.loads(pathlib.Path('third-person-motion-data.json').read_text());rig=json.loads(pathlib.Path('rig-data.json').read_text());nodes={n['name']:n for n in rig['nodes']};parents={rig['nodes'][c]['name']:n['name'] for n in rig['nodes'] for c in n.get('children',[])}
def matrix(n):
 q=n.get('rotation',[0,0,0,1]);return Matrix.LocRotScale(Vector(n.get('translation',[0,0,0])),Quaternion((q[3],*q[:3])),Vector(n.get('scale',[1,1,1])))
target={}
def world(name):
 if name not in target:target[name]=(world(parents[name]) if name in parents else Matrix.Identity(4))@matrix(nodes[name])
 return target[name]
for n in nodes:world(n)
mapping={'pelvis':'B-hips','spine_01':'B-spine','spine_03':'B-chest','neck_01':'B-neck','Head':'B-head'}
for side,S in [('l','L'),('r','R')]:
 for t,s in [('clavicle','shoulder'),('upperarm','upperArm'),('lowerarm','forearm'),('hand','hand'),('thigh','thigh'),('calf','shin'),('foot','foot')]:mapping[t+'_'+side]='B-'+s+'.'+S
# Root-relative source and target both use +Y up, +X left, +Z forward.
basis=Matrix.Identity(3)
files=[('BowIdle','Combat/Bow/HumanM@BowIdle01.fbx'),('BowLoad','Combat/Bow/HumanM@BowShot01 - Load.fbx'),('BowHold','Combat/Bow/HumanM@BowShot01 - Hold.fbx'),('BowRelease','Combat/Bow/HumanM@BowShot01 - Release.fbx')]
for direction in ['Forward','Backward','Left','Right','ForwardLeft','ForwardRight','BackwardLeft','BackwardRight']:files.append(('Strafe'+direction,'Movement/Strafe/StrafeRun/HumanM@StrafeRun01_'+direction+'.fbx'))
for key,file in files:
 if not (pathlib.Path('work/archer/Animations/Male')/file).exists():file='Movement/Run/HumanM@Run01_'+key.removeprefix('Strafe')+'.fbx'
 bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.fbx(filepath=str((pathlib.Path('work/archer/Animations/Male')/file).resolve()));r=next(o for o in bpy.data.objects if o.type=='ARMATURE');a=r.animation_data.action;start,end=a.frame_range;fps=bpy.context.scene.render.fps/bpy.context.scene.render.fps_base;times=[];values={n:[] for n in mapping};hipValues=[]
 restRoot=r.data.bones['B-root'].matrix_local.inverted()
 rest={n:(basis@(restRoot@r.data.bones[s].matrix_local).to_3x3()@basis.inverted()).to_quaternion() for n,s in mapping.items()}
 for i in range(math.ceil((end-start)/fps*30)+1):
  frame=min(end,start+i*fps/30);bpy.context.scene.frame_set(int(frame),subframe=frame-int(frame));times.append(round((frame-start)/fps,6));poseRoot=r.pose.bones['B-root'].matrix.inverted();worldq={'root':target['root'].to_quaternion(),'spine_02':None};desired={}
  for n,s in mapping.items():
   pose=(basis@(poseRoot@r.pose.bones[s].matrix).to_3x3()@basis.inverted()).to_quaternion();desired[n]=pose@rest[n].inverted()@target[n].to_quaternion()
  desired['spine_02']=desired['spine_01']@target['spine_01'].to_quaternion().inverted()@target['spine_02'].to_quaternion()
  hip=(poseRoot@r.pose.bones['B-hips'].matrix).translation.y;restHip=(restRoot@r.data.bones['B-hips'].matrix_local).translation.y;delta=(hip-restHip)/restHip*target['pelvis'].translation.y;hp=target[parents['pelvis']].inverted()@(target['pelvis'].translation+Vector((0,delta,0)));hipValues.extend(round(x,6) for x in hp)
  for n in mapping:
   par=parents.get(n);pq=desired.get(par,target[par].to_quaternion() if par else Quaternion());q=pq.inverted()@desired[n]
   if values[n] and q.dot(Quaternion((values[n][-1],*values[n][-4:-1])))<0:q.negate()
   values[n].extend(round(x,6) for x in (q.x,q.y,q.z,q.w))
 out[key]={'duration':times[-1],'tracks':[{'name':n+'.quaternion','type':'quaternion','times':times,'values':vals} for n,vals in values.items()]+[{'name':'pelvis.position','type':'vector','times':times,'values':hipValues},{'name':'spine_02.quaternion','type':'quaternion','times':times,'values':nodes['spine_02']['rotation']*len(times)}]};print('RETARGET',key,times[-1])
pathlib.Path('third-person-motion-data.json').write_text(json.dumps(out,separators=(',',':')))

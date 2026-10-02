import pathlib,json,struct
out={}
def extract(folder,keep):
 p=next(pathlib.Path('work/'+folder).rglob('*.glb'));data=p.read_bytes();jl=struct.unpack_from('<I',data,12)[0];j=json.loads(data[20:20+jl]);binary=data[28+jl:]
 def values(i):
  a=j['accessors'][i];v=j['bufferViews'][a['bufferView']];n={'SCALAR':1,'VEC3':3,'VEC4':4}[a['type']];fmt={5126:'f',5123:'H',5125:'I'}[a['componentType']];sz=struct.calcsize(fmt)*n;off=v.get('byteOffset',0)+a.get('byteOffset',0);stride=v.get('byteStride',sz);return [round(x,6) for k in range(a['count']) for x in struct.unpack_from('<'+fmt*n,binary,off+k*stride)]
 for a in j['animations']:
  if a['name'] not in keep:continue
  tracks=[]
  for c in a['channels']:
   name=j['nodes'][c['target']['node']]['name'];path=c['target']['path'];s=a['samplers'][c['sampler']]
   if name not in {'root','pelvis','spine_01','spine_02','spine_03','neck_01','Head','clavicle_l','clavicle_r','upperarm_l','upperarm_r','lowerarm_l','lowerarm_r','hand_l','hand_r','thigh_l','thigh_r','calf_l','calf_r','foot_l','foot_r'} or path=='scale':continue
   val=values(s['output']);times=values(s['input'])
   # Horizontal root motion belongs to the collision solver; retain vertical crouch/roll and all body rotations.
   if name=='root' and path=='translation':
    for i in range(0,len(val),3):val[i]=val[0];val[i+2]=val[2]
   tracks.append({'name':name+'.'+{'translation':'position','rotation':'quaternion'}[path],'type':'quaternion' if path=='rotation' else 'vector','times':times,'values':val})
  out[a['name']]={'duration':max(t['times'][-1] for t in tracks),'tracks':tracks}
extract('animations',{'Sword_Idle','Roll','Jump_Start','Jump_Loop','Jump_Land','Punch_Jab','Punch_Cross','Pistol_Aim_Neutral','Pistol_Shoot','OverhandThrow'})
extract('ual2',{'Sword_Dash','Sword_Regular_A','Melee_Hook','OverhandThrow','Idle_Rail_Loop','Walk_Carry_Loop'})
pathlib.Path('third-person-motion-data.json').write_text(json.dumps(out,separators=(',',':')))
print({k:v['duration'] for k,v in out.items()})

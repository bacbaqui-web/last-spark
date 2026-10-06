import bpy, math, os, json
from mathutils import Vector
ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),'..'))
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
def material(name,color,metal=0,rough=.7):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=rough;return m
paint=material('Faded teal',(.085,.255,.225),.22,.66);glass=material('Smoky blue glass',(.018,.05,.069),.3,.23);rubber=material('Rubber',(.017,.023,.021),0,.92);rim=material('Weathered alloy',(.47,.48,.39),.7,.4);lamp=material('Amber headlights',(.85,.68,.36),.1,.3);red=material('Tail light',(.35,.05,.024));rust=material('Oxidized steel',(.31,.12,.055))
# Model coordinates use X across, Y up, Z length. Convert into Blender Z-up.
def cv(v):return (v[0],-v[2],v[1])
def mesh(name,verts,faces,mat,bevel=0):
 data=bpy.data.meshes.new(name);data.from_pydata([cv(v) for v in verts],[],faces);data.update();obj=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(obj);obj.data.materials.append(mat)
 bpy.context.view_layer.objects.active=obj;obj.select_set(True)
 if bevel:
  mod=obj.modifiers.new('Hand-shaped edge chamfers','BEVEL');mod.width=bevel;mod.segments=2
  bpy.ops.object.modifier_apply(modifier=mod.name)
 obj.select_set(False);return obj
def loft(name,rings,mat,bevel=0):
 verts=[]
 # Eight-point cross sections create tapered shoulder and rounded rocker edges.
 for z,w,lo,hi in rings:verts += [[-w*.94,lo,z],[w*.94,lo,z],[w,lo+.10,z],[w,hi-.10,z],[w*.90,hi,z],[-w*.90,hi,z],[-w,hi-.10,z],[-w,lo+.10,z]]
 faces=[list(reversed(range(8)))];n=len(rings)
 for i in range(n-1):
  for k in range(8):faces.append([i*8+k,i*8+(k+1)%8,(i+1)*8+(k+1)%8,(i+1)*8+k])
 faces.append(list(range((n-1)*8,n*8)));return mesh(name,verts,faces,mat,bevel)
def patch(name,pts,mat):return mesh(name,pts,[list(range(len(pts)))],mat)
def cylinder(name,r,depth,pos,mat,vertices=32,axis='x'):
 bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=r,depth=depth,location=cv(pos));obj=bpy.context.object;obj.name=name
 if axis=='x':obj.rotation_euler[1]=math.pi/2
 obj.data.materials.append(mat);return obj
body=loft('Sculpted_body_shell',[[-2.35,.80,.43,.85],[-2.15,.94,.43,1.04],[-1.4,.97,.43,1.08],[-.5,.96,.43,1.09],[.8,.95,.43,1.07],[1.5,.91,.43,1.03],[2.12,.86,.43,.92],[2.35,.76,.46,.78]],paint)
# Cut wheel wells through the actual body shell using mesh booleans.
for z in [-1.38,1.38]:
 cutter=cylinder('Wheel_well_tool',.565,3,(0,.47,z),rubber,40);bpy.context.view_layer.objects.active=body
 mod=body.modifiers.new('Wheel arch cut','BOOLEAN');mod.operation='DIFFERENCE';mod.object=cutter;mod.solver='EXACT';bpy.ops.object.modifier_apply(modifier=mod.name);bpy.data.objects.remove(cutter,do_unlink=True)
bpy.context.view_layer.objects.active=body;mod=body.modifiers.new('Body edge bevel','BEVEL');mod.width=.035;mod.segments=2;bpy.ops.object.modifier_apply(modifier=mod.name)
loft('Shaped_roof_and_pillars',[[-1.25,.79,1.07,1.18],[-.72,.73,1.075,1.66],[.33,.72,1.075,1.68],[1.04,.81,1.06,1.17]],paint,.025)
for side in [-1,1]:
 patch('Rear_side_glass',[[side*.785,1.17,-1.10],[side*.718,1.55,-.7],[side*.727,1.56,-.26],[side*.812,1.16,-.26]],glass)
 patch('Front_side_glass',[[side*.814,1.16,-.15],[side*.725,1.56,-.15],[side*.713,1.58,.3],[side*.78,1.16,.88]],glass)
 patch('Door_panel_gap',[[side*.963,.59,-.20],[side*.963,1.0,-.20],[side*.963,1.0,-.183],[side*.963,.59,-.183]],rubber)
 patch('Door_handle',[[side*.97,.97,0],[side*.97,.97,.18],[side*.97,.93,.18],[side*.97,.93,0]],rim)
 mirror=loft('Wing_mirror',[[.63,.14,1.15,1.29],[.85,.17,1.13,1.30]],paint,.025);mirror.location.x=side*.99
patch('Windshield',[[-.63,1.66,.40],[.63,1.66,.40],[.724,1.22,1.005],[-.724,1.22,1.005]],glass)
patch('Rear_windshield',[[.645,1.63,-.77],[-.645,1.63,-.77],[-.718,1.23,-1.22],[.718,1.23,-1.22]],glass)
loft('Front_bumper',[[2.24,.82,.44,.62],[2.42,.77,.46,.60]],rubber,.025);loft('Rear_bumper',[[-2.42,.81,.44,.6],[-2.27,.87,.43,.62]],rubber,.025)
for side in [-1,1]:
 patch('Headlight',[[side*.26,.69,2.362],[side*.69,.69,2.362],[side*.69,.82,2.29],[side*.26,.86,2.29]],lamp)
 patch('Tail_light',[[side*.3,.65,-2.355],[side*.73,.65,-2.355],[side*.73,.79,-2.355],[side*.3,.79,-2.355]],red)
patch('Front_grille',[[-.23,.64,2.425],[.23,.64,2.425],[.23,.75,2.425],[-.23,.75,2.425]],rubber)
patch('Rust_on_hood',[[-.64,1.003,1.68],[-.38,1.015,1.58],[-.16,.995,1.79],[-.42,.973,1.96]],rust)
# Tires are individually edited ring meshes, not cylinders stacked on the body.
for x in [-.94,.94]:
 for z in [-1.38,1.38]:
  verts=[];faces=[];N=32
  for off,r in [(-.16,.34),(-.145,.40),(-.11,.45),(.11,.45),(.145,.40),(.16,.34)]:
   for i in range(N):a=i/N*2*math.pi;verts.append([x+off,.47+math.sin(a)*r,z+math.cos(a)*r])
  for j in range(5):
   for i in range(N):faces.append([j*N+i,j*N+(i+1)%N,(j+1)*N+(i+1)%N,(j+1)*N+i])
  faces += [list(reversed(range(N))),list(range(5*N,6*N))];tire=mesh('Profiled_tire',verts,faces,rubber)
  for face in tire.data.polygons:face.use_smooth=True
  outer=x+math.copysign(.166,x);disc=cylinder('Alloy_disc',.28,.018,(outer,.47,z),rim,32)
  for i in range(5):
   a=i*2*math.pi/5;cylinder('Rim_recess',.056,.022,(outer+math.copysign(.012,x),.47+math.sin(a)*.155,z+math.cos(a)*.155),rubber,8)
# Save editable source and the actual Blender exporter output.
for obj in bpy.context.scene.objects:
 if obj.type=='MESH':
  obj.data.materials[0].use_nodes=True
  obj.data.materials[0].surface_render_method='DITHERED'
  # thin glass and trim plates intentionally have visible backs
  obj.data.materials[0].use_backface_culling=False
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT,'work/sedan/abandoned-sedan.blend'))
bpy.ops.export_scene.gltf(filepath=os.path.join(ROOT,'public/models/sedan/blender-sedan.glb'),export_format='GLB',export_yup=True,export_apply=True)
print('SEDAN_COMPLETE',json.dumps({'objects':len(bpy.context.scene.objects),'polygons':sum(len(o.data.polygons) for o in bpy.context.scene.objects if o.type=='MESH')}))

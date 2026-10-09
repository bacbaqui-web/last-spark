"""Author UV-textured hard-surface robot meshes in Blender; no external model inputs.

Run: Blender --background --factory-startup --disable-autoexec --python this.py
Coordinates in construction helpers are X/right, Y/up, Z/front, in metres.
"""
import bpy, bmesh, math, random, json, os, sys
from pathlib import Path
from mathutils import Vector, Matrix

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public/models/wild-robots-v1'
SOURCE = ROOT / 'work/wild-robots-v1'
OUT.mkdir(parents=True, exist_ok=True)
SOURCE.mkdir(parents=True, exist_ok=True)
RNG = random.Random(4719)
PART = None
ROOT_OBJECT = None
ASSET_OBJECTS = []
MATERIALS = {}
REPORT = []

def cv(p): return Vector((p[0], -p[2], p[1]))
def vec(p): return Vector(p)

def clear_scene():
    global ASSET_OBJECTS
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    ASSET_OBJECTS = []

def materials():
    image = bpy.data.images.load(str(OUT / 'material-atlas.png'), check_existing=True)
    image.pack()
    specs = {'paint': ((.62,.39,.10), .32,.87,0), 'dark': ((.09,.085,.075), .68,.66,1),
             'rust': ((.24,.09,.035), .16,.94,2), 'moss': ((.15,.23,.045), 0,1,3),
             'steel': ((.32,.35,.33), .82,.34,None), 'rubber': ((.018,.022,.017), .05,.95,None),
             'eye': ((.22,.014,.002), .5,.16,None), 'iris': ((1,.18,.002), .08,.18,None)}
    for name,(color,metal,rough,tile) in specs.items():
        mat = bpy.data.materials.new('WildRobot_' + name)
        mat.use_nodes = True
        mat.diffuse_color = (*color,1)
        mat['atlas_tile'] = tile if tile is not None else -1
        p = mat.node_tree.nodes.get('Principled BSDF')
        p.inputs['Base Color'].default_value = (*color,1)
        p.inputs['Metallic'].default_value = metal
        p.inputs['Roughness'].default_value = rough
        if tile is not None:
            tex = mat.node_tree.nodes.new('ShaderNodeTexImage'); tex.image = image
            tex.interpolation = 'Linear'
            tint=mat.node_tree.nodes.new('ShaderNodeMixRGB');tint.blend_type='MULTIPLY';tint.inputs[0].default_value=1
            factor=.58 if name=='paint' else .73 if name=='moss' else .82
            tint.inputs[2].default_value=(factor,factor,factor,1)
            mat.node_tree.links.new(tex.outputs['Color'],tint.inputs[1])
            mat.node_tree.links.new(tint.outputs['Color'],p.inputs['Base Color'])
        if name in ('eye','iris'):
            p.inputs['Emission Color'].default_value = (*color,1)
            p.inputs['Emission Strength'].default_value = .25 if name == 'eye' else 3.5
        MATERIALS[name] = mat

def begin(identifier):
    global ROOT_OBJECT,PART
    clear_scene()
    ROOT_OBJECT = bpy.data.objects.new(identifier,None)
    bpy.context.collection.objects.link(ROOT_OBJECT)
    ROOT_OBJECT['asset_kind']='rigid hard-surface mesh prototype'
    ROOT_OBJECT['front_axis']='glTF +Z'
    ROOT_OBJECT['single_cyclops_eye']=True
    PART = ROOT_OBJECT

def part(name,pivot=(0,0,0)):
    global PART
    PART = bpy.data.objects.new(name,None)
    bpy.context.collection.objects.link(PART)
    PART.parent = ROOT_OBJECT
    PART.location = cv(pivot)
    bpy.context.view_layer.update()
    return PART

def adopt(obj,mat):
    obj.data.materials.clear(); obj.data.materials.append(MATERIALS[mat])
    world = obj.matrix_world.copy(); obj.parent = PART; obj.matrix_world = world
    ASSET_OBJECTS.append(obj)
    return obj

def uv_map(obj,mat):
    if mat not in ('paint','dark','rust','moss'): return
    tile = MATERIALS[mat]['atlas_tile']
    uv = obj.data.uv_layers.active or obj.data.uv_layers.new(name='UVMap')
    coords=[v.co.copy() for v in obj.data.vertices]
    if not coords: return
    mins=[min(p[k] for p in coords) for k in range(3)]
    spans=[max(.001,max(p[k] for p in coords)-mins[k]) for k in range(3)]
    scale=RNG.uniform(.57,.88); ox=RNG.uniform(.02,.96-scale); oy=RNG.uniform(.02,.96-scale)
    col = tile % 2; row = 1-tile//2
    for poly in obj.data.polygons:
        axis=max(range(3),key=lambda k:abs(poly.normal[k])); axes=[k for k in range(3) if k!=axis]
        for li in poly.loop_indices:
            co=coords[obj.data.loops[li].vertex_index]
            u=(co[axes[0]]-mins[axes[0]])/spans[axes[0]]
            v=(co[axes[1]]-mins[axes[1]])/spans[axes[1]]
            uv.data[li].uv=((col+ox+u*scale)*.5,(row+oy+v*scale)*.5)

def finish_mesh(obj,mat,bevel=0,smooth=False):
    bpy.context.view_layer.objects.active=obj
    obj.select_set(True)
    if bevel:
        mod=obj.modifiers.new('Machined edge chamfers','BEVEL');mod.width=bevel;mod.segments=2
        bpy.ops.object.modifier_apply(modifier=mod.name)
    bm=bmesh.new();bm.from_mesh(obj.data);bmesh.ops.recalc_face_normals(bm,faces=bm.faces);bm.to_mesh(obj.data);bm.free()
    obj.data.update()
    if smooth:
        for p in obj.data.polygons:p.use_smooth=True
    uv_map(obj,mat)
    adopt(obj,mat)
    obj.select_set(False)
    return obj

def mesh(name,vertices,faces,mat='paint',bevel=0,smooth=False):
    data=bpy.data.meshes.new(name);data.from_pydata([cv(p) for p in vertices],[],faces);data.update()
    obj=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(obj)
    return finish_mesh(obj,mat,bevel,smooth)

def box(name,center,size,mat='paint',bevel=.02):
    x,y,z=center;w,h,d=[v*.5 for v in size]
    vertices=[(x+sx*w,y+sy*h,z+sz*d) for sz in (-1,1) for sy in (-1,1) for sx in (-1,1)]
    faces=[(0,1,3,2),(4,6,7,5),(0,4,5,1),(2,3,7,6),(0,2,6,4),(1,5,7,3)]
    return mesh(name,vertices,faces,mat,min(bevel,min(size)*.2))

def plate(name,outline,depth,center=(0,0,0),mat='paint',bevel=.012):
    c=vec(center);n=len(outline)
    vertices=[c+Vector((x,y,z)) for z in (-depth*.5,depth*.5) for x,y in outline]
    faces=[tuple(reversed(range(n))),tuple(range(n,2*n))]
    faces += [(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
    return mesh(name,vertices,faces,mat,bevel)

def ellipsoid(name,center,scale,mat='dark',segments=20,rings=10):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments,ring_count=rings,radius=1,location=cv(center))
    obj=bpy.context.object;obj.name=name;obj.scale=(scale[0],scale[2],scale[1])
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    return finish_mesh(obj,mat,0,True)

def rod(name,a,b,r,mat='steel',r2=None,n=12):
    a,b=vec(a),vec(b);d=b-a
    bpy.ops.mesh.primitive_cone_add(vertices=n,radius1=r,radius2=r if r2 is None else r2,depth=d.length,location=cv((a+b)*.5))
    obj=bpy.context.object;obj.name=name;obj.rotation_euler=cv(d).to_track_quat('Z','Y').to_euler()
    bpy.ops.object.transform_apply(location=False,rotation=True,scale=True)
    return finish_mesh(obj,mat,0,True)

def ring(name,center,outer,inner,depth,mat='dark',axis='z',n=24):
    c=vec(center);vs=[]
    def point(r,a,z):
        p=(r*math.cos(a),r*math.sin(a),z)
        if axis=='x':p=(z,p[0],p[1])
        elif axis=='y':p=(p[0],z,p[1])
        return c+vec(p)
    for z,r in [(-depth/2,outer),(depth/2,outer),(depth/2,inner),(-depth/2,inner)]:
        for i in range(n):vs.append(point(r,i/n*math.tau,z))
    faces=[]
    for j in range(4):
        for i in range(n):faces.append((j*n+i,j*n+(i+1)%n,((j+1)%4)*n+(i+1)%n,((j+1)%4)*n+i))
    return mesh(name,vs,faces,mat,0,True)

def bolt(name,center,r=.025,axis='z'):
    d=Vector((r*.32,0,0)) if axis=='x' else Vector((0,0,r*.32))
    rod(name,vec(center)-d,vec(center)+d,r,'steel',n=6)

def joint(name,c,r=.10,axis='x'):
    ring(name+'_housing',c,r,r*.62,r*.72,'dark',axis,16)
    ring(name+'_rim',c,r*.89,r*.70,r*.78,'rust',axis,16)
    d=Vector((r*.47,0,0)) if axis=='x' else Vector((0,0,r*.47))
    rod(name+'_axle',vec(c)-d,vec(c)+d,r*.55,'steel',n=16)
    bolt(name+'_fastener',vec(c)+d,r*.22,axis)

def link(name,a,b,width,depth,mat='paint',armor=True):
    a,b=vec(a),vec(b);d=(b-a).normalized()
    basis=Vector((1,0,0));u=(basis-d*basis.dot(d))
    if u.length<.1:u=Vector((0,0,1))-d*d.z
    u.normalize();v=d.cross(u).normalized()
    rod(name+'_inner',a,b,width*.23,'dark',n=10)
    if armor:
        cross=[(-.68,-1),(.68,-1),(1,-.65),(1,.6),(.6,1),(-.6,1),(-1,.6),(-1,-.65)]
        vs=[]
        for t,factor in [(.12,.63),(.24,1),(.64,.94),(.83,.5)]:
            for x,y in cross:vs.append(a+(b-a)*t+u*x*width*.5*factor+v*y*depth*.5*factor)
        faces=[tuple(reversed(range(8))),tuple(range(24,32))]
        for j in range(3):
            for i in range(8):faces.append((j*8+i,j*8+(i+1)%8,(j+1)*8+(i+1)%8,(j+1)*8+i))
        mesh(name+'_shaped_armor',vs,faces,mat,.009)
        # Paired exposed hydraulic rods and their dark cylinders trace the segment.
        offset=u*width*.48+v*depth*.15
        p=a+(b-a)*.17+offset;q=a+(b-a)*.87+offset
        rod(name+'_piston_sleeve',p,p+(q-p)*.48,width*.10,'dark',n=12)
        rod(name+'_piston_rod',p+(q-p)*.43,q,width*.062,'steel',n=12)
        for t in (.28,.64):bolt(name+'_rivet',a+(b-a)*t+v*depth*.49,width*.07)

def cable(name,points,r=.025,mat='rubber'):
    curve=bpy.data.curves.new(name,'CURVE');curve.dimensions='3D';curve.resolution_u=8
    curve.bevel_depth=r;curve.bevel_resolution=2
    spline=curve.splines.new('BEZIER');spline.bezier_points.add(len(points)-1)
    for p,co in zip(spline.bezier_points,points):p.co=cv(co);p.handle_left_type='AUTO';p.handle_right_type='AUTO'
    obj=bpy.data.objects.new(name,curve);bpy.context.collection.objects.link(obj)
    bpy.context.view_layer.objects.active=obj;obj.select_set(True);bpy.ops.object.convert(target='MESH')
    return finish_mesh(bpy.context.object,mat,0,True)

def moss(name,center,rx,rz,count=9):
    # Solid irregular shallow patches and tiny upright leaf wedges: genuine geometry.
    c=vec(center)-vec((0,.025,0));vs=[];fs=[]
    for k in range(round(count*1.6)):
        a=RNG.random()*math.tau;rad=math.sqrt(RNG.random())
        p=c+vec((math.cos(a)*rx*rad,RNG.uniform(0,.022),math.sin(a)*rz*rad))
        r=RNG.uniform(.035,.082)*max(.6,min(1.8,rx*4));n=7;base=len(vs)
        vs.append(p+vec((0,r*.6,0)))
        for j in range(n):
            ang=j/n*math.tau;rr=r*RNG.uniform(.6,1.2)
            vs.append(p+vec((math.cos(ang)*rr,RNG.uniform(-.012,.009),math.sin(ang)*rr)))
        for j in range(n):fs.append((base,base+1+j,base+1+(j+1)%n))
        for j in range(5):
            q=p+vec((RNG.uniform(-r,r),r*.18,RNG.uniform(-r,r)));i=len(vs)
            h=RNG.uniform(.009,.029);w=.007
            vs.extend([q+vec((-w,0,0)),q+vec((w,0,0)),q+vec((RNG.uniform(-.016,.016),h,.007))]);fs.append((i,i+1,i+2))
    obj=mesh(name,vs,fs,'moss')
    # Close the shallow patch undersides; moss is double sided only at tiny leaf tips.
    obj.data.materials[0].use_backface_culling=False
    return obj

def eye(c,r=.15):
    c=vec(c)
    ring('Cyclops_octagonal_socket',c,r*1.55,r*1.12,.095,'paint',n=8)
    ring('Cyclops_dark_recess',c+vec((0,0,.026)),r*1.14,r*.88,.065,'rubber')
    ring('Cyclops_metal_bezel',c+vec((0,0,.065)),r*1.01,r*.84,.025,'steel')
    ellipsoid('Single_eye_lens',c+vec((0,0,.07)),(r*.83,r*.83,r*.22),'eye',24,12)
    ring('Lens_inner_machined_ring',c+vec((0,0,.083)),r*.78,r*.69,.008,'dark')
    ellipsoid('Single_eye_iris',c+vec((0,0,.115)),(r*.24,r*.24,r*.07),'iris',20,10)

def foot(name,c,scale=1,pad=False):
    c=vec(c)
    if pad:
        rod(name+'_contact_pad',c+vec((0,-.025,0)),c+vec((0,.03,0)),.115*scale,'dark',n=16)
    else:box(name+'_heel',c+vec((0,.035,-.035)),(.20*scale,.09*scale,.21*scale),'dark')
    for i,a in enumerate((-.9,.9,math.pi) if pad else (-.55,.55,math.pi)):
        end=c+vec((math.sin(a)*.20*scale,-.018,math.cos(a)*.27*scale))
        mid=c+(end-c)*.47+vec((0,.075*scale,0))
        link(name+'_toe'+str(i),c+vec((0,.065,0)),mid,.10*scale,.09*scale)
        # Tapered closed toe, an angular hooked claw, not a card.
        d=end-mid;w=.045*scale
        verts=[mid+vec((-w,.03,-.02)),mid+vec((w,.03,-.02)),mid+vec((w,-.025,.02)),mid+vec((-w,-.025,.02)),end+vec((0,0,.035))]
        mesh(name+'_claw'+str(i),verts,[(0,3,2,1),(0,1,4),(1,2,4),(2,3,4),(3,0,4)],'rust')

def rifle(c,scale=1,long=False):
    c=vec(c);s=scale
    def p(x,y,z):return c+vec((x*s,y*s,z*s))
    length=1.22 if long else .48
    box('Rifle_receiver',p(0,0,.06),(.20*s,.21*s,.42*s),'dark')
    box('Rifle_top_armor',p(0,.135,.12),(.22*s,.085*s,.50*s),'paint')
    box('Rifle_magazine',p(.02,-.22,.10),(.105*s,.25*s,.16*s),'dark')
    rod('Rifle_barrel',p(0,.01,.22),p(0,.01,length),.042*s,'steel',n=16)
    if long:
        # Separate upper/lower shroud rails and side struts leave real cooling slots.
        for side in (-1,1):
            box('Sniper_shroud_rail',p(side*.065,.065,.65),(.035*s,.035*s,.68*s),'paint',.008)
            box('Sniper_shroud_rail_lower',p(side*.065,-.035,.65),(.035*s,.026*s,.68*s),'dark',.007)
            for j in range(6):box('Sniper_cooling_strut',p(side*.065,.015,.37+j*.105),(.035*s,.09*s,.023*s),'rust',.004)
        rod('Sniper_recoil_tube',p(.11,-.02,-.10),p(.11,-.02,.48),.03*s,'steel')
    ring('Rifle_open_muzzle',p(0,.01,length+.025),.073*s,.040*s,.14*s,'dark',n=8)
    if long:
        for j in range(4):
            rod('Sniper_exposed_round',p(-.125,-.075+j*.048,.03),p(-.125,-.075+j*.048,.15),.016*s,'steel',n=8)

def vent(c,width=.3,height=.22):
    c=vec(c);box('Recessed_vent',c,(width,height,.035),'rubber',.004)
    for j in range(5):box('Vent_louver',c+vec((0,-height*.37+j*height*.185,.025)),(width*.88,.012,.035),'dark',.003)

def biped_leg(side,hip,knee,hock,ankle,width=.24,label='leg'):
    coords=[hip,knee,hock,ankle]
    for i in range(3):
        part(label+'_'+str(side)+'_segment_'+str(i),coords[i])
        joint(label+'_joint',coords[i],width*(.55 if i==0 else .40))
        link(label+'_segment',coords[i],coords[i+1],width*(1 if i==0 else .78 if i==1 else .50),width*.74)
        if i==0:moss(label+'_moss',vec(coords[i])*.6+vec(coords[i+1])*.4+vec((0,.07,.05)),width*.44,width*.23,5)
    part(label+'_'+str(side)+'_foot',ankle);joint(label+'_ankle',ankle,width*.27)
    foot(label+'_foot',vec(ankle)+vec((0,-.03,.06)),width/.24)

def claw_hand(c,scale=1):
    c=vec(c);box('Claw_palm',c,(.20*scale,.18*scale,.12*scale),'dark')
    for i,x in enumerate((-.08,.08)):
        a=c+vec((x*scale,-.07*scale,.02));b=c+vec((x*1.4*scale,-.22*scale,.06*scale));d=c+vec((x*.65*scale,-.30*scale,.13*scale))
        link('Claw_finger',a,b,.065*scale,.06*scale);link('Claw_tip',b,d,.045*scale,.04*scale,'rust')
    link('Claw_thumb',c+vec((0,.02,.07)),c+vec((0,-.14,.18)),.07*scale,.06*scale)

# Model constructors follow; each uses shaped closed shell meshes and named rigid assemblies.
def scout():
    begin('rust-scout')
    part('Torso',(0,1.25,0))
    ellipsoid('Torso_inner',(0,1.30,0),(.24,.30,.19))
    plate('Chest_chevron',[(-.26,.16),(.26,.16),(.23,-.06),(0,-.19),(-.23,-.06)],.15,(0,1.33,.16))
    for i in range(3):ring('Waist_bellows',(0,1.07+i*.045,0),.13,.06,.027,'dark','y',16)
    part('Pelvis',(0,1.04,0))
    plate('Pelvis_front',[(-.28,.12),(.28,.12),(.20,-.08),(0,-.16),(-.20,-.08)],.24,(0,1.01,.05))
    for side in (-1,1):
        biped_leg(side,(side*.19,1.24,-.04),(side*.31,.85,.20),(side*.29,.40,-.22),(side*.31,.14,.16),.31)
    part('Head',(0,1.63,0))
    box('Rectangular_head_core',(0,1.85,.025),(.62,.77,.44),'dark',.075)
    for s in (-1,1):
        plate('Head_side_guard',[(s*x,y) for x,y in [(.16,.40),(.30,.34),(.33,-.31),(.23,-.40),(.155,-.32)]],.16,(0,1.85,.26),'paint',.025)
        box('Head_side_plate',(s*.325,1.88,-.025),(.10,.65,.40),'paint',.035)
        bolt('Head_guard_bolt',(s*.245,2.13,.35),.027)
        bolt('Head_guard_bolt',(s*.245,1.60,.35),.027)
    plate('Head_brow',[(-.27,.06),(.27,.06),(.22,-.05),(-.22,-.05)],.18,(0,2.20,.22),'paint',.018)
    plate('Head_chin',[(-.17,.07),(.17,.07),(.12,-.09),(-.12,-.09)],.13,(0,1.54,.30))
    box('Head_roof',(0,2.255,.02),(.57,.06,.43),'paint',.02)
    eye((0,1.86,.287),.135)
    vent((0,1.59,-.23),.30,.16)
    moss('Head_roof_growth',(0,2.30,.0),.27,.18,22)
    for s in (-1,1):
        part('Shoulder_'+str(s),(s*.42,1.61,0))
        joint('Shoulder',(s*.40,1.59,0),.13)
        box('Shoulder_cap',(s*.49,1.62,-.025),(.29,.27,.30),'paint',.045)
        moss('Shoulder_growth',(s*.49,1.77,-.025),.15,.13,10)
        link('Upper_arm',(s*.49,1.53,0),(s*.60,1.22,.10),.18,.16)
        part('Forearm_'+str(s),(s*.60,1.22,.10))
        joint('Elbow',(s*.60,1.22,.10),.087)
        if s<0:
            link('Forearm',(s*.60,1.22,.10),(s*.60,1.16,.30),.20,.18)
            ring('Gun_wrist_coupling',(s*.60,1.16,.30),.105,.06,.12,'steel','z',12)
            rifle((s*.60,1.16,.42),.72)
            for side in (-1,1):box('Wrist_gun_side_armor',(s*.60+side*.077,1.16,.44),(.026,.14,.24),'paint',.012)
            PART['muzzle_local']=[0,-.0528,.734]
        else:
            link('Forearm',(s*.60,1.22,.10),(s*.57,.98,.22),.20,.18)
            claw_hand((s*.57,.90,.24),.72)
    part('Backpack',(0,1.65,-.20))
    box('Dorsal_power_pack',(0,1.67,-.26),(.42,.47,.18),'dark',.04)
    for s in (-1,1):
        cable('Shoulder_cable',[(s*.20,1.48,-.22),(s*.36,1.37,-.27),(s*.47,1.56,-.10)],.022)
    rod('Antenna_base',(.32,1.87,-.16),(.32,2.20,-.16),.033,'dark')
    rod('Antenna_mast',(.32,2.12,-.16),(.34,2.55,-.18),.011,'steel')

    # Bake silhouette changes into vertices, leaving all joint scales at one.
    # Blender axes are X/right, -Y/front, Z/up.
    for assembly in list(ROOT_OBJECT.children):
        if assembly.name.startswith('leg_'):continue
        pivot=assembly.location.copy();transform=Matrix.Translation((0,0,.22))
        if assembly.name=='Torso':
            center=cv((0,1.25,0));transform=transform@Matrix.Translation(center)@Matrix.Diagonal((.70,.78,.65,1))@Matrix.Translation(-center)
        elif assembly.name=='Pelvis':
            transform=transform@Matrix.Diagonal((.72,1,1,1))
        elif assembly.name=='Head':
            back=cv((0,0,-.23));transform=transform@Matrix.Translation(back)@Matrix.Diagonal((1,1.55,1,1))@Matrix.Translation(-back)
        children=[(obj,obj.matrix_world.copy()) for obj in ASSET_OBJECTS if obj.parent==assembly]
        assembly.location=transform@pivot;bpy.context.view_layer.update()
        for obj,world in children:
            obj.matrix_world=world;obj.data.transform(world.inverted()@transform@world);obj.data.update()
    bpy.context.view_layer.update()

def warden():
    begin('forest-warden')
    part('Torso',(0,2.30,0))
    ellipsoid('Heavy_inner_torso',(0,2.40,-.04),(.67,.63,.38),'dark')
    for s in (-1,1):
        plate('Sloped_chest_plate',[(s*x,y) for x,y in [(.06,.36),(.54,.39),(.67,.12),(.34,-.32),(.08,-.15)]],.20,(0,2.40,.30),'paint',.035)
        cable('Chest_hose',[(s*.38,2.74,.25),(s*.52,2.41,.40),(s*.27,2.12,.29)],.044)
    for i in range(4):ring('Waist_flexure',(0,1.93+i*.065,0),.27,.12,.04,'dark','y',20)
    part('Pelvis',(0,1.75,0))
    plate('Heavy_pelvic_shell',[(-.53,.22),(.53,.22),(.41,-.13),(0,-.26),(-.41,-.13)],.43,(0,1.76,.06),'paint',.03)
    for s in (-1,1):
        biped_leg(s,(s*.45,1.78,-.03),(s*.56,1.14,.30),(s*.54,.54,-.29),(s*.55,.17,.25),.43,'heavy_leg')
    part('Head',(0,2.67,.35))
    box('Recessed_head_core',(0,2.70,.29),(.46,.55,.39),'dark',.065)
    for s in (-1,1):
        plate('Head_guard',[(s*x,y) for x,y in [(.10,.29),(.25,.20),(.20,-.24),(.10,-.29)]],.12,(0,2.70,.48),'paint',.025)
    plate('Head_brow',[(-.23,.065),(.23,.065),(.17,-.06),(-.17,-.06)],.15,(0,2.985,.42))
    eye((0,2.73,.51),.112)
    moss('Head_moss',(0,3.04,.26),.24,.19,18)
    for s in (-1,1):
        shoulder=(s*.80,2.75,-.02);elbow=(s*1.11,2.03,.07)
        part('Heavy_shoulder_'+str(s),shoulder)
        joint('Heavy_shoulder_socket',shoulder,.22)
        plate('Shoulder_front',[(-.36,.24),(.30,.28),(.38,-.13),(.23,-.29),(-.28,-.25)],.69,(s*.91,2.86,.02),'paint',.055)
        moss('Deep_shoulder_moss',(s*.91,3.17,.02),.37,.31,42)
        link('Heavy_upper_arm',(s*.96,2.58,0),elbow,.36,.32)
        cable('Arm_hydraulic_hose',[(s*.88,2.65,-.25),(s*1.16,2.32,-.25),(s*1.10,2.03,-.13)],.035)
        part('Heavy_forearm_'+str(s),elbow)
        joint('Heavy_elbow',elbow,.18)
        if s<0:
            link('Crusher_forearm',elbow,(s*1.19,1.53,.20),.52,.44)
            ring('Crusher_wrist',(s*1.19,1.48,.20),.24,.13,.18,'dark','y')
            box('Crusher_palm',(s*1.19,1.33,.23),(.43,.31,.28),'paint',.04)
            for sign in (-1,1):
                outline=[(sign*.12,.13),(sign*.34,.02),(sign*.44,-.30),(sign*.34,-.57),(sign*.08,-.70),(sign*.20,-.44),(sign*.24,-.22),(sign*.10,-.04)]
                plate('Curved_crushing_finger',outline,.16,(s*1.19,1.34,.24),'rust',.017)
                joint('Crusher_finger_pivot',(s*1.19+sign*.20,1.41,.28),.095,'z')
            moss('Crusher_growth',(s*1.20,1.92,.20),.27,.20,16)
        else:
            link('Cannon_forearm',elbow,(s*1.16,1.75,.22),.40,.36)
            rod('Cannon_receiver',(s*1.16,1.75,.13),(s*1.16,1.75,.64),.245,'dark',n=16)
            for j in range(3):ring('Cannon_armor_band',(s*1.16,1.75,.25+j*.16),.31,.23,.13,'paint','z',12)
            for x in (-.18,.18):rod('Cannon_recoil_piston',(s*1.16+x,1.93,.18),(s*1.16+x,1.93,.67),.035,'steel')
            rod('Cannon_barrel',(s*1.16,1.75,.59),(s*1.16,1.75,.87),.17,'steel',n=16)
            ring('Cannon_open_muzzle',(s*1.16,1.75,.91),.23,.145,.14,'dark','z',16)
            moss('Cannon_moss',(s*1.16,2.04,.38),.27,.23,18)
            PART['muzzle_local']=[.05,-.28,.91]
    part('Heavy_back',(0,2.5,-.36))
    box('Armored_backpack',(0,2.56,-.43),(1.01,.76,.26),'paint',.07)
    moss('Backpack_growth',(0,2.95,-.43),.48,.17,32)
    for s in (-1,1):
        vent((s*.26,2.49,-.58),.32,.29)
        cable('Hanging_root',[(s*.86,3.14,.10),(s*.97,2.91,.32),(s*.92,2.69,.36)],.009,'moss')

    for assembly in list(ROOT_OBJECT.children):
        if assembly.name=='Pelvis':transform=Matrix.Diagonal((.70,1,1,1))
        elif assembly.name=='Head':transform=Matrix.Translation((0,0,-.18))
        elif assembly.name in ('Torso','Heavy_back') or assembly.name.startswith(('Heavy_shoulder_','Heavy_forearm_')):transform=Matrix.Translation((0,0,.14))
        else:continue
        children=[(obj,obj.matrix_world.copy()) for obj in ASSET_OBJECTS if obj.parent==assembly]
        assembly.location=transform@assembly.location;bpy.context.view_layer.update()
        for obj,world in children:
            applied=Matrix.Identity(4) if obj.name.startswith('Waist_flexure') else transform
            obj.matrix_world=world;obj.data.transform(world.inverted()@applied@world);obj.data.update()
    bpy.context.view_layer.update()

def mantis():
    begin('assault-mantis')
    part('Thorax',(0,1.55,.07))
    ellipsoid('Thorax_mechanism',(0,1.62,.07),(.21,.39,.18),'dark')
    plate('Thorax_shield',[(-.29,.31),(.29,.31),(.18,-.13),(0,-.33),(-.18,-.13)],.15,(0,1.66,.25),'paint',.025)
    for i in range(4):ring('Exposed_waist',(0,1.22+i*.055,-.03),.12,.055,.03,'dark','y',16)
    part('Pelvis',(0,1.20,-.06))
    plate('Narrow_pelvis',[(-.26,.10),(.26,.10),(.19,-.14),(0,-.21),(-.19,-.14)],.22,(0,1.21,.03))
    for s in (-1,1):
        biped_leg(s,(s*.24,1.23,-.06),(s*.47,.97,.40),(s*.46,.43,-.32),(s*.52,.105,.26),.28,'mantis_leg')
    part('Head',(0,2.02,.20))
    rod('Short_armored_neck',(0,1.90,.13),(0,2.09,.24),.12,'dark')
    outline=[(-.31,.22),(.31,.22),(.27,.02),(0,-.36),(-.27,.02)]
    plate('Triangular_head',outline,.30,(0,2.22,.28),'dark',.028)
    for s in (-1,1):
        plate('Triangular_face_guard',[(s*x,y) for x,y in [(.03,.22),(.29,.24),(.245,-.03),(.045,-.28)]],.10,(0,2.22,.455),'paint',.015)
    plate('Low_head_brow',[(-.28,.04),(.28,.04),(.20,-.035),(-.20,-.035)],.11,(0,2.47,.36),'paint',.012)
    eye((0,2.27,.49),.095)
    moss('Mantis_head_growth',(0,2.46,.24),.25,.14,16)
    part('Abdomen',(0,1.27,-.08))
    for i in range(3):
        ellipsoid('Segmented_abdomen_'+str(i),(0,1.22+i*.11,-.24-i*.15),(.22-i*.035,.20-i*.018,.24),'paint',16,8)
        moss('Abdomen_growth',(0,1.43+i*.085,-.24-i*.15),.17-i*.025,.17,8)
    for s in (-1,1):
        shoulder=(s*.35,1.95,.08);elbow=(s*.49,1.43,.18);wrist=(s*.78,1.80,.73)
        upper=part('Mantis_shoulder_'+str(s),shoulder)
        upper['joint_role']='upper_arm'
        joint('Mantis_shoulder',shoulder,.14,'x')
        plate('Shoulder_shell',[(-.17,.18),(.15,.22),(.20,-.02),(.04,-.25),(-.17,-.15)],.27,(s*.39,2.04,.10),'paint',.025)
        moss('Mantis_shoulder_growth',(s*.39,2.27,.10),.18,.13,12)
        link('Mantis_upper_arm',shoulder,elbow,.19,.18)

        forearm=part('Mantis_forearm_'+str(s),elbow)
        forearm['joint_role']='forearm'
        joint('Exposed_elbow_hinge',elbow,.13,'x')
        link('Folded_forearm',elbow,wrist,.23,.20)
        # The return segment rises forward from the elbow, creating the concept's
        # visible zig-zag arm instead of attaching the blade directly to the elbow.
        mid=vec(elbow).lerp(vec(wrist),.55)
        moss('Forearm_armor_growth',mid+vec((0,.095,0)),.13,.10,9)
        rod('Forearm_hydraulic_sleeve',vec(elbow)+vec((s*.10,.015,0)),mid+vec((s*.10,0,0)),.039,'dark')
        rod('Forearm_hydraulic_rod',mid+vec((s*.10,0,0)),vec(wrist)+vec((s*.10,-.05,-.06)),.025,'steel')

        hand=part('Blade_hand_'+str(s),wrist)
        hand['joint_role']='blade_hand'
        hand['blade_tip_local']=[s*.04,.12*math.cos(.18)-1.03*math.sin(.18),.12*math.sin(.18)+1.03*math.cos(.18)]
        hand['blade_edge_local']=[0,-math.cos(.18),-math.sin(.18)]
        joint('Independent_wrist_hinge',wrist,.15,'x')
        box('Blade_palm',vec(wrist)+vec((0,-.07,.01)),(.22,.21,.19),'dark',.03)
        blade_start=len(ASSET_OBJECTS)
        # Build the existing blade profile, then orient its spine up and edge down.
        # Its hinge axle
        # runs left-right so the cutting stroke travels down a vertical plane.
        outline=[(-.07,.025),(.12,.015),(.25,-.19),(.27,-.48),(.13,-.81),(-.12,-1.03),(-.065,-.73),(.045,-.37)]
        outline=[(s*x,y) for x,y in outline]
        plate('Vertical_scythe_back',outline,.13,vec(wrist)+vec((0,0,.04)),'paint',.016)
        edge=[(.27,-.48),(.13,-.81),(-.12,-1.03),(-.055,-.80),(.085,-.57),(.17,-.36)]
        plate('Vertical_sharpened_edge',[(s*x,y) for x,y in edge],.046,vec(wrist)+vec((0,0,.12)),'steel',.006)
        moss('Blade_spine_growth',vec(wrist)+vec((s*.07,.06,.035)),.13,.10,10)
        for offset in (-.18,-.39):bolt('Blade_mount_bolt',vec(wrist)+vec((s*.11,offset,.115)),.026)

        # Turn the broad face into the forward/up plane on BOTH arms. Keep the
        # wrist hinge and palm unchanged; rotate only the blade and its fittings.
        c=math.cos(.18);sn=math.sin(.18)
        game_turn=Matrix(((0,0,s,0),(-s*c,sn,0,0),(-s*sn,-c,0,0),(0,0,0,1)))
        basis=Matrix(((1,0,0,0),(0,0,-1,0),(0,1,0,0),(0,0,0,1)))
        pivot=cv(wrist);turn=Matrix.Translation(pivot)@basis@game_turn@basis.inverted()@Matrix.Translation(-pivot)
        bpy.context.view_layer.update()
        for obj in ASSET_OBJECTS[blade_start:]:obj.matrix_world=turn@obj.matrix_world

        # Preserve the three rigid joints in the editable Blender and GLB assets.
        bpy.context.view_layer.update()
        for child,parent in [(upper,bpy.data.objects['Thorax']),(forearm,upper),(hand,forearm)]:
            world=child.matrix_world.copy();child.parent=parent;child.matrix_world=world
            bpy.context.view_layer.update()

def insect_leg(side,index,a,b,c,d,width=.14,pad=False):
    label=('Spider' if pad else 'Beetle')+'_'+str(side)+'_'+str(index)
    for j,(p,q) in enumerate(zip([a,b,c],[b,c,d])):
        part(label+'_segment_'+str(j),p)
        joint(label+'_hinge',p,width*.64)
        link(label+'_limb',p,q,width*(1 if j==0 else .9 if j==1 else .55),width*.67)
        if j<2:moss(label+'_joint_growth',vec(p)+vec((0,width*.70,0)),width*.7,width*.48,4)
    part(label+'_foot',d);foot(label+'_foot',d,width/.17,pad)

def beetle_shell_tile(name,z0,z1,theta0,theta1):
    vs=[];nz=6;nt=7
    for j in range(nz+1):
        z=z0+(z1-z0)*j/nz;r=math.sqrt(max(.03,1-(z/.98)**2))
        for i in range(nt+1):
            a=theta0+(theta1-theta0)*i/nt
            vs.append((.81*r*math.cos(a),.56+.58*r*math.sin(a),z-.07))
    fs=[]
    for j in range(nz):
        for i in range(nt):
            n=j*(nt+1)+i;fs.append((n,n+1,n+nt+2,n+nt+1))
    obj=mesh(name,vs,fs,'paint')
    bpy.context.view_layer.objects.active=obj;obj.select_set(True)
    mod=obj.modifiers.new('Real armor thickness','SOLIDIFY');mod.thickness=.027
    bpy.ops.object.modifier_apply(modifier=mod.name)
    mod=obj.modifiers.new('Carapace chamfers','BEVEL');mod.width=.009;mod.segments=2
    bpy.ops.object.modifier_apply(modifier=mod.name)
    uv_map(obj,'paint');obj.select_set(False)

def beetle():
    begin('iron-beetle')
    part('Chassis',(0,.54,0))
    ellipsoid('Low_armored_chassis',(0,.56,-.02),(.68,.30,.83),'dark',24,12)
    for side in (-1,1):
        for i,z in enumerate((-.56,-.02,.51)):
            dz=(i-1)*.24
            insect_leg(side,i,(side*.54,.55,z),(side*.89,.65,z+dz),(side*1.02,.29,z+dz+.12),(side*1.11,.055,z+dz+.26),.20,False)
    part('Carapace',(0,.60,-.05))
    for side in (0,1):
        t0,t1=(.10,math.pi/2-.035) if side==0 else (math.pi/2+.035,math.pi-.10)
        for i,(a,b) in enumerate(((-.91,-.34),(-.32,.29),(.31,.89))):beetle_shell_tile('Split_shell_'+str(side)+'_'+str(i),a,b,t0,t1)
    for x,z in [(-.19,-.55),(.18,-.50),(-.32,.06),(.31,.03),(-.21,.48),(.18,.45)]:
        y=.56+.58*math.sqrt(max(.1,1-(z/.98)**2-(x/.81)**2))
        moss('Carapace_moss',(x,y+.02,z-.07),.22,.22,20)
    part('Front_head',(0,.55,.67))
    box('Beetle_head_core',(0,.59,.76),(.40,.38,.31),'dark',.06)
    plate('Beetle_face',[(-.27,.13),(-.17,.24),(.17,.24),(.27,.13),(.22,-.12),(0,-.22),(-.22,-.12)],.15,(0,.61,.92),'paint',.02)
    eye((0,.65,1.025),.115)
    plate('Ram_bumper',[(-.34,.09),(.34,.09),(.28,-.11),(0,-.21),(-.28,-.11)],.14,(0,.36,1.005),'rust',.024)
    for x in (-.22,.22):bolt('Ram_bolt',(x,.38,1.085),.033)
    moss('Beetle_head_growth',(0,.855,.82),.22,.14,12)

def spider():
    begin('wall-sniper-spider')
    part('Spider_body',(0,.85,0))
    ellipsoid('Compact_spider_body',(0,.84,0),(.44,.27,.51),'dark',20,10)
    plate('Front_body_armor',[(-.39,.14),(.39,.14),(.31,-.17),(-.31,-.17)],.47,(0,.94,.04),'paint',.025)
    box('Rear_power_module',(0,1.0,-.36),(.59,.40,.38),'paint',.055)
    vent((0,1.0,-.565),.39,.24)
    moss('Spider_back_growth',(0,1.23,-.28),.31,.20,22)
    for side in (-1,1):
        for i,z in enumerate((-.56,-.18,.21,.58)):
            spread=(i-1.5)*.40
            insect_leg(side,i,(side*.36,.86,z*.66),(side*.82,1.24,z+spread*.45),(side*1.24,.68,z+spread*.88),(side*1.43,.055,z+spread),.145,True)
            part('Leg_supply_hose_'+str(side)+'_'+str(i),(0,0,0))
            cable('Leg_cable',[(side*.24,1.03,z*.6),(side*.50,1.13,z),(side*.75,1.25,z+spread*.45)],.017)
    part('Spider_head',(0,.92,.38))
    plate('Spider_head_shell',[(-.27,.22),(.27,.22),(.23,-.16),(0,-.29),(-.23,-.16)],.27,(0,.92,.47),'paint',.025)
    eye((0,.96,.64),.125)
    moss('Spider_head_moss',(0,1.17,.46),.24,.16,13)
    part('Sniper_gimbal',(0,1.20,-.04))
    ring('Gimbal_turntable',(0,1.28,-.04),.21,.10,.08,'dark','y')
    for s in (-1,1):
        link('Gimbal_bracket',(s*.16,1.29,-.04),(s*.13,1.56,.01),.09,.11,'dark')
    joint('Elevation_axis',(0,1.53,.01),.115,'x')
    part('Sniper_rifle',(0,1.53,.01))
    rifle((0,1.57,.03),1.20,True)
    cable('Rifle_control_hose',[(.16,1.49,-.10),(.29,1.37,-.30),(.24,1.13,-.31)],.022)

def wasp():
    global PART
    begin('rust-wasp-drone')
    thorax=part('Thorax',(0,1.48,0))
    ellipsoid('Thorax_engine',(0,1.48,0),(.38,.40,.47),'dark',24,12)
    for x in (-.18,.18):
        ellipsoid('Split_thorax_armor',(x,1.57,-.045),(.22,.35,.43),'paint',20,12)
    box('Dorsal_spine',(0,1.83,-.10),(.095,.10,.51),'dark')
    moss('Dorsal_moss',(0,1.93,-.12),.29,.29,24)
    for s in (-1,1):
        PART=thorax
        joint('Thorax_drive',(s*.38,1.51,-.08),.17,'x')
        ring('Side_drive_trim',(s*.405,1.51,-.08),.14,.105,.04,'steel','x')
        cable('Power_line',[(s*.26,1.68,-.25),(s*.35,1.40,-.43),(s*.22,1.12,-.46)],.028)
        part('Rotor_mount_'+str(s),(s*.32,1.73,-.10))
        link('Lift_arm',(s*.32,1.73,-.10),(s*.79,1.94,-.12),.12,.14,'dark')
        link('Lift_arm_armor',(s*.49,1.81,-.10),(s*1.07,2.02,-.12),.11,.13,'paint')
        joint('Tilt_motor',(s*.80,1.96,-.12),.105,'z')
        center=(s*1.23,2.04,-.12)
        ring('Rotor_protective_ring',center,.70,.653,.105,'paint','y',48)
        ring('Rotor_lower_lip',(s*1.23,2.00,-.12),.701,.675,.025,'dark','y',48)
        for i in range(4):
            angle=i*math.tau/4
            tip=(center[0]+math.cos(angle)*.67,1.99,center[2]+math.sin(angle)*.67)
            rod('Guard_spoke',(center[0],1.95,center[2]),tip,.018,'steel',n=8)
        rod('Lift_motor',(center[0],1.88,center[2]),(center[0],2.10,center[2]),.105,'dark',n=20)
        ring('Motor_collar',(center[0],1.97,center[2]),.12,.095,.055,'steel','y')
        part('Rotor_'+str(s),center)
        ellipsoid('Rotor_hub',(center[0],2.075,center[2]),(.115,.065,.115),'steel',16,8)
        for i in range(3):
            angle=i*math.tau/3
            outline=[(.10,-.04),(.51,-.105),(.625,-.065),(.61,.035),(.25,.075)]
            vs=[]
            for dy in (-.012,.012):
                for rad,tan in outline:
                    vs.append((center[0]+math.cos(angle)*rad-math.sin(angle)*tan,2.065+dy+.045*rad,center[2]+math.sin(angle)*rad+math.cos(angle)*tan))
            mesh('Propeller_blade',vs,[(4,3,2,1,0),(5,6,7,8,9)]+[(j,(j+1)%5,(j+1)%5+5,j+5) for j in range(5)],'dark',.008)
    part('Head',(0,1.48,.39))
    ellipsoid('Head_skull',(0,1.50,.48),(.255,.29,.28),'dark',24,12)
    for s in (-1,1):
        ellipsoid('Cheek_armor',(s*.16,1.50,.52),(.105,.255,.25),'paint',16,10)
        cable('Antenna',[(s*.14,1.70,.49),(s*.21,1.94,.56),(s*.25,2.06,.68)],.018,'steel')
        rod('Mandible',(s*.12,1.30,.66),(s*.065,1.18,.75),.035,'dark',r2=.009)
    eye((0,1.52,.755),.133)
    moss('Head_moss',(0,1.795,.43),.17,.12,9)
    part('Abdomen',(0,1.21,-.34))
    cable('Curled_waist',[(0,1.32,-.35),(0,1.07,-.53),(0,.78,-.41),(0,.71,-.17)],.12,'dark')
    for i in range(4):
        ring('Waist_collar',(0,1.11-i*.08,-.47),.15,.12,.047,'steel','y')
    ellipsoid('Abdomen_underframe',(0,.70,.16),(.34,.30,.59),'dark',24,12)
    for i in range(5):
        z=-.28+i*.195
        radius=[.27,.33,.355,.33,.265][i]
        # Separate armored overlapping barrel segments preserve the curled wasp mass.
        ring('Abdomen_armor_band',(0,.70,z),radius,radius-.04,.15,'paint','z',24)
        ring('Abdomen_dark_joint',(0,.70,z+.087),radius*.97,radius*.87,.035,'dark','z',24)
        for s in (-1,1):bolt('Band_fastener',(s*radius*.67,.70+radius*.68,z+.080),.019)
    moss('Abdomen_growth',(0,1.04,.08),.22,.26,18)
    part('Stinger_gun',(0,.70,.58))
    part_gun=PART;part_gun['muzzle_local']=[0,0,.61]
    rod('Stinger_receiver',(0,.70,.52),(0,.70,.77),.19,'dark',r2=.14,n=20)
    ring('Receiver_trim',(0,.70,.75),.155,.105,.04,'steel')
    rod('Gun_barrel',(0,.70,.74),(0,.70,1.16),.077,'dark',n=16)
    for z in (.84,.98,1.13):ring('Barrel_collar',(0,.70,z),.091,.070,.038,'steel')
    ring('Muzzle_bore',(0,.70,1.19),.085,.053,.08,'steel')
    for s in (-1,1):
        for i in range(3):
            z=.28-i*.29
            a=(s*.30,1.42,z);b=(s*(.56+.07*i),1.15,z+.10);c=(s*(.61+.06*i),.89,z+.28);d=(s*(.52+.07*i),.70,z+.36)
            part('Wasp_leg_'+str(s)+'_'+str(i),a)
            for j,(p,q) in enumerate(zip([a,b,c],[b,c,d])):
                joint('Leg_joint',p,.055,'x');link('Folded_leg',p,q,.073 if j<2 else .037,.06,'paint' if j<2 else 'dark')


CONCEPTS = [
    ('rust-wasp-drone','녹슨 말벌 드론',wasp,'/models/wild-robots-v1/rust-wasp-concept.png','쌍발 프로펠라 공중형'),
    ('rust-scout','녹슨 척후병',scout,'01-rust-scout-v2.png','기본 전투·정찰형'),
    ('forest-warden','숲의 파수꾼',warden,'10-forest-warden-v2.png','중장갑 정예형'),
    ('iron-beetle','철갑 딱정벌레',beetle,'03-iron-beetle-v2.png','지상 돌진형'),
    ('wall-sniper-spider','폐허 거미 저격수',spider,'04-wall-sniper-spider-v2.png','벽면·고지대 저격형'),
    ('assault-mantis','이끼 사마귀 돌격병',mantis,'02-assault-mantis-v2.png','근접 돌격형')
]

def consolidate():
    groups={}
    for obj in list(ASSET_OBJECTS):
        if obj.name in bpy.data.objects:groups.setdefault(obj.parent,[]).append(obj)
    for parent,objects in groups.items():
        bpy.ops.object.select_all(action='DESELECT')
        for obj in objects:obj.select_set(True)
        bpy.context.view_layer.objects.active=objects[0]
        if len(objects)>1:bpy.ops.object.join()
        obj=bpy.context.object;obj.name=parent.name+'_Mesh'
        # Keeping named rigid pivots permits mechanical animation without soft-body weights.
        obj['assembly']=parent.name
        obj.select_set(False)

def geometry_report():
    meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
    points=[o.matrix_world @ Vector(corner) for o in meshes for corner in o.bound_box]
    lo=Vector(tuple(min(p[k] for p in points) for k in range(3)))
    hi=Vector(tuple(max(p[k] for p in points) for k in range(3)))
    triangles=0
    for obj in meshes:
        obj.data.calc_loop_triangles();triangles+=len(obj.data.loop_triangles)
        assert obj.data.uv_layers.active or all(m.name.endswith(('_steel','_rubber','_eye','_iris')) for m in obj.data.materials)
        assert all(math.isfinite(x) for v in obj.data.vertices for x in v.co)
    return {'meshObjects':len(meshes),'triangles':triangles,'vertices':sum(len(o.data.vertices) for o in meshes),
            'rigged':False,'rigidAssemblies':sum(o.type=='EMPTY' for o in bpy.context.scene.objects)-1,
            'textured':True,'texture':'material-atlas.png','boundsMetres':[round(hi.x-lo.x,3),round(hi.z-lo.z,3),round(hi.y-lo.y,3)],
            'animations':[],'note':'Named rigid mesh assemblies; skeletal rig and combat animation are not included.'},lo,hi

def stage(lo,hi):
    scene=bpy.context.scene;scene.render.engine='BLENDER_EEVEE'
    scene.render.resolution_x=900;scene.render.resolution_y=900;scene.render.resolution_percentage=100
    scene.render.image_settings.file_format='PNG';scene.render.film_transparent=False
    scene.world.use_nodes=True;bg=scene.world.node_tree.nodes.get('Background')
    bg.inputs['Color'].default_value=(.34,.38,.32,1);bg.inputs['Strength'].default_value=.6
    scene.view_settings.view_transform='AgX'
    # Stage objects are intentionally created only AFTER glTF export.
    bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,lo.z-.004));floor=bpy.context.object;floor.name='Studio_floor'
    mat=bpy.data.materials.new('Studio_ground');mat.diffuse_color=(.21,.23,.20,1);mat.use_nodes=True
    mat.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=(.21,.23,.20,1)
    mat.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value=.88;floor.data.materials.append(mat)
    center=(lo+hi)*.5;size=max(hi-lo)
    for name,pos,energy,light_size,color in [
        ('Key',(4,-5,7),1100,5,(1,.88,.72)),('Fill',(-4,-2,4),850,5,(.74,.86,1)),('Rim',(1,5,6),1400,4,(1,.96,.8))]:
        data=bpy.data.lights.new(name,'AREA');data.energy=energy;data.shape='DISK';data.size=light_size;data.color=color
        obj=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(obj);obj.location=center+Vector(pos)*max(1,size/3)
        obj.rotation_euler=(center-obj.location).to_track_quat('-Z','Y').to_euler()
    data=bpy.data.cameras.new('Asset_camera');cam=bpy.data.objects.new('Asset_camera',data);bpy.context.collection.objects.link(cam)
    cam.location=center+Vector((3.3,-6,2.9))*size*.85
    cam.rotation_euler=(center-cam.location).to_track_quat('-Z','Y').to_euler();data.type='ORTHO';data.ortho_scale=size*1.32
    scene.camera=cam
    scene.render.image_settings.color_mode='RGBA'
    # Start the editable source with the asset selected and a useful camera view.
    bpy.ops.object.select_all(action='DESELECT');ROOT_OBJECT.select_set(True);bpy.context.view_layer.objects.active=ROOT_OBJECT
    for screen in bpy.data.screens:
        for area in screen.areas:
            if area.type=='VIEW_3D':
                area.spaces.active.region_3d.view_perspective='CAMERA'
                area.spaces.active.shading.type='MATERIAL'

def main():
    import argparse,struct
    parser=argparse.ArgumentParser();parser.add_argument('--only');parser.add_argument('--no-render',action='store_true')
    args=parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
    materials()
    for identifier,title,build,concept,role in CONCEPTS:
        if args.only and identifier!=args.only:continue
        RNG.seed(4719+sum(ord(c) for c in identifier))
        build();bpy.context.view_layer.update();consolidate();bpy.context.view_layer.update()
        report,lo,hi=geometry_report()
        report.update({'id':identifier,'name':title,'role':role,'concept':concept,'glb':identifier+'.glb','preview':identifier+'.png','blend':identifier+'.blend'})
        bpy.ops.object.select_all(action='SELECT')
        bpy.ops.export_scene.gltf(filepath=str(OUT/(identifier+'.glb')),export_format='GLB',use_selection=True,export_yup=True,export_apply=True,export_animations=False,export_extras=True)
        path=OUT/(identifier+'.glb')
        raw=path.read_bytes();length=struct.unpack_from('<I',raw,12)[0];gltf=json.loads(raw[20:20+length])
        # Blender's glTF export ignores the explicit image multiply in this version.
        # Preserve its exact linear tint in the standard glTF material factor.
        for mat in gltf.get('materials',[]):
            pbr=mat.get('pbrMetallicRoughness',{})
            if 'baseColorTexture' in pbr:
                name=mat.get('name','');factor=.58 if name.endswith('_paint') else .73 if name.endswith('_moss') else .82
                pbr['baseColorFactor']=[factor,factor,factor,1]
        json_data=json.dumps(gltf,separators=(',',':'),ensure_ascii=False).encode('utf-8')
        json_data+=b' '*((-len(json_data))%4)
        remaining=raw[20+length:]
        path.write_bytes(struct.pack('<4sII',b'glTF',2,20+len(json_data)+len(remaining))+struct.pack('<I4s',len(json_data),b'JSON')+json_data+remaining)
        assert len(gltf.get('images',[]))>=1, 'texture image was not embedded'
        assert all('bufferView' in image for image in gltf['images']), 'GLB has external images'
        assert not gltf.get('skins'), 'Unexpected skin'
        assert len(gltf.get('meshes',[]))==report['meshObjects']
        report['embeddedImages']=len(gltf['images']);report['bytes']=path.stat().st_size
        stage(lo,hi)
        bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/(identifier+'.blend')))
        if not args.no_render:
            bpy.context.scene.render.filepath=str(OUT/(identifier+'.png'));bpy.ops.render.render(write_still=True)
        (OUT/(identifier+'.json')).write_text(json.dumps(report,ensure_ascii=False,indent=2))
        REPORT.append(report);print('WILD_ROBOT_COMPLETE',json.dumps(report,ensure_ascii=False),flush=True)
    records=[]
    for identifier,*_ in CONCEPTS:
        path=OUT/(identifier+'.json')
        if path.exists():records.append(json.loads(path.read_text()))
    for path in sorted([*OUT.glob('*-boss.json'),*OUT.glob('slag-beetle.json')]):
        record=json.loads(path.read_text())
        if not any(r['id']==record['id'] for r in records):records.append(record)
    (OUT/'manifest.json').write_text(json.dumps({'version':1,'units':'metres','source':'Authored Blender polygon meshes based on selected V2 concepts','models':records},ensure_ascii=False,indent=2))

if __name__=='__main__':main()

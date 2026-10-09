"""Detailed rigid boss meshes; reuse the faction's UV atlas and mesh authoring helpers.
Blender --background --python scripts/create-wild-bosses.py -- --only siege-beetle-boss
"""
from pathlib import Path
_source=Path(__file__).with_name('create-wild-robots.py')
exec(compile(_source.read_text().replace("if __name__=='__main__':main()",''),str(_source),'exec'))

def shell_tile(name,c,radii,az0,az1,el0,el1,mat='paint',nu=12,nv=8):
    # Closed, curved armor patch with a real inner wall rather than a flattened sphere.
    c=vec(c);r=vec(radii);vs=[]
    for inset in (0,.045):
        for j in range(nv+1):
            e=el0+(el1-el0)*j/nv
            for i in range(nu+1):
                a=az0+(az1-az0)*i/nu
                vs.append(c+vec(((r.x-inset)*math.sin(a)*math.cos(e),(r.y-inset)*math.sin(e),(r.z-inset)*math.cos(a)*math.cos(e))))
    width=nu+1;layer=width*(nv+1);faces=[]
    for j in range(nv):
        for i in range(nu):
            k=j*width+i;faces.extend([(k,k+1,k+1+width,k+width),(k+layer,k+width+layer,k+width+1+layer,k+1+layer)])
    rim=list(range(width))+[j*width+nu for j in range(1,nv+1)]+[nv*width+i for i in range(nu-1,-1,-1)]+[j*width for j in range(nv-1,0,-1)]
    for k,a in enumerate(rim):b=rim[(k+1)%len(rim)];faces.append((a,b,b+layer,a+layer))
    return mesh(name,vs,faces,mat,0,True)

def armored_joint(name,c,r,axis='x'):
    joint(name,c,r,axis)
    for side in (-1,1):
        d=vec((side*r*.70,0,0) if axis=='x' else (0,0,side*r*.70))
        ring(name+'_bearing',vec(c)+d,r*.84,r*.64,.035,'steel',axis,32)
        for i in range(8):
            a=i*math.tau/8
            offset=(0,math.sin(a)*r*.68,math.cos(a)*r*.68) if axis=='x' else (math.cos(a)*r*.68,math.sin(a)*r*.68,0)
            bolt(name+'_bearing_bolt',vec(c)+d+vec(offset),.016,axis)

def layered_leg(s,hip,knee,hock,ankle,w):
    global PART
    biped_leg(s,hip,knee,hock,ankle,w,'boss_leg')
    for j,(a,b) in enumerate(zip([hip,knee,hock],[knee,hock,ankle])):
        PART=bpy.data.objects['boss_leg_'+str(s)+'_segment_'+str(j)]
        armored_joint('Reinforced_leg_joint',a,w*(.45 if j==0 else .32))
        mid=(vec(a)+vec(b))*.5
        for k in range(3):
            center=mid+vec((0,(1-k)*.10,w*.28))
            shell_tile('Overlapping_leg_plate',center,(w*.57,w*.68,w*.41),-.95,.95,-.28,.65,'paint',12,6)
        for dx in (-w*.32,w*.32):
            p=vec(a)+vec((dx,-.10,-.10));q=vec(b)+vec((dx,.09,-.10))
            rod('Leg_hydraulic_jacket',p,p.lerp(q,.55),w*.09,'dark',n=20)
            rod('Leg_hydraulic_shaft',p.lerp(q,.5),q,w*.053,'steel',n=20)
    PART=bpy.data.objects['boss_leg_'+str(s)+'_foot']
    for dx in (-w*.36,0,w*.36):
        shell_tile('Broad_claw_foot',vec(ankle)+vec((dx,-.02,.20)),(w*.24,.18,.40),-1.35,1.35,-.12,1.42,'paint',12,8)

def boss_body(reaper=False):
    global PART
    y=2.72 if reaper else 2.36;w=.50 if reaper else .80
    torso=part('Thorax',(0,y,0));ellipsoid('Internal_chassis',(0,y,0),(w,.66,.45),'dark',32,18)
    for s in (-1,1):
        shell_tile('Split_curved_breastplate',(0,y+.08,.02),(w+.04,.67,.54),s*.055,s*1.43,-.92,1.13,'paint',20,14)
        for j in range(3):
            shell_tile('Overlapping_flank',(0,y-.04-j*.10,-.02),(w+.015,.5,.51),s*.98,s*2.35,-.5,.35,'dark' if reaper else 'paint')
        cable('Chest_hydraulics',[(s*.35,y+.43,.29),(s*.49,y,.47),(s*.28,y-.45,.20)],.04)
        for j in range(5):bolt('Chest_seam_rivets',(s*(.18+j*.075),y+.46-j*.09,.46),.022)
    for j in range(5):ring('Waist_flexure',(0,y-.74+j*.065,-.04),.24,.12,.045,'steel' if j%2 else 'dark','y',32)
    moss('Chest_roof_moss',(0,y+.66,-.02),w*.75,.35,30)
    part('Pelvis',(0,1.66 if reaper else 1.40,0))
    py=1.66 if reaper else 1.40
    ellipsoid('Pelvic_core',(0,py,0),(.40,.25,.28),'dark',24,14)
    for s in (-1,1):plate('Pelvic_guard',[(s*.03,.2),(s*.38,.12),(s*.30,-.20),(s*.07,-.26)],.14,(0,py,.22),'paint',.025)
    for s in (-1,1):
        layered_leg(s,(s*.39,py,0),(s*.64,.94 if reaper else .82,.37),(s*.59,.42,-.25),(s*.65,.19,.15),.43 if reaper else .54)
    part('Head',(0,y+.26,.42))
    ellipsoid('Recessed_head',(0,y+.26,.44),(.25,.30,.22),'dark',28,16)
    for s in (-1,1):
        plate('Angular_eye_guard',[(s*.03,.34),(s*.28,.21),(s*.21,-.17),(s*.035,-.25)],.14,(0,y+.26,.59),'paint',.018)
    eye((0,y+.26,.69),.12)
    plate('Horn_forehead',[(-.14,.10),(-.095,.34),(0,.64),(.095,.34),(.14,.1),(0,-.06)],.15,(0,y+.53,.43),'paint',.012)
    if reaper:
        for s in (-1,1):plate('Mantis_crown',[(0,0),(s*.17,.36),(s*.31,.47),(s*.21,.03)],.12,(s*.10,y+.44,.36),'paint')
    moss('Brow_growth',(0,y+.65,.30),.20,.12,12)
    return y,torso

def siege():
    global PART
    begin('siege-beetle-boss');y,torso=boss_body()
    for s in (-1,1):
        shoulder=(s*.86,2.78,0);elbow=(s*1.13,2.04,.02);wrist=(s*1.21,1.55,.17)
        part('Boss_shoulder_'+str(s),shoulder);armored_joint('Shoulder_motor',shoulder,.25)
        ellipsoid('Pauldron_inner',(s*.94,2.72,0),(.37,.37,.39),'dark',24,16)
        for j in range(3):shell_tile('Layered_beetle_pauldron',(s*.94,2.80-j*.11,0),(.42,.37,.44),-1.5,1.5,-.3,1.4,'paint',18,10)
        link('Heavy_humerus',shoulder,elbow,.42,.36)
        moss('Shoulder_old_moss',(s*.94,3.15,-.06),.33,.30,30)
        part('Boss_forearm_'+str(s),elbow);armored_joint('Elbow_axle',elbow,.20)
        link('Crushing_forearm',elbow,wrist,.53,.46)
        shell_tile('Forearm_shell',(s*1.21,1.80,.12),(.33,.38,.33),-1.45,1.45,-.7,1.2)
        ring('Wrist_lock',wrist,.22,.14,.15,'steel','y',32)
        for finger,dx in enumerate((-.17,0,.17)):
            a=vec(wrist)+vec((dx,-.03,.06));b=a+vec((dx*.35,-.24,.08));c=b+vec((-dx*.4,-.20,.11))
            armored_joint('Finger_knuckle',a,.062);link('Armored_claw',a,b,.16,.17);link('Claw_tip',b,c,.10,.11,'steel')
        moss('Forearm_moss',(s*1.22,2.05,.16),.27,.20,15)
        pivot=(s*.74,2.94,-.27);part('Missile_pod_'+str(s),pivot)
        link('Pod_support',(s*.53,2.52,-.27),pivot,.23,.27,'dark')
        center=vec((s*.85,3.27,-.10))
        outline=[(-.36,-.54),(.36,-.54),(.43,-.40),(.43,.43),(.29,.58),(-.29,.58),(-.43,.43),(-.43,-.40)]
        plate('Launcher_dark_core',outline,.55,center,'dark',.025)
        for dx in (-.435,.435):box('Launcher_side_armor',center+vec((dx,0,-.07)),(.07,1.01,.69),'paint',.018)
        box('Launcher_roof',center+vec((0,.58,-.07)),(.76,.09,.69),'paint',.018)
        box('Launcher_base',center+vec((0,-.55,-.07)),(.76,.09,.69),'paint',.018)
        for row in range(3):
            for col in (-1,1):
                c=center+vec((col*.19,.34-row*.32,.31))
                ring('Missile_tube',c,.148,.12,.18,'steel','z',32)
                rod('Recessed_missile',c-vec((0,0,.19)),c-vec((0,0,.035)),.112,'dark',n=24)
                ellipsoid('Missile_nose',c-vec((0,0,.045)),(.095,.095,.09),'rust',24,12)
        for dx in (-.35,.35):
            for dy in (-.48,0,.48):bolt('Pod_frame_bolt',center+vec((dx,dy,.29)),.026)
        moss('Launcher_moss',center+vec((0,.64,-.09)),.37,.32,24)
        PART['muzzle_local']=[s*.11,.33,.58]
    PART=torso
    for s in (-1,1):shell_tile('Rear_beetle_case',(0,2.49,-.07),(.79,.68,.54),s*1.62,s*3.10,-.8,1.2,'paint',18,12)

def reaper():
    global PART
    begin('moss-reaper-boss');y,torso=boss_body(True)
    for s in (-1,1):
        shoulder=(s*.73,3.03,0);elbow=(s*1.08,2.37,.10);wrist=(s*1.24,2.11,.64)
        part('Boss_shoulder_'+str(s),shoulder);armored_joint('Scythe_shoulder',shoulder,.23)
        link('Mantis_upper_arm',shoulder,elbow,.30,.28)
        for j in range(3):
            plate('Pointed_reaper_pauldron',[(s*-.28,.16),(s*.03,.29),(s*.34,.18),(s*.50,-.23),(s*.21,-.12),(s*-.16,-.20)],.36,(s*.79,3.15-j*.11,-.04-j*.09),'paint',.024)
        moss('Shoulder_mantle',(s*.79,3.39,-.09),.35,.28,35)
        part('Boss_forearm_'+str(s),elbow);armored_joint('Scythe_elbow',elbow,.16)
        link('Mantis_forearm',elbow,wrist,.27,.24)
        cable('Forearm_cable',[vec(elbow)+vec((s*.10,.02,-.05)),vec(wrist)+vec((s*.09,-.05,-.12)),wrist],.025)
        hand=part('Blade_hand_'+str(s),wrist);armored_joint('Blade_wrist',wrist,.14)
        # Vertical Y/Z blade plane: thick upper spine, sharpened edge underneath.
        outline=[(0,.15),(.40,.22),(.86,.15),(1.28,-.04),(1.59,-.43),(1.78,-.94),(1.39,-.61),(.95,-.32),(.39,-.16),(.03,-.10)]
        vs=[]
        blade_start=len(ASSET_OBJECTS)
        for dx in (-.045,.045):
            for z,dy in outline:vs.append(vec(wrist)+vec((dx,dy,z)))
        n=len(outline);mesh('Curved_scythe_blade',vs,[tuple(reversed(range(n))),tuple(range(n,2*n))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)],'dark',.008)
        for k in range(5):
            z=.14+k*.23;dy=.18-.18*(z/.9)**2
            link('Segmented_blade_spine',vec(wrist)+vec((0,dy,z)),vec(wrist)+vec((0,dy-.065,z+.22)),.16,.18,'paint')
            bolt('Blade_spine_bolt',vec(wrist)+vec((.085,dy-.04,z+.09)),.024,'x')
        # A separate tapered bright cutting bevel follows the curved lower outline.
        edge=outline[5:]+[outline[0]]
        for (z0,y0),(z1,y1) in zip(edge[:-1],edge[1:]):
            mesh('Sharpened_cutting_bevel',[vec(wrist)+vec((x,dy,z)) for x,dy,z in [(-.048,y0+.065,z0),(.048,y0+.065,z0),(0,y0,z0),(-.048,y1+.065,z1),(.048,y1+.065,z1),(0,y1,z1)]],[(0,3,5,2),(1,2,5,4),(0,1,4,3),(0,2,1),(3,4,5)],'steel')
        pivot=cv(wrist);turn=Matrix.Translation(pivot)@Matrix.Rotation(.40,4,'X')@Matrix.Rotation(s*.23,4,'Z')@Matrix.Translation(-pivot)
        for obj in ASSET_OBJECTS[blade_start:]:obj.matrix_world=turn@obj.matrix_world
        hand['blade_tip_local']=[0,-.94,1.78];hand['blade_edge_local']=[0,-1,0]
    part('Backpack',(0,2.93,-.30))
    for row in range(6):
        for s in (-1,1):
            shell_tile('Layered_carapace_mantle',(s*.13,3.07-row*.15,-.17-row*.045),(.59-row*.035,.48,.48),s*1.5,s*3.05,-.75,.65,'paint' if row%2==0 else 'dark',16,10)
    moss('Ancient_back_moss',(0,3.48,-.27),.51,.40,65)

def queen():
    global PART
    wasp();ROOT_OBJECT.name='queen-wasp-boss'
    # Enlarge the existing mechanical flight skeleton before adding boss-specific armor.
    transform=Matrix.Diagonal((1.30,1.25,1.30,1))
    for assembly in list(ROOT_OBJECT.children):
        children=[(o,o.matrix_world.copy()) for o in ASSET_OBJECTS if o.parent==assembly]
        assembly.location=transform@assembly.location;bpy.context.view_layer.update()
        for o,world in children:o.matrix_world=world;o.data.transform(world.inverted()@transform@world)
    PART=bpy.data.objects['Thorax']
    for s in (-1,1):
        for row in range(3):shell_tile('Queen_thorax_plate',(0,1.92-row*.045,-.03),(.57,.55,.65),s*.06,s*1.48,-.5+row*.17,.55+row*.17,'paint',20,10)
        armored_joint('Queen_rotor_root',(s*.51,2.09,-.13),.20)
    moss('Queen_roof_growth',(0,2.43,-.10),.39,.39,35)
    for s in (-1,1):
        PART=bpy.data.objects['Rotor_mount_'+str(s)]
        c=vec((s*1.599,2.55,-.156))
        for i in range(12):
            angle=i*math.tau/12
            p=c+vec((math.cos(angle)*.88,.065,math.sin(angle)*.88));bolt('Guard_segment_rivet',p,.03,'y')
            rod('Guard_external_brace',p-vec((0,.14,0)),p,.028,'dark',n=12)
        ring('Armored_guard_top',c+vec((0,.075,0)),.925,.855,.055,'paint','y',72)
        ring('Armored_guard_bottom',c-vec((0,.075,0)),.925,.86,.045,'dark','y',72)
        for dx in (-.09,.09):rod('Outrigger_piston',(s*.60,2.27,dx-.156),(s*1.12,2.54,dx-.156),.05,'steel',n=24)
        PART=bpy.data.objects['Rotor_'+str(s)]
        for i in range(12):
            a=i*math.tau/12;rod('Motor_cooling_fin',c+vec((math.cos(a)*.13,-.13,math.sin(a)*.13)),c+vec((math.cos(a)*.13,.045,math.sin(a)*.13)),.016,'steel',n=8)
    PART=bpy.data.objects['Abdomen']
    ellipsoid('Queen_bomb_belly',(0,.91,.12),(.59,.48,.81),'dark',40,24)
    for row in range(5):
        z0=-.63+row*.30;z1=z0+.275
        for section in range(4):
            vs=[];nu=24;nv=10
            for inset in (0,.04):
                for j in range(nv+1):
                    z=z0+(z1-z0)*j/nv;rad=.655*math.sqrt(max(.06,1-((z-.12)/.95)**2))-inset
                    for i in range(nu+1):
                        ang=section*math.pi/2+.016+(math.pi/2-.032)*i/nu
                        vs.append((math.cos(ang)*rad,.91+math.sin(ang)*rad*.82,z))
            layer=(nu+1)*(nv+1);faces=[]
            for j in range(nv):
                for i in range(nu):
                    k=j*(nu+1)+i;faces.extend([(k,k+1,k+nu+2,k+nu+1),(k+layer,k+nu+1+layer,k+nu+2+layer,k+1+layer)])
            rim=list(range(nu+1))+[j*(nu+1)+nu for j in range(1,nv+1)]+[nv*(nu+1)+i for i in range(nu-1,-1,-1)]+[j*(nu+1) for j in range(nv-1,0,-1)]
            for i,k in enumerate(rim):n=rim[(i+1)%len(rim)];faces.append((k,n,n+layer,k+layer))
            mesh('Queen_overlapping_belly_plate',vs,faces,'paint',0,True)
    for s in (-1,1):
        box('Bomb_rack_back',(s*.50,.83,.15),(.12,.57,.62),'dark',.025)
        for row in range(3):
            c=vec((s*.59,.66+row*.18,.19));rod('Bomb_canister',c-vec((0,0,.18)),c+vec((0,0,.17)),.082,'steel',n=24)
            ring('Bomb_strap',c,.091,.08,.04,'rust','z',24)
            ellipsoid('Bomb_nose',c+vec((0,0,.18)),(.082,.082,.09),'dark',20,12)
    moss('Queen_abdomen_moss',(0,1.42,.10),.43,.50,45)
    PART=bpy.data.objects['Head']
    for s in (-1,1):plate('Queen_crown_prong',[(0,0),(s*.03,.40),(s*.12,.52),(s*.15,.29),(s*.10,-.05)],.11,(s*.09,2.05,.66),'paint',.012)
    plate('Queen_central_crest',[(-.08,0),(-.045,.48),(0,.60),(.045,.48),(.08,0)],.12,(0,2.14,.59),'paint')
    PART=bpy.data.objects['Stinger_gun']
    for obj in list(ASSET_OBJECTS):
        if obj.parent==PART:
            ASSET_OBJECTS.remove(obj);bpy.data.objects.remove(obj,do_unlink=True)
    PART['muzzle_local']=[-.16,-.23,.806]
    PART['missile_ports']=[v for y in (-.23,0,.23) for x in (-.16,.16) for v in (x,y,.806)]
    box('Queen_launcher_mount',(0,.875,.90),(.62,.79,.42),'dark',.06)
    box('Queen_launcher_carapace',(0,.875,1.06),(.72,.88,.50),'paint',.065)
    box('Queen_launcher_face',(0,.875,1.33),(.66,.82,.08),'dark',.025)
    for row in (-1,0,1):
        for side in (-1,1):
            x=side*.16;y=.875+row*.23
            ring('Missile_launch_tube',(x,y,1.35),.115,.090,.36,'steel','z',32)
            ring('Missile_tube_lip',(x,y,1.53),.122,.092,.045,'rust','z',32)
            rod('Loaded_missile',(x,y,1.15),(x,y,1.41),.066,'dark',n=20)
            rod('Missile_warhead',(x,y,1.41),(x,y,1.50),.067,'paint',r2=.008,n=20)
    for side in (-1,1):
        rod('Launcher_hydraulic',(side*.31,.875,.66),(side*.31,.875,1.18),.05,'steel',n=20)
        moss('Launcher_moss',(side*.19,1.33,1.01),.14,.23,12)

BOSS_CONCEPTS=[
 ('siege-beetle-boss','포격 딱정벌레 · 보스',siege,'/models/wild-robots-v1/boss-siege-concept.png','미사일 중장갑 보스'),
 ('queen-wasp-boss','여왕말벌 · 보스',queen,'/models/wild-robots-v1/boss-queen-concept.png','쌍발 폭격 보스'),
 ('moss-reaper-boss','이끼 사신 · 보스',reaper,'/models/wild-robots-v1/boss-reaper-concept.png','대형 낫팔 근접 보스')]
CONCEPTS+=BOSS_CONCEPTS
if __name__=='__main__':main()

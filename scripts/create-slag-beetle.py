"""Rigid textured bombardier support robot, using the wild faction mesh helpers."""
from pathlib import Path
_source=Path(__file__).with_name('create-wild-bosses.py')
_entry_name=__name__;__name__='mesh_library'
exec(compile(_source.read_text(),str(_source),'exec'))
__name__=_entry_name

def slag_beetle():
    global PART
    beetle();ROOT_OBJECT.name='slag-beetle'
    heat=MATERIALS['iris'].copy();heat.name='WildRobot_furnace';MATERIALS['furnace']=heat
    PART=bpy.data.objects['Carapace']
    ellipsoid('Furnace_core',(0,1.02,-.36),(.69,.70,.76),'dark',32,20)
    for side in (-1,1):
        for row in range(4):
            shell_tile('Furnace_armor',(0,1.02,-.36),(.73,.74,.80),side*.07,side*1.5,-.3+row*.32,-.04+row*.32,'paint',16,8)
        for i in range(6):
            z=-.83+i*.17
            rod('Hot_pressure_vent',(side*.69,.98,z),(side*.69,1.27,z),.023,'furnace',n=12)
        rod('Pressure_feed',(side*.43,.66,-.68),(side*.43,1.28,-.82),.075,'steel',n=20)
    moss('Cool_back_moss',(0,1.70,-.47),.49,.38,40)
    part('Mortar_tail',(0,1.12,-.87))
    points=[(0,1.12,-.87),(0,1.64,-.94),(0,2.0,-.61),(0,2.18,-.12),(0,2.38,.47),(0,2.61,1.07)]
    for i,(a,b) in enumerate(zip(points,points[1:])):
        rod('Articulated_tail',a,b,.14 if i<3 else .115,'paint',n=24)
        joint('Tail_hinge',a,.17,'x')
        for side in (-1,1):rod('Tail_tension_cable',vec(a)+vec((side*.16,0,0)),vec(b)+vec((side*.14,0,0)),.022,'dark',n=12)
    a=vec(points[-2]);b=vec(points[-1]);direction=(b-a).normalized();end=b+direction*.46
    rod('Mortar_bore',b,end,.115,'dark',n=32)
    rod('Mortar_lip',end-direction*.05,end,.143,'steel',n=32)
    rod('Hot_bore_inset',end-direction*.01,end+direction*.005,.085,'furnace',n=24)
    PART['muzzle_local']=list(end-vec(points[0]))
    PART['launch_direction']=list(direction)

CONCEPTS.append(('slag-beetle','용재 포격벌레',slag_beetle,'/models/wild-robots-v1/slag-beetle-concept.png','곡사 화염 지원형'))
if __name__=='__main__':main()

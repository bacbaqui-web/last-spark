"""Copy selected locally owned Atomic Realm GLBs into the local game build."""
from pathlib import Path
import json, shutil
root=Path(__file__).resolve().parent.parent
inventory=json.loads((root/'asset/inventory.json').read_text())
names=['car','pickup_1','pickup_2','gas_Station_building_1','pharmacy_building','gas_station_annex_1','Bunker1','Bunker2','tree_1_a','tree_1_b','tree_2_a','tree_3_a','bush_1','grass_green_1','barrel_damaged_blue','road_barrier','rubble_1','rubble_2','gas_pump_A','gas_pump_C_destroyed','tire_cluster','metal_wire_fence','electric_pole_1','wooden_spike_barricade','box_1','wall_1_window_1','wall_1_window_2','wall_1_door_boarded','wall_column','Wall_1','Wall_1_Destroyed_1','Wall_1_Destroyed_2','Wall_Window_1','Wall_Window_2','Wall_Door_1','Floor_1','leaf_1','road_chunk_1','road_chunk_2','Bunker3']
models=[m for p in inventory['packs'] if p['name'].startswith(('[SOURCE]','[AR]')) for m in p['models']]
out=root/'public/atomic';out.mkdir(exist_ok=True);manifest=[]
for name in names:
    m=next(m for m in models if m['name']==name)
    shutil.copy2(root/'asset'/m['path'],out/(name+'.glb'))
    manifest.append({'id':name,'file':name+'.glb','source':m['path'],'triangles':m['triangles']})
(out/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
print(f'Prepared {len(manifest)} local models. Purchased files remain excluded from Git.')

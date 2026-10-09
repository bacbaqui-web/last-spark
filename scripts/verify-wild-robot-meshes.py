"""Reimport each self-contained GLB into a fresh Blender scene and validate it."""
import bpy, json, math, struct
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1]
BASE=ROOT/'public/models/wild-robots-v1'
manifest=json.loads((BASE/'manifest.json').read_text())
assert len(manifest['models'])==10
results=[]
for model in manifest['models']:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    path=BASE/model['glb'];raw=path.read_bytes()
    magic,version,total=struct.unpack_from('<4sII',raw)
    assert magic==b'glTF' and version==2 and total==len(raw)
    n=struct.unpack_from('<I',raw,12)[0];gltf=json.loads(raw[20:20+n])
    assert gltf.get('meshes') and not gltf.get('skins') and not gltf.get('animations')
    assert all('bufferView' in im and 'uri' not in im for im in gltf['images'])
    assert all('TEXCOORD_0' in p['attributes'] for mesh in gltf['meshes'] for p in mesh['primitives'] if 'baseColorTexture' in gltf['materials'][p['material']].get('pbrMetallicRoughness',{}))
    for material in gltf['materials']:
        pbr=material.get('pbrMetallicRoughness',{})
        if material['name'].endswith('_paint'):assert pbr.get('baseColorFactor')==[.58,.58,.58,1]
    bpy.ops.import_scene.gltf(filepath=str(path))
    meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
    assert len(meshes)==model['meshObjects']
    triangles=0
    for obj in meshes:
        assert all(math.isfinite(value) for vertex in obj.data.vertices for value in vertex.co)
        assert len(obj.data.polygons)>0
        obj.data.calc_loop_triangles();triangles+=len(obj.data.loop_triangles)
    assert triangles==model['triangles'],(triangles,model['triangles'])
    images=list({node.image for material in bpy.data.materials if material.use_nodes for node in material.node_tree.nodes if node.type=='TEX_IMAGE' and node.image})
    assert images
    for image in images:
        # Packed glTF images are decoded lazily; read their size and pixel data first.
        width,height=image.size
        assert width>0 and height>0
        assert len(image.pixels)==width*height*4
        assert image.has_data and image.packed_file
    points=[o.matrix_world@Vector(corner) for o in meshes for corner in o.bound_box]
    bounds=[max(p[k] for p in points)-min(p[k] for p in points) for k in range(3)]
    assert min(bounds)>.5 and max(bounds)<6
    result={'id':model['id'],'import':'passed','triangles':triangles,'meshObjects':len(meshes),'embeddedTextures':len(images),'textureDimensions':[list(im.size) for im in images],'rigged':False}
    results.append(result);print('VALIDATED',json.dumps(result),flush=True)
(ROOT/'work/wild-robots-v1/validation.json').write_text(json.dumps({'models':results,'status':'passed'},indent=2))

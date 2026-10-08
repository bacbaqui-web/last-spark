"""Run only with Blender --factory-startup --disable-autoexec, in a staging folder."""
import bpy
import json
import os
import sys

output, report_path, budget = sys.argv[sys.argv.index('--') + 1:]
budget = int(budget)
if bpy.data.libraries:
    raise RuntimeError('Linked external Blender libraries are not supported.')
folder = os.path.realpath(os.path.dirname(bpy.data.filepath))
for image in bpy.data.images:
    if image.source == 'FILE' and not image.packed_file and image.filepath:
        resolved = os.path.realpath(bpy.path.abspath(image.filepath))
        if not resolved.startswith(folder + os.sep) or not os.path.isfile(resolved):
            raise RuntimeError('An unpacked texture is missing from the asset folder: ' + image.name)

# glTF exports Principled nodes. Preserve a simple non-node material's viewport color.
for material in bpy.data.materials:
    if not material.use_nodes:
        color = tuple(material.diffuse_color)
        roughness = material.roughness
        metallic = material.metallic
        material.use_nodes = True
        shader = next((node for node in material.node_tree.nodes if node.type == 'BSDF_PRINCIPLED'), None)
        if shader:
            shader.inputs['Base Color'].default_value = color
            shader.inputs['Roughness'].default_value = roughness
            shader.inputs['Metallic'].default_value = metallic

objects = [obj for obj in bpy.context.scene.objects if not obj.hide_render and obj.type in {'MESH', 'ARMATURE'}]
meshes = [obj for obj in objects if obj.type == 'MESH']
if not meshes:
    raise RuntimeError('No renderable mesh in the Blender file.')
rigged = any(obj.type == 'ARMATURE' for obj in objects)
# The source often carries a render-only subdivision modifier. Export its control cage.
for obj in meshes:
    for modifier in obj.modifiers:
        if modifier.type == 'SUBSURF':
            modifier.show_viewport = False
            modifier.show_render = False
bpy.context.view_layer.update()

def triangle_count(obj):
    evaluated = obj.evaluated_get(bpy.context.evaluated_depsgraph_get())
    mesh = evaluated.to_mesh()
    mesh.calc_loop_triangles()
    count = len(mesh.loop_triangles)
    evaluated.to_mesh_clear()
    return count

before = sum(triangle_count(obj) for obj in meshes)
if before > budget and not rigged:
    ratio = budget * 0.94 / before
    if ratio < 0.04:
        raise RuntimeError('This model needs manual optimisation; automatic reduction would remove over 96%.')
    for obj in meshes:
        modifier = obj.modifiers.new('Game budget', 'DECIMATE')
        modifier.ratio = ratio
        modifier.use_collapse_triangulate = True
bpy.context.view_layer.update()
after = sum(triangle_count(obj) for obj in meshes)
bpy.ops.object.select_all(action='DESELECT')
for obj in objects:
    obj.hide_set(False)
    obj.select_set(True)
bpy.context.view_layer.objects.active = meshes[0]
bpy.ops.export_scene.gltf(filepath=output, export_format='GLB', use_selection=True,
                          export_apply=not rigged, export_animations=rigged,
                          export_materials='EXPORT', export_cameras=False, export_lights=False)
with open(report_path, 'w', encoding='utf-8') as file:
    json.dump({'sourceFormat': 'blend', 'trianglesBefore': before, 'trianglesAfter': after,
               'optimised': before != after, 'rigged': rigged,
               'objects': len(meshes), 'materials': len(bpy.data.materials)}, file)
print('LAST_SPARK_CONVERTED', before, after, output)

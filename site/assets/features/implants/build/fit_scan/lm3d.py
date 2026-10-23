"""Front orthographic render of a mesh, MediaPipe face mesh on it, rays back onto the mesh -> 478 3D points.
Usage: python3 lm3d.py mesh.npz out.npy [texture]"""
import sys, json, subprocess, bpy, numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree
src, out = sys.argv[1], sys.argv[2]
d = np.load(src, allow_pickle=True); V, F = d['V'], d['F']
UV = d['UV'] if 'UV' in d else None
tex = str(d['mats'][0]) if 'mats' in d and len(d['mats']) and d['mats'][0] else (sys.argv[3] if len(sys.argv) > 3 else None)
bpy.ops.wm.read_factory_settings(use_empty=True)
me = bpy.data.meshes.new('m'); me.from_pydata(V.tolist(), [], F.tolist())
if UV is not None and tex:
    uvl = me.uv_layers.new(); uvl.data.foreach_set('uv', UV.reshape(-1))
me.update()
for p in me.polygons: p.use_smooth = True
ob = bpy.data.objects.new('m', me); bpy.context.scene.collection.objects.link(ob)
m = bpy.data.materials.new('s'); m.use_nodes = True; b = m.node_tree.nodes['Principled BSDF']
b.inputs['Base Color'].default_value = (.75, .6, .5, 1); b.inputs['Roughness'].default_value = .6
if UV is not None and tex:
    t = m.node_tree.nodes.new('ShaderNodeTexImage'); t.image = bpy.data.images.load(tex)
    m.node_tree.links.new(t.outputs['Color'], b.inputs['Base Color'])
ob.data.materials.append(m)
# frame on the head: top 45 % of the height
lo, hi = V.min(0), V.max(0)
zc = hi[2] - .3 * (hi[2] - lo[2]) if len(sys.argv) < 5 else float(sys.argv[4])
size = float(sys.argv[5]) if len(sys.argv) > 5 else .6 * (hi[2] - lo[2])
xc = float(np.median(V[V[:, 2] > hi[2] - .5 * (hi[2] - lo[2]), 0]))
sc = bpy.context.scene; sc.render.engine = 'CYCLES'; sc.cycles.samples = 16; sc.cycles.use_denoising = True
sc.render.resolution_x = sc.render.resolution_y = 900
cam = bpy.data.cameras.new('c'); cam.type = 'ORTHO'; cam.ortho_scale = size
co = bpy.data.objects.new('c', cam); sc.collection.objects.link(co); sc.camera = co
co.location = (xc, lo[1] - 10 * size, zc); co.rotation_euler = (np.pi / 2, 0, 0)
for loc, e in (((xc - size, lo[1] - size, zc + size), 250 * size * size), ((xc + size, lo[1] - size, zc), 100 * size * size)):
    L = bpy.data.lights.new('l', 'AREA'); L.energy = e; L.size = size
    lo_ = bpy.data.objects.new('l', L); sc.collection.objects.link(lo_); lo_.location = loc
    lo_.rotation_euler = (Vector((xc, lo[1], zc)) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
w = bpy.data.worlds.new('w'); w.use_nodes = True; w.node_tree.nodes['Background'].inputs['Strength'].default_value = .6; sc.world = w
img = out.replace('.npy', '-front.png'); sc.render.filepath = img; bpy.ops.render.render(write_still=True)
pts = json.loads(subprocess.run(['python3.11', '/home/claude/scanwork/mp2d.py', img], capture_output=True, text=True).stdout)
if pts is None: print('NO FACE'); sys.exit(1)
bvh = BVHTree.FromPolygons(V.tolist(), F.tolist())
P = []
for px, py in pts:
    x = xc + (px / 900 - .5) * size; z = zc - (py / 900 - .5) * size
    hit = bvh.ray_cast(Vector((x, lo[1] - 1, z)), Vector((0, 1, 0)))
    P.append(list(hit[0]) if hit[0] else [np.nan] * 3)
P = np.array(P); np.save(out, P); print('landmarks', np.isnan(P[:, 0]).sum(), 'misses;', 'frame', xc, zc, size)

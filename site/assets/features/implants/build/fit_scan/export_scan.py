"""Import a scan glTF, join it, keep the biggest connected piece set, save verts/faces/uv to npz (Blender Z-up, face toward -Y)."""
import sys, bpy, bmesh, numpy as np
path, out = sys.argv[1], sys.argv[2]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=path)
obs = [o for o in bpy.context.scene.objects if o.type == 'MESH']
V, Fc, UV, M = [], [], [], []; off = 0; mats = []
for o in obs:
    me = o.data; mw = o.matrix_world
    v = np.array([mw @ x.co for x in me.vertices]); V.append(v)
    uvl = me.uv_layers.active.data if me.uv_layers else None
    for p in me.polygons:
        vs = list(p.vertices); ls = list(p.loop_indices)
        for k in range(1, len(vs) - 1):
            Fc.append([off + vs[0], off + vs[k], off + vs[k + 1]])
            UV.append([uvl[ls[j]].uv[:] for j in (0, k, k + 1)] if uvl else [(0, 0)] * 3)
            M.append(None)
        mat = o.material_slots[p.material_index].material if o.material_slots else None
        img = None
        if mat and mat.use_nodes:
            for n in mat.node_tree.nodes:
                if n.type == 'TEX_IMAGE' and n.image: img = bpy.path.abspath(n.image.filepath); break
        if img not in mats: mats.append(img)
        for k in range(len(vs) - 2): M[-1 - k] = mats.index(img)
    off += len(v)
V = np.concatenate(V); Fc = np.array(Fc); UV = np.array(UV, np.float32); M = np.array(M)
np.savez_compressed(out, V=V, F=Fc, UV=UV, M=M, mats=np.array([m or '' for m in mats]))
print('verts', len(V), 'tris', len(Fc), 'materials', mats)

# Wrapping the face mesh onto a scan

These scripts made `../male_head_fit.npz`, the male head wrapped onto "Male Head Sculpt" by lKutts
(https://sketchfab.com/3d-models/male-head-sculpt-deb721f8d38e4b00b17abadd5ace9cc1, CC BY 4.0).

1. Download the model from Sketchfab as glTF and unzip it.
2. `python3 export_scan.py scene.gltf scan.npz` (Blender's Python module, `pip install bpy`). Weld the vertices if the export splits them.
3. Dump the cleaned face mesh: `MH_DATA=... PART=face FACE_DUMP=face-clean.npz python3 ../build_implants.py /tmp/out`,
   then save its male shape in Blender axes as `mh-male.npz` (V = x, -z, y of `Pm`; F = `T`).
4. `python3 lm3d.py mh-male.npz lm-male-mh.npy x <eye height> <frame>` and the same for the scan.
   This renders the front, finds the 478 MediaPipe face points (`mp2d.py`, run with Python 3.11 and mediapipe 0.10.14)
   and casts them back onto the mesh.
5. `python3 fitscan.py male`: a similarity transform on the point pairs, a thin-plate warp of what is left over,
   then every vertex pulled onto the nearest scan surface with the pull smoothed over the mesh.
6. Undo the similarity transform, swap the axes back (x, z, -y) and save `P` to `../male_head_fit.npz`.

The scripts use hard-coded working paths from the session that made them; adjust them before running.

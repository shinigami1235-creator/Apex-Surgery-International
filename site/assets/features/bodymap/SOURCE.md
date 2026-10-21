# Body Map data sources

## Bodies: `bodies.bin`

Both bodies are built from the MakeHuman hm08 base mesh and its targets. The assets are CC0 1.0 (public domain dedication, September 2020).

- Repository: https://github.com/makehumancommunity/makehuman
- Commit: `a8bc2d54ff0ac92e78ff71431b1023eda42bf482` (26 June 2024)
- Files used:
  - `makehuman/data/3dobjs/base.obj` (base mesh)
  - `makehuman/data/targets/macrodetails/{african,asian,caucasian}-{female,male}-young.target`
  - `makehuman/data/targets/macrodetails/proportions/*-young-averagemuscle-averageweight-idealproportions.target`
  - `makehuman/data/targets/macrodetails/universal-female-young-averagemuscle-minweight.target`
  - `makehuman/data/targets/macrodetails/universal-male-young-maxmuscle-averageweight.target`
  - `makehuman/data/targets/{head,chin,forehead,eyebrows,nose,mouth,cheek,neck}/*.target` (face shape, listed in `build/morphs.py`)
  - `makehuman/data/rigs/default_weights.mhw` (vertex group weights, used for region labels)
- Licence text: `LICENSE.ASSETS.md` in that repository. CC0 needs no attribution, and this note records the source anyway.

The look matches the Face Atlas on the group's main site (`_ref/atlas.js`): a point at every vertex, three more along every edge, faint additive lines, and the active area in white.

### Build

`build/build_bodies.py` (with `mhload.py`, `morphs.py` and `meshlib.py`) writes `bodies.bin`. It is deterministic, so a rerun gives identical bytes.

```
MH_DATA=<makehuman checkout>/makehuman/data python3 build/build_bodies.py .
```

Steps:

1. Morph the base mesh with the targets in `build/morphs.py`. Ethnic mix 0.5 Asian, 0.3 Caucasian, 0.2 African. Ideal proportions at 0.6. Female at slight min weight (0.15), male at slight max muscle (0.3). Face targets give the female an oval head, tapered jaw, V-line chin, smooth forehead and refined nose, and the male a defined jaw angle, stronger chin and brow ridge and a slightly wider neck.
2. Keep only the `body` face group, split into triangles. Eyeballs, eyelashes, teeth, tongue, hair, genital, tights and skirt helpers and the joint helper cubes are dropped.
3. Label each triangle with a region. The dominant rig bone from `default_weights.mhw` gives head, neck, upper arm, thigh and lower leg. Geometric rules on the neutral mesh, using the joint helper positions, split the torso into breast, abdomen, waist and back, and hips and buttocks. Each vertex takes the region most of its triangles have.
4. Drop head triangles that no direction can see (the inside of the mouth).
5. Decimate by half-edge collapse: the shortest edge, measured against a local target length, goes first, into whichever end keeps the new edges shortest. Face front is densest, then the head, neck and body, with hands and feet sparsest. Then flip edges toward Delaunay triangles.
6. Every kept vertex is a vertex of the base mesh, so one topology serves both bodies and the switch morphs vertex to vertex.

Result: 3,258 vertices, 9,764 edges, 6,505 triangles.

### Region ids

| id | region |
|---|---|
| 0 | other |
| 1 | head |
| 2 | neck |
| 3 | breast (shown as 0 on the male body) |
| 4 | abdomen |
| 5 | upper arms |
| 6 | waist and back |
| 7 | hips and buttocks |
| 8 | thighs |
| 9 | calves |

### Binary layout (little endian)

| offset | type | content |
|---|---|---|
| 0 | Uint32 ×2 | N vertices, E edges |
| 8 | Float32 ×18 | cx, cy, cz, s; female eyeX, eyeY, eyeZ, chinY, crownY, faceFrontZ, faceHalfWidth; male the same seven |
| 80 | Int16 ×3N | female position; value = q / 32767 × s + c |
| 80 + 6N | Int16 ×3N | male position |
| 80 + 12N | Uint16 ×2E | edges (vertex index pairs) |
| 80 + 12N + 4E | Uint8 ×2N | female normal, octahedral |
| 80 + 14N + 4E | Uint8 ×2N | male normal, octahedral |
| 80 + 16N + 4E | Uint8 ×N | region id |

Units are MakeHuman decimetres. The figure faces +Z with Y up. The file is 94,522 bytes.

## Face-zoom head: `heads.bin`

Built by `build/build_heads.py` from the same mesh and the same morphs as the bodies, in the same units, so the head sits on the body's neck with no transform. Deterministic.

```
MH_DATA=<makehuman checkout>/makehuman/data python3 build/build_heads.py .
```

Steps:

1. Cut the head and neck from the `body` group with the bone rule the body build uses for its head and neck regions, plus the front of both eyeballs.
2. One Catmull-Clark step, as a sparse operator shared by female, male and the rig weights.
3. Keep a triangle when it is visible from at least one of 42 directions. This drops the inside of the mouth, nostrils and ear canals.
4. Close the mouth: every vertex on the lower lip's inner edge is welded to the nearest vertex on the upper lip's inner edge, so the lips meet in one seam.
5. Decimate the same way as the bodies to 2,999 vertices. Density follows the front of the face, with extra density around the eyes, nose and mouth and less on the crown and back of the head. Then flip edges toward Delaunay triangles.
6. Label face areas from rig weights and landmarks on the neutral mesh, and bake light occlusion per vertex (the share of directions that see it).

Result: 2,999 vertices, 8,884 edges. Both genders share the topology, so the switch morphs vertex to vertex in the face view too.

| area id | area |
|---|---|
| 0 | face and neck |
| 1 | forehead and brows |
| 2 | eyes |
| 3 | nose |
| 4 | chin and jaw |
| 15 | not tappable (lips, ears, scalp) |

Kinds: 0 skin, 1 lips, 2 eyeball, 3 ear, 4 scalp, 5 upper lid margin, 6 lower lid margin, 7 lip seam. The shader dims lip and seam points and lines so the closed mouth reads as one faint seam, dims the eyeballs and ears, and lifts the upper lid line.

### Binary layout (little endian)

| offset | type | content |
|---|---|---|
| 0 | Uint32 ×2 | N vertices, E edges |
| 8 | Float32 ×6 | cx, cy, cz, s, cutF, cutM |
| 32 | Int16 ×3N | female position; value = q / 32767 × s + c |
| 32 + 6N | Int16 ×3N | male position |
| 32 + 12N | Uint16 ×2E | edges |
| 32 + 12N + 4E | Uint8 ×2N | female normal, octahedral |
| 32 + 14N + 4E | Uint8 ×2N | male normal, octahedral |
| 32 + 16N + 4E | Uint8 ×N | area id (low 4 bits), kind (high 4 bits) |
| 32 + 17N + 4E | Uint8 ×N | light occlusion, 0 enclosed to 255 open |

`cutF` and `cutM` are the heights where the head fades into the body's neck in the face view. The file is 89,550 bytes.

Together the two files are 184,072 bytes. They replace `female.bin`, `male.bin` (128,052 bytes each) and the MediaPipe face mask `facemesh.js` (18,733 bytes), none of which are used any more.

## three.js

The module loads `three@0.160.0` from cdn.jsdelivr.net at runtime (MIT). `site/lab/vendor/three.module.js` is a local copy for offline testing only. The lab page maps to it when served from localhost, and it is not needed in production.

# Body Map data sources

## Bodies: `female.bin`, `male.bin`

Both bodies are built from the MakeHuman hm08 base mesh and macro targets. The assets are CC0 1.0 (public domain dedication, September 2020).

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

### Build

`build/build_bodies.py` (with `build/mhload.py`) produces both files. It is deterministic (seed 7), so a rerun gives identical bytes.

```
MH_DATA=<makehuman checkout>/makehuman/data python3 build/build_bodies.py .
```

Steps:

1. Morph the base mesh with the targets in `build/morphs.py`. Ethnic mix 0.5 Asian, 0.3 Caucasian, 0.2 African. Ideal proportions at 0.6. Female at slight min weight (0.15), male at slight max muscle (0.3). Face targets give the female an oval head, tapered jaw, V-line chin, smooth forehead and refined nose, and the male a defined jaw angle, stronger chin and brow ridge and a slightly wider neck.
2. Keep only the `body` face group. Eyeballs, eyelashes, teeth, tongue, hair, genital, tights and skirt helpers and the joint helper cubes are dropped.
3. Label each triangle with a region. The dominant rig bone from `default_weights.mhw` gives head, neck, upper arm, thigh and lower leg. Geometric rules on the neutral mesh, using the joint helper positions, split the torso into breast, abdomen, waist and back, and hips and buttocks.
4. Sample 12,800 points per body, area weighted. Face front ×3.6, rest of head ×2.2, neck ×1.4, forearms ×0.85, feet ×0.45, hands ×0.32.
5. Both bodies use the same triangle and barycentric sample for point *i*, so the male and female switch morphs point to point.
6. Quantise and write.

### Region ids

| id | region |
|---|---|
| 0 | other |
| 1 | head |
| 2 | neck |
| 3 | breast (female file only; 0 in the male file) |
| 4 | abdomen |
| 5 | upper arms |
| 6 | waist and back |
| 7 | hips and buttocks |
| 8 | thighs |
| 9 | calves |

### Binary layout (little endian)

| offset | type | content |
|---|---|---|
| 0 | Uint32 | N (12,800) |
| 4 | Float32 ×12 | cx, cy, cz, s, eyeX, eyeY, eyeZ, chinY, crownY, faceFrontZ, faceHalfWidth, reserved |
| 52 | Int16 ×3N | position; value = q / 32767 × s + c |
| 52 + 6N | Int8 ×3N | normal × 127 |
| 52 + 9N | Uint8 ×N | region id |

Units are MakeHuman decimetres. The figure faces +Z with Y up. Each file is 128,052 bytes.

## Face-zoom head: `heads.bin`

Built by `build/build_heads.py` from the same mesh and the same morphs as the bodies, in the same units, so the head sits on the body's neck with no transform. Deterministic (seed 11).

```
MH_DATA=<makehuman checkout>/makehuman/data python3 build/build_heads.py .
```

Steps:

1. Cut the head and neck from the `body` group with the bone rule the body build uses for its head and neck regions, plus the front of both eyeballs.
2. Catmull-Clark subdivide twice (as a sparse operator, so female, male and the rig weights share it).
3. Sample area weighted, five times the target count. Density is continuous: front of the face 4.2, sides 1.7, crown and back of the head about 0.5, ears 0.35.
4. Keep a sample when it is visible from at least one of 42 directions. This drops the inside of the mouth, nostrils and ear canals. The share of directions that see a sample is stored as its light occlusion.
5. Thin to 16,000 points by weighted sample elimination (Yuksel 2015), which spaces them evenly.
6. Label face areas from rig weights and landmarks on the neutral mesh.

Both genders use the same sample for point *i*, so the switch morphs point to point in the face view too.

| area id | area |
|---|---|
| 0 | face and neck |
| 1 | forehead and brows |
| 2 | eyes |
| 3 | nose |
| 4 | chin and jaw |
| 15 | not tappable (lips, ears, scalp) |

Kinds: 0 skin, 1 lips, 2 eyeball, 3 ear, 4 scalp, 5 upper lid margin, 6 lower lid margin. The shader uses them to keep the lips calm (no rim glow, one even tone), dim the eyeballs and ears, and lift the upper lid line slightly.

### Binary layout (little endian)

| offset | type | content |
|---|---|---|
| 0 | Uint32 | N (16,000) |
| 4 | Float32 ×8 | cx, cy, cz, sx, sy, sz, cutF, cutM |
| 36 | Uint32 ×N | female position, 11/11/10 bits; value = (q / qmax × 2 − 1) × s + c per axis |
| 36 + 4N | Uint32 ×N | male position, same packing |
| 36 + 8N | Uint8 ×2N | female normal, octahedral |
| 36 + 10N | Uint8 ×2N | male normal, octahedral |
| 36 + 12N | Uint8 ×N | area id (low 4 bits), kind (high 4 bits) |
| 36 + 13N | Uint8 ×N | light occlusion, 0 enclosed to 255 open |

`cutF` and `cutM` are the heights where the head fades into the body's neck in the face view. The file is 224,036 bytes. It replaces the MediaPipe face mask (`facemesh.js`, 18,733 bytes), which is no longer used.

## three.js

The module loads `three@0.160.0` from cdn.jsdelivr.net at runtime (MIT). `site/lab/vendor/three.module.js` is a local copy for offline testing only. The lab page maps to it when served from localhost, and it is not needed in production.

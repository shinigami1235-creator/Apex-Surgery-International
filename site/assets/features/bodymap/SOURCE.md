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
  - `makehuman/data/rigs/default_weights.mhw` (vertex group weights, used for region labels)
- Licence text: `LICENSE.ASSETS.md` in that repository. CC0 needs no attribution, and this note records the source anyway.

### Build

`build/build_bodies.py` (with `build/mhload.py`) produces both files. It is deterministic (seed 7), so a rerun gives identical bytes.

```
MH_DATA=<makehuman checkout>/makehuman/data python3 build/build_bodies.py .
```

Steps:

1. Morph the base mesh. Ethnic mix 0.5 Asian, 0.3 Caucasian, 0.2 African. Ideal proportions at 0.6. Female at slight min weight (0.15), male at slight max muscle (0.3).
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

## Face: `facemesh.js`

This is a copy of `_ref/facemesh.js` from the group's main site: the MediaPipe canonical face mesh (468 vertices with the edge list), tagged with the Face Atlas regions. It is loaded only when the visitor opens the face view. MediaPipe is licensed Apache 2.0.

## three.js

The module loads `three@0.160.0` from cdn.jsdelivr.net at runtime (MIT). `site/lab/vendor/three.module.js` is a local copy for offline testing only. The lab page maps to it when served from localhost, and it is not needed in production.

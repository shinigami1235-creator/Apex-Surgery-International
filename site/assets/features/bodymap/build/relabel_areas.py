"""Relabel two face areas in heads.bin after build_heads.py has written it.

Usage: python3 relabel_areas.py heads.bin heads.bin

  Eyes (area 2): an almond from the inner corner to a slightly higher outer corner,
    covering the upper lid up to the crease and the lower lid just under the lash line.
  Neck (area 5): face-and-neck skin below the jawline, split from the face area.
Both are measured on the female positions. The male shares the labels.
"""
import numpy as np, struct, sys
def load(path):
    b = open(path,'rb').read()
    n, ne = struct.unpack_from('<II', b, 0); h = struct.unpack_from('<6f', b, 8)
    c = np.array(h[:3]); s = h[3]
    o = 32
    pf = np.frombuffer(b, '<i2', 3*n, o).reshape(n,3)/32767*s + c; o += 6*n
    pm = np.frombuffer(b, '<i2', 3*n, o).reshape(n,3)/32767*s + c; o += 6*n
    E = np.frombuffer(b, '<u2', 2*ne, o).reshape(ne,2); o += 4*ne
    o_area = o + 4*n
    ak = np.frombuffer(b, np.uint8, n, o_area).copy()
    return dict(b=b, n=n, ne=ne, pf=pf, pm=pm, E=E, o_area=o_area, area=ak & 15, kind=ak >> 4)

src, dst = sys.argv[1], sys.argv[2]
H = load(src); P = H['pf']; area = H['area'].copy(); kind = H['kind']
x, y, z = P[:, 0], P[:, 1], P[:, 2]; sx = np.abs(x)
eyeY = P[kind == 2][:, 1].mean()
# ---- eyes: an almond from the inner corner to a slightly higher outer corner ----
xi, xo = .150, .450
u = np.clip((sx - xi) / (xo - xi), 0, 1) * 2 - 1            # -1 inner corner, 1 outer corner
inside_x = (sx > xi) & (sx < xo)
w = np.clip(1 - u ** 2, 0, 1)
yc = eyeY - .02 + (u + 1) / 2 * .05                          # outer corner sits higher
up = yc + .115 * w ** .6                                     # upper lid up to the crease
lo = yc - .075 * w ** .8                                     # lower lid just under the lash line
almond = inside_x & (y < up) & (y > lo) & (z > .95)
editable = np.isin(area, [0, 1, 2]) & np.isin(kind, [0, 2, 5, 6])
old_eye = (area == 2) & editable
area[old_eye] = np.where(y[old_eye] > eyeY + .12, 1, 0)
area[editable & (almond | np.isin(kind, [2, 5, 6]))] = 2
# ---- neck: face-and-neck skin below the jawline becomes its own area ----
jaw = np.where(area == 4)[0]
neck = np.zeros(len(P), bool)
for i in np.where(area == 0)[0]:
    near = jaw[(np.abs(z[jaw] - z[i]) < .16) & (np.abs(sx[jaw] - sx[i]) < .16)]
    if not len(near): near = jaw[np.abs(z[jaw] - z[i]) < .12]
    L = y[near].min() if len(near) else 5.72
    if z[i] < .25: L = min(L, 5.72)
    neck[i] = y[i] < L - .02
neck |= (area == 0) & (y < 5.5)
area[neck] = 5
print('eyeY', round(eyeY, 3), 'areas', np.bincount(area, minlength=16)[:6].tolist())
b = bytearray(H['b']); o = H['o_area']
b[o:o + H['n']] = (area | (kind << 4)).astype(np.uint8).tobytes()
open(dst, 'wb').write(bytes(b))

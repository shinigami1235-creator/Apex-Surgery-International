"""Pulls the male face back toward the ears in bodies.bin and heads.bin, so the forehead, nose and chin do not
sit so far in front of the skull.

Run once, after flatten_male_crown.py, from the bodymap folder:
    python3 build/recede_male_face.py .

Measured from the ear, the male eyes sat 1.27 dm forward and the chin 1.38 dm, against 0.90 and 0.88 for the
female, while the back of the head was close to hers. Everything in front of the ear is pulled back by an amount
that grows with the distance from the ear, so the sides of the head do not move and the nose and chin move the
most. It fades out below the chin, so the neck and body stay where they are. Both files share units and
coordinates, so the same change goes into both. Normals are corrected. The female shapes are not touched."""
import struct, sys, os
import numpy as np
from flatten_male_crown import i16_read, i16_write, octa_read, octa_write

K = .74      # how much of the far front is kept
W = .30      # how gradually the pull starts in front of the ear, decimetres
FADE = .50   # the pull fades out over this height below the chin, decimetres


def smooth(a, b, y):
    t = np.clip((y - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t), np.where((t > 0) & (t < 1), 6 * t * (1 - t) / (b - a), 0)


def recede(P, N, zE, chin):
    d = np.maximum(0, P[:, 2] - zE)
    g = d * d / (d + W)
    w, dw = smooth(chin - FADE, chin, P[:, 1])
    P = P.copy(); P[:, 2] -= w * (1 - K) * g
    b = 1 - w * (1 - K) * (d * d + 2 * d * W) / (d + W) ** 2    # dz'/dz
    a = -dw * (1 - K) * g                                         # dz'/dy
    N = N.copy(); N[:, 1] -= a * N[:, 2] / b; N[:, 2] /= b
    N /= np.linalg.norm(N, axis=1, keepdims=True)
    return P, N


def zmove(z, y, zE, chin):
    d = max(0, z - zE); w, _ = smooth(chin - FADE, chin, np.array([y]))
    return z - float(w[0]) * (1 - K) * d * d / (d + W)


def main(d):
    # heads.bin gives the ear plane: the mean depth of the male ear vertices
    ph = os.path.join(d, 'heads.bin'); bh = bytearray(open(ph, 'rb').read())
    n, ne = struct.unpack_from('<II', bh, 0); hh = list(struct.unpack_from('<6f', bh, 8))
    o = 32 + n * 12 + ne * 4
    kind = np.frombuffer(bh, dtype=np.uint8, count=n, offset=o + n * 4) >> 4
    PM = i16_read(bh, 32 + n * 6, n, hh)
    zE = float(PM[kind == 3, 2].mean())
    # bodies.bin gives the chin height
    pb = os.path.join(d, 'bodies.bin'); bb = bytearray(open(pb, 'rb').read())
    nb, neb = struct.unpack_from('<II', bb, 0); h = list(struct.unpack_from('<18f', bb, 8))
    chin = h[14]
    P, N = recede(PM, octa_read(bh, o + n * 2, n), zE, chin)
    i16_write(bh, 32 + n * 6, P, hh); octa_write(bh, o + n * 2, N)
    open(ph, 'wb').write(bh)
    nOff = 80 + nb * 12 + neb * 4
    P, N = recede(i16_read(bb, 80 + nb * 6, nb, h), octa_read(bb, nOff + nb * 2, nb), zE, chin)
    i16_write(bb, 80 + nb * 6, P, h); octa_write(bb, nOff + nb * 2, N)
    h[13] = zmove(h[13], h[12], zE, chin)   # male eye depth
    h[16] = zmove(h[16], h[12], zE, chin)   # male face front
    struct.pack_into('<18f', bb, 8, *h)
    open(pb, 'wb').write(bb)
    print('male face pulled back in front of z =', round(zE, 3), 'above y =', round(chin - FADE, 3))


if __name__ == '__main__':
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    main(sys.argv[1] if len(sys.argv) > 1 else '.')

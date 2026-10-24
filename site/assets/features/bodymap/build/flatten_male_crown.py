"""Lowers the crown of the male head in bodies.bin and heads.bin, so the head reads rounder and less like an oval.

Run once, after build_bodies.py and build_heads.py, from the bodymap folder:
    python3 build/flatten_male_crown.py .

Above a line just over the brows, the male head is pulled down by an amount that grows with height, so the top of
the scalp comes down about 1 cm and the forehead and face do not move. Both files use the same units and the same
coordinates, so the face-zoom head still sits on the body's neck. Normals are corrected for the squash.
The female shapes are not touched."""
import struct, sys, os
import numpy as np

K = .86      # how much of the height above the line is kept at the very top
W = .15      # how gradually the squash starts above the line, decimetres
ABOVE = .30  # the line sits this far above the eyes, decimetres


def squash(P, N, y0):
    t = np.maximum(0, P[:, 1] - y0)
    P = P.copy(); P[:, 1] -= (1 - K) * t * t / (t + W)
    s = 1 - (1 - K) * (t * t + 2 * t * W) / (t + W) ** 2    # dy'/dy
    N = N.copy(); N[:, 1] /= s
    N /= np.linalg.norm(N, axis=1, keepdims=True)
    return P, N


def i16_read(b, off, n, h):
    q = np.frombuffer(b, dtype='<i2', count=n * 3, offset=off).reshape(n, 3).astype(np.float64)
    return q / 32767 * h[3] + np.array(h[:3])


def i16_write(buf, off, P, h):
    q = np.round((P - np.array(h[:3])) / h[3] * 32767)
    assert np.abs(q).max() <= 32767, 'out of range'
    buf[off:off + P.size * 2] = q.astype('<i2').tobytes()


def octa_read(b, off, n):
    q = np.frombuffer(b, dtype=np.uint8, count=n * 2, offset=off).reshape(n, 2) / 255 * 2 - 1
    x, y = q[:, 0].copy(), q[:, 1].copy()
    z = 1 - np.abs(x) - np.abs(y)
    neg = z < 0
    ox = x.copy()
    x[neg] = (1 - np.abs(y[neg])) * np.sign(np.where(ox[neg] == 0, 1, ox[neg]))
    y[neg] = (1 - np.abs(ox[neg])) * np.sign(np.where(y[neg] == 0, 1, y[neg]))
    v = np.stack([x, y, z], 1)
    return v / np.linalg.norm(v, axis=1, keepdims=True)


def octa_write(buf, off, N):
    s = np.abs(N).sum(1, keepdims=True)
    p = N / s
    x, y, z = p[:, 0].copy(), p[:, 1].copy(), p[:, 2]
    neg = z < 0
    ox = x.copy()
    x[neg] = (1 - np.abs(y[neg])) * np.sign(np.where(ox[neg] == 0, 1, ox[neg]))
    y[neg] = (1 - np.abs(ox[neg])) * np.sign(np.where(y[neg] == 0, 1, y[neg]))
    q = np.clip(np.round((np.stack([x, y], 1) + 1) / 2 * 255), 0, 255).astype(np.uint8)
    buf[off:off + q.size] = q.tobytes()


def main(d):
    # bodies.bin: the male eye height gives the line; the male crown height in the header comes down too
    p = os.path.join(d, 'bodies.bin'); b = bytearray(open(p, 'rb').read())
    n, ne = struct.unpack_from('<II', b, 0); h = list(struct.unpack_from('<18f', b, 8))
    y0 = h[12] + ABOVE
    nOff = 80 + n * 12 + ne * 4
    P, N = squash(i16_read(b, 80 + n * 6, n, h), octa_read(b, nOff + n * 2, n), y0)
    i16_write(b, 80 + n * 6, P, h); octa_write(b, nOff + n * 2, N)
    t = max(0, h[15] - y0); h[15] -= (1 - K) * t * t / (t + W)
    struct.pack_into('<18f', b, 8, *h)
    open(p, 'wb').write(b)
    # heads.bin: the same line, since both files share units and coordinates
    p = os.path.join(d, 'heads.bin'); b = bytearray(open(p, 'rb').read())
    n, ne = struct.unpack_from('<II', b, 0); hh = list(struct.unpack_from('<6f', b, 8))
    o = 32 + n * 12 + ne * 4
    P, N = squash(i16_read(b, 32 + n * 6, n, hh), octa_read(b, o + n * 2, n), y0)
    i16_write(b, 32 + n * 6, P, hh); octa_write(b, o + n * 2, N)
    open(p, 'wb').write(b)
    print('male crown lowered above y =', round(y0, 3))


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else '.')

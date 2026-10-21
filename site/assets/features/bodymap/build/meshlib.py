"""Mesh tools for the Body Map builds: Catmull-Clark as a sparse operator, point z-buffer
visibility, even decimation by half-edge collapse, Delaunay edge flips, and packing.

Every vertex the decimator keeps is a vertex of the input mesh, so one decimated topology
serves the neutral, female and male shapes alike and the gender switch morphs vertex to vertex.
"""
import heapq, math, numpy as np
import scipy.sparse as sp

unit = lambda x: x / (np.linalg.norm(x, axis=-1, keepdims=True) + 1e-12)

# ---------------- subdivision ----------------
def cc_operator(Q, nv):
    """One Catmull-Clark step on a quad mesh with boundaries, as a sparse matrix S
    (new vertices = S @ old vertices) plus the new quads."""
    nf = len(Q)
    e = np.stack([Q, np.roll(Q, -1, 1)], 2).reshape(-1, 2)
    uk, einv, ecount = np.unique(np.sort(e, 1), axis=0, return_inverse=True, return_counts=True)
    einv = einv.ravel(); ne = len(uk)
    eface = np.repeat(np.arange(nf), 4)
    bnd = ecount == 1
    rows, cols, vals = [], [], []
    def add(r, c, v):
        r = np.asarray(r).ravel(); rows.append(r); cols.append(np.asarray(c).ravel()); vals.append(np.broadcast_to(np.asarray(v, float), r.shape).ravel())
    fbase = nv + ne
    for k in range(4): add(fbase + np.arange(nf), Q[:, k], .25)
    ia, ib = uk[:, 0], uk[:, 1]
    eb = np.where(bnd)[0]; ei = np.where(~bnd)[0]
    add(nv + eb, ia[eb], .5); add(nv + eb, ib[eb], .5)
    add(nv + ei, ia[ei], .25); add(nv + ei, ib[ei], .25)
    m = ~bnd[einv]
    for k in range(4): add(nv + einv[m], Q[eface[m], k], 1 / 16)
    vb = np.zeros(nv, bool); vb[ia[eb]] = True; vb[ib[eb]] = True
    val = np.bincount(np.concatenate([ia, ib]), minlength=nv).astype(float)
    fv = Q.ravel(); ff = np.repeat(np.arange(nf), 4)
    nfv = np.bincount(fv, minlength=nv).astype(float)
    mm = ~vb[fv]
    for k in range(4): add(fv[mm], Q[ff[mm], k], .25 / nfv[fv[mm]] / val[fv[mm]])
    for a_, b_ in ((ia, ib), (ib, ia)):
        mm = ~vb[a_]
        add(a_[mm], a_[mm], 1 / val[a_[mm]] / val[a_[mm]])
        add(a_[mm], b_[mm], 1 / val[a_[mm]] / val[a_[mm]])
    vi = np.where(~vb)[0]
    add(vi, vi, (val[vi] - 3) / val[vi])
    vbi = np.where(vb)[0]
    add(vbi, vbi, .75)
    for a_, b_ in ((ia, ib), (ib, ia)):
        mm = bnd & vb[a_]
        add(a_[mm], b_[mm], .125)
    S = sp.csr_matrix((np.concatenate(vals), (np.concatenate(rows), np.concatenate(cols))), shape=(fbase + nf, nv))
    eidx = nv + einv.reshape(nf, 4); fidx = fbase + np.arange(nf)
    NQ = np.concatenate([np.stack([Q[:, k], eidx[:, k], fidx, eidx[:, (k - 1) % 4]], 1) for k in range(4)])
    return S, NQ

def quads_to_tris(Q):
    """Split every quad along the same diagonal, so the topology is identical for every morph."""
    return np.concatenate([Q[:, [0, 1, 2]], Q[:, [0, 2, 3]]])

def vertex_normals(V, T):
    fn = np.cross(V[T[:, 1]] - V[T[:, 0]], V[T[:, 2]] - V[T[:, 0]])
    N = np.zeros_like(V)
    for k in range(3): np.add.at(N, T[:, k], fn)
    return unit(N)

# ---------------- visibility ----------------
def fib_dirs(n):
    i = np.arange(n) + .5
    phi = np.arccos(1 - 2 * i / n); th = np.pi * (1 + 5 ** .5) * i
    return np.stack([np.cos(th) * np.sin(phi), np.cos(phi), np.sin(th) * np.sin(phi)], 1)

def visibility(Pt, Nt, Pz, res=360, eps=.03, ndir=42, below=-.6):
    """For points Pt with normals Nt, test visibility against a z-buffer built from the dense
    surface samples Pz, from ndir directions. Returns (visible from any, share of the normal's
    hemisphere that sees the point)."""
    vis = np.zeros(len(Pt), bool); seen = np.zeros(len(Pt)); tot = np.zeros(len(Pt))
    c = (Pz.max(0) + Pz.min(0)) / 2; R = np.abs(Pz - c).max() * 1.05
    for d in fib_dirs(ndir):
        if d[1] < below: continue              # a neck cut is open underneath
        up = np.array([0, 1, 0.]) if abs(d[1]) < .9 else np.array([1, 0, 0.])
        ax = unit(np.cross(up, d)); ay = np.cross(d, ax)
        def proj(X):
            X = X - c
            ix = np.clip(np.round(((X @ ax) / R * .5 + .5) * (res - 1)).astype(int), 0, res - 1)
            iy = np.clip(np.round(((X @ ay) / R * .5 + .5) * (res - 1)).astype(int), 0, res - 1)
            return ix, iy, X @ d
        zx, zy, zd = proj(Pz)
        zb = np.full((res, res), -1e9)
        for ox in (-1, 0, 1):
            for oy in (-1, 0, 1):
                np.maximum.at(zb, (np.clip(zy + oy, 0, res - 1), np.clip(zx + ox, 0, res - 1)), zd)
        ix, iy, dz = proj(Pt)
        nd = Nt @ d
        hit = (nd > -.05) & (dz >= zb[iy, ix] - eps)
        vis |= hit
        cw = np.clip(nd, 0, None); tot += cw; seen += cw * hit
    return vis, seen / np.maximum(tot, 1e-6)

def surface_samples(V, T, n, rng):
    a, b, c = V[T[:, 0]], V[T[:, 1]], V[T[:, 2]]
    area = np.linalg.norm(np.cross(b - a, c - a), axis=1) * .5
    cdf = np.cumsum(area); cdf /= cdf[-1]
    k = np.searchsorted(cdf, rng.random(n))
    r1 = np.sqrt(rng.random(n)); r2 = rng.random(n)
    return a[k] * (1 - r1)[:, None] + b[k] * (r1 * (1 - r2))[:, None] + c[k] * (r1 * r2)[:, None]

def compact(T, *per_vertex):
    """Drop vertices no triangle uses. Returns new T, kept old indices, and the arrays reindexed."""
    used = np.unique(T)
    remap = -np.ones(T.max() + 1, int); remap[used] = np.arange(len(used))
    return (remap[T], used) + tuple(a[used] for a in per_vertex)

# ---------------- decimation ----------------
def decimate(shapes, T, target, scale, max_stretch=1.9):
    """Even decimation by half-edge collapse.

    shapes: list of (nv, 3) arrays; shapes[0] is the metric, every shape is checked for flips.
    scale:  per-vertex target edge length factor (smaller keeps the area denser).
    The shortest edge (length / local scale) is collapsed first, into whichever end keeps the
    new edges shortest, so the result is close to evenly spaced at the local scale.
    """
    P0 = shapes[0]
    nv = len(P0)
    F = [list(t) for t in T.tolist()]
    falive = [True] * len(F)
    vf = [set() for _ in range(nv)]
    for i, (a, b, c) in enumerate(F):
        vf[a].add(i); vf[b].add(i); vf[c].add(i)
    valive = np.array([len(s) > 0 for s in vf])
    stamp = [0] * nv
    P0l = P0.tolist(); sc = scale.tolist()

    def nbrs(u):
        s = set()
        for f in vf[u]: s.update(F[f])
        s.discard(u); return s
    def edge_faces(u, v): return [f for f in vf[u] if v in F[f]]
    def is_bnd_vert(u):
        cnt = {}
        for f in vf[u]:
            for w in F[f]:
                if w != u: cnt[w] = cnt.get(w, 0) + 1
        return any(c == 1 for c in cnt.values())
    def dist(u, v):
        a, b = P0l[u], P0l[v]
        return math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2)
    def cost(u, v): return dist(u, v) / ((sc[u] + sc[v]) * .5)
    def tri_n(P, a, b, c):
        p, q, r = P[a], P[b], P[c]
        return np.cross(q - p, r - p)

    def try_collapse(u, v):
        """Validity and resulting stretch of removing u into v, or None."""
        sh = edge_faces(u, v)
        if not sh: return None
        nu, nvv = nbrs(u), nbrs(v)
        opp = set()
        for f in sh: opp.update(w for w in F[f] if w != u and w != v)
        if (nu & nvv) != opp: return None                       # link condition
        if is_bnd_vert(u) and len(sh) != 1: return None          # boundary vertices slide along the boundary only
        stretch = 0.
        for w in nu:
            if w != v: stretch = max(stretch, dist(v, w) / ((sc[v] + sc[w]) * .5))
        for f in vf[u]:
            if f in sh: continue
            a, b, c = F[f]
            na = [v if x == u else x for x in (a, b, c)]
            for P in shapes:
                n0 = tri_n(P, a, b, c); n1 = tri_n(P, *na)
                l0 = np.linalg.norm(n0); l1 = np.linalg.norm(n1)
                if l1 < 1e-9 or np.dot(n0, n1) / (l0 * l1 + 1e-12) < .35: return None
        return stretch

    heap = []
    def push(u, v):
        if u > v: u, v = v, u
        heapq.heappush(heap, (cost(u, v), u, v, stamp[u], stamp[v]))
    seen = set()
    for f in F:
        for k in range(3):
            a, b = f[k], f[(k + 1) % 3]
            key = (min(a, b), max(a, b))
            if key not in seen: seen.add(key); push(*key)
    alive = int(valive.sum())
    limit = max_stretch
    while alive > target and heap:
        c0, u, v, su, sv = heapq.heappop(heap)
        if not (valive[u] and valive[v]) or su != stamp[u] or sv != stamp[v]: continue
        best = None
        for a, b in ((u, v), (v, u)):
            s = try_collapse(a, b)
            if s is not None and s <= limit and (best is None or s < best[0]): best = (s, a, b)
        if best is None: continue
        _, rm, keep = best
        for f in list(vf[rm]):
            if keep in F[f]:
                falive[f] = False
                for w in F[f]: vf[w].discard(f)
            else:
                F[f] = [keep if x == rm else x for x in F[f]]
                vf[keep].add(f)
        vf[rm] = set(); valive[rm] = False; alive -= 1
        for w in nbrs(keep) | {keep}: stamp[w] += 1
        for w in nbrs(keep):
            push(keep, w)
            for x in nbrs(w): push(w, x)
        if not heap and alive > target and limit < 4:
            limit *= 1.25
            seen = set()
            for i, f in enumerate(F):
                if falive[i]:
                    for k in range(3): push(f[k], f[(k + 1) % 3])
    T2 = np.array([F[i] for i in range(len(F)) if falive[i]])
    return T2

def delaunay_flips(shapes, T, passes=4):
    """Flip interior edges whose opposite angles sum past 180 degrees (on shapes[0]),
    when every shape keeps its triangles facing the same way."""
    P0 = shapes[0]
    T = [list(t) for t in T.tolist()]
    def ang(p, a, b):
        u = a - p; w = b - p
        return math.acos(max(-1, min(1, np.dot(u, w) / (np.linalg.norm(u) * np.linalg.norm(w) + 1e-12))))
    for _ in range(passes):
        emap = {}
        for i, t in enumerate(T):
            for k in range(3):
                a, b = t[k], t[(k + 1) % 3]
                emap.setdefault((min(a, b), max(a, b)), []).append(i)
        edges = set(emap)
        flips = 0; touched = set()
        for (a, b), fs in emap.items():
            if len(fs) != 2 or fs[0] in touched or fs[1] in touched: continue
            t1, t2 = T[fs[0]], T[fs[1]]
            c = [x for x in t1 if x != a and x != b][0]; d = [x for x in t2 if x != a and x != b][0]
            if (min(c, d), max(c, d)) in edges: continue
            if ang(P0[c], P0[a], P0[b]) + ang(P0[d], P0[a], P0[b]) <= math.pi + 1e-3: continue
            # keep orientation: t1 has a->b or b->a
            i = t1.index(a)
            if t1[(i + 1) % 3] == b: n1, n2 = [a, d, c], [d, b, c]
            else: n1, n2 = [b, d, c], [d, a, c]
            ok = True
            for P in shapes:
                o1 = np.cross(P[t1[1]] - P[t1[0]], P[t1[2]] - P[t1[0]]) + np.cross(P[t2[1]] - P[t2[0]], P[t2[2]] - P[t2[0]])
                for nt in (n1, n2):
                    nn = np.cross(P[nt[1]] - P[nt[0]], P[nt[2]] - P[nt[0]])
                    if np.dot(nn, o1) <= 0 or np.linalg.norm(nn) < 1e-9: ok = False
            if not ok: continue
            T[fs[0]], T[fs[1]] = n1, n2
            touched.update(fs); edges.add((min(c, d), max(c, d))); edges.discard((a, b))
            flips += 1
        if not flips: break
    return np.array(T)

def edges_of(T):
    e = np.concatenate([T[:, [0, 1]], T[:, [1, 2]], T[:, [2, 0]]])
    return np.unique(np.sort(e, 1), axis=0)

# ---------------- packing ----------------
def octa(Nt):
    n = Nt / np.abs(Nt).sum(1, keepdims=True)
    o = n[:, :2].copy(); neg = n[:, 2] < 0
    sx = np.where(n[neg, 0] >= 0, 1., -1.); sy = np.where(n[neg, 1] >= 0, 1., -1.)
    o[neg, 0] = (1 - np.abs(n[neg, 1])) * sx; o[neg, 1] = (1 - np.abs(n[neg, 0])) * sy
    return np.clip(np.round((o * .5 + .5) * 255), 0, 255).astype(np.uint8)

def quant(P, c, s):
    return np.round((P - c) / s * 32767).astype('<i2')

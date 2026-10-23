"""Wrap the MakeHuman head onto a scan: similarity transform on the MediaPipe landmark pairs, thin-plate warp of the
residuals, then each vertex pulled onto the nearest scan surface where the scan has one, with the pull smoothed over the
mesh so the noise of the scan does not come through. Usage: python3 fitscan.py female|male"""
import sys, numpy as np, bpy
from mathutils import Vector
from mathutils.bvhtree import BVHTree
sex = sys.argv[1]
scan = np.load(f'{sex == "female" and "head_3_scan" or "male_head_sculpt"}.npz', allow_pickle=True)
mhd = np.load(f'mh-{sex}.npz', allow_pickle=True)
A = np.load(f'lm-{sex}-mh.npy'); B = np.load(f'lm-{sex}-scan.npy')
ok = ~np.isnan(A[:, 0]) & ~np.isnan(B[:, 0]); ok[468:] = False      # iris points sit inside the eye holes on MakeHuman
A, B = A[ok], B[ok]

def umeyama(X, Y):
    mx, my = X.mean(0), Y.mean(0); Xc, Yc = X - mx, Y - my
    U, S, Vt = np.linalg.svd(Yc.T @ Xc / len(X)); D = np.eye(3)
    if np.linalg.det(U @ Vt) < 0: D[2, 2] = -1
    R = U @ D @ Vt; s = np.trace(np.diag(S) @ D) / (Xc ** 2).sum(1).mean()
    return s, R, my - s * R @ mx
s, R, t = umeyama(A, B)
V = (s * (R @ mhd['V'].T)).T + t; A2 = (s * (R @ A.T)).T + t
print('similarity scale', round(s, 4), 'landmark rms after', np.sqrt(((A2 - B) ** 2).sum(1).mean()).round(4))

# thin-plate warp of the residuals, a spread-out subset of the points, regularised
idx = np.arange(0, len(A2), 3)
_, keep = np.unique(np.round(A2[idx] / 1e-3), axis=0, return_index=True); idx = idx[np.sort(keep)]
P, D = A2[idx], (B - A2)[idx]
def tps(P, D, lam):
    r = np.linalg.norm(P[:, None] - P[None], axis=2); K = r
    n = len(P); Pm = np.hstack([np.ones((n, 1)), P])
    L = np.zeros((n + 4, n + 4)); L[:n, :n] = K - lam * np.eye(n)   # r is conditionally negative definite, so smoothing subtracts; L[:n, n:] = Pm; L[n:, :n] = Pm.T
    W = np.linalg.lstsq(L, np.vstack([D, np.zeros((4, 3))]), rcond=None)[0]
    def f(X):
        rr = np.linalg.norm(X[:, None] - P[None], axis=2)
        return rr @ W[:n] + np.hstack([np.ones((len(X), 1)), X]) @ W[n:]
    return f
scale = np.linalg.norm(B.max(0) - B.min(0))
warp = tps(P, D, .02 * scale)
V = V + warp(V); A3 = A2 + warp(A2)
V_after_warp = V.copy()
print('landmark rms after warp', np.sqrt(((A3 - B) ** 2).sum(1).mean()).round(4), 'face size', round(scale, 3))

# surface pull
SV, SF = scan['V'], scan['F']
bvh = BVHTree.FromPolygons(SV.tolist(), SF.tolist())
F = mhd['F']; n = len(V)
def normals(V):
    fn = np.cross(V[F[:, 1]] - V[F[:, 0]], V[F[:, 2]] - V[F[:, 0]]); vn = np.zeros_like(V)
    for k in range(3): np.add.at(vn, F[:, k], fn)
    return vn / (np.linalg.norm(vn, axis=1)[:, None] + 1e-12)
# neighbours for smoothing
E = np.concatenate([F[:, [0, 1]], F[:, [1, 2]], F[:, [2, 0]]]); E = np.unique(np.sort(E, 1), axis=0)
deg = np.bincount(E.ravel(), minlength=n).astype(float)
def smooth(X, it):
    for _ in range(it):
        S = np.zeros_like(X); np.add.at(S, E[:, 0], X[E[:, 1]]); np.add.at(S, E[:, 1], X[E[:, 0]])
        X = .5 * X + .5 * S / deg[:, None] if X.ndim == 2 else .5 * X + .5 * S / deg
    return X
thr = .06 * scale
for rnd, it in enumerate((40, 20, 10)):
    N = normals(V); disp = np.zeros_like(V); w = np.zeros(n)
    for i in range(n):
        co, nrm, fi, dist = bvh.find_nearest(Vector(V[i]))
        if co is None or dist > thr: continue
        d = np.array(co) - V[i]
        if np.dot(np.array(nrm), N[i]) < .3: continue      # wrong side or a stray piece
        disp[i] = d; w[i] = 1
    ws = smooth(w, it); ds = smooth(disp * w[:, None], it) / np.maximum(smooth(w, it), 1e-6)[:, None]
    V = V + ds * np.clip(ws * 1.5, 0, 1)[:, None]
    print('pass', rnd, 'hit', int(w.sum()), 'of', n, 'mean pull', np.linalg.norm(disp[w > 0], axis=1).mean().round(4))
# where the scan has nothing (the back of the female scan), carry the pull on smoothly from the parts it does cover:
# the pull is held where there were hits and relaxed everywhere else
V0w = V_after_warp
D = V - V0w; held = smooth(w, 6) > .5
for _ in range(600):
    S = np.zeros_like(D); np.add.at(S, E[:, 0], D[E[:, 1]]); np.add.at(S, E[:, 1], D[E[:, 0]])
    D = np.where(held[:, None], D, S / deg[:, None])
V = V0w + D
np.savez_compressed(f'fit-{sex}.npz', V=V, F=F, hit=w, s=s, R=R, t=t)

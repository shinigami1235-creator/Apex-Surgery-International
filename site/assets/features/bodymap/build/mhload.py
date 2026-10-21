import numpy as np, os, re
import os
D = os.environ.get('MH_DATA', 'makehuman/makehuman/data')  # data folder of a MakeHuman checkout
def load_obj():
    V=[]; F=[]; G=[]; g=None
    for line in open(D+'/3dobjs/base.obj'):
        if line.startswith('v '): V.append([float(x) for x in line.split()[1:4]])
        elif line.startswith('g '): g=line.split()[1]
        elif line.startswith('f '):
            idx=[int(p.split('/')[0])-1 for p in line.split()[1:]]
            F.append(idx); G.append(g)
    return np.array(V,np.float64), F, G
def load_target(name):
    d={}
    for line in open(D+'/targets/'+name):
        if line[0]=='#' or not line.strip(): continue
        p=line.split(); d[int(p[0])]=[float(x) for x in p[1:4]]
    return d
def apply(V, name, w):
    t=load_target(name)
    if not t: return
    idx=np.array(list(t.keys())); dv=np.array(list(t.values()))
    V[idx]+=w*dv
def joints(V,F,G):
    J={}
    for f,g in zip(F,G):
        if g and g.startswith('joint-'):
            J.setdefault(g,set()).update(f)
    return {k[6:]:V[list(v)].mean(0) for k,v in J.items()}

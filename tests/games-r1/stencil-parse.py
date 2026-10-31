import re, json, sys, os
s = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../_ref/stencils/cygnus-face.js')).read()
def grab(name):
    i = s.index('const '+name)
    j = s.index('`', i); k = s.index('`', j+1)
    return s[j+1:k]
out = {}
for name in ['FACE_FRONT','FACE_SIDE','FACE_45']:
    svg = grab(name)
    paths = re.findall(r'<path([^>]*)/>', svg)
    print(name, 'paths', len(paths))
    allsub = []
    for p in paths:
        tr = re.search(r'transform="matrix\(([^)]*)\)"', p)
        m = [float(x) for x in tr.group(1).split(',')] if tr else [1,0,0,1,0,0]
        d = re.search(r' d="([^"]*)"', p).group(1)
        fill = re.search(r'fill="([^"]*)"', p).group(1)
        subs = re.findall(r'M[^M]*', d)
        for sp in subs:
            nums = [float(x) for x in re.findall(r'-?\d+\.?\d*', sp)]
            xs = nums[0::2]; ys = nums[1::2]
            X = [m[0]*x + m[2]*y + m[4] for x,y in zip(xs,ys)]
            Y = [m[1]*x + m[3]*y + m[5] for x,y in zip(xs,ys)]
            allsub.append({'d': sp, 'bb': [min(X),min(Y),max(X),max(Y)], 'n': len(xs)})
        print(' matrix', m, 'fill', fill, 'subpaths', len(subs))
    out[name] = {'m': m, 'subs': allsub}
json.dump(out, open('subs.json','w'))
for name in out:
    print(name)
    for i, sp in enumerate(out[name]['subs']):
        bb = sp['bb']
        if (bb[2]-bb[0]) * (bb[3]-bb[1]) > 30 or True:
            pass
    print(len(out[name]['subs']))

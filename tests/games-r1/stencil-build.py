import json, os
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "../..")
data = json.load(open('subs.json'))  
def cls_front(sp):
    x0,y0,x1,y1 = sp['bb']; cx=(x0+x1)/2; cy=(y0+y1)/2; w=x1-x0; h=y1-y0
    if w > 120 or h > 120: return 'base'
    if 280 <= cy < 321.5 and 160 < cx < 440: return 'browL' if cx < 300 else 'browR'
    if 321.5 <= cy < 368 and 175 < cx < 425:
        if 280 < cx < 320: return 'nose'
        return 'eyeL' if cx < 300 else 'eyeR'
    if 300 <= cy < 460 and 270 < cx < 330: return 'nose'
    if 400 <= cy < 460 and 240 < cx < 360: return 'nose'
    if 455 <= cy < 535 and 235 < cx < 365: return 'lips'
    return 'base'
def cls_45(sp):
    x0,y0,x1,y1 = sp['bb']; cx=(x0+x1)/2; cy=(y0+y1)/2; w=x1-x0; h=y1-y0
    if w > 120 or h > 120: return 'base'
    # the far brow and eye touch the profile line and share its holes, so they stay with the base
    if 150 <= cx < 290 and 280 <= cy < 314: return 'browR'
    if 185 <= cx < 290 and 314 <= cy < 375: return 'eyeR'
    return 'base'
out = {}
for name, key, fn in [('FACE_FRONT','front',cls_front),('FACE_45','left45',cls_45)]:
    D = data[name]; m = D['m']
    groups = {}
    for sp in D['subs']:
        g = fn(sp)
        G = groups.setdefault(g, {'d': '', 'bb': [1e9,1e9,-1e9,-1e9]})
        G['d'] += sp['d']
        bb = sp['bb']
        G['bb'] = [min(G['bb'][0],bb[0]),min(G['bb'][1],bb[1]),max(G['bb'][2],bb[2]),max(G['bb'][3],bb[3])]
    for g in groups: groups[g]['bb'] = [round(v,1) for v in groups[g]['bb']]
    out[key] = {'m': m, 'groups': groups}
    print(key, {g: groups[g]['bb'] for g in groups})
hdr = '''/* Face line art for Proportion: the clinic's own traced stencils (_ref/stencils/cygnus-face.js),
   600 x 800 units, skull top at y 70 and chin at y 610. Each view's single traced path is split into
   its subpaths and grouped by region. `m` is the stencil's own transform; `bb` boxes are in 600 x 800
   units after that transform. Generated from the stencil file; do not edit by hand. */
'''
js = hdr + 'export const FACE_W = 600, FACE_H = 800, SKULL_Y = 70, CHIN_Y = 610;\nexport const VIEWS = {\n'
for key, v in out.items():
    js += f'  {key}: {{\n    m: {json.dumps(v["m"])},\n    groups: {{\n'
    for g, G in v['groups'].items():
        js += f'      {g}: {{ bb: {json.dumps(G["bb"])}, d: "{G["d"]}" }},\n'
    js += '    }\n  },\n'
js += '};\n'
open(os.path.join(ROOT, 'site/assets/features/games/stencil.js'),'w').write(js)
print(len(js))

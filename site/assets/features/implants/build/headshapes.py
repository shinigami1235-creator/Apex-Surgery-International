"""The two head shapes the face viewers draw.

Female: MakeHuman's own young woman, 85 % Asian and 15 % European, average build, no face edits.
Gid chose her over shapes tuned by hand, fitted to golden ratios, and fitted to scans.

Male: the same MakeHuman head wrapped onto "Male Head Sculpt" by lKutts
(https://sketchfab.com/3d-models/male-head-sculpt-deb721f8d38e4b00b17abadd5ace9cc1, CC BY 4.0).
male_head_fit.npz holds the wrapped vertex positions in MakeHuman space, in the face mesh's vertex order;
fit_scan/ has the scripts that made it."""
import os, numpy as np
D = os.environ.get('MH_DATA', 'makehuman/makehuman/data')
M = 'macrodetails/'
HERE = os.path.dirname(os.path.abspath(__file__))

def macro(gender, age=.5, muscle=.5, weight=.5, race=(('asian', 1.),), prop=.5):
    """MakeHuman's macro modifiers as (target, weight) pairs. gender 0 female to 1 male; age .5 = 25 years;
    muscle and weight .5 = average; race weights sum to 1; prop above .5 blends in ideal proportions."""
    out = []
    gw = {'female': 1 - gender, 'male': gender}
    aw = {'child': (.5 - age) / .3125, 'young': 1 - (.5 - age) / .3125} if age < .5 else {'young': 1 - (age - .5) / .5, 'old': (age - .5) / .5}
    mw = {'minmuscle': max(0, .5 - muscle) * 2, 'averagemuscle': 1 - abs(muscle - .5) * 2, 'maxmuscle': max(0, muscle - .5) * 2}
    ww = {'minweight': max(0, .5 - weight) * 2, 'averageweight': 1 - abs(weight - .5) * 2, 'maxweight': max(0, weight - .5) * 2}
    for g, a1 in gw.items():
        for a, a2 in aw.items():
            for r, a3 in race: out.append((M + f'{r}-{g}-{a}.target', a1 * a2 * a3))
            for m, a4 in mw.items():
                for w, a5 in ww.items():
                    out.append((M + f'universal-{g}-{a}-{m}-{w}.target', a1 * a2 * a4 * a5))
                    if prop > .5: out.append((M + f'proportions/{g}-{a}-{m}-{w}-idealproportions.target', a1 * a2 * a4 * a5 * (prop - .5) * 2))
    return [(n, w) for n, w in out if w > 1e-4 and os.path.exists(D + '/targets/' + n)]

HEAD_FEMALE = macro(0., age=.52, muscle=.5, weight=.46, race=(('asian', .85), ('caucasian', .15)), prop=.8)

def male_fit():
    p = os.path.join(HERE, 'male_head_fit.npz')
    return np.load(p)['P'] if os.path.exists(p) else None

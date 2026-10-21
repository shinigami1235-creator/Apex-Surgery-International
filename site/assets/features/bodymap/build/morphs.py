"""Morph targets shared by build_bodies.py and build_heads.py, so the head in the
full-body view and the face-zoom head have the same shape.

Weights are MakeHuman modifier values (0 to 1). Target paths are relative to
<MH_DATA>/targets/.
"""
M = 'macrodetails/'
MIX = [('african', .2), ('asian', .5), ('caucasian', .3)]

def both(name, w):
    """A left/right pair of cheek targets."""
    return [(f'cheek/l-{name}.target', w), (f'cheek/r-{name}.target', w)]

# Female: elegant. Softer tapered jaw, V-line chin, smooth forehead, refined nose.
FEMALE_FACE = [
    ('head/head-oval.target', .55),
    ('head/head-invertedtriangular.target', .25),
    ('head/head-fat-decr.target', .35),
    ('chin/chin-triangle.target', .65),
    ('chin/chin-bones-decr.target', .55),
    ('chin/chin-width-decr.target', .45),
    ('chin/chin-prominent-incr.target', .2),
    ('chin/chin-height-incr.target', .15),
    ('forehead/forehead-nubian-decr.target', .3),
    ('forehead/forehead-temple-decr.target', .25),
    ('nose/nose-scale-horiz-decr.target', .3),
    ('nose/nose-point-width-decr.target', .45),
    ('nose/nose-flaring-decr.target', .4),
    ('nose/nose-nostrils-width-decr.target', .35),
    ('nose/nose-hump-decr.target', .4),
    ('nose/nose-point-up.target', .2),
    ('nose/nose-volume-decr.target', .2),
    ('mouth/mouth-scale-horiz-decr.target', .15),
    ('mouth/mouth-upperlip-volume-incr.target', .15),
    ('neck/neck-scale-horiz-decr.target', .25),
    ('neck/neck-double-decr.target', .4),
] + both('cheek-bones-incr', .25) + both('cheek-volume-decr', .25)

# Male: sharper. Defined jaw angle, stronger chin and brow ridge, slightly wider neck.
MALE_FACE = [
    ('head/head-square.target', .3),
    ('head/head-fat-decr.target', .4),
    ('chin/chin-bones-incr.target', .55),
    ('chin/chin-prominent-incr.target', .5),
    ('chin/chin-width-incr.target', .25),
    ('chin/chin-height-incr.target', .2),
    ('forehead/forehead-nubian-incr.target', .3),
    ('eyebrows/eyebrows-trans-forward.target', .55),
    ('nose/nose-hump-decr.target', .2),
    ('nose/nose-point-width-decr.target', .2),
    ('neck/neck-scale-horiz-incr.target', .3),
    ('neck/neck-double-decr.target', .4),
] + both('cheek-bones-incr', .3) + both('cheek-volume-decr', .35)

FEMALE = [(M + f'{r}-female-young.target', w) for r, w in MIX] + [
    (M + 'proportions/female-young-averagemuscle-averageweight-idealproportions.target', .6),
    (M + 'universal-female-young-averagemuscle-minweight.target', .15)] + FEMALE_FACE
MALE = [(M + f'{r}-male-young.target', w) for r, w in MIX] + [
    (M + 'proportions/male-young-averagemuscle-averageweight-idealproportions.target', .6),
    (M + 'universal-male-young-maxmuscle-averageweight.target', .3)] + MALE_FACE

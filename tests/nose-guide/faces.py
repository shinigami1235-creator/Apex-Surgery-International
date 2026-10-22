"""Stand-in sample faces for offline tests. Each one puts its nose where the
module's SAMPLES points expect it, so the hand-placed points land on a nose."""
import random, sys
from PIL import Image, ImageDraw, ImageFilter

OUT = sys.argv[1] if len(sys.argv) > 1 else '.'
SKIN = (214, 168, 140)
SKIN_D = (176, 126, 100)


def bg(W, H, top, bot):
    im = Image.new('RGB', (W, H))
    d = ImageDraw.Draw(im)
    for y in range(H):
        t = y / H
        d.line([(0, y), (W, y)], fill=tuple(int(a + (b - a) * t) for a, b in zip(top, bot)))
    return im


def grain(im, amt=10):
    random.seed(4)
    n = Image.effect_noise(im.size, amt).convert('RGB')
    return Image.blend(im, Image.composite(im, n, Image.new('L', im.size, 235)), .5)


def front(W=1200, H=1500, tilt=0.0, name='front', pts=None):
    im = bg(W, H, (120, 132, 150), (70, 78, 96))
    d = ImageDraw.Draw(im)
    P = lambda x, y: (x * W, y * H)
    N, T, C, AL, AR = (pts[k] for k in ('N', 'T', 'C', 'AL', 'AR'))
    cx = (AL[0] + AR[0]) / 2 + tilt * -.04
    L = C[1] - N[1]
    # hair, neck, face
    d.ellipse([P(cx - .27, N[1] - 2.3 * L), P(cx + .27, N[1] + 2.2 * L)], fill=(52, 36, 30))
    d.rectangle([P(cx - .1, C[1] + 1.2 * L), P(cx + .1, 1)], fill=SKIN_D)
    d.ellipse([P(cx - .2 + tilt * .03, N[1] - 1.7 * L), P(cx + .2 - tilt * .05, C[1] + 1.75 * L)], fill=SKIN)
    # brows and eyes
    for s in (-1, 1):
        ex = N[0] + s * (.085 - (tilt * .03 if s > 0 else 0))
        d.line([P(ex - .045, N[1] - .045), P(ex, N[1] - .058), P(ex + .045, N[1] - .045)], fill=(70, 48, 40), width=int(.012 * W))
        d.ellipse([P(ex - .04, N[1] - .012), P(ex + .04, N[1] + .022)], fill=(245, 240, 236))
        d.ellipse([P(ex - .015, N[1] - .01), P(ex + .015, N[1] + .02)], fill=(58, 40, 34))
    # nose: soft side shadows, wings, nostrils, tip highlight
    sh = Image.new('RGBA', im.size, (0, 0, 0, 0))
    g = ImageDraw.Draw(sh)
    for s in (-1, 1):
        A = AL if s < 0 else AR
        g.line([P(N[0] + s * .018, N[1] + .01), P(T[0] + s * .03, T[1] - .02), P(A[0] - s * .005, A[1] - .006)], fill=(120, 70, 55, 150), width=int(.016 * W))
        g.ellipse([P(A[0] - .022, A[1] - .02), P(A[0] + .022, A[1] + .016)], outline=(130, 80, 62, 190), width=int(.008 * W))
        g.ellipse([P((A[0] + T[0]) / 2 - .014, C[1] - .012), P((A[0] + T[0]) / 2 + .014, C[1] + .002)], fill=(70, 36, 30, 230))
    g.ellipse([P(T[0] - .03, T[1] - .028), P(T[0] + .03, T[1] + .01)], fill=(250, 214, 190, 110))
    sh = sh.filter(ImageFilter.GaussianBlur(W * .006))
    im.paste(sh, (0, 0), sh)
    # lips
    d.chord([P(cx - .06, C[1] + .035), P(cx + .06, C[1] + .085)], 0, 180, fill=(170, 84, 86))
    d.chord([P(cx - .06, C[1] + .02), P(cx + .06, C[1] + .065)], 180, 360, fill=(160, 76, 80))
    im = grain(im.filter(ImageFilter.GaussianBlur(1.2)))
    im.save(f'{OUT}/{name}.jpg', quality=90)


def side(W=1400, H=1400):
    im = bg(W, H, (198, 202, 208), (178, 182, 190))
    d = ImageDraw.Draw(im)
    P = lambda x, y: (x * W, y * H)
    edge = [(.64, .02), (.62, .14), (.605, .26), (.594, .345), (.5805, .3931), (.5665, .455), (.545, .505),
            (.5335, .526), (.538, .556), (.5565, .583), (.552, .61), (.548, .635), (.556, .655), (.553, .68),
            (.56, .72), (.585, .75), (.62, .76), (.64, .86), (.64, 1.0)]
    d.polygon([P(*p) for p in edge] + [P(1.0, 1.0), P(1.0, .0)], fill=SKIN)
    d.ellipse([P(.6, -.12), P(1.25, .55)], fill=(52, 36, 30))
    d.polygon([P(.62, .02), P(.85, .02), P(.86, .3), P(.70, .25), P(.64, .2)], fill=(52, 36, 30))
    d.ellipse([P(.82, .4), P(.88, .52)], fill=SKIN_D)  # ear
    sh = Image.new('RGBA', im.size, (0, 0, 0, 0))
    g = ImageDraw.Draw(sh)
    g.arc([P(.566, .5), P(.606, .56)], 120, 320, fill=(120, 70, 55, 200), width=int(.008 * W))  # alar crease
    g.ellipse([P(.552, .55), P(.57, .565)], fill=(70, 36, 30, 200))
    g.ellipse([P(.596, .375), P(.63, .395)], fill=(58, 40, 34, 230))  # eye
    g.line([P(.588, .345), P(.635, .34)], fill=(70, 48, 40, 230), width=int(.01 * W))
    g.line([P(.549, .612), P(.575, .618)], fill=(160, 76, 80, 220), width=int(.012 * W))
    sh = sh.filter(ImageFilter.GaussianBlur(W * .003))
    im.paste(sh, (0, 0), sh)
    im = grain(im.filter(ImageFilter.GaussianBlur(1.2)))
    im.save(f'{OUT}/side.jpg', quality=90)


front(pts={'N': (.500, .398), 'T': (.4985, .507), 'C': (.4985, .522), 'AL': (.4335, .511), 'AR': (.5635, .511)})
front(W=1200, H=1200, tilt=1, name='45', pts={'N': (.462, .517), 'T': (.472, .592), 'C': (.477, .611), 'AL': (.426, .602), 'AR': (.518, .597)})
side()

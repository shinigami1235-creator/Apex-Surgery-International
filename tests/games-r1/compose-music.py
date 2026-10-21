"""Calm lounge and spa loops for the Apex games, composed with music21 and rendered with FluidSynth.

Each piece is an 8-bar loop. It is rendered three times in a row and the middle cycle is cut out with
one second of margin on each side, so any window of exactly one cycle inside the file loops without a
seam (the player sets loopStart = 1 s and loopEnd = 1 s + cycle). Output: MP3, 96 kbps.
"""
import json, os, random, subprocess, sys
import numpy as np
from scipy.io import wavfile
from music21 import stream, note, chord, tempo, meter, pitch as m21pitch
from mido import MidiFile, Message

SF2 = '/usr/share/sounds/sf2/FluidR3_GM.sf2'
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, 'out')
os.makedirs(OUT, exist_ok=True)
BARS = 8
SR = 48000  # with these tempos one cycle is a whole number of FluidSynth 64-sample blocks


def P(name):
    return m21pitch.Pitch(name).midi


def voicing(names):
    return [P(n) for n in names.split()]


class Piece:
    def __init__(self, key, bpm, seed):
        self.key, self.bpm = key, bpm
        self.rng = random.Random(seed)
        self.parts = []  # (label, program, channel, velocity scale, part)

    def part(self, label, program, channel=0, vel=1.0):
        p = stream.Part()
        p.partName = label
        p.insert(0, tempo.MetronomeMark(number=self.bpm))
        p.insert(0, meter.TimeSignature('4/4'))
        self.parts.append([label, program, channel, vel, p, []])
        return len(self.parts) - 1

    def add(self, idx, offset, pitches, dur, vel):
        """Insert a note or chord; store the velocity for mido to apply later."""
        part = self.parts[idx][4]
        if isinstance(pitches, (list, tuple)):
            el = chord.Chord([note.Note(m) for m in pitches], quarterLength=dur)
        else:
            el = note.Note(pitches, quarterLength=dur)
        el.volume.velocity = max(1, min(127, int(vel)))
        part.insert(float(offset), el)

    def hum(self, v, spread=8):
        return v + self.rng.randint(-spread, spread)


def render(name, piece, cycles=3):
    score = stream.Score()
    for label, program, channel, vel, part, _ in piece.parts:
        # repeat the 8-bar cycle three times
        big = stream.Part()
        big.insert(0, tempo.MetronomeMark(number=piece.bpm))
        big.insert(0, meter.TimeSignature('4/4'))
        for c in range(cycles):
            for el in part.flatten().notes:
                cp = el.__deepcopy__()
                big.insert(el.offset + c * BARS * 4, cp)
        score.insert(0, big)
    mid_path = os.path.join(OUT, name + '.mid')
    score.write('midi', fp=mid_path)
    mid = MidiFile(mid_path)
    tracks = [t for t in mid.tracks if any(m.type == 'note_on' for m in t)]
    for t, (label, program, channel, vel, part, _) in zip(tracks, piece.parts):
        pos = 0
        for j, msg in enumerate(t):
            if msg.type == 'track_name':
                pos = j + 1
                break
        for msg in t:
            if hasattr(msg, 'channel'):
                msg.channel = channel
            if msg.type == 'note_on' and msg.velocity > 0:
                msg.velocity = max(1, min(127, int(msg.velocity * vel)))
        if channel != 9:
            t.insert(pos, Message('program_change', program=program, channel=channel, time=0))
        # gentle reverb and chorus sends per track
        t.insert(pos, Message('control_change', control=91, value=72, channel=channel, time=0))
        t.insert(pos, Message('control_change', control=93, value=28 if channel != 9 else 0, channel=channel, time=0))
    mid.save(mid_path)
    wav = os.path.join(OUT, name + '-full.wav')
    subprocess.run(['fluidsynth', '-ni', '-q', '-g', '0.55', '-r', str(SR), '-R', '1', '-C', '0', '-F', wav, SF2, mid_path], check=True)
    sr, data = wavfile.read(wav)
    L = BARS * 4 * 60.0 / piece.bpm
    a, b = int(round((L - 1.0) * sr)), int(round((2 * L + 1.0) * sr))
    seg = data[a:b].astype(np.float32)
    # 40 ms crossfade into the loop point: the samples just before loopEnd blend into the ones just
    # before loopStart, so the jump from loopEnd back to loopStart is continuous.
    n = int(0.04 * sr)
    ls, le = int(round(1.0 * sr)), int(round((1.0 + L) * sr))
    ramp = np.linspace(0, 1, n, dtype=np.float32)[:, None] if seg.ndim > 1 else np.linspace(0, 1, n, dtype=np.float32)
    seg[le - n:le] = seg[le - n:le] * (1 - ramp) + seg[ls - n:ls] * ramp
    seg_wav = os.path.join(OUT, name + '-seg.wav')
    wavfile.write(seg_wav, sr, np.clip(seg, -32768, 32767).astype(np.int16))
    # static gain to about -19 LUFS (loudnorm's dynamic mode would break the loop)
    meas = subprocess.run(['ffmpeg', '-nostats', '-i', seg_wav, '-af', 'ebur128', '-f', 'null', '-'], capture_output=True, text=True).stderr
    lufs = float([l for l in meas.splitlines() if l.strip().startswith('I:')][-1].split()[1])
    gain = -19.0 - lufs
    mp3 = os.path.join(OUT, name + '.mp3')
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', seg_wav,
                    '-af', f'highpass=f=38,volume={gain:.2f}dB,alimiter=limit=0.75:level=false',
                    '-ar', str(sr), '-ac', '2', '-b:a', '96k', mp3], check=True)
    return {'file': name + '.mp3', 'cycle': round(L, 6), 'bpm': piece.bpm, 'bytes': os.path.getsize(mp3)}


# ---------------------------------------------------------------- building blocks
def pad(pc, idx, prog, vel=46, bar_len=1):
    for i, (bass, v) in enumerate(prog):
        if i % bar_len:
            continue
        pc.add(idx, i * 4, v, 4 * bar_len, pc.hum(vel, 4))


def bassline(pc, idx, prog, style='root', vel=70):
    for i, (bass, v) in enumerate(prog):
        o = i * 4
        if style == 'long':
            pc.add(idx, o, bass, 4, pc.hum(vel, 4))
        elif style == 'root':
            pc.add(idx, o, bass, 2.5, pc.hum(vel, 5))
            pc.add(idx, o + 2.5, bass + 7, 1.5, pc.hum(vel - 10, 5))
        elif style == 'walk':
            nxt = prog[(i + 1) % len(prog)][0]
            pc.add(idx, o, bass, 1.5, pc.hum(vel, 5))
            pc.add(idx, o + 1.5, bass + 7, 1, pc.hum(vel - 12, 5))
            pc.add(idx, o + 3, bass + 12 if bass + 12 < 60 else bass, 0.5, pc.hum(vel - 18, 5))
            step = 1 if nxt > bass else -1
            pc.add(idx, o + 3.5, nxt - step * (2 if abs(nxt - bass) > 2 else 1), 0.5, pc.hum(vel - 14, 5))


def comp(pc, idx, prog, vel=60, pattern=((0, 1.5), (1.5, 1), (3, 1))):
    for i, (bass, v) in enumerate(prog):
        o = i * 4
        for k, (at, d) in enumerate(pattern):
            pc.add(idx, o + at, v, d, pc.hum(vel - (6 if k else 0), 6))


def arp(pc, idx, prog, vel=58, step=0.5, up=12, order=(0, 1, 2, 3, 2, 1, 0, 1)):
    for i, (bass, v) in enumerate(prog):
        notes = sorted(v)
        seq = notes + [n + up for n in notes]
        for k in range(int(4 / step)):
            n = seq[order[k % len(order)] % len(seq)]
            accent = 6 if k % int(1 / step if step < 1 else 1) == 0 else 0
            pc.add(idx, i * 4 + k * step, n, step * 1.6, pc.hum(vel + accent, 5))


def melody(pc, idx, prog, scale, vel=64, density=0.45, lo=67, hi=86, phrase_bars=2, seed_shift=0):
    """Sparse lyrical line: chord tones on strong beats, scale steps between, rests at phrase ends."""
    r = random.Random(pc.rng.random() + seed_shift)
    cur = r.choice([n for n in range(lo, hi) if n % 12 in scale])
    for i, (bass, v) in enumerate(prog):
        o = i * 4
        last_bar = (i % phrase_bars) == phrase_bars - 1
        t = 0.0
        while t < 4:
            if last_bar and t >= 2:
                break
            if r.random() > density and t > 0:
                t += 1.0
                continue
            tones = [n for n in range(lo, hi) if n % 12 in {x % 12 for x in v}] if t in (0.0, 2.0) else \
                    [n for n in range(lo, hi) if n % 12 in scale]
            tones.sort(key=lambda n: abs(n - cur) + r.random() * 3)
            cur = tones[0] if r.random() < 0.7 else tones[min(2, len(tones) - 1)]
            d = r.choice([1.0, 1.5, 2.0]) if t in (0.0, 2.0) else r.choice([0.5, 1.0])
            d = min(d, 4 - t)
            pc.add(idx, o + t, cur, d * 0.95, pc.hum(vel, 7))
            t += d
        if last_bar:
            pc.add(idx, o + 2, cur, 2, pc.hum(vel - 8, 5))


def drums(pc, idx, bars, kick=None, rim=None, hat=None, shaker=None, cabasa=None, ride=None, vel=1.0):
    for b in range(bars):
        o = b * 4
        if kick:
            for at in kick:
                pc.add(idx, o + at, 35, 0.5, pc.hum(int(62 * vel), 5))
        if rim:
            for at in rim:
                pc.add(idx, o + at, 37, 0.5, pc.hum(int(46 * vel), 5))
        if hat:
            for k in range(8):
                pc.add(idx, o + k * 0.5, 42, 0.25, pc.hum(int((34 if k % 2 else 44) * vel), 4))
        if shaker:
            for k in range(16):
                pc.add(idx, o + k * 0.25, 70, 0.25, pc.hum(int((22 if k % 2 else 32) * vel), 4))
        if cabasa:
            for k in range(8):
                pc.add(idx, o + k * 0.5 + 0.25 * (k % 2), 69, 0.25, pc.hum(int(26 * vel), 4))
        if ride:
            for k in range(4):
                pc.add(idx, o + k, 51, 0.5, pc.hum(int(30 * vel), 4))


def prog_from(spec):
    return [(P(b), voicing(v)) for b, v in spec]


PIECES = {}

# Hub: warm lounge in D major, 75 bpm
def hub():
    pc = Piece('D', 75, 11)
    prog = prog_from([('G2', 'B3 D4 F#4 A4'), ('F#2', 'A3 C#4 E4 A4'), ('E2', 'G3 B3 D4 F#4'), ('A2', 'G3 B3 D4 E4'),
                      ('G2', 'B3 D4 F#4 A4'), ('F#2', 'A3 C#4 E4 A4'), ('B1', 'A3 C#4 D4 F#4'), ('A2', 'G3 C#4 E4 F#4')])
    p_pad = pc.part('pad', 89, 0, 0.8)
    p_ep = pc.part('ep', 4, 1, 0.85)
    p_bass = pc.part('bass', 35, 2, 0.9)
    p_mel = pc.part('vib', 11, 3, 0.75)
    p_dr = pc.part('drums', 0, 9, 0.8)
    pad(pc, p_pad, prog, 44)
    comp(pc, p_ep, prog, 56, ((0, 1.5), (1.5, 0.5), (2.5, 1.5)))
    bassline(pc, p_bass, prog, 'root', 72)
    melody(pc, p_mel, prog, {2, 4, 6, 9, 11}, 60, 0.4, 69, 86)
    drums(pc, p_dr, BARS, kick=(0, 2.5), rim=(1, 3), shaker=True, vel=0.85)
    return pc

# Steady Hand: spa calm in F, 64 bpm, harp and strings
def steady():
    pc = Piece('F', 64, 23)
    prog = prog_from([('F2', 'A3 C4 E4 G4'), ('F2', 'A3 B3 E4 G4'), ('D2', 'F3 A3 C4 E4'), ('D2', 'F3 A3 C4 G4'),
                      ('Bb1', 'D4 F4 A4 C5'), ('Bb1', 'D4 F4 A4 E5'), ('C2', 'Bb3 D4 F4 G4'), ('C2', 'Bb3 E4 G4 A4')])
    p_str = pc.part('strings', 49, 0, 0.7)
    p_harp = pc.part('harp', 46, 1, 0.8)
    p_bass = pc.part('bass', 32, 2, 0.7)
    p_pno = pc.part('piano', 0, 3, 0.6)
    p_pad = pc.part('halo', 94, 4, 0.5)
    pad(pc, p_str, prog, 44, 2)
    pad(pc, p_pad, prog, 38, 2)
    arp(pc, p_harp, prog, 54, 0.5, 12, (0, 1, 2, 3, 4, 3, 2, 1))
    bassline(pc, p_bass, prog, 'long', 58)
    melody(pc, p_pno, prog, {5, 7, 9, 0, 2, 4}, 52, 0.3, 72, 88, 4)
    return pc

# Proportion: atelier piano in Eb, 75 bpm
def proportion():
    pc = Piece('Eb', 75, 37)
    prog = prog_from([('Eb2', 'G3 Bb3 D4 F4'), ('C2', 'Eb3 G3 Bb3 D4'), ('Ab1', 'C4 Eb4 G4 Bb4'), ('Bb1', 'Ab3 C4 Eb4 F4'),
                      ('Eb2', 'G3 Bb3 D4 F4'), ('G1', 'F3 Bb3 D4 G4'), ('Ab1', 'C4 Eb4 G4 Bb4'), ('Bb1', 'Ab3 D4 Eb4 F4')])
    p_pad = pc.part('strings', 48, 0, 0.6)
    p_pno = pc.part('piano', 0, 1, 0.75)
    p_bass = pc.part('bass', 35, 2, 0.85)
    p_vib = pc.part('vib', 11, 3, 0.7)
    p_dr = pc.part('drums', 0, 9, 0.7)
    pad(pc, p_pad, prog, 40)
    arp(pc, p_pno, prog, 52, 0.5, 12, (0, 2, 1, 3, 2, 4, 3, 1))
    bassline(pc, p_bass, prog, 'root', 66)
    melody(pc, p_vib, prog, {3, 5, 7, 10, 0}, 58, 0.38, 70, 87)
    drums(pc, p_dr, BARS, rim=(1, 3), shaker=True, vel=0.7)
    return pc

# Fact Rush: bright lounge in A, 96 bpm, nylon guitar and keys
def factrush():
    pc = Piece('A', 96, 41)
    prog = prog_from([('A2', 'C#4 E4 G#4 B4'), ('C#2', 'B3 E4 G#4 C#5'), ('D2', 'C#4 E4 F#4 A4'), ('E2', 'D4 F#4 A4 B4'),
                      ('A2', 'C#4 E4 G#4 B4'), ('F#2', 'A3 C#4 E4 G#4'), ('D2', 'C#4 E4 F#4 A4'), ('E2', 'D4 G#4 A4 B4')])
    p_gtr = pc.part('nylon', 24, 0, 0.85)
    p_ep = pc.part('ep', 4, 1, 0.7)
    p_bass = pc.part('bass', 33, 2, 0.9)
    p_pad = pc.part('pad', 89, 3, 0.55)
    p_fl = pc.part('flute', 73, 4, 0.55)
    p_dr = pc.part('drums', 0, 9, 0.85)
    arp(pc, p_gtr, prog, 60, 0.5, 12, (0, 1, 2, 3, 1, 2, 3, 2))
    comp(pc, p_ep, prog, 50, ((0.5, 1), (2, 0.5), (3.5, 0.5)))
    bassline(pc, p_bass, prog, 'walk', 74)
    pad(pc, p_pad, prog, 38)
    melody(pc, p_fl, prog, {9, 11, 1, 4, 6}, 56, 0.35, 72, 88, 4)
    drums(pc, p_dr, BARS, kick=(0, 1.5, 2.5), rim=(1, 3), hat=True, shaker=True, vel=0.85)
    return pc

# Recovery Sort: garden marimba in C, 80 bpm
def recoverysort():
    pc = Piece('C', 80, 53)
    prog = prog_from([('C2', 'E4 G4 B4 D5'), ('A1', 'C4 E4 G4 B4'), ('F1', 'A3 C4 E4 G4'), ('G1', 'F4 A4 C5 D5'),
                      ('C2', 'E4 G4 B4 D5'), ('E2', 'D4 G4 B4 E5'), ('F1', 'A3 C4 E4 B4'), ('G1', 'F4 A4 B4 D5')])
    p_mar = pc.part('marimba', 12, 0, 0.8)
    p_kal = pc.part('kalimba', 108, 1, 0.6)
    p_bass = pc.part('bass', 33, 2, 0.85)
    p_pad = pc.part('pad', 89, 3, 0.6)
    p_dr = pc.part('drums', 0, 9, 0.8)
    arp(pc, p_mar, prog, 56, 0.5, 12, (0, 2, 1, 3, 0, 2, 4, 3))
    melody(pc, p_kal, prog, {0, 2, 4, 7, 9}, 58, 0.42, 74, 91)
    bassline(pc, p_bass, prog, 'root', 70)
    pad(pc, p_pad, prog, 40)
    drums(pc, p_dr, BARS, kick=(0, 2.5), cabasa=True, rim=(3,), vel=0.8)
    return pc

# Memory Match: music-box lounge in G, 80 bpm
def memorymatch():
    pc = Piece('G', 80, 67)
    prog = prog_from([('G2', 'B3 D4 F#4 A4'), ('B1', 'A3 D4 F#4 A4'), ('C2', 'B3 E4 G4 D5'), ('D2', 'C4 E4 F#4 A4'),
                      ('E2', 'D4 G4 B4 F#5'), ('B1', 'A3 D4 F#4 B4'), ('C2', 'B3 E4 G4 A4'), ('D2', 'C4 F#4 G4 A4')])
    p_cel = pc.part('celesta', 8, 0, 0.7)
    p_ep = pc.part('ep2', 5, 1, 0.75)
    p_bass = pc.part('bass', 35, 2, 0.85)
    p_pad = pc.part('pad', 88, 3, 0.55)
    p_dr = pc.part('drums', 0, 9, 0.75)
    melody(pc, p_cel, prog, {7, 9, 11, 2, 4}, 62, 0.5, 74, 91)
    comp(pc, p_ep, prog, 54, ((0, 1), (1.5, 1), (3, 1)))
    bassline(pc, p_bass, prog, 'root', 68)
    pad(pc, p_pad, prog, 40)
    drums(pc, p_dr, BARS, kick=(0, 2.5), rim=(1, 3), hat=True, vel=0.7)
    return pc


if __name__ == '__main__':
    only = sys.argv[2:] or None
    meta = {}
    for name, fn in [('hub', hub), ('steady', steady), ('proportion', proportion), ('factrush', factrush),
                     ('recoverysort', recoverysort), ('memorymatch', memorymatch)]:
        if only and name not in only:
            continue
        info = render('music-' + name, fn())
        meta[name] = info
        print(name, info)
    json.dump(meta, open(os.path.join(OUT, 'meta.json'), 'w'), indent=1)

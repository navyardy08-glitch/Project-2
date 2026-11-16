#!/usr/bin/env python3
"""Music + SFX stems for "The Thief Who Returned Everything" (all original synthesis).
usage: python3 audio.py <voice> <outdir>   -> outdir/music.wav, outdir/sfx.wav (48 kHz stereo, exact voice length)
"""
import sys, subprocess
import numpy as np
from dsp import SR, ns, tt, rng, lp, hp, bp, colored, smooth_noise, fades, phase, modal, pan, st, place, widen, make_ir, convolve_st, write_wav
from instruments import m2f, pluck, pad, fife, glock, musicbox, timpani, cymbal, brush, triangle
from sfx_gen import rattle, clink, whoosh, bird_chirps, crickets, breeze, creak, boot, babble, hurrah, applause, hammer_hit, stroll_step
from instruments import snare, snare_roll

FPS = 30.0
F = lambda f: f / FPS


def voice_len(path):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True, check=True).stdout
    return len(raw) // 4


# ================================================================ drum + extra synths
def dholak(kind, vel, r):
    d = 0.6
    t = tt(d)
    if kind == "L":  # bass head 'ge' with pitch bend
        y = modal(d, [(92, 1.0, 0.22), (148, 0.45, 0.12), (231, 0.18, 0.06)], r, glide=0.18, glide_tau=0.05)
        y += lp(r.standard_normal(len(t)), 300) * np.exp(-t / 0.01) * 0.6
    elif kind == "H":  # treble 'na'
        y = modal(d, [(540, 1.0, 0.07), (890, 0.55, 0.045), (1270, 0.32, 0.03), (1830, 0.15, 0.02)], r)
        y += bp(r.standard_normal(len(t)), 1500, 7000, 1) * np.exp(-t / 0.004) * 0.5
    else:  # soft ghost 'ti/ka'
        y = modal(d, [(610, 0.6, 0.03), (980, 0.3, 0.02)], r) + bp(r.standard_normal(len(t)), 2000, 8000, 1) * np.exp(-t / 0.003) * 0.4
    return fades(y * vel, 0.0005, 0.05)


def shaker(vel, r):
    t = tt(0.12)
    return bp(r.standard_normal(len(t)), 4000, 11000, 2) * np.exp(-((t - 0.02) / 0.018) ** 2) * vel


def rock_hit(r, big=1.0):
    d = 1.2
    t = tt(d)
    tink = modal(d, [(2870, 0.7, 0.045), (4630, 0.45, 0.028), (7200, 0.25, 0.012)], r)
    nz = r.standard_normal(len(t))
    crack = bp(nz, 700, 6500, 1) * np.exp(-t / 0.014) * 1.5
    thump = np.sin(phase(68 * (1 + 0.5 * np.exp(-t / 0.012)))) * np.exp(-t / 0.07) * 1.4
    y = tink * 0.9 + crack + thump
    grit = rattle(0.7, r, 45, np.exp(-np.linspace(0, 1, ns(0.7)) * 4), heavy=False) * 0.45
    y[ns(0.03): ns(0.03) + len(grit)] += grit[: len(y) - ns(0.03)]
    return fades(y * big, 0.0, 0.15)


def tap(r, f0=2400.0, a=0.5):
    t = tt(0.25)
    y = modal(0.25, [(f0, 0.6, 0.03), (f0 * 1.62, 0.3, 0.018)], r) + bp(r.standard_normal(len(t)), 900, 5000, 1) * np.exp(-t / 0.008) * 0.6
    y += np.sin(phase(90 * np.ones(len(t)))) * np.exp(-t / 0.03) * 0.4
    return y * a


def step_soft(r, a=0.5):
    t = tt(0.22)
    nz = r.standard_normal(len(t))
    y = lp(nz, 500, 2) * np.exp(-t / 0.025) * 1.2 + bp(nz, 900, 4000, 1) * np.clip(t / 0.015, 0, 1) * np.exp(-t / 0.05) * 0.18
    return y * a


def rumble(dur, r, a=1.0):
    n = ns(dur)
    t = np.arange(n) / SR
    y = lp(colored(n, r, 1.2), 220, 2) * (0.6 + 0.4 * smooth_noise(n, r, 6)) * np.clip(t / (dur * 0.6), 0, 1) ** 1.5
    y += bp(colored(n, r, 0.5), 500, 2500, 1) * 0.15 * np.clip(t / dur, 0, 1) ** 2
    return fades(y * a, 0.05, 0.05)


def crash_big(r, a=1.0, dur=2.2):
    t = tt(dur)
    nz = r.standard_normal(len(t))
    y = lp(colored(len(t), r, 1.0), 300, 2) * np.exp(-t / 0.45) * 2.2
    y += np.sin(phase(46 * (1 + 0.6 * np.exp(-t / 0.02)))) * np.exp(-t / 0.18) * 2.0
    y += bp(nz, 600, 5000, 1) * np.exp(-t / 0.05) * 1.6
    deb = rattle(dur - 0.1, r, 80, np.exp(-np.linspace(0, 1, ns(dur - 0.1)) * 3.5), heavy=True) * 0.9
    y[ns(0.05): ns(0.05) + len(deb)] += deb[: len(y) - ns(0.05)]
    return fades(y * a, 0.0, 0.3)


def crack_sharp(r, a=1.0):
    t = tt(0.5)
    nz = r.standard_normal(len(t))
    y = bp(nz, 1200, 8000, 1) * np.exp(-t / 0.006) * 1.5
    for k in range(4):
        y += np.roll(bp(nz, 800, 6000, 1) * np.exp(-t / 0.004), ns(0.02 + 0.03 * k)) * 0.6
    y += np.sin(phase(120 * np.ones(len(t)))) * np.exp(-t / 0.04) * 0.5
    return y * a


def cuckoo(r, a=1.0):
    out = np.zeros(ns(0.75))
    for t0, f, d in [(0.0, 1318.5, 0.2), (0.27, 1046.5, 0.32)]:
        t = tt(d)
        env = np.clip(t / 0.02, 0, 1) * np.clip((d - t) / 0.06, 0, 1)
        y = (np.sin(phase(f * np.ones(len(t)))) + 0.18 * np.sin(2 * phase(f * np.ones(len(t))))) * env
        y += bp(r.standard_normal(len(t)), f * 0.8, f * 1.5, 1) * env * 0.06
        out[ns(t0): ns(t0) + len(y)] += y
    return out * a


def clay_break(r, a=1.0):
    y = np.zeros(ns(1.2))
    t = tt(1.2)
    y += lp(r.standard_normal(len(t)), 400, 2) * np.exp(-t / 0.03) * 1.2
    y += bp(r.standard_normal(len(t)), 1500, 7000, 1) * np.exp(-t / 0.02) * 1.0
    for k in range(9):
        c = clink(r, f0=r.uniform(1800, 4200), dur=0.12, bright=0.6) * r.uniform(0.3, 0.8)
        i = ns(0.01 + k * r.uniform(0.02, 0.07))
        y[i: i + len(c)] += c[: len(y) - i]
    return y * a


def wings(dur, r, a=1.0):
    n = ns(dur)
    t = np.arange(n) / SR
    rate = 7.5 + 1.5 * smooth_noise(n, r, 1.0)
    m = (0.5 + 0.5 * np.sin(phase(rate))) ** 4
    return bp(r.standard_normal(n), 250, 2200, 1) * m * np.exp(-t / (dur * 0.6)) * a


# ================================================================ extra synths
def wood_thud(r, a=1.0, f=95.0):
    t = tt(0.4)
    y = np.sin(phase(f * (1 + 0.4 * np.exp(-t / 0.015)))) * np.exp(-t / 0.06) * 1.3
    y += modal(0.4, [(210, 0.7, 0.05), (430, 0.4, 0.03), (780, 0.2, 0.02)], r) + bp(r.standard_normal(len(t)), 500, 4000, 1) * np.exp(-t / 0.006) * 0.7
    return fades(y * a, 0.0, 0.08)


def knock(r, a=1.0):
    t = tt(0.22)
    y = modal(0.22, [(310, 1.0, 0.035), (640, 0.6, 0.02), (1150, 0.3, 0.012)], r) + bp(r.standard_normal(len(t)), 800, 5000, 1) * np.exp(-t / 0.003) * 0.6
    return y * a


def ting(r, f=2637.0, a=0.6, d=1.2):
    return modal(d, [(f, 1.0, 0.35), (f * 2.76, 0.35, 0.15), (f * 5.4, 0.15, 0.06)], r) * a


def zip_up(r, d=0.34):
    t = tt(d)
    f = 500 * (2 ** (t / d * 2.3))
    y = np.sin(phase(f)) * np.sin(np.pi * t / d) ** 0.7 * 0.5
    return y + whoosh(d, r, d * 0.6, 500, 3500, 0.8, 0.08)[: len(t)] * 0.9


def kettle_whistle(dur, r):
    n = ns(dur); t = np.arange(n) / SR
    f = 1900 + 500 * np.clip(t / 0.5, 0, 1) + 25 * np.sin(2 * np.pi * 6 * t)
    env = np.clip(t / 0.35, 0, 1) * np.clip((dur - t) / 0.3, 0, 1)
    y = (np.sin(phase(f)) + 0.3 * np.sin(2 * phase(f))) * env * 0.5 + bp(r.standard_normal(n), 2500, 9000, 1) * env * 0.35
    return y


def bell(r, f=196.0, a=0.8, d=3.0):
    return modal(d, [(f, 1.0, 1.4), (f * 2.0, 0.6, 1.0), (f * 2.4, 0.45, 0.8), (f * 3.0, 0.3, 0.6), (f * 4.2, 0.2, 0.35), (f * 5.4, 0.12, 0.2)], r) * a


def fire(dur, r, a=1.0):
    n = ns(dur)
    y = lp(colored(n, r, 0.8), 900, 2) * (0.5 + 0.5 * smooth_noise(n, r, 9)) * 0.5
    y += rattle(dur, r, 22, None, heavy=False)[:n] * 0.5
    return fades(y * a, 0.2, 0.3)


def puff_snd(r, a=0.5):
    t = tt(0.3)
    return lp(r.standard_normal(len(t)), 1400, 2) * np.sin(np.pi * np.clip(t / 0.3, 0, 1)) ** 0.6 * np.exp(-t / 0.09) * a


def tile_step(r, a=0.4):
    t = tt(0.12)
    return (modal(0.12, [(r.uniform(900, 1400), 0.7, 0.015), (r.uniform(2100, 3000), 0.4, 0.008)], r) + lp(r.standard_normal(len(t)), 600, 2) * np.exp(-t / 0.015)) * a


def soft_step(r, a=0.4):
    t = tt(0.2)
    nz = r.standard_normal(len(t))
    return (lp(nz, 450, 2) * np.exp(-t / 0.022) * 1.2 + bp(nz, 900, 3500, 1) * np.exp(-t / 0.03) * 0.15) * a


# ================================================================ music
def music(N):
    r = rng(11)
    out = np.zeros((2, N))
    END = N / SR
    D = 38  # D2

    def bass(t, m, v=0.7, d=0.7):
        place(out, pan(pluck(m2f(m), v, r, dur=d, bright=0.3, pos=0.22), 0.0), t, 0.8)

    def pz(t, m, v=0.5, p=0.2, d=0.5):
        place(out, pan(pluck(m2f(m), v, r, dur=d, bright=0.7, pos=0.12), p), t, 0.7)

    def tiptoe(t0, t1, beat, mel=True, drums=False, v=1.0, root=D):
        """sneaky two-bar vamp: bass on 1 and 3, off-beat plucks, optional brush"""
        bl = [0, 0, -2, -5, 0, 0, 3, -5]
        tune = [(0.5, 62), (1.5, 65), (2.5, 69), (3.5, 68), (4.5, 62), (5.5, 65), (6.5, 70), (7, 69), (7.5, 65)]
        t, i = t0, 0
        while t < t1 - 0.02:
            bar = (i // 4) % 8
            if i % 2 == 0:
                bass(t, root + bl[bar] + (7 if i % 4 == 2 else 0), 0.65 * v)
            if drums:
                place(out, pan(brush(0.35 * v, r, 0.12), 0.3), t + beat / 2, 0.8)
                if i % 4 in (1, 3):
                    place(out, pan(snare(0.3 * v, r, 0.2, snappy=0.6), -0.2), t, 0.5)
            t += beat
            i += 1
        if mel:
            t = t0
            while t < t1 - 0.02:
                for (b, m) in tune:
                    if t + b * beat < t1 - 0.05:
                        pz(t + b * beat, m + (root - D), 0.42 * v, 0.25 if int(b * 2) % 4 else -0.2)
                t += 8 * beat

    def box_tune(t0, notes, beat, v=0.4, tr=0):
        for (b, m) in notes:
            place(out, pan(musicbox(m2f(m + tr), v, r, 1.5), 0.2 * np.sin(b)), t0 + b * beat, 0.9)

    # --- hook (0 - 5.2 s): hit, then the tiptoe vamp
    place(out, pan(timpani(m2f(38), 0.9, r, 1.8), 0.0), 0.0, 1.0)
    place(out, cymbal(0.35, r, 1.6), 0.0, 0.35)
    bt = 60 / 108.0
    tiptoe(0.55, F(155), bt, mel=True)
    # --- the town (5.2 - 9.9): warm major pad + fife tune
    place(out, pad([m2f(50), m2f(57), m2f(62), m2f(66)], F(298) - F(155), 0.3, r, att=0.5, rel=0.6, warm=1400), F(155), 1.0)
    for (b, d, m) in [(0, 1, 74), (1, 0.5, 78), (1.5, 0.5, 81), (2, 1.5, 83), (3.5, 0.5, 81), (4, 1, 78), (5, 1, 76), (6, 1.5, 74)]:
        place(out, pan(fife(m2f(m), d * bt * 0.95, 0.42, r, rel=0.06), 0.12), F(160) + b * bt, 1.0)
    tk = F(160)
    while tk < F(296):
        bass(tk, 38 if int((tk - F(160)) / bt) % 4 < 2 else 33, 0.5)
        tk += 2 * bt
    # --- nights of missing things (9.9 - 25.3): tiptoe, glock falls on each theft
    tiptoe(F(298), F(760), bt, mel=True, drums=False)
    for f0 in (392, 420, 450):
        for j, m in enumerate([86, 81, 77, 74]):
            place(out, pan(glock(m2f(m), 0.4, r, 0.9), 0.3), F(f0) + j * 0.06, 0.6)
    # --- rooftops (25.3 - 29.7): faster, with brushes
    bf = 60 / 150.0
    tiptoe(F(760), F(890), bf, mel=True, drums=True, v=1.1, root=D + 2)
    place(out, pan(brush(0.5, r, 0.4, swish=True), 0.0), F(888), 0.7)
    # --- things come back (29.7 - 42.2): music-box major
    place(out, pad([m2f(50), m2f(57), m2f(62), m2f(66)], F(1268) - F(896), 0.26, r, att=1.2, rel=1.0, warm=1200), F(896), 1.0)
    bm = 60 / 96.0
    tune2 = [(0, 74), (1, 78), (2, 81), (3, 78), (4, 83), (5, 81), (6, 78), (7, 74), (8, 76), (9, 79), (10, 83), (11, 79), (12, 81), (13, 78), (14, 76), (15, 74)]
    box_tune(F(988), tune2, bm, 0.34)
    tk, i = F(900), 0
    while tk < F(1262):
        bass(tk, [38, 45, 43, 45][i % 4], 0.42, 1.0)
        tk += 2 * bm
        i += 1
    # the music box itself plays (f1170 - 1256)
    box_tune(F(1170), [(0, 86), (0.5, 90), (1, 93), (1.5, 90), (2, 95), (2.5, 93), (3, 90), (3.5, 86), (4, 88), (4.5, 91), (5, 95), (6, 93), (7, 90), (8, 86)], bm * 0.75, 0.42)
    # --- stakeout (42.2 - 53.5): heartbeat + thin tension pad, sparse plucks
    place(out, pad([m2f(38), m2f(45), m2f(53)], F(1606) - F(1272), 0.26, r, att=1.5, rel=0.3, warm=700), F(1272), 1.0)
    tk, i = F(1276), 0
    while tk < F(1600):
        place(out, pan(timpani(m2f(38), 0.22 + 0.18 * (tk - F(1276)) / 11, r, 0.6), 0.0), tk, 0.8)
        place(out, pan(timpani(m2f(38), 0.14, r, 0.5), 0.0), tk + 0.24, 0.7)
        if i % 2 == 1:
            pz(tk + 0.6, [62, 65, 68, 65][(i // 2) % 4], 0.3, 0.3)
        tk += 1.1
        i += 1
    place(out, pan(bell(r, 146.8, 0.5, 3.0), 0.0), F(1432), 0.7)
    # --- the town comes running (53.5 - 56.3): snare roll + timpani build
    for (ts, vs) in snare_roll(F(1606), F(1690), 0.15, 0.75, r):
        place(out, pan(snare(vs, r, 0.2, snappy=0.8), -0.1), ts, 0.45)
    tk = F(1606)
    while tk < F(1686):
        u = (tk - F(1606)) / (F(1686) - F(1606))
        place(out, pan(timpani(m2f(38 + (2 if u > 0.6 else 0)), 0.3 + 0.5 * u, r, 0.7), 0.1), tk, 0.9)
        tk += 0.36 - 0.14 * u
    place(out, cymbal(0.5, r, 1.2), F(1688), 0.4)
    # --- "You see" (56.5): music stops; low warm pad + lone music box
    STOP = F(1692)
    place(out, pad([m2f(38), m2f(45), m2f(50), m2f(57)], F(2112) - STOP, 0.3, r, att=1.4, rel=1.5, warm=600), STOP + 0.3, 1.0)
    for (fr, m) in [(1716, 74), (1744, 69), (1790, 77), (1816, 74), (1856, 72), (1892, 69), (1920, 74), (1940, 77), (1966, 81), (2002, 74), (2040, 69), (2066, 65), (2090, 62)]:
        place(out, pan(musicbox(m2f(m), 0.36, r, 1.8), 0.2), F(fr), 0.85)
    # --- trial + workshop (70.4 - 82): gentle major groove
    place(out, pad([m2f(50), m2f(57), m2f(62), m2f(66)], F(2462) - F(2112), 0.28, r, att=0.8, rel=0.5, warm=1500), F(2112), 1.0)
    tk, i = F(2116), 0
    while tk < F(2456):
        bass(tk, [38, 45, 43, 45, 38, 42, 43, 45][i % 8], 0.55, 0.9)
        if tk > F(2204):
            place(out, pan(brush(0.3, r, 0.12), 0.3), tk + bm / 2, 0.8)
            pz(tk + bm / 2, [78, 81, 83, 81, 78, 74, 76, 78][i % 8], 0.4, -0.2)
        tk += bm
        i += 1
    place(out, pan(timpani(m2f(38), 0.8, r, 1.6), 0.0), F(2200), 1.0)
    place(out, cymbal(0.4, r, 1.8), F(2200), 0.4)
    for (b, d, m) in [(0, 1, 74), (1, 0.5, 78), (1.5, 0.5, 81), (2, 1.5, 83), (3.5, 0.5, 81), (4, 1, 86), (5, 1, 83), (6, 2, 81), (8, 1, 78), (9, 1, 81), (10, 2, 74)]:
        place(out, pan(fife(m2f(m), d * bm * 0.95, 0.4, r, rel=0.07), 0.12), F(2232) + b * bm, 1.0)
    # --- twist (82.1): music stops, low drone; hit + ting on the last word
    place(out, pan(brush(0.5, r, 0.4, swish=True), 0.0), F(2458), 0.7)
    place(out, pad([m2f(38), m2f(45)], F(2540) - F(2462), 0.3, r, att=0.4, rel=1.2, warm=420), F(2462), 1.0)
    LAST = F(2508)
    place(out, pan(timpani(m2f(38), 0.9, r, 1.8), 0.0), LAST, 1.1)
    place(out, pan(glock(m2f(86), 0.6, r, 1.6), 0.25), LAST + 0.02, 0.8)
    place(out, pan(triangle(0.35, r, 1.4), 0.3), LAST + 0.02, 0.5)
    place(out, pan(musicbox(m2f(74), 0.5, r, 1.6), -0.2), LAST + 0.12, 0.8)
    # --- outro (84.3 - 88.3): warm D-major resolution under the goodbye wave, gentle fade to the end
    OUT = F(2526)
    place(out, pad([m2f(50), m2f(57), m2f(62), m2f(66)], END - OUT, 0.3, r, att=1.0, rel=1.4, warm=1300), OUT, 1.0)
    for k, m in enumerate([38, 45, 43, 45, 38]):
        bass(F(2560) + k * 2 * bm, m, 0.45, 1.2)
    for (b, m) in [(0, 74), (1, 78), (2, 81), (3, 83), (4, 81), (5, 78), (6, 81), (7, 86)]:
        place(out, pan(musicbox(m2f(m), 0.42, r, 1.8), 0.15), F(2560) + b * bm * 0.75, 0.85)
        if b % 2 == 0: pz(F(2560) + b * bm * 0.75, m - 12, 0.3, -0.2, 0.6)
    FIN = F(2560) + 7 * bm * 0.75
    place(out, pan(glock(m2f(86), 0.45, r, 2.4), 0.2), FIN, 0.7)
    place(out, pan(triangle(0.25, r, 2.0), 0.3), FIN, 0.4)
    place(out, pan(timpani(m2f(38), 0.4, r, 2.0), 0.0), FIN, 0.7)
    ir = make_ir(1.2, 5, hf=1.4)
    out = out + 0.15 * convolve_st(out, ir)
    return fades(out, 0.0, 1.3)


# ================================================================ sfx
def sfx(N):
    r = rng(23)
    out = np.zeros((2, N))
    END = N / SR
    P = lambda x, f, g=0.5, p=0.0: place(out, pan(x, p), F(f), g)
    # ambience: quiet air everywhere, crickets at night outdoors, birds by day outdoors
    out += breeze(END, r, 0.3, 0.12, 800) * 0.4
    for a, b in [(298, 378), (1265, 1312), (1846, 1886), (1934, 1962)]:
        place(out, widen(crickets(F(b) - F(a), r, 3), r), F(a), 0.035)
    for a, b in [(155, 298), (568, 680), (890, 1036), (1966, 2162), (2224, 2521)]:
        place(out, widen(bird_chirps(F(b) - F(a), r, 0.7), r), F(a), 0.07)
    for a, b in [(0, 155), (1606, 1783)]:
        place(out, widen(fire(F(b) - F(a), r, 1.0), r), F(a), 0.08)
    # hook
    P(whoosh(0.5, r, 0.1, 300, 2400, 0.9, 0.3), 0, 0.4)
    place(out, widen(babble(1.4, r, 190, 1.0, rate=5), r), F(52), 0.12)
    place(out, widen(babble(1.2, r, 130, 1.1, rate=5), r), F(56), 0.12)
    for fs in (102, 110, 118): P(soft_step(r, 0.3), fs, 0.5)
    P(wood_thud(r, 0.6, 120), 127, 0.5, -0.1)
    # town
    P(whoosh(1.6, r, 1.0, 200, 1500, 1.0, 0.5, 0.05), 150, 0.2)
    for fs in np.arange(236, 296, 9.5): P(stroll_step(r, 0.5) * 0.4, fs, 0.4, r.uniform(-0.4, 0.4))
    # sneak across the street
    for fs in np.arange(302, 376, 12.5): P(soft_step(r, 0.35), fs, 0.5, (fs - 340) / 80)
    # thefts
    for f0, p in [(392, -0.1), (420, 0.1), (450, 0.0)]:
        P(zip_up(r), f0 - 1, 0.4, p); P(puff_snd(r, 0.5), f0 + 2, 0.5, p)
    P(ting(r, 3136, 0.3, 0.6), 463, 0.4)
    # the mayor sits on nothing
    for fs in (496, 503, 510): P(soft_step(r, 0.3), fs, 0.5)
    P(whoosh(0.3, r, 0.25, 250, 1500, 0.8, 0.05), 519, 0.35)
    P(wood_thud(r, 1.2, 70), 527, 0.6); P(puff_snd(r, 0.7), 528, 0.5)
    # door slam + bolts, nails
    P(whoosh(0.25, r, 0.2, 300, 1800, 0.8, 0.05), 591, 0.35)
    P(wood_thud(r, 1.3, 85), 597, 0.6, -0.1)
    for fb in (608, 616): P(clink(r, f0=1900, dur=0.14, bright=0.8) * 0.8, fb, 0.5, -0.1); P(knock(r, 0.4), fb, 0.5, -0.1)
    P(wood_thud(r, 0.7, 150), 641, 0.45); P(wood_thud(r, 0.7, 140), 655, 0.45)
    for fh in (641, 655, 664, 671): P(hammer_hit(r, 0.8), fh, 0.42, 0.15)
    # cupboard
    P(creak(0.85, r, 90, 150), 688, 0.3, 0.1)
    for k in range(3):
        d = 0.9; t = tt(d)
        sn = bp(r.standard_normal(len(t)), 180, 900, 1) * np.sin(np.pi * t / d) ** 2 * (1 + 0.6 * np.sin(2 * np.pi * 26 * t)) * 0.5
        P(sn, 700 + k * 22, 0.3, 0.1)
    # rooftops
    for fs in np.arange(762, 888, 4.3): P(tile_step(r, r.uniform(0.25, 0.4)), fs, 0.45, r.uniform(-0.5, 0.5))
    P(whoosh(1.0, r, 0.6, 300, 2400, 1.0, 0.3, 0.2), 756, 0.25)
    for fc in (838, 858): P(whoosh(0.6, r, 0.45, 500, 4000, 0.7, 0.12, 0.25), fc - 14, 0.35)
    # strange... everything came back
    P(ting(r, 2093, 0.3, 0.8), 953, 0.4)
    for i, f0 in enumerate((990, 1000, 1010)): P(ting(r, [2637, 3136, 3520][i], 0.45, 1.0), f0 + 1, 0.45, -0.3 + 0.3 * i); P(puff_snd(r, 0.3), f0, 0.4)
    for i, fs in enumerate(np.arange(1040, 1090, 15)): P(knock(r, 0.3), fs, 0.5, -0.1); P(ting(r, 1800 if i % 2 else 1500, 0.12, 0.15), fs, 0.5, -0.1)
    P(kettle_whistle(F(1150) - F(1104), r), 1104, 0.22, 0.1)
    P(clink(r, f0=2400, dur=0.12), 1164, 0.4)
    for fs in np.arange(1212, 1262, 7.5): P(soft_step(r, 0.3), fs, 0.45)
    # stakeout
    P(whoosh(1.2, r, 0.8, 200, 1400, 1.0, 0.4, 0.05), 1266, 0.2)
    for fs in np.arange(1316, 1364, 12): P(soft_step(r, 0.3), fs, 0.5, 0.2)
    P(creak(0.3, r, 140, 180), 1368, 0.2, -0.2)
    for i, fw in enumerate((1458, 1470, 1482, 1494)): P(creak(0.36, r, 120 + 25 * i, 200 + 30 * i), fw, 0.3, 0.0)
    P(wood_thud(r, 0.7, 110), 1546, 0.5); P(puff_snd(r, 0.4), 1547, 0.4)
    for fs in np.arange(1562, 1604, 7.5): P(soft_step(r, 0.3), fs, 0.45)
    # the whole town came running
    for fs in np.arange(1608, 1688, 2.2): P(boot(r, 0.6) * r.uniform(0.3, 0.6), fs, 0.35, r.uniform(-0.7, 0.7))
    for k in range(5): place(out, pan(babble(F(1688) - F(1612), r, [120, 200, 150, 240, 170][k], 1.0 + 0.05 * k, rate=5.5), -0.6 + 0.3 * k), F(1612), 0.07)
    # candlelight mending
    for fs in np.arange(1848, 1884, 12.5): P(soft_step(r, 0.3), fs, 0.45)
    for fh in (1895, 1907, 1919, 1931): P(knock(r, 0.6), fh, 0.45, -0.1)
    P(ting(r, 3136, 0.4, 1.0), 1917, 0.4)
    P(wood_thud(r, 0.5, 130), 1959, 0.45, -0.2); P(ting(r, 2637, 0.4, 1.0), 1965, 0.4)
    for fs in np.arange(1964, 1990, 9): P(soft_step(r, 0.3), fs, 0.45, 0.3)
    # nobody opened the door
    for fk in (2002, 2008, 2014, 2028, 2034): P(knock(r, 0.9), fk, 0.5, -0.15)
    place(out, breeze(F(2108) - F(2050), r, 1.0, 0.4, 700), F(2050), 0.5)
    # trial, verdict, cheers
    for k in range(4): place(out, pan(babble(F(2196) - F(2110), r, [130, 210, 160, 230][k], 1.0, rate=4.5, active=0.6), -0.6 + 0.4 * k), F(2110), 0.05)
    P(hammer_hit(r, 1.1), 2200, 0.5); P(wood_thud(r, 1.0, 90), 2200, 0.5)
    for k in range(9): P(hurrah(r, [140, 230, 180, 300, 160, 250, 200, 320, 150][k], 1.0, kid=k in (3, 7)), 2206 + k * 5 + r.integers(0, 4), 0.16, -0.8 + 0.2 * k)
    dA = 3.0; nA = ns(dA); env = np.interp(np.arange(nA) / SR, [0, 0.4, 1.6, dA], [0, 1, 0.7, 0])
    place(out, applause(dA, r, 22, env), F(2206), 0.1)
    P(whoosh(1.4, r, 0.9, 200, 1500, 1.0, 0.4, 0.05), 2226, 0.2)
    for fsp, fq in [(2333, 2637), (2341, 3136), (2385, 3520)]: P(ting(r, fq, 0.4, 1.0), fsp, 0.4, 0.2)
    for fh in np.arange(2370, 2412, 14): P(knock(r, 0.6), fh, 0.4, -0.1)
    for fs in np.arange(2414, 2456, 9.5): P(stroll_step(r, 0.5) * 0.4, fs, 0.4, 0.3)
    # the step
    for fs in np.arange(2463, 2486, 4.5): P(soft_step(r, 0.35), fs, 0.5, 0.3)
    P(wood_thud(r, 0.5, 160), 2488, 0.45, 0.2)
    P(creak(0.4, r, 110, 160), 2489, 0.25, -0.1)
    P(ting(r, 3520, 0.5, 1.4), 2505, 0.45, 0.2)
    # outro: sparkles and a few birds while everyone waves
    P(ting(r, 3136, 0.4, 1.2), 2566, 0.35, -0.2); P(ting(r, 3951, 0.35, 1.2), 2590, 0.3, 0.2)
    P(whoosh(1.2, r, 0.8, 300, 2000, 1.0, 0.4, 0.05), 2558, 0.15)
    return fades(out, 0.01, 1.0)


if __name__ == "__main__":
    voice, outdir = sys.argv[1], sys.argv[2]
    N = voice_len(voice)
    m = music(N)
    s = sfx(N)
    write_wav(f"{outdir}/music.wav", m / max(1e-9, np.abs(m).max()) * 0.5)
    write_wav(f"{outdir}/sfx.wav", s / max(1e-9, np.abs(s).max()) * 0.5)
    print("stems written", N / SR, "s")

#!/usr/bin/env python3
"""Music + SFX for "అత్త పుట్టింటికి వెళ్ళింది" (original synthesis). Times are in seconds on voice.wav's clock.
usage: python3 tel_audio.py <voice_padded.wav> <outdir>  -> outdir/tel_music.wav, outdir/tel_sfx.wav"""
import sys
import numpy as np
from dsp import SR, tt, rng, lp, hp, bp, fades, pan, place, make_ir, convolve_st, write_wav
from instruments import m2f, pluck, pad, fife, glock, musicbox, timpani, cymbal, triangle
from sfx_gen import whoosh, bird_chirps, breeze, creak, bubbles
from audio import dholak, shaker, knock, ting, kettle_whistle, fire, puff_snd, wood_thud, voice_len

D = 50  # D3 tonic (D major / Mixolydian flavour)
BPM = 104.0
B = 60.0 / BPM


def groove(out, r, t0, t1, vel=0.6, busy=1, flute=None, bass=True):
    """dholak + shaker + pluck bass; optional fife melody [(beat, beats, midi)]"""
    t, i = t0, 0
    pat = ["L", "H", "H", "L", "H", "L", "H", "H"] if busy else ["L", "H", "-", "H", "L", "-", "H", "-"]
    while t < t1 - 0.05:
        k = pat[i % 8]
        if k != "-": place(out, pan(dholak(k, vel * (1.0 if k == "L" else 0.75), r), 0.1 if k == "H" else -0.05), t, 0.9)
        if busy and i % 2 == 1: place(out, pan(shaker(0.25 * vel, r), 0.35), t, 0.6)
        if bass and i % 4 == 0: place(out, pan(pluck(m2f([D - 12, D - 12, D - 5, D - 10][(i // 4) % 4]), 0.55 * vel, r, dur=0.8, bright=0.3, pos=0.22), 0), t, 0.8)
        t += B / 2; i += 1
    if flute:
        for (b, d, m) in flute:
            if t0 + b * B < t1: place(out, pan(fife(m2f(m), d * B * 0.95, 0.42, r, rel=0.06), 0.15), t0 + b * B, 0.8)


def music(N):
    r = rng(5)
    out = np.zeros((2, N)); END = N / SR
    TUNE = [(0, 1, 74), (1, .5, 76), (1.5, .5, 78), (2, 1, 81), (3, 1, 78), (4, .5, 76), (4.5, .5, 78), (5, 1, 76), (6, 2, 74)]
    # 0 - 5.6: happy hook groove
    groove(out, r, 0.0, 5.55, 0.6, 1, TUNE)
    # 5.6: record scratch + stop; 5.86-9.6 sad low pad with lone plucks
    place(out, pad([m2f(D - 12), m2f(D - 5), m2f(D + 1)], 4.0, 0.3, r, att=0.5, rel=1.2, warm=500), 5.9, 1.0)
    for k, m in enumerate([D + 12, D + 10, D + 8, D + 5]): place(out, pan(pluck(m2f(m), 0.4, r, dur=1.4, bright=0.45), -0.2), 6.0 + k * 0.9, 0.7)
    # 9.65 - 21.5: light pizzicato under the bus-stand talk (sparse, stays out of the words)
    for k in range(16):
        tk = 9.7 + k * B * 1.5
        place(out, pan(pluck(m2f([D + 12, D + 16, D + 19, D + 16][k % 4]), 0.22, r, dur=0.5, bright=0.6, pos=0.12), 0.25), tk, 0.6)
    # 21.6 - 28.2: bus leaves -> build, punch at 25.95
    for k in range(8): place(out, pan(dholak("H", 0.3 + 0.07 * k, r), 0.1), 21.7 + k * 0.5, 0.8)
    place(out, cymbal(0.5, r, 1.6), 25.95, 0.5)
    groove(out, r, 25.95, 28.2, 0.65, 1, [(0, 1, 81), (1, 1, 83), (2, 2, 86)])
    # 28.2 - 35.7: lazy happy groove (first day)
    groove(out, r, 28.2, 35.7, 0.45, 0, [(0, 2, 74), (2, 1, 78), (3, 1, 76), (4, 3, 74), (8, 2, 78), (10, 1, 81), (11, 1, 78), (12, 3, 76)])
    # 35.75 - 54.7: chaos (second day) — faster, tense, minor colour, hits on the gags
    t, i = 35.75, 0
    while t < 54.6:
        place(out, pan(dholak("L" if i % 4 == 0 else "H", 0.55 if i % 4 == 0 else 0.4, r), 0.05), t, 0.9)
        if i % 2 == 0: place(out, pan(pluck(m2f([D + 13, D + 12, D + 15, D + 13][(i // 2) % 4]), 0.3, r, dur=0.3, bright=0.7), -0.25), t, 0.6)
        t += B / 3; i += 1
    for th in [35.9, 41.6, 48.85]: place(out, pan(timpani(m2f(D - 12), 0.6, r, 1.2), 0), th, 0.8)
    # 50.3 sad droop for the wilted tulasi
    place(out, pan(fife(m2f(D + 7), 0.9, 0.35, r), 0.1), 50.4, 0.6); place(out, pan(fife(m2f(D + 3), 1.2, 0.3, r), 0.1), 51.3, 0.6)
    # 54.7 - 61.2: sad flute over a pad
    place(out, pad([m2f(D - 12), m2f(D - 5), m2f(D + 3)], 6.6, 0.3, r, att=1.0, rel=1.4, warm=700), 54.7, 1.0)
    for (b, d, m) in [(0, 2, 74), (2, 2, 72), (4, 3, 69), (8, 4, 65)]: place(out, pan(fife(m2f(m), d * 0.5, 0.32, r, rel=0.12), 0.15), 54.9 + b * 0.5, 0.7)
    # 61.2 - 63.1: silence for the knocks
    # 63.15: door opens — rising glock + warm major pad
    for k, m in enumerate([74, 78, 81, 86, 90]): place(out, pan(glock(m2f(m), 0.35, r, 1.4), 0.2), 63.2 + k * 0.08, 0.6)
    place(out, pad([m2f(D - 12), m2f(D - 5), m2f(D + 4)], 8.0, 0.28, r, att=0.6, rel=1.4, warm=1200), 63.2, 1.0)
    # 71.2 - 80.7: emotional flashback — music box + pad
    place(out, pad([m2f(D - 12), m2f(D - 3), m2f(D + 2)], 9.6, 0.28, r, att=1.2, rel=1.6, warm=800), 71.2, 1.0)
    for k, m in enumerate([86, 83, 81, 78, 81, 83, 78, 74, 76, 78, 74]): place(out, pan(musicbox(m2f(m), 0.4, r, 1.6), -0.15), 71.6 + k * 0.82, 0.8)
    # 80.7 - end: warm finale groove, gentle, resolves on D
    groove(out, r, 80.7, 91.0, 0.42, 0, [(0, 1, 74), (1, 1, 78), (2, 2, 81), (4, 1, 83), (5, 1, 81), (6, 2, 78), (8, 1, 76), (9, 1, 78), (10, 2, 74), (12, 2, 78), (14, 2, 81), (16, 4, 86)])
    place(out, pad([m2f(D - 12), m2f(D - 5), m2f(D + 4), m2f(D + 7)], END - 90.8, 0.3, r, att=0.4, rel=1.6, warm=1400), 90.8, 1.0)
    place(out, pan(glock(m2f(86), 0.5, r, 2.4), 0.2), 90.9, 0.7); place(out, pan(triangle(0.3, r, 2.0), 0.3), 90.9, 0.4)
    ir = make_ir(1.1, 5, hf=1.3)
    out = out + 0.14 * convolve_st(out, ir)
    return fades(out, 0.0, 1.5)


def scratch(r):
    t = tt(0.32)
    f = np.interp(t, [0, 0.12, 0.32], [2600, 700, 1800])
    ph = np.cumsum(f) / SR
    return (np.sin(2 * np.pi * ph) * 0.3 + bp(r.standard_normal(len(t)), 900, 4000, 1) * 0.6) * np.exp(-t / 0.18)


def horn(r, d=0.45):
    t = tt(d)
    y = np.sign(np.sin(2 * np.pi * 415 * t)) * 0.4 + np.sign(np.sin(2 * np.pi * 523 * t)) * 0.3
    return lp(y, 2200) * np.minimum(1, t / 0.02) * np.minimum(1, (d - t) / 0.05)


def engine(dur, r, a=1.0):
    t = tt(dur)
    y = lp(r.standard_normal(len(t)), 140, 2) * (0.8 + 0.2 * np.sin(2 * np.pi * 28 * t))
    return y * a


def click(r):
    t = tt(0.05)
    return bp(r.standard_normal(len(t)), 2000, 6000, 1) * np.exp(-t / 0.006)


def sfx(N):
    r = rng(9)
    out = np.zeros((2, N))
    P = lambda x, t, g=0.5, p=0.0: place(out, x if x.ndim == 2 else pan(x, p), t, g)
    # whip-pan whooshes on the human-style cuts
    for tw in [2.72, 21.57, 28.17, 35.72, 61.17, 80.67]: P(whoosh(0.45, r, 0.6, 400, 2600, 0.8, 0.2, 0.08), tw - 0.1, 0.35)
    # bus stand ambience + engine
    P(breeze(9.6, r, 0.5), 0.0, 0.25); P(engine(9.0, r, 0.6), 0.0, 0.25)
    P(breeze(12.0, r, 0.5), 9.65, 0.18); P(engine(12.0, r, 0.4), 9.65, 0.15)
    P(engine(3.2, r, 1.0), 21.6, 0.45); P(horn(r), 21.75, 0.35, -0.2)
    P(breeze(6.6, r, 0.5), 21.6, 0.2)
    P(scratch(r), 5.6, 0.55)                                                             # freeze-frame scratch
    P(fire(2.0, r, 0.6), 7.6, 0.25)                                                      # day-two smoke
    P(bird_chirps(2.8, r, 0.6), 28.2, 0.3)                                               # morning, still asleep
    P(ting(r, 1760, 0.35, 0.6), 31.3, 0.3)                                               # bowl
    for k in range(int(2.0 * 30 / 9)): P(click(r), 33.75 + k * 9 / 30, 0.35, 0.2)          # TV channel clicks
    P(bubbles(2.8, r, 18), 35.9, 0.35); P(fire(2.8, r, 0.8), 35.9, 0.3)                  # milk boils over
    for k in range(4): P(kettle_whistle(0.45, r), 38.75 + k * 0.7, 0.4, -0.1)           # cooker whistles
    P(fire(2.0, r, 1.0), 41.5, 0.4)                                                      # dal burning
    P(ting(r, 330, 0.5, 0.6), 48.85, 0.3)                                                # reaction sting
    P(creak(0.5, r, 90, 140), 59.4, 0.25)                                                # phone set down / sigh
    P(wood_thud(r, 0.6, 140), 59.9, 0.3)
    for tk in [61.28, 61.5]: P(knock(r, 1.0), tk, 0.6, 0.1)                              # ఠక్ ఠక్
    P(creak(0.9, r, 110, 170), 63.2, 0.35)                                               # door opens
    P(puff_snd(r, 0.5), 77.0, 0.35)                                                      # thought bubble pops in
    P(fire(3.2, r, 0.35), 80.7, 0.2)                                                     # gentle cooking sizzle
    P(ting(r, 2637, 0.5, 1.2), 84.35, 0.35); P(ting(r, 3136, 0.4, 1.2), 84.9, 0.3)       # sparkle + heart
    return fades(out, 0.01, 1.0)


if __name__ == "__main__":
    voice, outdir = sys.argv[1], sys.argv[2]
    N = voice_len(voice)
    m = music(N); s = sfx(N)
    write_wav(f"{outdir}/tel_music.wav", m / max(1e-9, np.abs(m).max()) * 0.5)
    write_wav(f"{outdir}/tel_sfx.wav", s / max(1e-9, np.abs(s).max()) * 0.5)
    print("stems", N / SR, "s")

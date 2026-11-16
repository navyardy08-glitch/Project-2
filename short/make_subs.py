#!/usr/bin/env python3
"""make_subs.py -> work/subs.ass : burned-in captions from work/phrases.json + the outro "Thanks for watching!" card.
Long phrases are split into short chunks (<= 6 words) timed by their share of characters."""
import json, re

FPS = 30
P = json.load(open("work/phrases.json"))
THANKS = (2568, 2650)


def ts(f):
    s = f / FPS
    return f"{int(s // 3600)}:{int(s % 3600 // 60):02d}:{s % 60:05.2f}"


def chunks(text, maxw=6):
    words = text.split()
    if len(words) <= maxw:
        return [text]
    n = -(-len(words) // maxw)
    # prefer breaking right after a comma near the even split point
    out, cur = [], []
    target = len(words) / n
    for i, w in enumerate(words):
        cur.append(w)
        left = len(words) - i - 1
        if left and (len(cur) >= target + 1 or (len(cur) >= target - 1 and w.endswith(",")) or (len(cur) >= target and left >= 2)):
            out.append(" ".join(cur)); cur = []
    if cur:
        if len(cur) == 1 and out: out[-1] += " " + cur[0]
        else: out.append(" ".join(cur))
    return out


events = []
for p in P:
    parts = chunks(p["text"])
    total = sum(len(c) for c in parts)
    f = p["f0"]
    for c in parts:
        d = (p["f1"] - p["f0"]) * len(c) / total
        events.append([round(f), round(f + d), c])
        f += d
# hold each caption until the next one if the gap is short, so captions don't flicker
for i, e in enumerate(events):
    nxt = events[i + 1][0] if i + 1 < len(events) else e[1] + 12
    e[1] = nxt if nxt - e[1] <= 14 else e[1] + 8

head = """[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Cap,Inter Black,78,&H00FFFFFF,&H00FFFFFF,&H00201820,&H80000000,0,0,0,0,100,100,1.5,0,1,8,3,2,90,90,470,1
Style: Thanks,Inter Black,118,&H0070E4FF,&H00FFFFFF,&H00201820,&H90000000,0,0,0,0,100,100,1,0,1,9,5,2,60,60,420,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
lines = []
for a, b, t in events:
    lines.append(f"Dialogue: 0,{ts(a)},{ts(b)},Cap,,0,0,0,,{{\\fad(60,60)}}{t}")
pop = r"{\fad(250,0)\fscx55\fscy55\t(0,260,\fscx110\fscy110)\t(260,420,\fscx100\fscy100)}"
lines.append(f"Dialogue: 1,{ts(THANKS[0])},{ts(THANKS[1])},Thanks,,0,0,0,,{pop}Thanks for\\Nwatching!")
open("work/subs.ass", "w").write(head + "\n".join(lines) + "\n")
print(len(events), "captions")
for a, b, t in events[:6] + events[-3:]:
    print(a, b, t)

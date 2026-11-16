#!/usr/bin/env python3
"""thumbs2.py -> out/thumbs/: 5 more thumbnail designs with smaller, punchier sticker-style text.
Each as vertical 1080x1920 and landscape 1280x720."""
import os, math
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageEnhance

BLACK = "/usr/share/fonts/opentype/inter/InterDisplay-Black.otf"
OUT = "out/thumbs"
os.makedirs(OUT, exist_ok=True)
YEL, WHT, INK, RED = (255, 214, 64), (255, 255, 255), (24, 18, 32), (226, 48, 52)


def fr(n):
    img = Image.open(f"frames/f{n:04d}.jpg").convert("RGB")
    img = ImageEnhance.Color(img).enhance(1.2)
    return ImageEnhance.Contrast(img).enhance(1.12).convert("RGBA")


def font(s):
    return ImageFont.truetype(BLACK, s)


def tag(im, txt, cx, y, size, bg=RED, fg=WHT, tilt=-4):
    """sticker: rounded box with text, slightly tilted, drop shadow"""
    f = font(size)
    d0 = ImageDraw.Draw(im)
    w = int(d0.textlength(txt, font=f)); h = int(size * 1.0)
    px, py = int(size * 0.38), int(size * 0.24)
    W, H = w + 2 * px, h + 2 * py
    st = Image.new("RGBA", (W + 40, H + 40), (0, 0, 0, 0))
    d = ImageDraw.Draw(st)
    d.rounded_rectangle([24, 26, W + 24, H + 26], radius=int(size * 0.28), fill=(0, 0, 0, 110))
    d.rounded_rectangle([16, 16, W + 16, H + 16], radius=int(size * 0.28), fill=bg, outline=INK, width=max(4, size // 16))
    d.text((16 + px, 16 + py - size * 0.06), txt, font=f, fill=fg)
    st = st.rotate(tilt, resample=Image.BICUBIC, expand=True)
    im.alpha_composite(st, (int(cx - st.width / 2), int(y)))
    return y + st.height - int(size * 0.25)


def big(im, txt, cx, y, size, col=YEL, maxw=980):
    d = ImageDraw.Draw(im)
    f = font(size)
    while d.textlength(txt, font=f) > maxw:
        size -= 4; f = font(size)
    w = d.textlength(txt, font=f)
    sw = max(5, size // 10)
    d.text((cx - w / 2 + sw * 0.7, y + sw), txt, font=f, fill=(0, 0, 0, 140), stroke_width=sw, stroke_fill=(0, 0, 0, 140))
    d.text((cx - w / 2, y), txt, font=f, fill=col, stroke_width=sw, stroke_fill=INK)
    return y + int(size * 1.1)


def ring(im, cx, cy, r, width=14):
    d = ImageDraw.Draw(im)
    for k in range(3):  # slightly hand-drawn double stroke
        rr = r + k * 3
        d.ellipse([cx - rr * 1.05, cy - rr * 0.92, cx + rr * 1.05, cy + rr * 0.92], outline=RED, width=width - k * 4)


def arrow(im, x0, y0, x1, y1, width=18):
    d = ImageDraw.Draw(im)
    d.line([(x0, y0), (x1, y1)], fill=INK, width=width + 10)
    d.line([(x0, y0), (x1, y1)], fill=RED, width=width)
    a = math.atan2(y1 - y0, x1 - x0); L = width * 3.2
    pts = [(x1 + math.cos(a) * width, y1 + math.sin(a) * width),
           (x1 - math.cos(a - 0.5) * L, y1 - math.sin(a - 0.5) * L),
           (x1 - math.cos(a + 0.5) * L, y1 - math.sin(a + 0.5) * L)]
    d.polygon(pts, fill=RED, outline=INK, width=6)


def shade(im, top=True, bottom=False, depth=640, a=190):
    g = Image.new("L", (1, im.height))
    for y in range(im.height):
        v = 0
        if top: v = max(v, a * max(0, 1 - y / depth) ** 1.5)
        if bottom: v = max(v, a * max(0, 1 - (im.height - 1 - y) / depth) ** 1.5)
        g.putpixel((0, y), int(v))
    s = Image.new("RGBA", im.size, INK + (0,)); s.putalpha(g.resize(im.size))
    return Image.alpha_composite(im, s)


def landscape(src, box, draw_text, ann=None):
    """blurred fill + subject crop on the right + text drawn by draw_text(L, x_right_limit)"""
    L = src.convert("RGB").resize((1280, int(1920 * 1280 / 1080))).crop((0, 300, 1280, 1020)).filter(ImageFilter.GaussianBlur(26))
    L = ImageEnhance.Brightness(L).enhance(0.5).convert("RGBA")
    crop = src.crop(box)
    s = 720 / crop.height
    crop = crop.resize((int(crop.width * s), 720))
    x0 = 1280 - crop.width + 30
    m = Image.new("L", crop.size, 255); md = ImageDraw.Draw(m)
    for i in range(80): md.line([(i, 0), (i, 720)], fill=int(255 * i / 80))
    L.paste(crop, (x0, 0), m)
    if ann: ann(L, lambda x, y: (x0 + (x - box[0]) * s, (y - box[1]) * s), s)
    draw_text(L, x0)
    return L


def save(name, v, L):
    v.convert("RGB").save(f"{OUT}/{name}_vertical_1080x1920.jpg", quality=93)
    L.convert("RGB").save(f"{OUT}/{name}_youtube_1280x720.jpg", quality=93)
    print("wrote", name)


# 4 -- "secret": sad close-up
src = fr(1720)
v = shade(src, top=True, depth=700)
y = tag(v, "NOBODY KNEW", 540, 110, 84, tilt=-3)
big(v, "HIS SECRET...", 540, y + 10, 104)
def t4(L, xr):
    cx = 40 + (xr - 40) / 2
    y = tag(L, "NOBODY KNEW", cx, 190, 62, tilt=-3)
    big(L, "HIS SECRET...", cx, y + 8, 76, maxw=xr - 60)
save("secret", v, landscape(src, (100, 330, 1080, 1500), t4))

# 5 -- "fixes": mending the kettle by candlelight, ring + arrow on the kettle
src = fr(1900)
v = shade(src, top=True, depth=650)
y = tag(v, "STEALS IT.", 540, 90, 78, tilt=-4)
y = tag(v, "FIXES IT.", 540, y, 78, bg=YEL, fg=INK, tilt=3)
big(v, "RETURNS IT?!", 540, y + 6, 100)
ring(v, 255, 1240, 190); arrow(v, 640, 1550, 420, 1360)
def a5(L, P, s):
    cx, cy = P(255, 1240); ring(L, cx, cy, 190 * s, 10)
def t5(L, xr):
    cx = 30 + (xr - 30) / 2
    y = tag(L, "STEALS IT.", cx, 120, 56, tilt=-4)
    y = tag(L, "FIXES IT.", cx, y, 56, bg=YEL, fg=INK, tilt=3)
    big(L, "RETURNS IT?!", cx, y + 6, 70, maxw=xr - 50)
save("fixes", v, landscape(src, (0, 600, 1080, 1700), t5, a5))

# 6 -- "before / after": the same kettle, stolen vs returned
a, b = fr(1915), fr(1120)
v = Image.new("RGBA", (1080, 1920), INK + (255,))
v.paste(a.crop((0, 780, 1080, 1730)), (0, 0)); v.paste(b.crop((0, 500, 1080, 1450)), (0, 970))
ImageDraw.Draw(v).rectangle([0, 948, 1080, 972], fill=WHT)
tag(v, "BROKEN", 270, 60, 86, tilt=-5)
tag(v, "FIXED & RETURNED!", 540, 1010, 76, bg=YEL, fg=INK, tilt=3)
big(v, "WHO DID THIS?", 540, 1740, 92, col=WHT)
L = Image.new("RGBA", (1280, 720), INK + (255,))
L.paste(a.crop((0, 860, 1080, 1720)).resize((630, 502)), (0, 218)); L.paste(b.crop((0, 600, 1080, 1460)).resize((630, 502)), (650, 218))
tag(L, "BROKEN", 250, 220, 50, tilt=-5); tag(L, "FIXED & RETURNED!", 960, 220, 46, bg=YEL, fg=INK, tilt=3)
big(L, "WHO DID THIS?", 640, 40, 104, col=WHT, maxw=1200)
save("beforeafter", v, L)

# 7 -- "verdict": the stern mayor
src = fr(2190)
v = shade(src, top=False, bottom=True, depth=760)
y = tag(v, "THE VERDICT:", 540, 1380, 80, tilt=-3)
big(v, "GUILTY... OR HERO?", 540, y + 8, 96)
def t7(L, xr):
    cx = 40 + (xr - 40) / 2
    y = tag(L, "THE VERDICT:", cx, 200, 58, tilt=-3)
    big(L, "GUILTY... OR HERO?", cx, y + 6, 72, maxw=xr - 60)
save("verdict", v, landscape(src, (0, 400, 1080, 1700), t7))

# 8 -- "shock": the stunned guards and baker
src = fr(85)
v = shade(src, top=True, depth=640)
y = tag(v, "WAIT...", 540, 100, 86, tilt=-5)
big(v, "HE'S GIVING IT BACK?!", 540, y + 10, 92)
def t8(L, xr):
    cx = 40 + (xr - 40) / 2
    y = tag(L, "WAIT...", cx, 190, 62, tilt=-5)
    big(L, "HE'S GIVING IT BACK?!", cx, y + 6, 66, maxw=xr - 60)
save("shock", v, landscape(src, (0, 450, 1080, 1750), t8))

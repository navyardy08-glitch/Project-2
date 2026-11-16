#!/usr/bin/env python3
"""thumbs.py -> out/thumbs/: 3 thumbnail designs, each as a vertical 1080x1920 (Shorts / Reels cover)
and a landscape 1280x720 (regular YouTube thumbnail), built from rendered frames."""
import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageEnhance

FONT = "/usr/share/fonts/opentype/inter/InterDisplay-Black.otf"
OUT = "out/thumbs"
os.makedirs(OUT, exist_ok=True)
YEL, WHT, INK = (255, 214, 64), (255, 255, 255), (24, 18, 32)

DESIGNS = [
    # frame, crop box in the 1080x1920 frame for the landscape version (focus on the subject), text lines (colour per line)
    ("caught", 40, (0, 380, 1080, 1700), [("CAUGHT...", WHT), ("PUTTING IT", YEL), ("BACK?!", YEL)]),
    ("window", 1580, (0, 250, 1080, 1550), [("HE BROKE IN", WHT), ("TO GIVE IT", YEL), ("BACK", YEL)]),
    ("step", 2620, (0, 380, 1080, 1700), [("THE THIEF", WHT), ("WHO RETURNED", YEL), ("EVERYTHING", YEL)]),
]


def pop(img, k=1.12):
    img = ImageEnhance.Color(img).enhance(1.18)
    return ImageEnhance.Contrast(img).enhance(k)


def text_block(d, lines, x, y, size, anchor_center, maxw):
    for txt, col in lines:
        s = size
        f = ImageFont.truetype(FONT, s)
        while d.textlength(txt, font=f) > maxw and s > 20:
            s -= 4
            f = ImageFont.truetype(FONT, s)
        w = d.textlength(txt, font=f)
        tx = x - w / 2 if anchor_center else x
        sw = max(6, s // 9)
        d.text((tx + sw * 0.6, y + sw * 0.9), txt, font=f, fill=(0, 0, 0, 150), stroke_width=sw, stroke_fill=(0, 0, 0, 150))
        d.text((tx, y), txt, font=f, fill=col, stroke_width=sw, stroke_fill=INK)
        y += int(s * 1.08)
    return y


for name, fr, box, lines in DESIGNS:
    src = pop(Image.open(f"frames/f{fr:04d}.jpg").convert("RGB"))

    # vertical 1080x1920: frame + dark gradient at top + big text
    v = src.copy().convert("RGBA")
    g = Image.new("L", (1, 1920))
    for y in range(1920):
        yy = (1919 - y) if name == "step" else y
        g.putpixel((0, y), int(210 * max(0, 1 - yy / 760) ** 1.4))
    shade = Image.new("RGBA", (1080, 1920), INK + (0,))
    shade.putalpha(g.resize((1080, 1920)))
    v = Image.alpha_composite(v, shade)
    d = ImageDraw.Draw(v)
    text_block(d, lines, 540, 1390 if name == "step" else 120, 150, True, 980)
    v.convert("RGB").save(f"{OUT}/{name}_vertical_1080x1920.jpg", quality=93)

    # landscape 1280x720: blurred fill, subject crop on the right, text on the left
    L = src.resize((1280, int(1920 * 1280 / 1080))).crop((0, 300, 1280, 1020)).filter(ImageFilter.GaussianBlur(28))
    L = ImageEnhance.Brightness(L).enhance(0.55).convert("RGBA")
    crop = src.crop(box)
    h = 720
    crop = crop.resize((int(crop.width * h / crop.height), h))
    x0 = 1280 - crop.width + 40
    mask = Image.new("L", crop.size, 255)
    md = ImageDraw.Draw(mask)
    for i in range(90):
        md.line([(i, 0), (i, h)], fill=int(255 * i / 90))
    L.paste(crop, (x0, 0), mask)
    d = ImageDraw.Draw(L)
    text_block(d, lines, 50, 150, 112, False, x0 + 60)
    L.convert("RGB").save(f"{OUT}/{name}_youtube_1280x720.jpg", quality=93)
    print("wrote", name)

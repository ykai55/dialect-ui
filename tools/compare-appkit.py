#!/usr/bin/env python3
"""把 AppKit 原生控件和 CSS 复刻逐个控件拼成对照图（一个组件一张）。

用法：python3 tools/compare-appkit.py <WORK>
  <WORK>/css-{light,dark}.png   verify.html 的截图
  reference/shots/macos/appkit/native-{mode}-{row}.png   原生渲染
  shots/verify/macos/{row}-{mode}.png                    输出
"""
import pathlib
import sys

from PIL import Image, ImageDraw, ImageFont

ROWS = [
    "button", "button-accent", "button-disabled",
    "field-placeholder", "field-value",
    "check-off", "check-on", "check-disabled",
    "radio-off", "radio-on",
    "switch-off", "switch-on",
    "select", "slider",
]
MODES = ("light", "dark")
PAD = 14
ZOOM = 2
LABEL = 20


def content_bbox(im, bg):
    w, h = im.size
    left, top, right, bottom = w, h, -1, -1
    for y in range(h):
        for x in range(w):
            p = im.getpixel((x, y))
            if max(abs(p[i] - bg[i]) for i in range(3)) > 6:
                left = min(left, x); right = max(right, x)
                top = min(top, y); bottom = max(bottom, y)
    if right < 0:
        return (0, 0, w, h)
    return (left, top, right + 1, bottom + 1)


def main():
    work = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else "/tmp/dialect-ui-probe-verify")
    root = pathlib.Path(".")
    out_dir = root / "shots/verify/macos"
    out_dir.mkdir(parents=True, exist_ok=True)

    try:
        font = ImageFont.load_default(size=18)
    except TypeError:
        font = ImageFont.load_default()

    for mode in MODES:
        css_strip = Image.open(work / f"css-{mode}.png").convert("RGB")
        cell_h = css_strip.height // len(ROWS)

        for i, row in enumerate(ROWS):
            native = Image.open(
                root / f"reference/shots/macos/appkit/native-{mode}-{row}.png"
            ).convert("RGB")
            css = css_strip.crop((0, i * cell_h, css_strip.width, (i + 1) * cell_h))

            n_box = content_bbox(native, native.getpixel((2, 2)))
            c_box = content_bbox(css, css.getpixel((2, 2)))
            box = (
                max(0, min(n_box[0], c_box[0]) - PAD),
                max(0, min(n_box[1], c_box[1]) - PAD),
                min(native.width, max(n_box[2], c_box[2]) + PAD),
                min(native.height, max(n_box[3], c_box[3]) + PAD),
            )

            n = native.crop(box)
            c = css.crop(box)
            n = n.resize((n.width * ZOOM, n.height * ZOOM), Image.NEAREST)
            c = c.resize((c.width * ZOOM, c.height * ZOOM), Image.NEAREST)

            w = max(n.width, c.width) + PAD * 2
            h = PAD * 2 + LABEL * 2 + n.height + c.height + PAD
            sheet = Image.new("RGB", (w, h), (248, 248, 249))
            d = ImageDraw.Draw(sheet)
            y = PAD
            d.text((PAD, y), "AppKit", fill=(70, 70, 78), font=font)
            y += LABEL
            sheet.paste(n, (PAD, y))
            y += n.height + PAD
            d.text((PAD, y), "CSS", fill=(70, 70, 78), font=font)
            y += LABEL
            sheet.paste(c, (PAD, y))

            dest = out_dir / f"{row}-{mode}.png"
            sheet.save(dest)
            print(f"    {dest}")


if __name__ == "__main__":
    main()

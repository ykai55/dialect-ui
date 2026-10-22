#!/usr/bin/env python3
"""把 Win10 原生控件（uxtheme 离屏渲染）和 CSS 复刻逐个控件拼成对照图（一个控件一张）。

用法：python3 tools/compare-win10.py <WORK>
  <WORK>/css-{light,dark}.png                        verify/verify-win10.html 的 2x 截图
  reference/shots/windows/win10-uxtheme/matrix/
    win10-{row}-{mode}.png                          原生渲染（1x 的最近邻 2x 放大）
  shots/verify/win10/{row}-{mode}.png               输出

和 macOS 那套（tools/compare-appkit.py）一样：
  - 按内容包围盒裁剪，四周留 PAD；
  - 原生在上、CSS 在下，各自标名字；
  - 再放大 ZOOM 倍（NEAREST），一张图只看一个控件；
  - 整页缩略图不保留。

【同步约定，改之前先读】
  ROWS 的顺序和行高必须和 verify/verify-win10.html 的 `rows` 数组逐项一致：
  每行一个 .cell，普通行 48px、textarea 行 120px，截图是 2x。
  脚本按 48/120 累加切片，所以行序错一个，后面所有控件都会错位；
  加控件时两边一起加、只往后面加，别插队。改行高也要两边同时改。
"""
import pathlib
import sys

from PIL import Image, ImageDraw, ImageFont

# 顺序 = verify/verify-win10.html 的 rows 顺序，逐项对应。
ROWS = [
    # button
    "button-normal",
    "button-hot",
    "button-pressed",
    "button-focus",
    "button-disabled",
    "button-defaulted",
    # field
    "field-normal",
    "field-focus",
    "field-disabled",
    # textarea（行高 120）
    "textarea-normal",
    "textarea-focus",
    "textarea-disabled",
    # combobox
    "combobox-normal",
    "combobox-hot",
    "combobox-pressed",
    "combobox-focus",
    "combobox-disabled",
    # slider
    "slider-normal",
    "slider-hot",
    "slider-pressed",
    "slider-focus",
    "slider-disabled",
    # checkbox
    "checkbox-unchecked-normal",
    "checkbox-unchecked-hot",
    "checkbox-unchecked-pressed",
    "checkbox-unchecked-focus",
    "checkbox-unchecked-disabled",
    "checkbox-checked-normal",
    "checkbox-checked-hot",
    "checkbox-checked-pressed",
    "checkbox-checked-focus",
    "checkbox-checked-disabled",
    # radio
    "radio-unchecked-normal",
    "radio-unchecked-hot",
    "radio-unchecked-pressed",
    "radio-unchecked-focus",
    "radio-unchecked-disabled",
    "radio-checked-normal",
    "radio-checked-hot",
    "radio-checked-pressed",
    "radio-checked-focus",
    "radio-checked-disabled",
]
MODES = ("light", "dark")
PAD = 14
ZOOM = 2
LABEL = 20
SCALE = 2  # 截图与原生图都是 2x


def row_height_px(row):
    """行高（1x 逻辑像素）：和页面 .cell / .cell--textarea 对应。"""
    return 120 if row.startswith("textarea-") else 48


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
    work = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else "/tmp/dialect-ui-probe-verify-win10")
    root = pathlib.Path(".")
    native_dir = root / "reference/shots/windows/win10-uxtheme/matrix"
    out_dir = root / "shots/verify/win10"
    out_dir.mkdir(parents=True, exist_ok=True)

    try:
        font = ImageFont.load_default(size=18)
    except TypeError:
        font = ImageFont.load_default()

    expect_h = sum(row_height_px(r) for r in ROWS) * SCALE

    for mode in MODES:
        strip_path = work / f"css-{mode}.png"
        if not strip_path.exists():
            sys.exit(f"缺少 {strip_path}，先跑 tools/verify-win10.sh")
        css_strip = Image.open(strip_path).convert("RGB")
        if css_strip.height != expect_h:
            sys.exit(
                f"{strip_path} 高 {css_strip.height}px，按 ROWS 应该是 {expect_h}px。\n"
                f"  行序或行高和 verify/verify-win10.html 不同步了：先对齐两边再重跑。"
            )

        # 按 48/120 累加切片，textarea 行更高
        offsets = []
        y = 0
        for row in ROWS:
            h = row_height_px(row) * SCALE
            offsets.append((y, y + h))
            y += h

        for i, row in enumerate(ROWS):
            native_path = native_dir / f"win10-{row}-{mode}.png"
            if not native_path.exists():
                sys.exit(f"缺少原生图 {native_path}")
            native = Image.open(native_path).convert("RGB")
            top, bottom = offsets[i]
            css = css_strip.crop((0, top, css_strip.width, bottom))

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
            d.text((PAD, y), "Win10 native", fill=(70, 70, 78), font=font)
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

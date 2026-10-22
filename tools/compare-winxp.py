#!/usr/bin/env python3
"""把 XP classic 原生控件（GDI / DrawFrameControl 离屏渲染）和 CSS 复刻逐个控件拼成对照图。

用法：python3 tools/compare-winxp.py <WORK>
  <WORK>/css-light.png                             verify/verify-winxp.html 的 2x 截图
  reference/shots/windows/classic/
    {row}-96dpi.png                                原生渲染（324×48 逻辑格，textarea 324×104，menu 324×112）
  shots/verify/winxp/{row}.png                   输出

原生图还没齐的时候退到上一轮的临时探针图（同一套布局，文件名多一个 classic- 前缀）：
  reference/shots/windows/classic-probe/mfc-dfdfdf/classic-{row}-96dpi.png

原生源选择：
  1. 环境变量 NATIVE_DIR 指定目录（该目录下 {row}-96dpi.png 和
     classic-{row}-96dpi.png 两种名字都会试）；
  2. 没指定就看 reference/shots/windows/classic/ 在不在，在就用它；
  3. 还不在就用 classic-probe/mfc-dfdfdf/。

和 Win10 那套（tools/compare-win10.py）一样：
  - 按内容包围盒裁剪，四周留 PAD；
  - 原生在上、CSS 在下，各自标名字；
  - 再放大 ZOOM 倍（NEAREST），一张图只看一个控件；
  - 原生图是 96dpi（1x），先 NEAREST 放大 2 倍再和 2x 截图对。
缺某张原生图时跳过该行、最后统一列出缺了哪些（探针图不全，正式矩阵齐了就不该缺）。

【同步约定，改之前先读】
  ROWS 的顺序和行高必须和 verify/verify-winxp.html 的 rows 数组逐项一致：
  每行一个 .cell，普通行 48px，textarea 行 104px，menu 行 112px，截图是 2x。
  脚本按 48/104/112 累加切片，所以行序错一个，后面所有控件都会错位；
  加控件时两边一起加、只往后面加，别插队。改行高也要两边同时改。
"""
import os
import pathlib
import sys

from PIL import Image, ImageDraw, ImageFont

# 顺序 = verify/verify-winxp.html 的 rows 顺序，逐项对应。
ROWS = [
    # button
    "button-normal",
    "button-pressed",
    "button-disabled",
    "button-default",
    # field
    "field-normal",
    "field-disabled",
    # textarea（行高 104）
    "textarea-normal",
    # checkbox
    "checkbox-unchecked",
    "checkbox-checked",
    "checkbox-checked-pressed",
    "checkbox-disabled",
    # radio
    "radio-unchecked",
    "radio-checked",
    "radio-checked-pressed",
    "radio-disabled",
    # combobox
    "combobox-normal",
    "combobox-disabled",
    # slider
    "slider-normal",
    # menu（行高 112）
    "menu-popup",
    "menu-popup-hover",
]

# 行高（1x 逻辑像素）：和 verify/verify-winxp.html 的 .cell / .cell--textarea / .cell--menu 对应。
# textarea 104、menu 112，其余一律 48。
ROW_HEIGHTS = {
    "textarea-normal": 104,
    "menu-popup": 112,
    "menu-popup-hover": 112,
}
DEFAULT_H = 48

PAD = 14
ZOOM = 2
LABEL = 20
SCALE = 2  # 截图 2x；原生 96dpi 图先 NEAREST 放大到 2x


def row_height_px(row):
    return ROW_HEIGHTS.get(row, DEFAULT_H)


def find_native(root, row):
    """在选定目录里按两种命名找原生 96dpi 图，返回 path 或 None。"""
    for name in (f"{row}-96dpi.png", f"classic-{row}-96dpi.png"):
        p = root / name
        if p.exists():
            return p
    return None


def pick_native_dir(root):
    env = os.environ.get("NATIVE_DIR")
    if env:
        return pathlib.Path(env), "NATIVE_DIR"
    final = root / "reference/shots/windows/classic"
    if final.is_dir():
        return final, "正式矩阵"
    probe = root / "reference/shots/windows/classic-probe/mfc-dfdfdf"
    return probe, "临时探针图"


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
    work = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else "/tmp/dialect-ui-probe-verify-winxp")
    root = pathlib.Path(".")
    native_dir, src_name = pick_native_dir(root)
    out_dir = root / "shots/verify/winxp"
    out_dir.mkdir(parents=True, exist_ok=True)

    print(f"原生图源：{native_dir}（{src_name}）")

    try:
        font = ImageFont.load_default(size=18)
    except TypeError:
        font = ImageFont.load_default()

    strip_path = work / "css-light.png"
    if not strip_path.exists():
        sys.exit(f"缺少 {strip_path}，先跑 tools/verify-winxp.sh")
    css_strip = Image.open(strip_path).convert("RGB")

    expect_h = sum(row_height_px(r) for r in ROWS) * SCALE
    if css_strip.height != expect_h:
        sys.exit(
            f"{strip_path} 高 {css_strip.height}px，按 ROWS 应该是 {expect_h}px。\n"
            f"  行序或行高和 verify/verify-winxp.html 不同步了：先对齐两边再重跑。"
        )

    # 按 48/104/112 累加切片，textarea 和 menu 行更高
    offsets = []
    y = 0
    for row in ROWS:
        h = row_height_px(row) * SCALE
        offsets.append((y, y + h))
        y += h

    missing = []
    for i, row in enumerate(ROWS):
        native_path = find_native(native_dir, row)
        if native_path is None:
            missing.append(row)
            continue

        native = Image.open(native_path).convert("RGB")
        # 96dpi 图是 1x：NEAREST 放大到 2x，再和 2x 截图同尺度比。
        native = native.resize((native.width * SCALE, native.height * SCALE), Image.NEAREST)

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
        d.text((PAD, y), "XP classic native", fill=(70, 70, 78), font=font)
        y += LABEL
        sheet.paste(n, (PAD, y))
        y += n.height + PAD
        d.text((PAD, y), "CSS", fill=(70, 70, 78), font=font)
        y += LABEL
        sheet.paste(c, (PAD, y))

        dest = out_dir / f"{row}.png"
        sheet.save(dest)
        print(f"    {dest}")

    print(f"完成：{len(ROWS) - len(missing)}/{len(ROWS)} 行 → {out_dir}")
    if missing:
        print("缺原生图，跳过：" + "、".join(missing))


if __name__ == "__main__":
    main()

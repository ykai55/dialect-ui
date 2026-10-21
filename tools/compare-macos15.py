#!/usr/bin/env python3
"""把 macOS 11–15 legacy AppKit 原生控件和 CSS 复刻（data-theme="macos15"）逐个拼对照图。

用法：python3 tools/compare-macos15.py <WORK>
  <WORK>/css-{light,dark}.png                          verify-macos15.html 的 2x 截图
  reference/shots/macos15/appkit/native-{mode}-{row}.png  原生渲染（2x）
  shots/verify/macos15/{row}-{mode}.png               输出：上原生、下 CSS
  shots/verify/macos15/report.txt                     逐行 ink bbox 差 + 颜色对照

和 macOS 26 那套（tools/compare-appkit.py）的区别：
1. 原生 PNG 内嵌 Generic RGB profile，先转 sRGB 再比——不转的话白底和蓝色
   都会偏（CSS 是 sRGB）。转换用的 profile 是 AppKit 自己写进去的那个。
2. 除了拼图，还打印逐行 ink bbox 差和颜色对照，写进 report.txt。
3. 行数和 26 那套一样是 14 行，但控件尺寸按 legacy 的可见尺寸对（见
   verify-macos15.html 里的注释）。

【同步约定，改之前先读】
  ROWS 的顺序必须和 verify-macos15.html 的 rows 数组逐项一致；
  每行 48px（截图为 2x，切片按 96px 累加），两边一起改、只往后加。
"""
import io
import os
import pathlib
import sys

from PIL import Image, ImageCms, ImageDraw, ImageFont

ROWS = [
    "button",
    "button-accent",
    "button-disabled",
    "field-placeholder",
    "field-value",
    "check-off",
    "check-on",
    "check-disabled",
    "radio-off",
    "radio-on",
    "switch-off",
    "switch-on",
    "select",
    "slider",
]
MODES = ("light", "dark")
CELL_W = 648          # 324 @2x
CELL_H = 96           # 48 @2x
PAD = 14
ZOOM = 2
LABEL = 20

# 采样点：单元内 2x 坐标（原生和 CSS 用同一坐标，因为 verify 页按可见尺寸对齐了）。
# (标签, x, y)；区域极值用 ("label", (x0, y0, x1, y1), "min"|"max")
SAMPLE_POINTS = {
    "button": [("填充", 100, 48)],
    "button-accent": [("渐变顶", 100, 34), ("填充", 100, 48), ("渐变底", 100, 62)],
    "button-disabled": [("填充", 100, 48)],
    "field-placeholder": [("填充", 300, 48)],
    "field-value": [("填充", 500, 48)],
    "check-off": [("盒子填充", 42, 48)],
    "check-on": [("盒子顶部", 42, 40), ("盒子底部", 42, 56)],
    "check-disabled": [("盒子填充", 32, 40)],
    "radio-off": [("圆填充", 42, 48)],
    "radio-on": [("圆顶部", 42, 40), ("圆点", 42, 48)],
    "switch-off": [("轨道", 88, 48), ("knob", 48, 48)],
    "switch-on": [("轨道", 40, 48), ("knob", 88, 48)],
    "select": [("填充", 200, 48)],
    "slider": [("填充", 80, 44), ("轨道", 400, 44), ("knob", 206, 44)],
}

# 区域极值采样（chevron 颜色这种按区域取最暗 / 最亮更稳）
SAMPLE_REGIONS = {
    "select": [("chevron 极值", (350, 30, 364, 58), "auto")],
}


def load_srgb(path):
    im = Image.open(path)
    rgb = im.convert("RGB")
    icc = im.info.get("icc_profile")
    converted = False
    if icc:
        prof = ImageCms.ImageCmsProfile(io.BytesIO(icc))
        rgb = ImageCms.profileToProfile(
            rgb, prof, ImageCms.createProfile("sRGB"), outputMode="RGB"
        )
        converted = True
    return rgb, converted


def hx(p):
    return "#%02X%02X%02X" % p[:3]


def lum(p):
    return 0.299 * p[0] + 0.587 * p[1] + 0.114 * p[2]


def delta(a, b):
    return max(abs(a[i] - b[i]) for i in range(3))


def content_bbox(im, bg):
    w, h = im.size
    px = im.load()
    left, top, right, bottom = w, h, -1, -1
    for y in range(h):
        for x in range(w):
            if delta(px[x, y], bg) > 6:
                left = min(left, x); right = max(right, x)
                top = min(top, y); bottom = max(bottom, y)
    if right < 0:
        return (0, 0, w, h)
    return (left, top, right + 1, bottom + 1)


def region_extreme(im, box, mode):
    """区域里最暗 / 最亮的像素（chevron 这种细线按极值采比较稳）。"""
    px = im.load()
    x0, y0, x1, y1 = box
    best = None
    for y in range(y0, y1):
        for x in range(x0, x1):
            p = px[x, y]
            if best is None or (lum(p) > lum(best) if mode == "max" else lum(p) < lum(best)):
                best = p
    return best


def fmt1x(bb):
    return "%s×%s" % ((bb[2] - bb[0]) / 2, (bb[3] - bb[1]) / 2)


def main():
    work = pathlib.Path(
        sys.argv[1] if len(sys.argv) > 1 else "/tmp/platform-ui-macos15-verify"
    )
    root = pathlib.Path(".")
    native_dir = pathlib.Path(os.environ["NATIVE_DIR"]) if os.environ.get("NATIVE_DIR") \
        else root / "reference/shots/macos15/appkit"
    out_dir = root / "shots/verify/macos15"
    out_dir.mkdir(parents=True, exist_ok=True)

    try:
        font = ImageFont.load_default(size=18)
    except TypeError:
        font = ImageFont.load_default()

    report = []
    w = report.append
    w("macOS 11–15 legacy 原生 vs CSS（data-theme=macos15）")
    w("原生图：reference/shots/macos15/appkit/（sdk 15.0 compat 路径，见 docs/macos15-native-notes.md）")
    w("CSS 图：verify-macos15.html?mode={light,dark}（324×48 格，2x）")
    w("bbox 单位：CSS px（1x）；Δ = CSS − 原生。颜色已统一到 sRGB。")
    w("")

    for mode in MODES:
        strip_path = work / ("css-%s.png" % mode)
        if not strip_path.exists():
            sys.exit("缺 %s，先跑 tools/verify-macos15.sh" % strip_path)
        css_strip = Image.open(strip_path).convert("RGB")
        expect_h = len(ROWS) * CELL_H
        if css_strip.height != expect_h:
            sys.exit(
                "%s 高 %dpx，按 ROWS 应该是 %dpx（行数 / 行高和 verify-macos15.html 不同步）"
                % (strip_path, css_strip.height, expect_h)
            )
        w("## %s" % mode)
        w("%-18s %-22s %-22s %-24s" % ("行", "原生 bbox", "CSS bbox", "Δ(左,上,宽,高)"))

        for i, row in enumerate(ROWS):
            native, _ = load_srgb(native_dir / ("native-%s-%s.png" % (mode, row)))
            css = css_strip.crop((0, i * CELL_H, CELL_W, (i + 1) * CELL_H))

            n_box = content_bbox(native, native.load()[2, 2])
            c_box = content_bbox(css, css.load()[2, 2])
            nw = (n_box[2] - n_box[0]) / 2
            nh = (n_box[3] - n_box[1]) / 2
            cw = (c_box[2] - c_box[0]) / 2
            ch = (c_box[3] - c_box[1]) / 2
            d = (
                round((c_box[0] - n_box[0]) / 2, 1),
                round((c_box[1] - n_box[1]) / 2, 1),
                round(cw - nw, 1),
                round(ch - nh, 1),
            )
            w("%-18s %-22s %-22s %-24s" % (row, fmt1x(n_box), fmt1x(c_box), str(d)))

            # 颜色对照
            colors = []
            for label, x, y in SAMPLE_POINTS.get(row, []):
                a = native.load()[x, y]
                b = css.load()[x, y]
                colors.append("%s %s→%s(Δ%d)" % (label, hx(a), hx(b), delta(a, b)))
            for label, box, kind in SAMPLE_REGIONS.get(row, []):
                # 深色下拉框的 chevron 比填充亮，浅色比填充暗
                if kind == "auto":
                    kind = "min" if mode == "light" else "max"
                a = region_extreme(native, box, kind)
                b = region_extreme(css, box, kind)
                colors.append("%s %s→%s(Δ%d)" % (label, hx(a), hx(b), delta(a, b)))
            if colors:
                w("    颜色: " + "  ".join(colors))

            # 拼图：两边各按自己的内容包围盒裁，取并集
            box = (
                max(0, min(n_box[0], c_box[0]) - PAD),
                max(0, min(n_box[1], c_box[1]) - PAD),
                min(CELL_W, max(n_box[2], c_box[2]) + PAD),
                min(CELL_H, max(n_box[3], c_box[3]) + PAD),
            )
            n = native.crop(box)
            c = css.crop(box)
            n = n.resize((n.width * ZOOM, n.height * ZOOM), Image.NEAREST)
            c = c.resize((c.width * ZOOM, c.height * ZOOM), Image.NEAREST)

            sw = max(n.width, c.width) + PAD * 2
            sh = PAD * 2 + LABEL * 2 + n.height + c.height + PAD
            sheet = Image.new("RGB", (sw, sh), (248, 248, 249))
            ddraw = ImageDraw.Draw(sheet)
            yy = PAD
            ddraw.text((PAD, yy), "AppKit legacy (sdk 15.0)", fill=(70, 70, 78), font=font)
            yy += LABEL
            sheet.paste(n, (PAD, yy))
            yy += n.height + PAD
            ddraw.text((PAD, yy), "CSS macos15", fill=(70, 70, 78), font=font)
            yy += LABEL
            sheet.paste(c, (PAD, yy))
            dest = out_dir / ("%s-%s.png" % (row, mode))
            sheet.save(dest)
            print("    %s" % dest)
        w("")

    w("## 读法")
    w("- ink bbox 只说明「墨迹范围」，不说明形状：按钮 / 输入框 / 下拉框的可见范围比 frame 窄一截，")
    w("  是 AppKit bezel 的绘制惯例（按钮 200 的 frame 只画 188），verify 页按可见尺寸对齐，")
    w("  所以 CSS 的盒子就等于可见尺寸，宽度差应该在 0–2px。")
    w("- 颜色 Δ 大于 8 的行，通常是抗锯齿 / 字体栅格化差（文字边缘、1px 渐变），不是主题写错；")
    w("  原生 PNG 已从 Generic RGB 转 sRGB。")
    w("- check / radio 的 bbox 包含 label，字体渲染不同会让宽度差 1–3px，归字体档。")
    w("- 焦点 / 悬停 / 按下 / 菜单展开层没有原生图，不在这份报告里。")

    (out_dir / "report.txt").write_text("\n".join(report) + "\n", encoding="utf-8")
    print("\n报告：%s" % (out_dir / "report.txt"))


if __name__ == "__main__":
    main()

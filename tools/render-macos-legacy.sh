#!/usr/bin/env bash
# 一条命令完成「macOS 11–15 旧版外观」的原生渲染 + 采样：
#
#   1. 编译 tools/appkit-render.swift
#   2. 用 vtool 把二进制的 LC_BUILD_VERSION sdk 改成 15.0
#      AppKit 是按这个字段挑外观的，跟二进制跑在哪版系统上无关。本机是
#      macOS 26.6.1（只有 26/27 SDK），把 sdk 改成 15.0 后 AppKit 会走系统
#      内置的旧版外观路径：白底 0.5px 描边按钮（可见 188×21）、14×14 复选框、
#      38×22 开关、白底下拉框。
#      注意 vtool 必须重写 sdk，-set-build-version macos 15.0 15.0 是两个参数
#      （minos、sdk），只给一个会报错。
#   3. 渲染 reference/shots/macos15/appkit/native-{light,dark}-{row}.png
#      下拉框是放进真实 NSWindow 的 contentView 渲染的（离屏会画错箭头格），
#      其余控件离屏渲染（窗口里的控件会按「非活跃窗口」把强调色画灰）。
#   4. 从 PNG 采样生成同目录 metrics.txt，并打印每个控件的可见尺寸。
#
# 产物目录在 .gitignore 里，不入库。
# 用法：
#   bash tools/render-macos-legacy.sh
#   OUT=/tmp/x bash tools/render-macos-legacy.sh          # 换输出目录
#   PYTHON=/path/to/python3 bash tools/render-macos-legacy.sh
# 可用环境变量：OUT / WORK / PYTHON / SWIFTC
set -euo pipefail

cd "$(dirname "$0")/.."
ROOT="$(pwd)"

OUT="${OUT:-$ROOT/reference/shots/macos15/appkit}"
WORK="${WORK:-/tmp/dialect-ui-macos15-render}"
SWIFTC="${SWIFTC:-swiftc}"

# 本机 python3 没装 Pillow 时退到内置运行时
PYTHON="${PYTHON:-python3}"
if ! "$PYTHON" -c 'import PIL' >/dev/null 2>&1; then
  BUNDLED_PYTHON=/Users/bytedance/.dsh/dsh-runtimes/dsh-primary-runtime/dependencies/python/bin/python3
  if [ -x "$BUNDLED_PYTHON" ] && "$BUNDLED_PYTHON" -c 'import PIL' >/dev/null 2>&1; then
    PYTHON="$BUNDLED_PYTHON"
    echo "python3 没有 Pillow，改用内置 Python：$PYTHON"
  else
    echo "需要 Pillow。指定一个装了 Pillow 的 Python：" >&2
    echo "  PYTHON=/path/to/python3 bash tools/render-macos-legacy.sh" >&2
    exit 1
  fi
fi

command -v xcrun >/dev/null 2>&1 || { echo "找不到 xcrun（需要 Xcode 命令行工具）" >&2; exit 1; }
mkdir -p "$WORK/mc" "$WORK/tmp" "$OUT"
rm -f "$OUT"/native-*.png

echo "1/4 编译 tools/appkit-render.swift"
(
  cd tools
  TMPDIR="$WORK/tmp" CLANG_MODULE_CACHE_PATH="$WORK/mc" \
    "$SWIFTC" -O -module-cache-path "$WORK/mc" appkit-render.swift -o "$WORK/render" 2>&1 |
    grep -v sandbox-exec || true
)
[ -x "$WORK/render" ] || { echo "编译失败：$WORK/render 不存在" >&2; exit 1; }

echo "2/4 vtool 把 LC_BUILD_VERSION 的 sdk 改成 15.0"
xcrun vtool -set-build-version macos 15.0 15.0 -replace \
  -output "$WORK/render15" "$WORK/render" >/dev/null
xcrun vtool -show-build "$WORK/render15" | grep -E '^( *minos| *sdk) 15\.0$' >/dev/null || {
  echo "vtool 改 sdk 之后读回的不是 15.0： " >&2
  xcrun vtool -show-build "$WORK/render15" >&2
  exit 1
}

echo "3/4 渲染 AppKit legacy 控件（默认 2x，输出到 ${OUT#$ROOT/}）"
"$WORK/render15" --legacy --out "$OUT" | sed 's/^/    /'

echo "4/4 采样像素，生成 metrics.txt"
"$PYTHON" - "$OUT" <<'PYEOF'
#!/usr/bin/env python3
"""从 legacy AppKit 渲染出的 PNG 采样实测值，写 metrics.txt。

这个脚本内嵌在 tools/render-macos-legacy.sh 里（不单独提交），由它调用：
  render-macos-legacy.sh 把输出目录作为 argv[1] 传进来
  <目录>/native-{light,dark}-{row}.png  tools/appkit-render.swift --legacy 的产物

颜色：PNG 内嵌的是 Generic RGB profile，先转到 sRGB 再采样——不转会偏
（同一块白底 raw #E7E7E7 转完是 #ECECEC，蓝色也是同样的量级差）。
坐标：PNG 是 2x，输出一律折算成 CSS px（1x）。
"""
import io
import pathlib
import sys

from PIL import Image, ImageCms

MODES = ("light", "dark")
ROWS = [
    "button", "button-accent", "button-disabled",
    "field-placeholder", "field-value",
    "check-off", "check-on", "check-disabled",
    "radio-off", "radio-on",
    "switch-off", "switch-on",
    "select", "slider", "segmented",
    "window-bg",
]


def load(path):
    im = Image.open(path)
    rgb = im.convert("RGB")
    icc = im.info.get("icc_profile")
    if icc:
        prof = ImageCms.ImageCmsProfile(io.BytesIO(icc))
        rgb = ImageCms.profileToProfile(
            rgb, prof, ImageCms.createProfile("sRGB"), outputMode="RGB"
        )
    return rgb


def hx(p):
    return "#%02X%02X%02X" % p[:3]


def diff(a, b):
    return max(abs(a[i] - b[i]) for i in range(3))


def lum(p):
    return 0.299 * p[0] + 0.587 * p[1] + 0.114 * p[2]


def one(v):
    return round(v / 2, 1)


def bbox(im, tol=6, region=None):
    px = im.load()
    bg = px[2, 2]
    x0, y0, x1, y1 = region or (0, 0, im.width, im.height)
    l, t, r, b = x1, y1, -1, -1
    for y in range(y0, y1):
        for x in range(x0, x1):
            if diff(px[x, y], bg) > tol:
                l = min(l, x); t = min(t, y); r = max(r, x); b = max(b, y)
    if r < 0:
        return None
    return (l, t, r + 1, b + 1)


def box1(bb):
    return "%s×%s @%s,%s" % (one(bb[2] - bb[0]), one(bb[3] - bb[1]), one(bb[0]), one(bb[1]))


def run_parts(seq, off, maxw):
    """把一段像素序列压缩成「窄段」列表：形状 (<maxw 设备像素) 的段才留下，用来
    看描边 / 阴影的颜色，长纯色段（填充）跳过。"""
    rr = []
    last = None
    start = 0
    for i, p in enumerate(seq):
        if p != last:
            if last is not None:
                rr.append((start + off, i - 1 + off, last))
            start = i
            last = p
    rr.append((start + off, len(seq) - 1 + off, last))
    return rr


def v_narrow(im, x, y0, y1, maxw=6):
    px = im.load()
    rr = run_parts([px[x, y] for y in range(max(0, y0), min(im.height, y1))], max(0, y0), maxw)
    return " ".join("%s:%s" % (one(a), hx(c)) for a, b, c in rr if b - a + 1 <= maxw)


def h_narrow(im, y, x0, x1, maxw=6):
    px = im.load()
    rr = run_parts([px[x, y] for x in range(max(0, x0), min(im.width, x1))], max(0, x0), maxw)
    return " ".join("%s:%s" % (one(a), hx(c)) for a, b, c in rr if b - a + 1 <= maxw)


def corner_profile(im, bb, n=8, tol=8):
    """自上而下每 0.5px 记一次左沿 x（1x）：圆角的实际形状，比一个「半径」更可信。"""
    px = im.load()
    bg = px[2, 2]
    out = []
    for y in range(bb[1], min(bb[3], bb[1] + 2 * n)):
        xs = [x for x in range(max(0, bb[0] - 4), min(im.width, bb[2] + 4))
              if diff(px[x, y], bg) > tol]
        if xs:
            out.append(one(min(xs)))
    return " ".join(str(v) for v in out)


def extreme(im, region, brighter=False):
    px = im.load()
    best = None
    x0, y0, x1, y1 = region
    for y in range(max(0, y0), min(im.height, y1)):
        for x in range(max(0, x0), min(im.width, x1)):
            p = px[x, y]
            if best is None or (lum(p) > lum(best) if brighter else lum(p) < lum(best)):
                best = p
    return hx(best)


def grad(im, x, ytop, ymid, ybot):
    px = im.load()
    return "top %s  mid %s  bottom %s" % (hx(px[x, ytop]), hx(px[x, ymid]), hx(px[x, ybot]))


def main():
    src = pathlib.Path(sys.argv[1])
    dest = pathlib.Path(sys.argv[2]) if len(sys.argv) > 2 else src / "metrics.txt"
    imgs = {}
    for mode in MODES:
        for row in ROWS:
            p = src / ("native-%s-%s.png" % (mode, row))
            if not p.exists():
                sys.exit("缺 %s，先跑 tools/render-macos-legacy.sh" % p)
            imgs[(mode, row)] = load(p)

    out = []
    w = out.append
    w("# macOS 11–15 旧版外观：AppKit 渲染实测值")
    w("# 生成：bash tools/render-macos-legacy.sh")
    w("# 来源：macOS 26.6.1 + Xcode 27.1，tools/appkit-render.swift 编译后")
    w("#       用 vtool 把 LC_BUILD_VERSION 的 sdk 改成 15.0，走系统内置的旧版外观路径。")
    w("#       compat 路径 caveat 见 docs/macos15-native-notes.md。")
    w("# 颜色：PNG 内嵌 Generic RGB profile → 已转 sRGB。坐标：CSS px（1x，PNG 是 2x）。")
    w("# 「可见」= 和底色差 > 6/255 的像素包围盒；AppKit 的 bezel 常比控件 frame 小一圈，")
    w("#   两者都记下来；对比页按「可见」尺寸对齐，所以 CSS 那边不需要复刻 frame 的内缩。")
    w("# 剖面只打「窄段」（≤3 CSS px）的颜色，长纯色段就是填充，省略。")
    w("")

    for mode in MODES:
        w("## %s" % mode)
        bg = imgs[(mode, "window-bg")].getpixel((324, 48))
        w("窗口底色 %s（legacy NSColor.windowBackgroundColor）" % hx(bg))
        w("")

        for row in ("button", "button-accent", "button-disabled"):
            im = imgs[(mode, row)]
            bb = bbox(im)
            cy = (bb[1] + bb[3]) // 2
            fill = hx(im.load()[bb[0] + 20, cy])
            brighter = mode == "dark" or row == "button-accent"
            text = extreme(im, (bb[0] + 80, bb[1] + 8, bb[0] + 280, bb[3] - 8), brighter)
            w("[%s] %s" % (mode, row))
            w("  frame 200×32（NSButton .rounded regular 的 sizeToFit 高度 32；可见只有 22）")
            w("  可见 %s  圆角约 6px  填充 %s  字色 %s（文字区最%s像素）13pt regular(400)"
              % (box1(bb), fill, text, "亮" if brighter else "暗"))
            w("  圆角剖面（自上而下每 0.5px 的左沿，1x）: %s" % corner_profile(im, bb))
            if row == "button-accent":
                w("  渐变（x=1x %s）: %s"
                  % (one(bb[0] + 10),
                     grad(im, bb[0] + 20, bb[1] + 6, (bb[1] + bb[3]) // 2, bb[3] - 6)))
            w("  顶部/底部剖面（x=1x %s）: %s"
              % (one(bb[0] + 20), v_narrow(im, bb[0] + 40, bb[1] - 8, bb[3] + 8)))
            w("")

        for row in ("field-placeholder", "field-value"):
            im = imgs[(mode, row)]
            bb = bbox(im)
            cy = (bb[1] + bb[3]) // 2
            fill = hx(im.load()[bb[0] + 40, cy])
            w("[%s] %s" % (mode, row))
            w("  frame 300×22（regular rounded bezel 的 sizeToFit 高度 22）")
            w("  可见 %s  填充 %s  圆角约 6px" % (box1(bb), fill))
            w("  圆角剖面（自上而下每 0.5px 的左沿，1x）: %s" % corner_profile(im, bb))
            w("  四边剖面（x=1x %s）: %s"
              % (one(bb[2] - 40), v_narrow(im, bb[2] - 40, bb[1] - 8, bb[3] + 8)))
            if row == "field-placeholder":
                w("  占位符字色 %s（文字区最暗像素）"
                  % extreme(im, (bb[0] + 20, bb[1] + 8, bb[0] + 520, bb[3] - 8)))
            else:
                w("  文字色 %s（文字区最%s像素）"
                  % (extreme(im, (bb[0] + 20, bb[1] + 8, bb[0] + 520, bb[3] - 8),
                             mode == "dark"), "亮" if mode == "dark" else "暗"))
            w("")

        for row in ("check-off", "check-on", "check-disabled", "radio-off", "radio-on"):
            im = imgs[(mode, row)]
            bb = bbox(im, region=(0, 0, 62, im.height))  # 只取盒子 / 圆，不含 label
            cx = (bb[0] + bb[2]) // 2
            cy = (bb[1] + bb[3]) // 2
            checked = row in ("check-on", "check-disabled", "radio-on")
            disabled = row.endswith("disabled")
            w("[%s] %s  盒子 / 圆可见 %s  圆角%s"
              % (mode, row, box1(bb), "3.5px" if row.startswith("check") else "50%"))
            w("  圆角剖面（自上而下每 0.5px 的左沿，1x）: %s" % corner_profile(im, bb))
            if checked:
                w("  渐变: %s" % grad(im, bb[0] + 4, bb[1] + 4, cy, bb[3] - 4))
                # 勾 / 点：浅色 checked 是白勾（取最亮），禁用勾 / 深色勾取最亮/最暗
                if disabled:
                    mark = extreme(im, (bb[0] + 2, bb[1] + 2, bb[2] - 2, bb[3] - 2),
                                   mode == "dark")
                    w("  勾 / 点 %s（禁用态：文字区最%s像素）" % (mark, "亮" if mode == "dark" else "暗"))
                else:
                    w("  勾 / 点 %s（盒子内最亮像素）" % extreme(im, (bb[0] + 2, bb[1] + 2, bb[2] - 2, bb[3] - 2), True))
            else:
                w("  填充: %s" % grad(im, bb[0] + 4, bb[1] + 4, cy, bb[3] - 4))
            w("  横剖面: %s" % h_narrow(im, cy, bb[0] - 6, bb[2] + 6))
            w("")

        for row in ("switch-off", "switch-on"):
            im = imgs[(mode, row)]
            bb = bbox(im)
            cy = (bb[1] + bb[3]) // 2
            px = im.load()
            track_x = bb[2] - 20 if row == "switch-off" else bb[0] + 14
            knob_x = bb[0] + 20 if row == "switch-off" else bb[2] - 20
            w("[%s] %s  frame 42×25  可见 %s（NSSwitch intrinsic 是 38×22）"
              % (mode, row, box1(bb)))
            w("  轨道 %s  knob %s（20×20 圆，距轨道边 1px）"
              % (hx(px[track_x, cy]), hx(px[knob_x, cy])))
            if row == "switch-on":
                w("  轨道渐变（x=1x %s）: %s"
                  % (one(bb[0] + 14),
                     grad(im, bb[0] + 14, bb[1] + 6, cy, bb[3] - 6)))
            w("  横剖面（y=1x %s）: %s"
              % (one(cy), h_narrow(im, cy, bb[0] - 6, bb[2] + 6, maxw=10)))
            w("")

        im = imgs[(mode, "select")]
        bb = bbox(im)
        cy = (bb[1] + bb[3]) // 2
        px = im.load()
        fill = hx(px[bb[0] + 60, cy])
        w("[%s] select  frame 180×25  可见 %s（左右各内缩 2–3，上下 1.5）" % (mode, box1(bb)))
        w("  填充 %s  文字 %s  chevron %s"
          % (fill,
             extreme(im, (bb[0] + 18, bb[1] + 6, bb[0] + 240, bb[3] - 6), mode == "dark"),
             extreme(im, (bb[2] - 40, bb[1] + 4, bb[2] - 4, bb[3] - 4), mode == "dark")))
        w("  实测双 chevron 约 6.5×10.5（两段各 4.5 高，中间空 2px，笔画约 1px）")
        w("  描边剖面（x=1x %s）: %s"
          % (one(bb[0] + 100), v_narrow(im, bb[0] + 100, bb[1] - 8, bb[3] + 8)))
        w("  ⚠ 下拉框是放进真实 NSWindow 的 contentView 渲染的（离屏会画出错误的")
        w("    蓝色强调箭头格）；本进程不是前台应用，窗口是非活跃状态，")
        w("    chevron / 文字可能比活跃窗口浅一档。")
        w("")

        im = imgs[(mode, "slider")]
        bb = bbox(im)
        px = im.load()
        cy = (bb[1] + bb[3]) // 2
        w("[%s] slider  frame 220×24  可见 %s" % (mode, box1(bb)))
        w("  轨道 4px；填充 %s；未填充 %s；knob 20×20 白色圆 + 1.5px 落影"
          % (hx(px[bb[0] + 30, cy]), hx(px[bb[2] - 30, cy])))
        w("  横剖面（y=1x %s）: %s" % (one(cy), h_narrow(im, cy, bb[0] - 6, bb[2] + 6, maxw=12)))
        w("")

        im = imgs[(mode, "segmented")]
        bb = bbox(im)
        px = im.load()
        cy = (bb[1] + bb[3]) // 2
        # 选中段是第二段（Week），颜色取段中心；轨道取第一段里避开文字的位置
        track = hx(px[bb[0] + 6, bb[1] + 4])
        sel_x = bb[0] + int((bb[2] - bb[0]) * 0.42)
        w("[%s] segmented  frame 139×24  可见 %s（.rounded regular，中间段选中）"
          % (mode, box1(bb)))
        w("  轨道 %s  选中段底 %s  圆角约 5–6px（旧版：白色 pill 浮起，不用强调色）"
          % (track, hx(px[sel_x, cy])))
        w("  圆角剖面（自上而下每 0.5px 的左沿，1x）: %s" % corner_profile(im, bb))
        w("  横向剖面（y=1x %s）: %s" % (one(cy), h_narrow(im, cy, bb[0] - 6, bb[2] + 6, maxw=8)))
        w("")

    w("## 没渲染到的状态（主题里标了「估计」）")
    w("hover / pressed / focus：离屏渲染没有鼠标、没有第一响应者。")
    w("菜单展开层、多行输入：这条链路不渲染。")
    w("深色下拉框来自非活跃窗口（见上面 select 的 caveat）。")
    w("字重取的是 NSFont.systemFont(ofSize: 13) 的 regular，不是从像素反推的。")

    dest.write_text("\n".join(out) + "\n", encoding="utf-8")
    print("metrics: %s（%d 行）" % (dest, len(out)))
    self_check(imgs)


def self_check(imgs):
    """渲染链路的自检：外观有没有真的切到 legacy、下拉框有没有画错、尺寸对不对。"""
    problems = []
    sizes = []
    for row in ROWS:
        sizes.append(row)
    print("")
    print("%-18s %-16s %-16s" % ("控件", "light 可见(1x)", "dark 可见(1x)"))
    for row in ROWS:
        cells = []
        for mode in MODES:
            im = imgs[(mode, row)]
            if (im.width, im.height) != (648, 96):
                problems.append("%s-%s 尺寸 %s，应该是 648×96" % (mode, row, im.size))
            if row == "window-bg":
                cells.append("底色 %s" % hx(im.getpixel((324, 48))))
                continue
            bb = bbox(im, region=(0, 0, 62, im.height)) if row.startswith(("check", "radio")) else bbox(im)
            cells.append(box1(bb))
        print("%-18s %-22s %-22s" % (row, cells[0], cells[1]))

    # legacy 外观签名：普通按钮可见高约 22（Tahoe 是 24 且宽=frame 宽 200）
    bb = bbox(imgs[("light", "button")])
    w, h = one(bb[2] - bb[0]), one(bb[3] - bb[1])
    if not (185 <= w <= 192 and 20 <= h <= 23):
        problems.append(
            "普通按钮可见 %s×%s，不像 legacy 外观（应该是约 188×22）。"
            "vtool 改 sdk 那步可能没生效。" % (w, h)
        )
    # 下拉框箭头格：离屏渲染会在右侧画一块蓝色强调色，窗口承载后没有
    im = imgs[("light", "select")]
    px = im.load()
    bb = bbox(im)
    blue = 0
    for y in range(bb[1], bb[3]):
        for x in range(bb[2] - 40, bb[2]):
            p = px[x, y]
            if p[2] - max(p[0], p[1]) > 60:
                blue += 1
    if blue > 0:
        problems.append("下拉框右侧有 %d 个蓝色像素，窗口承载可能失效（会画成蓝色箭头格）" % blue)
    # 窗口底色：legacy 浅色 #ECECEC / 深色 #323232
    for mode, want in (("light", (236, 236, 236)), ("dark", (50, 50, 50))):
        p = imgs[(mode, "window-bg")].getpixel((324, 48))
        if diff(p, want) > 2:
            problems.append("%s 窗口底色 %s，期望 %s（外观没切到 legacy？）"
                            % (mode, hx(p), hx(want)))
    if problems:
        for p in problems:
            print("✗ " + p)
        sys.exit(1)
    print("")
    print("自检通过：sdk 15.0 legacy 外观、2x 位图、下拉框无蓝色箭头格、窗口底色对")


if __name__ == "__main__":
    main()
PYEOF

echo ""
echo "完成：${OUT#$ROOT/}/native-{light,dark}-{row}.png + metrics.txt"

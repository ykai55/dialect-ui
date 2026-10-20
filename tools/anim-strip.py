#!/usr/bin/env python3
"""分析录下来的原生动画：找出控件（蓝色填充）出现的那一段，报告有没有中间帧，并拼一张图。

用法：python3 tools/anim-strip.py <录制目录> <输出名>
输出：shots/frames/native-<输出名>.png
"""
import glob
import pathlib
import sys

from PIL import Image, ImageDraw, ImageFont


def is_blue(p):
    r, g, b = p[0], p[1], p[2]
    return b > 170 and b - r > 55 and b - g > 40


def blue_pixels(im):
    px = im.load()
    w, h = im.size
    pts = []
    for y in range(0, h, 2):
        for x in range(0, w, 2):
            if is_blue(px[x, y]):
                pts.append((x, y))
    return pts


root = pathlib.Path(sys.argv[1])
name = sys.argv[2]
files = sorted(glob.glob(str(root / "frames" / "*.png")))
if not files:
    raise SystemExit("没有帧")

frames = [Image.open(f).convert("RGB") for f in files]
counts = [len(blue_pixels(f)) for f in frames]
mx = max(counts)
if mx < 20:
    raise SystemExit("没找到蓝色控件")

# 找「由无到有」的那一步
step = None
for i in range(1, len(counts)):
    if counts[i - 1] < mx * 0.1 and counts[i] > mx * 0.5:
        step = i
        break
if step is None:
    raise SystemExit("没找到状态切换")

# 中间帧：蓝色量介于 10% 和 90% 之间
mid = [i for i in range(step - 1, min(step + 30, len(counts)))
       if mx * 0.1 < counts[i] < mx * 0.9]

print(f"切换发生在第 {step + 1} 帧（{step / 60 * 1000:.0f}ms），中间帧 {len(mid)} 张")

# 用切换后那一帧的蓝色区域作为裁剪框
pts = blue_pixels(frames[step])
xs = [p[0] for p in pts]
ys = [p[1] for p in pts]
pad = 26
box = (max(0, min(xs) - pad), max(0, min(ys) - pad),
       min(frames[0].width, max(xs) + pad), min(frames[0].height, max(ys) + pad))

picked = list(range(max(0, step - 2), min(len(frames), step + 4)))
crops = [(i, frames[i].crop(box)) for i in picked]
cw, ch = crops[0][1].size
scale = 3
cell_w, cell_h = cw * scale, ch * scale
cols = min(3, len(crops))
rows = (len(crops) + cols - 1) // cols
label_h = 22
out = Image.new("RGB", (cols * (cell_w + 8), rows * (cell_h + label_h) + 8), (250, 250, 251))
d = ImageDraw.Draw(out)
font = ImageFont.load_default(size=18)
for n, (i, crop) in enumerate(crops):
    im = crop.resize((cell_w, cell_h), Image.NEAREST)
    x = (n % cols) * (cell_w + 8)
    y = (n // cols) * (cell_h + label_h) + label_h
    out.paste(im, (x, y))
    d.text((x + 3, y - label_h + 2), f"#{i + 1} · {i / 60 * 1000:.0f}ms",
           fill=(60, 60, 70), font=font)

dest = pathlib.Path("shots/frames") / f"native-{name}.png"
dest.parent.mkdir(parents=True, exist_ok=True)
out.save(dest)
print(dest)

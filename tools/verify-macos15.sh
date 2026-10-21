#!/usr/bin/env bash
# 一条命令跑完 macOS 11–15 旧版外观的「原生 vs 复刻」核对：
#   1. 调 tools/render-macos-legacy.sh 渲染原生控件（编译 → vtool 改 sdk 15.0 → 渲染 → 采样）
#   2. 用无头 Chrome 2x 截 verify-macos15.html 的明暗两套
#   3. tools/compare-macos15.py 逐个控件拼对照图，输出逐行 ink bbox 差 + 颜色对照
#
# 产物：
#   reference/shots/macos15/appkit/native-{light,dark}-{row}.png（生成物，gitignore）
#   shots/verify/macos15/{row}-{light,dark}.png
#   shots/verify/macos15/report.txt
#
# 前置：本地静态服务已经在跑（python3 -m http.server 4173 --bind 127.0.0.1），见 README。
# 用法：
#   bash tools/verify-macos15.sh
#   PYTHON=/path/to/python3 bash tools/verify-macos15.sh
# 可用环境变量：CHROME / BASE / WORK / PYTHON / OUT
set -euo pipefail

cd "$(dirname "$0")/.."

CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
BASE="${BASE:-http://127.0.0.1:4173}"
WORK="${WORK:-/tmp/dialect-ui-macos15-verify}"
PROFILE="$WORK/chrome-profile"

# 页面：14 行 × 48px = 672（1x），截图 2x = 648×1344。
# 和 verify-macos15.html 的 .cell、tools/compare-macos15.py 的 ROWS/CELL_H 同步。
PAGE_W=324
PAGE_H=672

PYTHON="${PYTHON:-python3}"
if ! "$PYTHON" -c 'import PIL' >/dev/null 2>&1; then
  BUNDLED_PYTHON=/Users/bytedance/.dsh/dsh-runtimes/dsh-primary-runtime/dependencies/python/bin/python3
  if [ -x "$BUNDLED_PYTHON" ] && "$BUNDLED_PYTHON" -c 'import PIL' >/dev/null 2>&1; then
    PYTHON="$BUNDLED_PYTHON"
    echo "python3 没有 Pillow，改用内置 Python：$PYTHON"
  else
    echo "需要 Pillow。指定一个装了 Pillow 的 Python：PYTHON=/path/to/python3 bash tools/verify-macos15.sh" >&2
    exit 1
  fi
fi

if [ ! -x "$CHROME" ]; then
  echo "找不到 Chrome：$CHROME（可以用 CHROME=/path/to/chrome 覆盖）" >&2
  exit 1
fi

mkdir -p "$WORK" "$PROFILE"

if ! curl -sf -o /dev/null "$BASE/verify-macos15.html"; then
  echo "静态服务没起：$BASE/verify-macos15.html 打不开。" >&2
  echo "先跑：python3 -m http.server 4173 --bind 127.0.0.1" >&2
  exit 1
fi

echo "1/3 渲染 AppKit legacy 原生控件"
PYTHON="$PYTHON" WORK="$WORK/native" bash tools/render-macos-legacy.sh | sed 's/^/    /'

echo "2/3 截 CSS 版本（${PAGE_W}×${PAGE_H} @2x）"
# 每次清空 Chrome profile：http.server 不支持条件请求，复用 profile 时 Chrome 可能
# 直接拿上一次缓存的 css/theme-macos15.css，改完 CSS 再跑会看到旧样式。
for mode in light dark; do
  rm -rf "$PROFILE"
  mkdir -p "$PROFILE"
  "$CHROME" \
    --headless=new --no-sandbox --disable-gpu --hide-scrollbars \
    --force-device-scale-factor=2 \
    --window-size="$PAGE_W,$PAGE_H" \
    --user-data-dir="$PROFILE" \
    --virtual-time-budget=1500 \
    --screenshot="$WORK/css-$mode.png" \
    "$BASE/verify-macos15.html?mode=$mode&v=$(date +%s)" >/dev/null 2>&1
  echo "    $WORK/css-$mode.png"
done

echo "3/3 逐个控件拼对照图 + bbox / 颜色报告"
NATIVE_DIR="${OUT:-$(pwd)/reference/shots/macos15/appkit}" \
  "$PYTHON" tools/compare-macos15.py "$WORK" | sed 's/^/    /'

echo ""
echo "完成：shots/verify/macos15/{row}-{light,dark}.png"
echo "      shots/verify/macos15/report.txt"
